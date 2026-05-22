/**
 * Cron: Auto-generate class sessions
 * Runs weekly — generates sessions 4 weeks ahead from class definitions.
 * Skips closed dates and already-existing sessions.
 *
 * Vercel cron schedule: every Monday at 5 AM Colombia (10 AM UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";
import { SESSION_GENERATION_WEEKS } from "@/lib/constants/business-rules";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY required for cron jobs");
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/generate-sessions] CRON_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const weeks = SESSION_GENERATION_WEEKS;

  // Get active class definitions
  const { data: definitions } = await supabase
    .from("tu_class_definitions")
    .select("*")
    .eq("is_active", true);

  if (!definitions || definitions.length === 0) {
    return NextResponse.json({ message: "No active definitions", count: 0 });
  }

  // Calculate date range
  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + weeks * 7);

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const nowDateStr = formatDate(now);
  const endDateStr = formatDate(end);

  // Get closed dates in range
  const { data: closedDates } = await supabase
    .from("tu_closed_dates")
    .select("date")
    .gte("date", nowDateStr)
    .lte("date", endDateStr);

  const closedSet = new Set(
    (closedDates || []).map((d: { date: string }) => d.date),
  );

  // Get existing sessions in range (avoid duplicates)
  const { data: existing } = await supabase
    .from("tu_class_sessions")
    .select("definition_id, session_date")
    .gte("session_date", nowDateStr)
    .lte("session_date", endDateStr);

  const existingSet = new Set(
    (existing || []).map(
      (s: { definition_id: string; session_date: string }) =>
        `${s.definition_id}_${s.session_date}`,
    ),
  );

  // Generate sessions
  const toInsert: Array<{
    definition_id: string;
    session_date: string;
    start_time: string;
    teacher: string;
    capacity: number;
    status: string;
  }> = [];

  const current = new Date(now);
  current.setHours(0, 0, 0, 0);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = formatDate(current);

    if (!closedSet.has(dateStr)) {
      for (const def of definitions) {
        if (def.day_of_week === dayOfWeek) {
          const key = `${def.id}_${dateStr}`;
          if (!existingSet.has(key)) {
            toInsert.push({
              definition_id: def.id,
              session_date: dateStr,
              start_time: def.start_time,
              teacher: def.teacher,
              capacity: def.capacity,
              status: "scheduled",
            });
          }
        }
      }
    }
    current.setDate(current.getDate() + 1);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from("tu_class_sessions")
      .insert(toInsert);

    if (error) {
      console.error("[cron/generate-sessions]", error.message);
      return NextResponse.json(
        { error: "Failed to generate sessions" },
        { status: 500 },
      );
    }
  }

  // Notify Tata if sessions were generated
  if (toInsert.length > 0) {
    try {
      await sendTelegramMessage(
        `📅 <b>CRON: Sesiones generadas</b>\n\n<b>${toInsert.length}</b> nuevas sesiones creadas para las proximas <b>${weeks} semanas</b>.`,
      );
    } catch {}
  }

  console.log(`[cron/generate-sessions] Generated ${toInsert.length} sessions for ${weeks} weeks`);

  return NextResponse.json({
    message: `Generated ${toInsert.length} sessions for ${weeks} weeks`,
    count: toInsert.length,
  });
}
