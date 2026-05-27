import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";
import { systemLog } from "@/lib/system-log";

/**
 * POST /api/admin/students/import
 * Bulk import students from CSV data.
 * Expects JSON body: { students: [{ name, email?, phone? }] }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const students = body.students as { name: string; email?: string; phone?: string }[];

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "No students provided" }, { status: 400 });
    }

    if (students.length > 200) {
      return NextResponse.json({ error: "Maximum 200 students per import" }, { status: 400 });
    }

    const supabase = admin.supabase;
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const s of students) {
      const name = (s.name || "").trim();
      if (!name || name.length < 2) {
        results.errors.push(`Skipped: empty name`);
        results.skipped++;
        continue;
      }

      const email = (s.email || "").trim().toLowerCase() || null;
      const phone = (s.phone || "").trim() || null;

      // Check for duplicate by email or name
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
        .insert({
          full_name: name,
          email,
          phone,
          role: "student",
        });

      if (insertErr) {
        results.errors.push(`Error: ${name} — ${insertErr.message}`);
        results.skipped++;
      } else {
        results.created++;
      }
    }

    // Notify via Telegram
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
      details: { created: results.created, skipped: results.skipped, total: students.length },
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
