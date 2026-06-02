import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { sendTelegramMessage } from "@/lib/telegram";
import { z } from "zod";

const CheckInSchema = z.object({
  booking_id: z.string().uuid(),
  action: z.enum(["check_in", "no_show", "undo_check_in", "cancel_refund"]),
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

      // 1. Cancel the booking
      const { error: cancelErr } = await supabase
        .from("tu_class_bookings")
        .update({
          status: "cancelled",
          checked_in: false,
          checked_in_at: null,
          cancelled_at: new Date().toISOString(),
          cancel_reason: "Cancelada por admin (credito devuelto)",
        })
        .eq("id", booking_id);

      if (cancelErr) {
        console.error("[admin/check-in] cancel_refund booking update:", cancelErr.message);
        return NextResponse.json({ error: "Error cancelando reserva" }, { status: 500 });
      }

      // 2. Remove attendance record if checked in
      if (booking.checked_in) {
        await supabase
          .from("tu_attendance")
          .delete()
          .eq("booking_id", booking_id);
      }

      // 3. Decrement session enrolled count
      const { data: session } = await supabase
        .from("tu_class_sessions")
        .select("enrolled")
        .eq("id", booking.session_id)
        .single();

      if (session && (session.enrolled || 0) > 0) {
        await supabase
          .from("tu_class_sessions")
          .update({ enrolled: (session.enrolled || 1) - 1 })
          .eq("id", booking.session_id);
      }

      // 4. Refund pack credit if booking had a pack
      let creditRefunded = false;
      if (booking.pack_id) {
        const { data: pack } = await supabase
          .from("tu_packs")
          .select("id, classes_used, total_classes, status")
          .eq("id", booking.pack_id)
          .single();

        if (pack && (pack.classes_used || 0) > 0) {
          const newUsed = (pack.classes_used || 1) - 1;
          const newStatus =
            pack.total_classes === -1
              ? "active"
              : newUsed < pack.total_classes
                ? "active"
                : "exhausted";

          await supabase
            .from("tu_packs")
            .update({ classes_used: newUsed, status: newStatus })
            .eq("id", pack.id);

          creditRefunded = true;
        }
      }

      // 5. Get student info for Telegram notification
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

        await sendTelegramMessage(
          `🔄 <b>RESERVA CANCELADA + CREDITO DEVUELTO</b>\n\n<b>Alumno:</b> ${studentInfo?.full_name || "Desconocido"}\n<b>Clase:</b> ${className}\n<b>Fecha:</b> ${sessionDate}\n<b>Credito:</b> ${creditRefunded ? "Devuelto ✅" : "Sin pack asociado"}`,
        );
      } catch {}

      return NextResponse.json({
        message: creditRefunded
          ? "Reserva cancelada y credito devuelto"
          : "Reserva cancelada (sin pack para reembolsar)",
        credit_refunded: creditRefunded,
      });
    }
  }
}
