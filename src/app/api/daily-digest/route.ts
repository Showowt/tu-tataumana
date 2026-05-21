import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { DAY_NAMES } from "@/lib/schedule";
import { TIMEZONE } from "@/lib/constants/business-rules";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function sendTelegram(text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return false;

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  return res.ok;
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * GET /api/daily-digest
 * Sends Tata a summary of tomorrow's schedule with enrollment counts.
 * NOW reads from tu_class_sessions + tu_class_bookings (real data).
 * Called by Vercel cron at 9 PM Colombia time daily.
 * Also callable with ?date=YYYY-MM-DD for any date.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Default to tomorrow in Colombia timezone
    let dateStr: string;
    if (dateParam) {
      dateStr = dateParam;
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
      }).format(tomorrow);
    }

    const targetDate = new Date(dateStr + "T12:00:00");
    const dayOfWeek = targetDate.getDay();
    const dayName = DAY_NAMES[dayOfWeek];

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Get REAL sessions from tu_class_sessions for the target date
    const { data: sessions } = await supabase
      .from("tu_class_sessions")
      .select("id, start_time, teacher, capacity, enrolled, status, definition:tu_class_definitions(name, name_es)")
      .eq("session_date", dateStr)
      .eq("status", "scheduled")
      .order("start_time", { ascending: true });

    if (!sessions || sessions.length === 0) {
      await sendTelegram(
        `📋 <b>MANANA: ${dayName}, ${dateStr}</b>\n\nNo hay clases programadas.`,
      );
      return NextResponse.json({ message: "Digest sent (no classes)" });
    }

    // Get REAL bookings from tu_class_bookings with student names
    const sessionIds = sessions.map((s) => s.id);
    const { data: bookings } = await supabase
      .from("tu_class_bookings")
      .select("session_id, student:tu_students(full_name)")
      .in("session_id", sessionIds)
      .eq("status", "confirmed");

    // Group bookings by session
    const bookingsBySession: Record<string, string[]> = {};
    if (bookings) {
      for (const b of bookings) {
        const sid = b.session_id as string;
        const student = b.student as unknown as { full_name: string } | null;
        if (!bookingsBySession[sid]) bookingsBySession[sid] = [];
        if (student?.full_name) bookingsBySession[sid].push(student.full_name);
      }
    }

    // Build the digest message
    let totalStudents = 0;
    const classLines: string[] = [];

    for (const session of sessions) {
      const def = (Array.isArray(session.definition) ? session.definition[0] : session.definition) as { name: string; name_es: string } | null;
      const className = def?.name_es || def?.name || "Clase";
      const enrolled = session.enrolled || 0;
      const capacity = session.capacity || 10;
      const spotsLeft = capacity - enrolled;
      totalStudents += enrolled;

      const bar = enrolled > 0
        ? "█".repeat(Math.min(enrolled, capacity)) + "░".repeat(Math.max(spotsLeft, 0))
        : "░".repeat(capacity);

      let line = `\n<b>${formatTime12h(session.start_time)} — ${className}</b>`;
      line += ` (${session.teacher})`;
      line += `\n${bar}  ${enrolled}/${capacity}`;

      if (enrolled >= capacity) {
        line += "  LLENO";
      } else if (spotsLeft <= 3) {
        line += `  ${spotsLeft} cupos`;
      }

      // List student names
      const names = bookingsBySession[session.id];
      if (names && names.length > 0) {
        line += `\n${names.map((n) => `  · ${n}`).join("\n")}`;
      }

      classLines.push(line);
    }

    const header = `📋 <b>MANANA: ${dayName}, ${dateStr}</b>\n<b>${sessions.length} clases · ${totalStudents} alumnos reservados</b>`;
    const fullMessage = header + "\n" + classLines.join("\n") + "\n\n" +
      (totalStudents === 0
        ? "Sin reservas aun — comparte el horario!"
        : `Lindo dia manana, Tata!`);

    await sendTelegram(fullMessage);

    // -----------------------------------------------------------------------
    // PACK EXPIRY WARNINGS — packs expiring in 3 days or less
    // -----------------------------------------------------------------------
    if (supabase) {
      try {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const expiryDateStr = threeDaysFromNow.toISOString();

        const { data: expiringPacks } = await supabase
          .from("tu_packs")
          .select("id, pack_type, expires_at, classes_used, total_classes, student:tu_students(full_name, email, phone)")
          .eq("status", "active")
          .lte("expires_at", expiryDateStr)
          .order("expires_at", { ascending: true })
          .limit(20);

        if (expiringPacks && expiringPacks.length > 0) {
          const expiryLines = expiringPacks.map((p) => {
            const student = p.student as unknown as { full_name: string; email: string; phone: string } | null;
            const name = student?.full_name || "Unknown";
            const remaining = p.total_classes === -1
              ? "Ilimitado"
              : `${(p.total_classes || 0) - (p.classes_used || 0)} creditos`;
            const expiresAt = new Date(p.expires_at as string);
            const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const urgency = daysLeft <= 1 ? "HOY/MANANA" : `${daysLeft} dias`;
            return `  · <b>${name}</b> — ${(p.pack_type as string).replace(/_/g, " ")} (${remaining}) — expira en ${urgency}`;
          });

          await sendTelegram(
            `⏰ <b>PACKS POR EXPIRAR (${expiringPacks.length})</b>\n\n${expiryLines.join("\n")}\n\n💡 Oportunidad de renovacion!`,
          );
        }
      } catch (expiryErr) {
        console.error("[Daily Digest] Pack expiry check failed:", expiryErr);
      }
    }

    return NextResponse.json({
      message: "Digest sent",
      date: dateStr,
      day: dayName,
      total_students: totalStudents,
      classes: sessions.length,
    });
  } catch (err) {
    console.error("[Daily Digest]", err);
    return NextResponse.json(
      { error: "Failed to send digest" },
      { status: 500 }
    );
  }
}
