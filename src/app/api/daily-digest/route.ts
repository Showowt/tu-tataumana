import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { SCHEDULE, DAY_NAMES, CAPACITY, getColombiaDate, formatDateShort } from "@/lib/schedule";

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

/**
 * GET /api/daily-digest
 * Sends Tata a summary of tomorrow's schedule with enrollment counts.
 * Called by Vercel cron at 9 PM Colombia time daily.
 * Also callable with ?date=YYYY-MM-DD for any date.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check — only allow cron or requests with the correct secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Default to tomorrow
    const targetDate = dateParam
      ? new Date(dateParam + "T12:00:00")
      : getColombiaDate(1);

    const dateStr = formatDateShort(targetDate);
    const dayOfWeek = targetDate.getDay();
    const dayName = DAY_NAMES[dayOfWeek];
    const classes = SCHEDULE[dayOfWeek] || [];

    if (classes.length === 0) {
      await sendTelegram(
        `<b>TOMORROW: ${dayName}, ${dateStr}</b>\n\nNo classes scheduled. Rest day.`
      );
      return NextResponse.json({ message: "Digest sent (no classes)" });
    }

    // Get enrollment data from DB
    const supabase = getSupabase();
    let slotData: Record<string, number> = {};

    if (supabase) {
      const { data: slots } = await supabase
        .from("tu_class_slots")
        .select("class_time, enrolled")
        .eq("class_date", dateStr);

      if (slots) {
        for (const slot of slots) {
          slotData[slot.class_time] = slot.enrolled;
        }
      }
    }

    // Also get booked names for each class
    let bookingsByTime: Record<string, string[]> = {};
    if (supabase) {
      const { data: bookings } = await supabase
        .from("tu_bookings")
        .select("name, class_time, service")
        .eq("preferred_date", dateStr)
        .neq("status", "cancelled");

      if (bookings) {
        for (const b of bookings) {
          const timeKey = b.class_time || "unknown";
          if (!bookingsByTime[timeKey]) bookingsByTime[timeKey] = [];
          bookingsByTime[timeKey].push(b.name);
        }
      }
    }

    // Build the digest message
    let totalStudents = 0;
    const classLines: string[] = [];

    for (const cls of classes) {
      const enrolled = slotData[cls.time] || 0;
      const spotsLeft = CAPACITY - enrolled;
      totalStudents += enrolled;

      const bar = enrolled > 0
        ? "█".repeat(enrolled) + "░".repeat(spotsLeft)
        : "░".repeat(CAPACITY);

      let line = `\n<b>${cls.time} — ${cls.name}</b>\n`;
      line += `${bar}  ${enrolled}/${CAPACITY}`;

      if (enrolled === CAPACITY) {
        line += "  FULL";
      } else if (spotsLeft <= 3) {
        line += `  ${spotsLeft} left`;
      }

      // List names
      const names = bookingsByTime[cls.time];
      if (names && names.length > 0) {
        line += `\n${names.map((n) => `  · ${n}`).join("\n")}`;
      }

      classLines.push(line);
    }

    const header = `<b>TOMORROW: ${dayName}, ${dateStr}</b>\n<b>${classes.length} classes · ${totalStudents} students booked</b>`;
    const fullMessage = header + "\n" + classLines.join("\n") + "\n\n" +
      (totalStudents === 0
        ? "No bookings yet — share the schedule!"
        : `Have a beautiful day tomorrow, Tata!`);

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
      classes: classes.length,
    });
  } catch (err) {
    console.error("[Daily Digest]", err);
    return NextResponse.json(
      { error: "Failed to send digest" },
      { status: 500 }
    );
  }
}
