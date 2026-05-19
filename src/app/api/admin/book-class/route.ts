import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import { notifyClassBooking } from "@/lib/telegram";

const BookClassSchema = z.object({
  student_id: z.string().uuid(),
  session_id: z.string().uuid(),
  pack_id: z.string().uuid().optional().nullable(),
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

  const { student_id, session_id, pack_id } = parsed.data;

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

  // 2. Check for duplicate booking
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

  // 3. Check capacity (admin can still override if needed, but warn)
  const isFull = (session.enrolled || 0) >= (session.capacity || 12);

  // 4. Deduct pack credit if pack provided
  if (pack_id) {
    const { data: pack } = await supabase
      .from("tu_packs")
      .select("id, total_classes, classes_used, status")
      .eq("id", pack_id)
      .single();

    if (!pack || pack.status !== "active") {
      return NextResponse.json({ error: "Pack no activo" }, { status: 400 });
    }

    // Deduct credit (unless unlimited)
    if (pack.total_classes !== -1) {
      const remaining = pack.total_classes - (pack.classes_used || 0);
      if (remaining <= 0) {
        return NextResponse.json({ error: "Pack sin creditos disponibles" }, { status: 400 });
      }

      await supabase
        .from("tu_packs")
        .update({
          classes_used: (pack.classes_used || 0) + 1,
          status: (pack.classes_used || 0) + 1 >= pack.total_classes ? "exhausted" : "active",
        })
        .eq("id", pack_id);
    }
  }

  // 5. Create booking (NO cutoff check — admin override)
  const { data: booking, error: bookErr } = await supabase
    .from("tu_class_bookings")
    .insert({
      student_id,
      session_id,
      pack_id: pack_id || null,
      status: "confirmed",
      checked_in: false,
    })
    .select("id")
    .single();

  if (bookErr) {
    console.error("[admin/book-class]", bookErr.message);
    return NextResponse.json(
      { error: "Error al crear reserva: " + bookErr.message },
      { status: 500 },
    );
  }

  // 6. Increment enrolled count on session
  await supabase
    .from("tu_class_sessions")
    .update({ enrolled: (session.enrolled || 0) + 1 })
    .eq("id", session_id);

  // 7. Fire-and-forget notification
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
