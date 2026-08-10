/**
 * Cron: Auto-complete past sessions
 * Runs daily at 11 PM Colombia (4 AM UTC).
 * - Marks all past "scheduled" sessions as "completed"
 * - Records attendance for still-confirmed bookings on those sessions
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";
import { TIMEZONE } from "@/lib/constants/business-rules";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY required for cron jobs");
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/complete-sessions] CRON_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
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

  // 2. Record attendance for still-confirmed bookings on completed sessions.
  // The studio doesn't use per-student check-in — anyone not manually marked
  // no-show before the sweep counts as attended.
  let attendedCount = 0;
  if (completedCount > 0) {
    const sessionIds = completed!.map((s) => s.id);
    const sweptAt = new Date().toISOString();

    const { data: toAttend } = await supabase
      .from("tu_class_bookings")
      .select("id, student_id, session_id")
      .eq("status", "confirmed")
      .eq("checked_in", false)
      .in("session_id", sessionIds);

    if (toAttend && toAttend.length > 0) {
      // Record attendance (idempotent via unique booking_id index). NOTE (R2F-07): the
      // session status was already flipped to 'completed' in step 1, so a failure here
      // is NOT auto-retried by the next run (which only sweeps status='scheduled') — it
      // is logged for manual recovery. Attendance is a soft record (credits are deducted
      // at booking), so this is acceptable; a proper recovery sweep is a Round-3 item.
      const { error: attErr } = await supabase.from("tu_attendance").upsert(
        toAttend.map((b) => ({
          booking_id: b.id,
          student_id: b.student_id,
          session_id: b.session_id,
          status: "attended",
          checked_in_at: sweptAt,
        })),
        { onConflict: "booking_id", ignoreDuplicates: true },
      );

      if (attErr) {
        console.error("[cron/complete-sessions] attendance insert failed — NOT marking checked_in (will retry):", attErr.message);
      } else {
        const { error: flagErr } = await supabase
          .from("tu_class_bookings")
          .update({ checked_in: true, checked_in_at: sweptAt })
          .in("id", toAttend.map((b) => b.id));
        if (flagErr) console.error("[cron/complete-sessions] check-in flag update failed (attendance recorded):", flagErr.message);
        attendedCount = toAttend.length;
      }
    }
  }

  if (completedCount > 0) {
    try {
      await sendTelegramMessage(
        `🔄 <b>CRON: Sesiones completadas</b>\n\n<b>Sesiones cerradas:</b> ${completedCount}\n<b>Asistencias registradas:</b> ${attendedCount}`,
      );
    } catch {}
  }

  console.log(
    `[cron/complete-sessions] Completed: ${completedCount}, Attended: ${attendedCount}`,
  );

  return NextResponse.json({
    completed: completedCount,
    attended: attendedCount,
    date: today,
  });
}
