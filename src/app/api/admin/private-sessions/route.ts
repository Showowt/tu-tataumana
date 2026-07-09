import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";

const CreateSchema = z.object({
  client_name: z.string().min(2),
  client_email: z.string().email().optional().or(z.literal("")),
  client_phone: z.string().optional().or(z.literal("")),
  service_type: z.string().min(1).default("Private Yoga"),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration_minutes: z.number().int().positive().default(60),
  price_cop: z.number().int().min(0).default(190000),
  group_size: z.number().int().positive().default(1),
  teacher: z.string().default("Tata"),
  location: z.string().default("Casa Carolina"),
  notes: z.string().optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const from = params.get("from");
    const to = params.get("to");

    let query = admin.supabase
      .from("tu_private_sessions")
      .select("*")
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(100);

    if (status && status !== "all") query = query.eq("status", status);
    if (from) query = query.gte("session_date", from);
    if (to) query = query.lte("session_date", to);

    const { data, error } = await query;
    if (error) {
      console.error("[admin/private-sessions GET]", error.message);
      return NextResponse.json({ error: "Failed to load" }, { status: 500 });
    }

    // Stats
    const all = data || [];
    const stats = {
      total: all.length,
      scheduled: all.filter((s) => s.status === "scheduled").length,
      completed: all.filter((s) => s.status === "completed").length,
      revenue: all.filter((s) => s.payment_status === "paid").reduce((sum, s) => sum + (s.price_cop || 0), 0),
    };

    return NextResponse.json({ data: all, stats });
  } catch (err) {
    console.error("[admin/private-sessions GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { error: insertErr } = await admin.supabase
      .from("tu_private_sessions")
      .insert({
        ...parsed.data,
        client_email: parsed.data.client_email || null,
        client_phone: parsed.data.client_phone || null,
        notes: parsed.data.notes || null,
        created_by: admin.email,
      });

    if (insertErr) {
      console.error("[admin/private-sessions POST]", insertErr.message);
      return NextResponse.json({ error: "Error al crear" }, { status: 500 });
    }

    try {
      const price = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(parsed.data.price_cop);
      await sendTelegramMessage(
        `🧘 <b>Sesion Privada Agendada</b>\n\n` +
          `<b>Cliente:</b> ${escapeHtml(parsed.data.client_name)}\n` +
          `<b>Servicio:</b> ${escapeHtml(parsed.data.service_type)}\n` +
          `<b>Fecha:</b> ${parsed.data.session_date} ${parsed.data.start_time}\n` +
          `<b>Grupo:</b> ${parsed.data.group_size} persona(s)\n` +
          `<b>Precio:</b> ${price}\n` +
          `<b>Teacher:</b> ${escapeHtml(parsed.data.teacher)}`,
      );
    } catch (err) {
      console.error("[admin/private-sessions] Telegram failed:", err);
    }

    return NextResponse.json({ message: "Sesion privada creada" }, { status: 201 });
  } catch (err) {
    console.error("[admin/private-sessions POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const PatchSchema = z.object({
  id: z.string().uuid(),
  client_name: z.string().min(2).max(200).optional(),
  client_email: z.string().email().optional().nullable().or(z.literal("")),
  client_phone: z.string().max(30).optional().nullable().or(z.literal("")),
  service_type: z.string().min(1).max(100).optional(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration_minutes: z.number().int().positive().optional(),
  group_size: z.number().int().positive().max(30).optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  payment_status: z.enum(["pending", "paid", "partial"]).optional(),
  payment_method: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  price_cop: z.number().int().min(0).max(50000000).optional(),
  teacher: z.string().min(1).max(100).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;

    // Managers can only update status/payment/notes — not price/teacher
    if (admin.role === "manager") {
      delete (updates as Record<string, unknown>).price_cop;
      delete (updates as Record<string, unknown>).teacher;
    }

    // Verify session exists
    const { data: existing } = await admin.supabase
      .from("tu_private_sessions")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });
    }

    const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        // Normalize empty strings to null for nullable fields
        if ((key === "client_email" || key === "client_phone" || key === "notes") && value === "") {
          safeUpdates[key] = null;
        } else {
          safeUpdates[key] = value;
        }
      }
    }

    const { error } = await admin.supabase
      .from("tu_private_sessions")
      .update(safeUpdates)
      .eq("id", id);

    if (error) {
      console.error("[admin/private-sessions PATCH]", error.message);
      return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
    }

    return NextResponse.json({ message: "Actualizado" });
  } catch (err) {
    console.error("[admin/private-sessions PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
