import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import { notifyClassBooking } from "@/lib/telegram";
import { captureApiError } from "@/lib/sentry-helpers";
import { systemLog } from "@/lib/system-log";

const BookClassSchema = z.object({
  student_id: z.string().uuid(),
  session_id: z.string().uuid(),
  pack_id: z.string().uuid().optional().nullable(),
  // For 2x1 promos: deduct credit from a DIFFERENT student's pack
  credit_from_student_id: z.string().uuid().optional().nullable(),
  // For partner accounts: guest name per booking
  guest_name: z.string().max(100).optional().nullable(),
});

/**
 * POST /api/admin/book-class
 * Admin books a class on behalf of a student.
 * BYPASSES booking cutoff and max-booking limits.
 * Admin can book students even minutes before class.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;
  const body = await request.json();
  const parsed = BookClassSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { student_id, session_id, pack_id, credit_from_student_id, guest_name } = parsed.data;

  // If the booking insert fails after we've deducted a pack credit, we roll the
  // credit back so it isn't silently lost.
  let creditDeducted: { packId: string; prevUsed: number } | null = null;

  // 1. Verify session exists and isn't cancelled
  const { data: session, error: sessErr } = await supabase
    .from("tu_class_sessions")
    .select("id, session_date, start_time, capacity, enrolled, status, teacher, definition:tu_class_definitions(name, name_es)")
    .eq("id", session_id)
    .single();

  if (sessErr || !session) {
    return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });
  }

  if (session.status === "cancelled") {
    return NextResponse.json({ error: "Esta sesion fue cancelada" }, { status: 400 });
  }

  // 1b. Check if student is a partner account (can book same class multiple times)
  const { data: student } = await supabase
    .from("tu_students")
    .select("is_partner")
    .eq("id", student_id)
    .single();

  const isPartner = student?.is_partner === true;

  // 2. Check for duplicate booking (skip for partner accounts)
  if (!isPartner) {
    const { data: existingBooking } = await supabase
      .from("tu_class_bookings")
      .select("id")
      .eq("student_id", student_id)
      .eq("session_id", session_id)
      .neq("status", "cancelled")
      .single();

    if (existingBooking) {
      return NextResponse.json({ error: "El alumno ya tiene reserva para esta clase" }, { status: 409 });
    }
  }

  // 3. Check capacity (admin can still override if needed, but warn)
  const isFull = (session.enrolled || 0) >= (session.capacity || 12);

  // 4. Deduct pack credit if pack provided
  if (pack_id) {
    // Verify pack ownership: must belong to the student being booked (or credit_from_student_id)
    const packOwnerId = credit_from_student_id || student_id;
    const { data: pack } = await supabase
      .from("tu_packs")
      .select("id, total_classes, classes_used, status, student_id, pack_type, locked_session_id")
      .eq("id", pack_id)
      .single<{ id: string; total_classes: number; classes_used: number; status: string; student_id: string; pack_type: string; locked_session_id: string | null }>();

    if (!pack || pack.status !== "active") {
      return NextResponse.json({ error: "Pack no activo" }, { status: 400 });
    }

    if (pack.student_id !== packOwnerId) {
      return NextResponse.json({ error: "Pack no pertenece al alumno indicado" }, { status: 403 });
    }

    // 2x1 packs: all credits must go to the same session
    if (pack.pack_type.toUpperCase().includes("2X1")) {
      if (pack.locked_session_id && pack.locked_session_id !== session_id) {
        return NextResponse.json(
          { error: "Este pack 2x1 ya fue usado en otra clase. Los créditos 2x1 son para una sola clase." },
          { status: 400 },
        );
      }
      // Lock to this session on first use
      if (!pack.locked_session_id) {
        await supabase
          .from("tu_packs")
          .update({ locked_session_id: session_id })
          .eq("id", pack_id)
          .is("locked_session_id", null);
      }
    }

    // Deduct credit (unless unlimited) with optimistic lock
    if (pack.total_classes !== -1) {
      const remaining = pack.total_classes - (pack.classes_used || 0);
      if (remaining <= 0) {
        return NextResponse.json({ error: "Pack sin creditos disponibles" }, { status: 400 });
      }

      const newUsed = (pack.classes_used || 0) + 1;
      const { data: updatedPack, error: packErr } = await supabase
        .from("tu_packs")
        .update({
          classes_used: newUsed,
          status: newUsed >= pack.total_classes ? "exhausted" : "active",
        })
        .eq("id", pack_id)
        .eq("classes_used", pack.classes_used || 0)
        .select("id")
        .single();

      if (packErr || !updatedPack) {
        return NextResponse.json({ error: "Conflicto al deducir credito — intenta de nuevo" }, { status: 409 });
      }
      creditDeducted = { packId: pack_id, prevUsed: pack.classes_used || 0 };
    }
  }

  // 5. Resolve guest name for partner accounts.
  // Partners (e.g. hotels) book the same class multiple times — one row per guest.
  // The DB uniqueness index is (session_id, student_id, COALESCE(guest_name,'')),
  // so every partner booking needs a DISTINCT guest_name or it collides. When no
  // name is given we auto-number the guest so anonymous multi-bookings still work.
  let finalGuestName: string | null = null;
  if (isPartner) {
    const typed = guest_name?.trim();
    if (typed) {
      finalGuestName = typed;
    } else {
      const { count } = await supabase
        .from("tu_class_bookings")
        .select("id", { count: "exact", head: true })
        .eq("student_id", student_id)
        .eq("session_id", session_id)
        .neq("status", "cancelled");
      finalGuestName = `Invitado ${(count || 0) + 1}`;
    }
  }

  // 6. Create booking (NO cutoff check — admin override)
  const { data: booking, error: bookErr } = await supabase
    .from("tu_class_bookings")
    .insert({
      student_id,
      session_id,
      pack_id: pack_id || null,
      status: "confirmed",
      checked_in: false,
      ...(finalGuestName ? { guest_name: finalGuestName } : {}),
    })
    .select("id")
    .single();

  if (bookErr) {
    // Give the just-deducted credit back before returning.
    if (creditDeducted) {
      await supabase
        .from("tu_packs")
        .update({ classes_used: creditDeducted.prevUsed, status: "active" })
        .eq("id", creditDeducted.packId);
    }

    const isDuplicate =
      bookErr.code === "23505" ||
      /duplicate key|idx_active_booking_unique/i.test(bookErr.message);

    systemLog({ category: "booking", level: "error", message: "Admin booking insert failed", route: "admin/book-class", details: { error: bookErr.message, code: bookErr.code, student_id, session_id, pack_id, guest_name: finalGuestName } });
    console.error("[admin/book-class]", bookErr.message);

    if (isDuplicate) {
      return NextResponse.json(
        {
          error: isPartner
            ? "Ya existe una reserva con ese nombre de invitado para esta clase. Usa un nombre distinto."
            : "El alumno ya tiene reserva para esta clase.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "No se pudo crear la reserva. Intenta de nuevo." },
      { status: 500 },
    );
  }

  // 7. Increment enrolled count atomically (SQL enrolled = enrolled + 1 — no
  //    read-modify-write race that would silently drop the increment under contention).
  const { error: adjErr } = await supabase.rpc("tu_adjust_enrolled", { p_session_id: session_id, p_delta: 1 });
  if (adjErr) console.error("[admin/book-class] tu_adjust_enrolled failed:", adjErr.message);

  // 8. Fire-and-forget notification
  try {
    const { data: studentData } = await supabase
      .from("tu_students")
      .select("full_name, email")
      .eq("id", student_id)
      .single();

    const packRes = pack_id
      ? await supabase
          .from("tu_packs")
          .select("pack_type, total_classes, classes_used")
          .eq("id", pack_id)
          .single()
      : null;

    const def = (Array.isArray(session.definition) ? session.definition[0] : session.definition) as { name: string; name_es: string } | null;

    await notifyClassBooking({
      studentName: studentData?.full_name ?? "Alumno",
      studentEmail: studentData?.email ?? undefined,
      className: def?.name_es ?? def?.name ?? "Clase",
      classDate: session.session_date,
      classTime: session.start_time,
      teacher: session.teacher ?? "Tata",
      packType: packRes?.data?.pack_type ?? "admin",
      creditsRemaining: packRes?.data
        ? packRes.data.total_classes - (packRes.data.classes_used ?? 0)
        : -1,
    });
  } catch (notifyErr) {
    console.error("[admin/book-class] notification failed:", notifyErr);
  }

  systemLog({ category: "booking", level: "info", message: "Admin booking created", route: "admin/book-class", details: { booking_id: booking?.id, student_id, session_id, pack_id, was_full: isFull } });

  return NextResponse.json(
    {
      data: {
        booking_id: booking?.id,
        session_date: session.session_date,
        start_time: session.start_time,
        was_full: isFull,
      },
      message: isFull
        ? "Reservado (clase estaba llena — override admin)"
        : "Reservado exitosamente",
    },
    { status: 201 },
  );
}
