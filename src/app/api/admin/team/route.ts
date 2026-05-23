import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, type AdminRole } from "@/lib/admin-auth";
import { z } from "zod";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const AddMemberSchema = z.object({
  email: z.string().email("Email invalido"),
  full_name: z.string().min(2, "Nombre requerido"),
  role: z.enum(["admin", "manager"]),
});

const RemoveMemberSchema = z.object({
  member_id: z.string().uuid("ID invalido"),
});

// Role hierarchy: owner > admin > manager
const ROLE_LEVEL: Record<AdminRole, number> = {
  owner: 3,
  admin: 2,
  manager: 1,
};

// ---------------------------------------------------------------------------
// GET — List team members
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Don't expose telegram_chat_id — return boolean flag instead
    const { data, error } = await admin.supabase
      .from("tu_admin_users")
      .select("id, email, full_name, role, is_active, telegram_chat_id, created_at")
      .order("role", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[admin/team] List failed:", error.message);
      return NextResponse.json({ error: "Failed to load team" }, { status: 500 });
    }

    // Strip telegram_chat_id, replace with boolean
    const sanitized = (data || []).map((m) => ({
      id: m.id,
      email: m.email,
      full_name: m.full_name,
      role: m.role,
      is_active: m.is_active,
      has_telegram: !!m.telegram_chat_id,
      created_at: m.created_at,
    }));

    return NextResponse.json({
      data: sanitized,
      current_role: admin.role,
      current_email: admin.email,
    });
  } catch (err) {
    console.error("[admin/team GET] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Add team member
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owners and admins can add members
    if (ROLE_LEVEL[admin.role] < ROLE_LEVEL["admin"]) {
      return NextResponse.json(
        { error: "Solo owners y admins pueden agregar miembros" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = AddMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { email, full_name, role } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Can't assign a role higher than or equal to your own
    if (ROLE_LEVEL[role as AdminRole] >= ROLE_LEVEL[admin.role]) {
      return NextResponse.json(
        { error: "No puedes asignar un rol igual o superior al tuyo" },
        { status: 403 },
      );
    }

    // Check if email already exists
    const { data: existing } = await admin.supabase
      .from("tu_admin_users")
      .select("id, is_active, role")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      if (!existing.is_active) {
        // SECURITY: Role hierarchy check on reactivation too
        if (ROLE_LEVEL[role as AdminRole] >= ROLE_LEVEL[admin.role]) {
          return NextResponse.json(
            { error: "No puedes reactivar con un rol igual o superior al tuyo" },
            { status: 403 },
          );
        }

        // Can't reactivate someone who had a higher role than you
        if (ROLE_LEVEL[existing.role as AdminRole] >= ROLE_LEVEL[admin.role]) {
          return NextResponse.json(
            { error: "No puedes reactivar a alguien con tu mismo rol o superior" },
            { status: 403 },
          );
        }

        const { error: reactivateError } = await admin.supabase
          .from("tu_admin_users")
          .update({ is_active: true, role, full_name, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (reactivateError) {
          console.error("[admin/team] Reactivation failed:", reactivateError.message);
          return NextResponse.json(
            { error: "Error al reactivar miembro" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          message: `${full_name} reactivado como ${role}`,
          reactivated: true,
        });
      }
      return NextResponse.json(
        { error: "Este email ya tiene acceso admin" },
        { status: 409 },
      );
    }

    // Get the admin's own tu_admin_users ID for created_by
    const { data: selfRecord } = await admin.supabase
      .from("tu_admin_users")
      .select("id")
      .eq("email", admin.email)
      .maybeSingle();

    // Create the team member record
    const { error: insertError } = await admin.supabase
      .from("tu_admin_users")
      .insert({
        email: normalizedEmail,
        full_name,
        role,
        is_active: true,
        created_by: selfRecord?.id || null,
      });

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Este email ya tiene acceso admin" },
          { status: 409 },
        );
      }
      console.error("[admin/team] Insert failed:", insertError.message);
      return NextResponse.json(
        { error: "Error al agregar miembro" },
        { status: 500 },
      );
    }

    // Ensure the person has a Supabase auth account (create if needed)
    // Use createUser directly — handles duplicates gracefully
    try {
      const tempPassword = crypto.randomUUID() + "Aa1!";
      const { error: createErr } = await admin.supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createErr && !createErr.message.includes("already been registered")) {
        console.error("[admin/team] Auth account creation failed:", createErr.message);
      }
    } catch (authErr) {
      console.error("[admin/team] Auth account creation error:", authErr);
    }

    // Notify via Telegram (escape user input)
    try {
      await sendTelegramMessage(
        `👥 <b>Nuevo miembro del equipo</b>\n\n` +
          `<b>Nombre:</b> ${escapeHtml(full_name)}\n` +
          `<b>Email:</b> ${escapeHtml(normalizedEmail)}\n` +
          `<b>Rol:</b> ${escapeHtml(role)}\n` +
          `<b>Agregado por:</b> ${escapeHtml(admin.email)}`,
      );
    } catch (telegramErr) {
      console.error("[admin/team] Telegram notification failed:", telegramErr);
    }

    return NextResponse.json({
      message: `${full_name} agregado como ${role}`,
      created: true,
    });
  } catch (err) {
    console.error("[admin/team POST] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — Remove/deactivate team member
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owners and admins can remove members
    if (ROLE_LEVEL[admin.role] < ROLE_LEVEL["admin"]) {
      return NextResponse.json(
        { error: "Solo owners y admins pueden remover miembros" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = RemoveMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "ID invalido" },
        { status: 400 },
      );
    }

    const { member_id } = parsed.data;

    // Get the member being removed
    const { data: member } = await admin.supabase
      .from("tu_admin_users")
      .select("id, email, full_name, role")
      .eq("id", member_id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    // SECURITY: Can't remove yourself
    if (member.email.toLowerCase() === admin.email.toLowerCase()) {
      return NextResponse.json(
        { error: "No puedes removerte a ti mismo" },
        { status: 403 },
      );
    }

    // Can't remove owners
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "No se puede remover al owner" },
        { status: 403 },
      );
    }

    // Can't remove someone with equal or higher role
    if (ROLE_LEVEL[member.role as AdminRole] >= ROLE_LEVEL[admin.role]) {
      return NextResponse.json(
        { error: "No puedes remover a alguien con tu mismo rol o superior" },
        { status: 403 },
      );
    }

    // Soft-delete: deactivate instead of removing
    const { error: updateError } = await admin.supabase
      .from("tu_admin_users")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", member_id);

    if (updateError) {
      console.error("[admin/team] Deactivate failed:", updateError.message);
      return NextResponse.json(
        { error: "Error al remover miembro" },
        { status: 500 },
      );
    }

    // Notify via Telegram (escape user input)
    try {
      await sendTelegramMessage(
        `🚫 <b>Miembro removido del equipo</b>\n\n` +
          `<b>Nombre:</b> ${escapeHtml(member.full_name)}\n` +
          `<b>Email:</b> ${escapeHtml(member.email)}\n` +
          `<b>Removido por:</b> ${escapeHtml(admin.email)}`,
      );
    } catch (telegramErr) {
      console.error("[admin/team] Telegram notification failed:", telegramErr);
    }

    return NextResponse.json({
      message: `${member.full_name} removido del equipo`,
      removed: true,
    });
  } catch (err) {
    console.error("[admin/team DELETE] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
