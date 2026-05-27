import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";
import { systemLog } from "@/lib/system-log";

const ImportRowSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
});

const ImportBodySchema = z.object({
  students: z.array(ImportRowSchema).min(1).max(200),
});

function sanitizeField(value: string): string {
  return value.replace(/^[=+\-@\t\r]+/, "").trim();
}

/**
 * POST /api/admin/students/import
 * Bulk import students from CSV data.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (admin.role === "manager") {
      return NextResponse.json(
        { error: "Solo admins pueden importar alumnos en masa" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = ImportBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = admin.supabase;
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const s of parsed.data.students) {
      const name = sanitizeField(s.name);
      if (name.length < 2) {
        results.errors.push("Skipped: empty name");
        results.skipped++;
        continue;
      }

      const email = s.email ? s.email.trim().toLowerCase() : null;
      const phone = s.phone ? sanitizeField(s.phone) : null;

      if (email) {
        const { data: existing } = await supabase
          .from("tu_students")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existing) {
          results.errors.push(`Skipped: ${name} (${email}) — already exists`);
          results.skipped++;
          continue;
        }
      }

      const { error: insertErr } = await supabase
        .from("tu_students")
        .insert({ full_name: name, email, phone, role: "student" });

      if (insertErr) {
        results.errors.push(`Error: ${name} — ${insertErr.message}`);
        results.skipped++;
      } else {
        results.created++;
      }
    }

    try {
      await sendTelegramMessage(
        `📋 <b>Importacion masiva de alumnos</b>\n\n` +
          `<b>Creados:</b> ${results.created}\n` +
          `<b>Omitidos:</b> ${results.skipped}\n` +
          `<b>Por:</b> ${escapeHtml(admin.email)}`,
      );
    } catch (err) {
      console.error("[admin/students/import] Telegram failed:", err);
    }

    systemLog({
      category: "system",
      level: "info",
      message: `Bulk import: ${results.created} created, ${results.skipped} skipped`,
      route: "admin/students/import",
      details: { created: results.created, skipped: results.skipped, total: parsed.data.students.length },
    });

    return NextResponse.json({
      message: `${results.created} alumnos creados, ${results.skipped} omitidos`,
      ...results,
    });
  } catch (err) {
    console.error("[admin/students/import] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
