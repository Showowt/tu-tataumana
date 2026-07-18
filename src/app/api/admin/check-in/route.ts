import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { sendTelegramMessage } from "@/lib/telegram";
import { z } from "zod";

const CheckInSchema = z.object({
  booking_id: z.string().uuid(),
  action: z.enum(["check_in", "no_show", "undo_check_in", "cancel_refund", "reschedule", "transfer"]),
  new_session_id: z.string().uuid().optional(),
  new_student_id: z.string().uuid().optional(),
});

/**
 * POST /api/admin/check-in
 * Check in a student, mark no-show, or undo check-in.
 * Creates attendance record on check-in.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;

  const body = await request.json();
  const parsed = CheckInSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { booking_id, action } = parsed.data;

  // Get booking with student and session info
  const { data: booking, error: bookingError } = await supabase
    .from("tu_class_bookings")
    .select("id, student_id, session_id, status, checked_in, pack_id")
    .eq("id", booking_id)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  switch (action) {
    case "check_in": {
      if (booking.status !== "confirmed") {
        return NextResponse.json(
          { error: "Can only check in confirmed bookings" },
          { status: 400 },
        );
      }

      // Update booking
      const { error: updateErr } = await supabase
        .from("tu_class_bookings")
        .update({ checked_in: true, checked_in_at: new Date().toISOString() })
        .eq("id", booking_id);

      if (updateErr) {
        console.error("[admin/check-in]", updateErr.message);
        return NextResponse.json({ error: "Failed to check in" }, { status: 500 });
      }

      // Create attendance record
      await supabase.from("tu_attendance").insert({
        booking_id: booking.id,
        student_id: booking.student_id,
        session_id: booking.session_id,
        status: "attended",
        checked_in_at: new Date().toISOString(),
      });

      return NextResponse.json({ message: "Student checked in" });
    }

    case "no_show": {
      if (booking.status !== "confirmed") {
        return NextResponse.json(
          { error: "Can only mark confirmed bookings as no-show" },
          { status: 400 },
        );
      }

      // Update booking status
      await supabase
        .from("tu_class_bookings")
        .update({ status: "no_show" })
        .eq("id", booking_id);

      // Create attendance record
      await supabase.from("tu_attendance").insert({
        booking_id: booking.id,
        student_id: booking.student_id,
        session_id: booking.session_id,
        status: "no_show",
      });

      // No-shows don't get pack credit refund — the credit was already deducted at booking time

      // Check chronic no-show status (warn Tata if 3+ no-shows)
      try {
        const { count: totalNoShows } = await supabase
          .from("tu_class_bookings")
          .select("id", { count: "exact", head: true })
          .eq("student_id", booking.student_id)
          .eq("status", "no_show");

        if (totalNoShows && totalNoShows >= 3) {
          const { data: studentInfo } = await supabase
            .from("tu_students")
            .select("full_name, email")
            .eq("id", booking.student_id)
            .single();

          await sendTelegramMessage(
            `⚠️ <b>AUSENCIA RECURRENTE</b>\n\n<b>${studentInfo?.full_name || "Alumno"}</b> (${studentInfo?.email || "?"})\n<b>Ausencias totales:</b> ${totalNoShows}\n\n${totalNoShows >= 5 ? "🔴 Considerar bloquear o contactar al alumno." : "Podria necesitar seguimiento."}`,
          );
        }
      } catch {}

      return NextResponse.json({ message: "Marked as no-show" });
    }

    case "undo_check_in": {
      if (!booking.checked_in) {
        return NextResponse.json(
          { error: "Student is not checked in" },
          { status: 400 },
        );
      }

      await supabase
        .from("tu_class_bookings")
        .update({ checked_in: false, checked_in_at: null })
        .eq("id", booking_id);

      // Remove attendance record
      await supabase
        .from("tu_attendance")
        .delete()
        .eq("booking_id", booking_id)
        .eq("status", "attended");

      return NextResponse.json({ message: "Check-in undone" });
    }

    case "cancel_refund": {
      if (booking.status === "cancelled") {
        return NextResponse.json(
          { error: "La reserva ya esta cancelada" },
          { status: 400 },
        );
      }

      // Check if this is a 2x1 pack — if so, cancel ALL bookings from this pack on this session
      let is2x1 = false;
      let siblingBookingIds: string[] = [];

      if (booking.pack_id) {
        const { data: packCheck } = await supabase
          .from("tu_packs")
          .select("pack_type")
          .eq("id", booking.pack_id)
          .single();

        is2x1 = !!packCheck?.pack_type?.toUpperCase().includes("2X1");

        if (is2x1) {
          // Find ALL other non-cancelled bookings from this same pack on the same session
          const { data: siblings } = await supabase
            .from("tu_class_bookings")
            .select("id, checked_in")
            .eq("pack_id", booking.pack_id)
            .eq("session_id", booking.session_id)
            .neq("status", "cancelled")
            .neq("id", booking_id);

          siblingBookingIds = (siblings || []).map((s: { id: string }) => s.id);

          // Remove attendance for checked-in siblings
          for (const sib of (siblings || []) as { id: string; checked_in: boolean }[]) {
            if (sib.checked_in) {
              await supabase.from("tu_attendance").delete().eq("booking_id", sib.id);
            }
          }
        }
      }

      // 1. Cancel the main booking with ATOMIC status guard
      const { data: cancelData, error: cancelErr } = await supabase
        .from("tu_class_bookings")
        .update({
          status: "cancelled",
          checked_in: false,
          checked_in_at: null,
          cancelled_at: new Date().toISOString(),
          cancel_reason: is2x1
            ? "Cancelada por admin (pack 2x1 — ambos creditos devueltos)"
            : "Cancelada por admin (credito devuelto)",
        })
        .eq("id", booking_id)
        .neq("status", "cancelled")
        .select("id")
        .single();

      if (cancelErr || !cancelData) {
        return NextResponse.json({ error: "La reserva ya fue cancelada (posible doble-click)" }, { status: 409 });
      }

      // 1b. For 2x1: also cancel all sibling bookings from the same pack+session
      if (siblingBookingIds.length > 0) {
        await supabase
          .from("tu_class_bookings")
          .update({
            status: "cancelled",
            checked_in: false,
            checked_in_at: null,
            cancelled_at: new Date().toISOString(),
            cancel_reason: "Cancelada automaticamente (pack 2x1 — ambos creditos devueltos)",
          })
          .in("id", siblingBookingIds)
          .neq("status", "cancelled");
      }

      const totalCancelled = 1 + siblingBookingIds.length;

      // 2. Remove attendance record if checked in
      if (booking.checked_in) {
        await supabase
          .from("tu_attendance")
          .delete()
          .eq("booking_id", booking_id);
      }

      // 3. Decrement session enrolled count (by total cancelled bookings)
      const { data: session } = await supabase
        .from("tu_class_sessions")
        .select("enrolled")
        .eq("id", booking.session_id)
        .single();

      if (session && (session.enrolled || 0) > 0) {
        const newEnrolled = Math.max((session.enrolled || 0) - totalCancelled, 0);
        await supabase
          .from("tu_class_sessions")
          .update({ enrolled: newEnrolled })
          .eq("id", booking.session_id)
          .eq("enrolled", session.enrolled || 0);
      }

      // 4. Refund pack credits
      let creditRefunded = false;
      if (booking.pack_id) {
        const { data: pack } = await supabase
          .from("tu_packs")
          .select("id, classes_used, total_classes, status, pack_type, locked_session_id")
          .eq("id", booking.pack_id)
          .single();

        if (!pack) {
          console.error("[admin/check-in] cancel_refund: pack not found:", booking.pack_id);
        } else if ((pack.classes_used || 0) > 0) {
          // 2x1: refund ALL credits used on this session. Non-2x1: refund 1.
          const creditsToRefund = is2x1 ? totalCancelled : 1;
          const newUsed = Math.max((pack.classes_used || 0) - creditsToRefund, 0);
          const newStatus =
            pack.total_classes === -1
              ? "active"
              : newUsed < pack.total_classes
                ? "active"
                : "exhausted";

          const packUpdate: Record<string, unknown> = { classes_used: newUsed, status: newStatus };
          // Clear locked_session_id for 2x1 packs when all credits are refunded
          if (is2x1 && newUsed === 0) {
            packUpdate.locked_session_id = null;
          }

          const { data: updatedPack } = await supabase
            .from("tu_packs")
            .update(packUpdate)
            .eq("id", pack.id)
            .eq("classes_used", pack.classes_used || 0)
            .select("id")
            .single();

          creditRefunded = !!updatedPack;
        }
      }

      // 5. Telegram notification
      try {
        const { data: studentInfo } = await supabase
          .from("tu_students")
          .select("full_name")
          .eq("id", booking.student_id)
          .single();

        const { data: sessionInfo } = await supabase
          .from("tu_class_sessions")
          .select("session_date, start_time, definition:definition_id(name)")
          .eq("id", booking.session_id)
          .single();

        const def = sessionInfo?.definition as unknown as { name: string } | { name: string }[] | null;
        const className = (Array.isArray(def) ? def[0]?.name : def?.name) || "Clase";
        const sessionDate = sessionInfo?.session_date || "";

        const cancelMsg = is2x1
          ? `🔄 <b>PACK 2X1 CANCELADO — ${totalCancelled} CREDITOS DEVUELTOS</b>\n\n<b>Alumno:</b> ${studentInfo?.full_name || "Desconocido"}\n<b>Clase:</b> ${className}\n<b>Fecha:</b> ${sessionDate}\n<b>Reservas canceladas:</b> ${totalCancelled}\n<b>Creditos:</b> ${creditRefunded ? "Todos devueltos ✅" : "Error en devolucion"}`
          : `🔄 <b>RESERVA CANCELADA + CREDITO DEVUELTO</b>\n\n<b>Alumno:</b> ${studentInfo?.full_name || "Desconocido"}\n<b>Clase:</b> ${className}\n<b>Fecha:</b> ${sessionDate}\n<b>Credito:</b> ${creditRefunded ? "Devuelto ✅" : "Sin pack asociado"}`;

        await sendTelegramMessage(cancelMsg);
      } catch {}

      return NextResponse.json({
        message: is2x1
          ? `Pack 2x1 cancelado: ${totalCancelled} reservas canceladas, creditos devueltos`
          : creditRefunded
            ? "Reserva cancelada y credito devuelto"
            : "Reserva cancelada (sin pack para reembolsar)",
        credit_refunded: creditRefunded,
        bookings_cancelled: totalCancelled,
      });
    }

    case "reschedule": {
      const newSessionId = (body as { new_session_id?: string }).new_session_id;
      if (!newSessionId) {
        return NextResponse.json(
          { error: "new_session_id es requerido para reagendar" },
          { status: 400 },
        );
      }

      // Only confirmed, non-checked-in bookings can be rescheduled
      if (booking.status !== "confirmed") {
        return NextResponse.json(
          { error: "Solo se pueden reagendar reservas confirmadas" },
          { status: 400 },
        );
      }
      if (booking.checked_in) {
        return NextResponse.json(
          { error: "No se puede reagendar una reserva con check-in" },
          { status: 400 },
        );
      }

      // Can't reschedule to the same session
      if (newSessionId === booking.session_id) {
        return NextResponse.json(
          { error: "La reserva ya esta en esta sesion" },
          { status: 400 },
        );
      }

      // Verify new session exists, is scheduled, and has capacity
      const { data: newSession, error: newSessionErr } = await supabase
        .from("tu_class_sessions")
        .select("id, session_date, start_time, teacher, capacity, enrolled, status, definition_id")
        .eq("id", newSessionId)
        .single();

      if (newSessionErr || !newSession) {
        return NextResponse.json(
          { error: "Sesion destino no encontrada" },
          { status: 404 },
        );
      }

      if (newSession.status !== "scheduled") {
        return NextResponse.json(
          { error: "La sesion destino no esta disponible (estado: " + newSession.status + ")" },
          { status: 400 },
        );
      }

      if ((newSession.enrolled || 0) >= newSession.capacity) {
        return NextResponse.json(
          { error: "La sesion destino esta llena (" + newSession.enrolled + "/" + newSession.capacity + ")" },
          { status: 400 },
        );
      }

      // Check for duplicate booking (same student, same new session)
      const { data: existingBooking } = await supabase
        .from("tu_class_bookings")
        .select("id")
        .eq("student_id", booking.student_id)
        .eq("session_id", newSessionId)
        .neq("status", "cancelled")
        .maybeSingle();

      if (existingBooking) {
        return NextResponse.json(
          { error: "El alumno ya tiene una reserva en esa sesion" },
          { status: 409 },
        );
      }

      // 1. Update booking's session_id
      const { error: updateErr } = await supabase
        .from("tu_class_bookings")
        .update({ session_id: newSessionId })
        .eq("id", booking_id)
        .eq("status", "confirmed"); // atomic guard

      if (updateErr) {
        console.error("[admin/check-in reschedule] update booking:", updateErr.message);
        return NextResponse.json({ error: "Error al reagendar" }, { status: 500 });
      }

      // 2. Decrement old session enrolled (with optimistic lock)
      const { data: oldSession } = await supabase
        .from("tu_class_sessions")
        .select("enrolled")
        .eq("id", booking.session_id)
        .single();

      if (oldSession && (oldSession.enrolled || 0) > 0) {
        await supabase
          .from("tu_class_sessions")
          .update({ enrolled: (oldSession.enrolled || 1) - 1 })
          .eq("id", booking.session_id)
          .eq("enrolled", oldSession.enrolled || 0);
      }

      // 3. Increment new session enrolled (with optimistic lock)
      await supabase
        .from("tu_class_sessions")
        .update({ enrolled: (newSession.enrolled || 0) + 1 })
        .eq("id", newSessionId)
        .eq("enrolled", newSession.enrolled || 0);

      // 3b. Update locked_session_id for 2x1 packs
      if (booking.pack_id) {
        const { data: reschPack } = await supabase
          .from("tu_packs")
          .select("pack_type, locked_session_id")
          .eq("id", booking.pack_id)
          .single();

        if (reschPack?.pack_type?.toUpperCase().includes("2X1") && reschPack.locked_session_id === booking.session_id) {
          await supabase
            .from("tu_packs")
            .update({ locked_session_id: newSessionId })
            .eq("id", booking.pack_id);
        }
      }

      // 4. Telegram notification
      try {
        const { data: studentInfo } = await supabase
          .from("tu_students")
          .select("full_name")
          .eq("id", booking.student_id)
          .single();

        const { data: oldSessionInfo } = await supabase
          .from("tu_class_sessions")
          .select("session_date, start_time, definition:definition_id(name)")
          .eq("id", booking.session_id)
          .single();

        const oldDef = oldSessionInfo?.definition as unknown as { name: string } | { name: string }[] | null;
        const oldClassName = (Array.isArray(oldDef) ? oldDef[0]?.name : oldDef?.name) || "Clase";

        const { data: newDef } = await supabase
          .from("tu_class_definitions")
          .select("name")
          .eq("id", newSession.definition_id)
          .single();

        const newClassName = newDef?.name || "Clase";

        await sendTelegramMessage(
          `🔄 <b>RESERVA REAGENDADA</b>\n\n` +
          `<b>Alumno:</b> ${studentInfo?.full_name || "Desconocido"}\n` +
          `<b>De:</b> ${oldClassName} — ${oldSessionInfo?.session_date || "?"} ${oldSessionInfo?.start_time?.slice(0, 5) || ""}\n` +
          `<b>A:</b> ${newClassName} — ${newSession.session_date} ${newSession.start_time?.slice(0, 5) || ""}`,
        );
      } catch {}

      return NextResponse.json({ message: "Reserva reagendada exitosamente" });
    }

    case "transfer": {
      const newStudentId = (body as { new_student_id?: string }).new_student_id;
      if (!newStudentId) {
        return NextResponse.json(
          { error: "new_student_id es requerido para transferir" },
          { status: 400 },
        );
      }

      // Only confirmed, non-checked-in bookings can be transferred
      if (booking.status !== "confirmed") {
        return NextResponse.json(
          { error: "Solo se pueden transferir reservas confirmadas" },
          { status: 400 },
        );
      }
      if (booking.checked_in) {
        return NextResponse.json(
          { error: "No se puede transferir una reserva con check-in" },
          { status: 400 },
        );
      }

      // Can't transfer to the same student
      if (newStudentId === booking.student_id) {
        return NextResponse.json(
          { error: "La reserva ya pertenece a este alumno" },
          { status: 400 },
        );
      }

      // Verify new student exists
      const { data: newStudent, error: newStudentErr } = await supabase
        .from("tu_students")
        .select("id, full_name")
        .eq("id", newStudentId)
        .single();

      if (newStudentErr || !newStudent) {
        return NextResponse.json(
          { error: "Alumno destino no encontrado" },
          { status: 404 },
        );
      }

      // Check for duplicate booking (new student already in same session)
      const { data: duplicateBooking } = await supabase
        .from("tu_class_bookings")
        .select("id")
        .eq("student_id", newStudentId)
        .eq("session_id", booking.session_id)
        .neq("status", "cancelled")
        .maybeSingle();

      if (duplicateBooking) {
        return NextResponse.json(
          { error: "El alumno destino ya tiene una reserva en esta sesion" },
          { status: 409 },
        );
      }

      // Update booking's student_id
      const { error: updateErr } = await supabase
        .from("tu_class_bookings")
        .update({ student_id: newStudentId })
        .eq("id", booking_id)
        .eq("status", "confirmed"); // atomic guard

      if (updateErr) {
        console.error("[admin/check-in transfer] update booking:", updateErr.message);
        return NextResponse.json({ error: "Error al transferir" }, { status: 500 });
      }

      // Telegram notification
      try {
        const { data: oldStudent } = await supabase
          .from("tu_students")
          .select("full_name")
          .eq("id", booking.student_id)
          .single();

        const { data: sessionInfo } = await supabase
          .from("tu_class_sessions")
          .select("session_date, start_time, definition:definition_id(name)")
          .eq("id", booking.session_id)
          .single();

        const def = sessionInfo?.definition as unknown as { name: string } | { name: string }[] | null;
        const className = (Array.isArray(def) ? def[0]?.name : def?.name) || "Clase";

        await sendTelegramMessage(
          `🔀 <b>RESERVA TRANSFERIDA</b>\n\n` +
          `<b>De:</b> ${oldStudent?.full_name || "Desconocido"}\n` +
          `<b>A:</b> ${newStudent.full_name}\n` +
          `<b>Clase:</b> ${className} — ${sessionInfo?.session_date || "?"} ${sessionInfo?.start_time?.slice(0, 5) || ""}`,
        );
      } catch {}

      return NextResponse.json({ message: "Reserva transferida exitosamente" });
    }
  }
}
