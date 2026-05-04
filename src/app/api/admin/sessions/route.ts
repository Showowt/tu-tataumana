import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/lib/admin-auth";

/**
 * GET /api/admin/sessions
 * List class sessions with definition details and booking counts.
 *
 * Query params:
 *   from     — start date (default: today)
 *   to       — end date (default: from + 7)
 *   status   — filter by status (scheduled, cancelled, completed)
 *   teacher  — filter by teacher name
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  const { searchParams } = request.nextUrl;

  const today = new Date().toISOString().split("T")[0];
  const from = searchParams.get("from") || today;
  let to = searchParams.get("to");
  if (!to) {
    const d = new Date(from);
    d.setDate(d.getDate() + 7);
    to = d.toISOString().split("T")[0];
  }

  const status = searchParams.get("status");
  const teacher = searchParams.get("teacher");

  let query = supabase
    .from("tu_class_sessions")
    .select(
      `
      *,
      definition:tu_class_definitions (
        name, name_es, style, level, duration_minutes,
        price_cop, price_usd, location
      )
    `,
    )
    .gte("session_date", from)
    .lte("session_date", to)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }
  if (teacher) {
    query = query.eq("teacher", teacher);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin/sessions GET]", error.message);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }

  return NextResponse.json({ data: data || [], from, to });
}

/**
 * POST /api/admin/sessions
 * Administrative session actions: cancel, complete, or generate.
 *
 * Body:
 *   action: "cancel" | "complete" | "generate"
 *   session_id: string (for cancel/complete)
 *   reason: string (for cancel)
 *   weeks: number (for generate, default 4)
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  const body = await request.json();
  const { action } = body;

  switch (action) {
    case "cancel": {
      const { session_id, reason } = body;
      if (!session_id) {
        return NextResponse.json({ error: "session_id required" }, { status: 400 });
      }

      // Cancel session
      const { error: sessError } = await supabase
        .from("tu_class_sessions")
        .update({
          status: "cancelled",
          cancel_reason: reason || "Cancelled by admin",
        })
        .eq("id", session_id);

      if (sessError) {
        console.error("[admin/sessions cancel]", sessError.message);
        return NextResponse.json({ error: "Failed to cancel session" }, { status: 500 });
      }

      // Cancel all confirmed bookings for this session and refund pack credits
      const { data: bookings } = await supabase
        .from("tu_class_bookings")
        .select("id, pack_id")
        .eq("session_id", session_id)
        .eq("status", "confirmed");

      for (const booking of bookings || []) {
        await supabase
          .from("tu_class_bookings")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "Session cancelled" })
          .eq("id", booking.id);

        // Refund pack credit
        if (booking.pack_id) {
          const { data: pack } = await supabase
            .from("tu_packs")
            .select("classes_used, status")
            .eq("id", booking.pack_id)
            .single();

          if (pack) {
            await supabase
              .from("tu_packs")
              .update({
                classes_used: Math.max((pack.classes_used || 0) - 1, 0),
                status: pack.status === "exhausted" ? "active" : pack.status,
              })
              .eq("id", booking.pack_id);
          }
        }
      }

      return NextResponse.json({
        message: "Session cancelled",
        bookings_cancelled: (bookings || []).length,
      });
    }

    case "complete": {
      const { session_id: sid } = body;
      if (!sid) {
        return NextResponse.json({ error: "session_id required" }, { status: 400 });
      }

      const { error } = await supabase
        .from("tu_class_sessions")
        .update({ status: "completed" })
        .eq("id", sid);

      if (error) {
        console.error("[admin/sessions complete]", error.message);
        return NextResponse.json({ error: "Failed to complete session" }, { status: 500 });
      }

      // Mark unchecked-in bookings as no-show
      await supabase
        .from("tu_class_bookings")
        .update({ status: "no_show" })
        .eq("session_id", sid)
        .eq("status", "confirmed")
        .eq("checked_in", false);

      return NextResponse.json({ message: "Session completed" });
    }

    case "generate": {
      const weeks = body.weeks || 4;
      const { data: definitions } = await supabase
        .from("tu_class_definitions")
        .select("*")
        .eq("is_active", true);

      if (!definitions || definitions.length === 0) {
        return NextResponse.json({ message: "No active definitions" });
      }

      // Get closed dates
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + weeks * 7);

      const { data: closedDates } = await supabase
        .from("tu_closed_dates")
        .select("date")
        .gte("date", now.toISOString().split("T")[0])
        .lte("date", end.toISOString().split("T")[0]);

      const closedSet = new Set((closedDates || []).map((d: { date: string }) => d.date));

      // Get existing sessions
      const { data: existing } = await supabase
        .from("tu_class_sessions")
        .select("definition_id, session_date")
        .gte("session_date", now.toISOString().split("T")[0])
        .lte("session_date", end.toISOString().split("T")[0]);

      const existingSet = new Set(
        (existing || []).map(
          (s: { definition_id: string; session_date: string }) =>
            `${s.definition_id}_${s.session_date}`,
        ),
      );

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
        const dateStr = current.toISOString().split("T")[0];

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
        const { error } = await supabase.from("tu_class_sessions").insert(toInsert);
        if (error) {
          console.error("[admin/sessions generate]", error.message);
          return NextResponse.json({ error: "Failed to generate sessions" }, { status: 500 });
        }
      }

      return NextResponse.json({
        message: `Generated ${toInsert.length} sessions for ${weeks} weeks`,
        count: toInsert.length,
      });
    }

    default:
      return NextResponse.json(
        { error: "Invalid action. Use: cancel, complete, generate" },
        { status: 400 },
      );
  }
}
