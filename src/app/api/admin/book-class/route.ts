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
 * Admin books a class on behalf of a student using the same
 * tu_book_class atomic function that the student portal uses.
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

  // Call the same atomic booking function
  const { data, error } = await supabase.rpc("tu_book_class", {
    p_student_id: student_id,
    p_session_id: session_id,
    p_pack_id: pack_id || null,
  });

  if (error) {
    console.error("[admin/book-class]", error.message);
    return NextResponse.json(
      { error: "Booking failed: " + error.message },
      { status: 500 },
    );
  }

  const result = data as Record<string, unknown>;

  if (result.error) {
    return NextResponse.json(
      { error: result.error as string },
      { status: 400 },
    );
  }

  // Fire-and-forget notification
  try {
    const [sessionRes, studentRes] = await Promise.all([
      supabase
        .from("tu_class_sessions")
        .select("start_time, teacher, definition:tu_class_definitions(name, name_es)")
        .eq("id", session_id)
        .single<{
          start_time: string;
          teacher: string;
          definition: { name: string; name_es: string } | null;
        }>(),
      supabase
        .from("tu_students")
        .select("full_name, email")
        .eq("id", student_id)
        .single<{ full_name: string; email: string | null }>(),
    ]);

    const packRes = pack_id
      ? await supabase
          .from("tu_packs")
          .select("pack_type, total_classes, classes_used")
          .eq("id", pack_id)
          .single<{ pack_type: string; total_classes: number; classes_used: number }>()
      : null;

    await notifyClassBooking({
      studentName: studentRes.data?.full_name ?? "Alumno",
      studentEmail: studentRes.data?.email ?? undefined,
      className:
        sessionRes.data?.definition?.name_es ??
        sessionRes.data?.definition?.name ??
        "Clase",
      classDate: String(result.session_date ?? ""),
      classTime: sessionRes.data?.start_time ?? "",
      teacher: sessionRes.data?.teacher ?? "Tata",
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
        booking_id: result.booking_id,
        session_date: result.session_date,
        start_time: result.start_time,
      },
      message: "Class booked successfully (admin)",
    },
    { status: 201 },
  );
}
