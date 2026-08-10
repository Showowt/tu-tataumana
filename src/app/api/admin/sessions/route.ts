import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

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

  const supabase = admin.supabase;
  const { searchParams } = request.nextUrl;

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
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

  const supabase = admin.supabase;
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
          enrolled: 0, // all bookings are cancelled below — reset so a later reactivate/generate doesn't revive a phantom-full count
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

      let refundErrors = 0;
      for (const booking of bookings || []) {
        const { error: cancelErr } = await supabase
          .from("tu_class_bookings")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "Session cancelled" })
          .eq("id", booking.id);

        if (cancelErr) {
          console.error("[admin/sessions cancel] Booking cancel failed:", booking.id, cancelErr.message);
          refundErrors++;
          continue;
        }

        // Refund pack credit with optimistic lock
        if (booking.pack_id) {
          const { data: pack } = await supabase
            .from("tu_packs")
            .select("classes_used, status, pack_type")
            .eq("id", booking.pack_id)
            .single();

          if (pack) {
            const newUsed = Math.max((pack.classes_used || 0) - 1, 0);
            const packUpdate: Record<string, unknown> = {
              classes_used: newUsed,
              status: pack.status === "exhausted" ? "active" : pack.status,
            };
            // Clear locked_session_id for 2x1 packs when no credits remain used
            if (pack.pack_type?.toUpperCase().includes("2X1") && newUsed === 0) {
              packUpdate.locked_session_id = null;
            }

            const { error: refundErr } = await supabase
              .from("tu_packs")
              .update(packUpdate)
              .eq("id", booking.pack_id)
              .eq("classes_used", pack.classes_used);

            if (refundErr) {
              console.error("[admin/sessions cancel] Pack refund failed:", booking.pack_id, refundErr.message);
              refundErrors++;
            }
          }
        }
      }

      if (refundErrors > 0) {
        console.error(`[admin/sessions cancel] ${refundErrors} refund errors for session ${session_id}`);
      }

      return NextResponse.json({
        message: "Session cancelled",
        bookings_cancelled: (bookings || []).length,
      });
    }

    case "reactivate": {
      const { session_id } = body;
      if (!session_id) {
        return NextResponse.json({ error: "session_id required" }, { status: 400 });
      }

      // Only cancelled sessions can be reactivated
      const { data: sess } = await supabase
        .from("tu_class_sessions")
        .select("id, status")
        .eq("id", session_id)
        .single();

      if (!sess) {
        return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });
      }
      if (sess.status !== "cancelled") {
        return NextResponse.json(
          { error: "Solo se pueden reactivar sesiones canceladas" },
          { status: 400 },
        );
      }

      const { error: reactErr } = await supabase
        .from("tu_class_sessions")
        .update({ status: "scheduled", cancel_reason: null })
        .eq("id", session_id);

      if (reactErr) {
        console.error("[admin/sessions reactivate]", reactErr.message);
        return NextResponse.json({ error: "Failed to reactivate session" }, { status: 500 });
      }

      return NextResponse.json({ message: "Sesion reactivada" });
    }

    case "complete": {
      const { session_id: sid, force } = body;
      if (!sid) {
        return NextResponse.json({ error: "session_id required" }, { status: 400 });
      }

      // Guard: prevent completing future sessions by accident
      if (!force) {
        const { data: sess } = await supabase
          .from("tu_class_sessions")
          .select("session_date, start_time")
          .eq("id", sid)
          .single();

        if (sess) {
          const sessionDT = new Date(`${sess.session_date}T${sess.start_time}-05:00`);
          if (sessionDT > new Date()) {
            return NextResponse.json(
              { error: "Esta clase aún no ha comenzado.", code: "future_session" },
              { status: 400 },
            );
          }
        }
      }

      const { error } = await supabase
        .from("tu_class_sessions")
        .update({ status: "completed" })
        .eq("id", sid);

      if (error) {
        console.error("[admin/sessions complete]", error.message);
        return NextResponse.json({ error: "Failed to complete session" }, { status: 500 });
      }

      // The studio doesn't use per-student check-in: completing a session
      // records attendance for everyone still confirmed. Real absences must be
      // marked individually with the No-show button BEFORE completing.
      const completedAt = new Date().toISOString();
      const { data: toAttend } = await supabase
        .from("tu_class_bookings")
        .select("id, student_id")
        .eq("session_id", sid)
        .eq("status", "confirmed")
        .eq("checked_in", false);

      if (toAttend && toAttend.length > 0) {
        // Record attendance FIRST (idempotent via unique booking_id index) so a failure
        // here leaves checked_in=false and completion/cron re-runs instead of losing it.
        const { error: attErr } = await supabase.from("tu_attendance").upsert(
          toAttend.map((b) => ({
            booking_id: b.id,
            student_id: b.student_id,
            session_id: sid,
            status: "attended",
            checked_in_at: completedAt,
          })),
          { onConflict: "booking_id", ignoreDuplicates: true },
        );

        if (attErr) {
          console.error("[admin/sessions complete] attendance insert failed — NOT marking checked_in (will retry):", attErr.message);
        } else {
          const { error: flagErr } = await supabase
            .from("tu_class_bookings")
            .update({ checked_in: true, checked_in_at: completedAt })
            .in("id", toAttend.map((b) => b.id));
          if (flagErr) console.error("[admin/sessions complete] check-in flag update failed (attendance recorded):", flagErr.message);
        }
      }

      return NextResponse.json({
        message: "Session completed",
        attended: toAttend?.length || 0,
      });
    }

    case "update_capacity": {
      const { session_id: capSid, capacity: newCapacity } = body;
      if (!capSid || typeof newCapacity !== "number" || newCapacity < 1) {
        return NextResponse.json(
          { error: "session_id and capacity (>= 1) required" },
          { status: 400 },
        );
      }

      const { error } = await supabase
        .from("tu_class_sessions")
        .update({ capacity: newCapacity })
        .eq("id", capSid);

      if (error) {
        console.error("[admin/sessions update_capacity]", error.message);
        return NextResponse.json(
          { error: "Failed to update capacity" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        message: `Capacity updated to ${newCapacity}`,
        capacity: newCapacity,
      });
    }

    case "generate": {
      const weeks = Math.min(Math.max(body.weeks || 4, 1), 12);
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

      const nowDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const endDateStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

      const { data: closedDates } = await supabase
        .from("tu_closed_dates")
        .select("date")
        .gte("date", nowDateStr)
        .lte("date", endDateStr);

      const closedSet = new Set((closedDates || []).map((d: { date: string }) => d.date));

      // Get existing sessions (including cancelled ones so we can reactivate them)
      const { data: existing } = await supabase
        .from("tu_class_sessions")
        .select("id, definition_id, session_date, status")
        .gte("session_date", nowDateStr)
        .lte("session_date", endDateStr);

      // Slots with a live (non-cancelled) session — never touch these
      const activeSet = new Set(
        (existing || [])
          .filter((s: { status: string }) => s.status !== "cancelled")
          .map(
            (s: { definition_id: string; session_date: string }) =>
              `${s.definition_id}_${s.session_date}`,
          ),
      );

      // Slots whose only session is cancelled — reactivate instead of skipping.
      // (Regenerating the schedule should bring back a class the schedule still calls for.)
      const cancelledMap = new Map<string, string>();
      for (const s of (existing || []) as Array<{
        id: string;
        definition_id: string;
        session_date: string;
        status: string;
      }>) {
        const key = `${s.definition_id}_${s.session_date}`;
        if (s.status === "cancelled" && !activeSet.has(key)) {
          cancelledMap.set(key, s.id);
        }
      }

      const toInsert: Array<{
        definition_id: string;
        session_date: string;
        start_time: string;
        teacher: string;
        capacity: number;
        status: string;
      }> = [];
      const reactivateIds: string[] = [];

      const current = new Date(now);
      current.setHours(0, 0, 0, 0);

      while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;

        if (!closedSet.has(dateStr)) {
          for (const def of definitions) {
            if (def.day_of_week === dayOfWeek) {
              const key = `${def.id}_${dateStr}`;
              if (activeSet.has(key)) continue; // live session already exists
              const cancelledId = cancelledMap.get(key);
              if (cancelledId) {
                reactivateIds.push(cancelledId); // bring back a cancelled slot
              } else {
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

      if (reactivateIds.length > 0) {
        const { error: reactErr } = await supabase
          .from("tu_class_sessions")
          .update({ status: "scheduled", cancel_reason: null })
          .in("id", reactivateIds);
        if (reactErr) {
          console.error("[admin/sessions generate reactivate]", reactErr.message);
          return NextResponse.json({ error: "Failed to reactivate sessions" }, { status: 500 });
        }
      }

      const parts: string[] = [];
      if (toInsert.length > 0) parts.push(`${toInsert.length} nuevas`);
      if (reactivateIds.length > 0) parts.push(`${reactivateIds.length} reactivadas`);
      return NextResponse.json({
        message: parts.length
          ? `Sesiones: ${parts.join(", ")} (${weeks} semanas)`
          : `Sin cambios — el horario ya esta completo (${weeks} semanas)`,
        count: toInsert.length,
        reactivated: reactivateIds.length,
      });
    }

    default:
      return NextResponse.json(
        { error: "Invalid action. Use: cancel, reactivate, complete, update_capacity, generate" },
        { status: 400 },
      );
  }
}
