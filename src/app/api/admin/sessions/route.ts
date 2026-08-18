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

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * POST /api/admin/sessions
 * Administrative session actions: cancel, reactivate, complete, update,
 * update_capacity, add, or generate.
 *
 * Body:
 *   action: "cancel" | "reactivate" | "complete" | "update" | "update_capacity" | "add" | "generate"
 *   session_id: string (for cancel/reactivate/complete/update/update_capacity)
 *   reason: string (for cancel)
 *   start_time / teacher / capacity / notes (for update — edit ONE week's session)
 *   definition_id + session_date [+ start_time/teacher/capacity] (for add — one-off class)
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
        const { error: attendErr } = await supabase
          .from("tu_class_bookings")
          .update({ checked_in: true, checked_in_at: completedAt })
          .in("id", toAttend.map((b) => b.id));

        if (attendErr) {
          console.error("[admin/sessions complete] auto check-in failed:", attendErr.message);
        } else {
          await supabase.from("tu_attendance").insert(
            toAttend.map((b) => ({
              booking_id: b.id,
              student_id: b.student_id,
              session_id: sid,
              status: "attended",
              checked_in_at: completedAt,
            })),
          );
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

    case "update": {
      // Edit a single session (one week only) — time, teacher, capacity, notes.
      // This is how a week-specific schedule change is made without touching
      // the recurring template.
      const { session_id: updSid, start_time, teacher, capacity, notes } = body;
      if (!updSid) {
        return NextResponse.json({ error: "session_id required" }, { status: 400 });
      }

      const { data: sess } = await supabase
        .from("tu_class_sessions")
        .select("id, status, start_time, teacher, capacity, session_date")
        .eq("id", updSid)
        .single();

      if (!sess) {
        return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });
      }
      if (sess.status !== "scheduled") {
        return NextResponse.json(
          { error: "Solo se pueden editar sesiones programadas" },
          { status: 400 },
        );
      }

      const sessionUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (start_time !== undefined) {
        if (typeof start_time !== "string" || !TIME_REGEX.test(start_time)) {
          return NextResponse.json({ error: "start_time invalido (HH:MM)" }, { status: 400 });
        }
        sessionUpdates.start_time = start_time;
      }
      if (teacher !== undefined) {
        if (typeof teacher !== "string" || !teacher.trim() || teacher.length > 100) {
          return NextResponse.json({ error: "teacher invalido" }, { status: 400 });
        }
        sessionUpdates.teacher = teacher.trim();
      }
      if (capacity !== undefined) {
        if (typeof capacity !== "number" || capacity < 1 || capacity > 50) {
          return NextResponse.json({ error: "capacity invalida (1-50)" }, { status: 400 });
        }
        sessionUpdates.capacity = capacity;
      }
      if (notes !== undefined) {
        sessionUpdates.notes = typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 500) : null;
      }

      if (Object.keys(sessionUpdates).length === 1) {
        return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
      }

      const { error: updErr } = await supabase
        .from("tu_class_sessions")
        .update(sessionUpdates)
        .eq("id", updSid);

      if (updErr) {
        console.error("[admin/sessions update]", updErr.message);
        return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
      }

      // Warn about confirmed bookings if the time moved — Tata should notify them
      let bookingsAffected = 0;
      if (sessionUpdates.start_time && sessionUpdates.start_time !== sess.start_time) {
        const { count } = await supabase
          .from("tu_class_bookings")
          .select("id", { count: "exact", head: true })
          .eq("session_id", updSid)
          .eq("status", "confirmed");
        bookingsAffected = count || 0;
      }

      return NextResponse.json({
        message: bookingsAffected > 0
          ? `Sesion actualizada — ${bookingsAffected} reserva(s) confirmada(s) tienen el horario anterior, avisales del cambio`
          : "Sesion actualizada",
        bookings_affected: bookingsAffected,
      });
    }

    case "add": {
      // Add a one-off session for a specific date (e.g., an extra class this
      // week) without changing the recurring weekly template.
      const { definition_id, session_date, start_time: addTime, teacher: addTeacher, capacity: addCap } = body;
      if (!definition_id || !session_date) {
        return NextResponse.json(
          { error: "definition_id y session_date requeridos" },
          { status: 400 },
        );
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(session_date)) {
        return NextResponse.json({ error: "session_date invalida (YYYY-MM-DD)" }, { status: 400 });
      }
      if (addTime !== undefined && (typeof addTime !== "string" || !TIME_REGEX.test(addTime))) {
        return NextResponse.json({ error: "start_time invalido (HH:MM)" }, { status: 400 });
      }
      if (addCap !== undefined && (typeof addCap !== "number" || addCap < 1 || addCap > 50)) {
        return NextResponse.json({ error: "capacity invalida (1-50)" }, { status: 400 });
      }

      const { data: def } = await supabase
        .from("tu_class_definitions")
        .select("id, name, start_time, teacher, capacity")
        .eq("id", definition_id)
        .single();

      if (!def) {
        return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
      }

      const { data: closed } = await supabase
        .from("tu_closed_dates")
        .select("date")
        .eq("date", session_date)
        .maybeSingle();

      if (closed) {
        return NextResponse.json(
          { error: `${session_date} esta marcado como dia cerrado — reabrelo primero` },
          { status: 400 },
        );
      }

      const finalTime = addTime || def.start_time;

      // Avoid exact duplicates (same class, date, and time still active)
      const { data: dup } = await supabase
        .from("tu_class_sessions")
        .select("id, status")
        .eq("definition_id", definition_id)
        .eq("session_date", session_date)
        .eq("start_time", finalTime)
        .neq("status", "cancelled");

      if (dup && dup.length > 0) {
        return NextResponse.json(
          { error: "Ya existe una sesion de esta clase en esa fecha y hora" },
          { status: 409 },
        );
      }

      const { data: created, error: addErr } = await supabase
        .from("tu_class_sessions")
        .insert({
          definition_id,
          session_date,
          start_time: finalTime,
          teacher: (typeof addTeacher === "string" && addTeacher.trim()) || def.teacher,
          capacity: addCap || def.capacity,
          status: "scheduled",
        })
        .select("id")
        .single();

      if (addErr || !created) {
        console.error("[admin/sessions add]", addErr?.message);
        return NextResponse.json({ error: "Failed to add session" }, { status: 500 });
      }

      return NextResponse.json(
        { message: `Clase agregada: ${def.name} el ${session_date}`, session_id: created.id },
        { status: 201 },
      );
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

      // Get existing sessions — ANY existing session (including cancelled)
      // occupies its slot. Generating must NEVER resurrect a session that was
      // deliberately cancelled for that week; use the per-session "reactivar"
      // button for that.
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
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;

        if (!closedSet.has(dateStr)) {
          for (const def of definitions) {
            if (def.day_of_week === dayOfWeek && !existingSet.has(`${def.id}_${dateStr}`)) {
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
        message: toInsert.length > 0
          ? `Sesiones: ${toInsert.length} nuevas (${weeks} semanas)`
          : `Sin cambios — el horario ya esta completo (${weeks} semanas)`,
        count: toInsert.length,
      });
    }

    default:
      return NextResponse.json(
        { error: "Invalid action. Use: cancel, reactivate, complete, update, update_capacity, add, generate" },
        { status: 400 },
      );
  }
}
