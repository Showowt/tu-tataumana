/**
 * Cron: Auto-complete past sessions
 * Runs daily at 11 PM Colombia (4 AM UTC).
 * - Marks all past "scheduled" sessions as "completed"
 * - Marks unchecked bookings on completed sessions as "no_show"
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";
import { TIMEZONE } from "@/lib/constants/business-rules";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();

  // Get today's date in Colombia timezone
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // 1. Complete all past scheduled sessions
  const { data: completed, error: completeErr } = await supabase
    .from("tu_class_sessions")
    .update({ status: "completed" })
    .eq("status", "scheduled")
    .lt("session_date", today)
    .select("id");

  if (completeErr) {
    console.error("[cron/complete-sessions]", completeErr.message);
    return NextResponse.json({ error: completeErr.message }, { status: 500 });
  }

  const completedCount = completed?.length || 0;

  // 2. Mark unchecked bookings on completed sessions as no-show
  let noShowCount = 0;
  if (completedCount > 0) {
    const sessionIds = completed!.map((s) => s.id);

    const { data: noShows } = await supabase
      .from("tu_class_bookings")
      .update({ status: "no_show" })
      .eq("status", "confirmed")
      .eq("checked_in", false)
      .in("session_id", sessionIds)
      .select("id");

    noShowCount = noShows?.length || 0;
  }

  if (completedCount > 0) {
    try {
      await sendTelegramMessage(
        `🔄 <b>CRON: Sesiones completadas</b>\n\n<b>Sesiones cerradas:</b> ${completedCount}\n<b>No-shows marcados:</b> ${noShowCount}`,
      );
    } catch {}
  }

  console.log(
    `[cron/complete-sessions] Completed: ${completedCount}, No-shows: ${noShowCount}`,
  );

  return NextResponse.json({
    completed: completedCount,
    no_shows: noShowCount,
    date: today,
  });
}
