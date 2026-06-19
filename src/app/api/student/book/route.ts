import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { z } from "zod";
import { notifyClassBooking } from "@/lib/telegram";
import { captureApiError } from "@/lib/sentry-helpers";
import { systemLog } from "@/lib/system-log";

const BookSchema = z.object({
  session_id: z.string().uuid("Invalid session ID"),
  pack_id: z.string().uuid("Invalid pack ID").optional().nullable(),
  guest_name: z.string().min(2).optional(), // For 2x1 packs: guest's name
});

/**
 * POST /api/student/book
 * Books a class session for the authenticated student.
 * Uses the tu_book_class database function for atomic transaction.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get student ID
    const { data: student } = await supabase
      .from("tu_students")
      .select("id")
      .eq("auth_id", user.id)
      .single<{ id: string }>();

    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 },
      );
    }

    // Validate input
    const body = await request.json();
    const parsed = BookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { guest_name } = parsed.data;

    // If a 2x1 pack is being used, guest_name is REQUIRED
    // 2x1 means "two people, one class" — not two separate bookings
    if (parsed.data.pack_id) {
      const { data: packCheck } = await supabase
        .from("tu_packs")
        .select("pack_type, classes_remaining, total_classes, classes_used")
        .eq("id", parsed.data.pack_id)
        .single<{ pack_type: string; classes_remaining: number; total_classes: number; classes_used: number }>();

      if (packCheck && packCheck.pack_type.toUpperCase().includes("2X1")) {
        const remaining = packCheck.total_classes - packCheck.classes_used;
        if (remaining >= 2 && !guest_name) {
          return NextResponse.json(
            { error: "El pack 2x1 requiere el nombre de tu acompañante para reservar." },
            { status: 400 },
          );
        }
        // If only 1 credit left on a 2x1, it means the guest was already booked
        // but the primary wasn't — this shouldn't happen, so block it
        if (remaining < 2 && remaining > 0) {
          return NextResponse.json(
            { error: "Este pack 2x1 ya fue utilizado. Los créditos 2x1 se usan juntos en una sola clase." },
            { status: 400 },
          );
        }
      }
    }

    // Detect 2x1 pack: if guest_name provided, handle dual booking
    const is2x1 = !!guest_name && parsed.data.pack_id;

    // Call atomic booking function for the primary student
    const { data, error } = await supabase.rpc("tu_book_class", {
      p_student_id: student.id,
      p_session_id: parsed.data.session_id,
      p_pack_id: parsed.data.pack_id || null,
    });

    if (error) {
      captureApiError("student/book", error, { student_id: student.id, session_id: parsed.data.session_id });
      systemLog({ category: "booking", level: "error", message: "Student booking RPC failed", route: "student/book", student_id: student.id, details: { error: error.message, session_id: parsed.data.session_id, pack_id: parsed.data.pack_id } });
      console.error("[student/book]", error.message);
      return NextResponse.json(
        { error: "Booking failed: " + error.message },
        { status: 500 },
      );
    }

    const result = data as Record<string, unknown>;

    if (result.error) {
      systemLog({ category: "booking", level: "warn", message: `Student booking rejected: ${result.error}`, route: "student/book", student_id: student.id, details: { reason: result.error, session_id: parsed.data.session_id, pack_id: parsed.data.pack_id } });
      return NextResponse.json(
        { error: result.error as string },
        { status: 400 },
      );
    }

    // 2x1: Book the guest into the same class using the second credit
    if (is2x1 && guest_name) {
      try {
        // Find or create guest student record
        const { data: existingGuest } = await supabase
          .from("tu_students")
          .select("id")
          .ilike("full_name", guest_name.trim())
          .limit(1)
          .maybeSingle();

        let guestId = existingGuest?.id;

        if (!guestId) {
          // Create a minimal guest student record
          const { data: newGuest } = await supabase
            .from("tu_students")
            .insert({
              full_name: guest_name.trim(),
              email: null,
              role: "student",
              notes: "Created via 2x1 promo booking",
            })
            .select("id")
            .single();
          guestId = newGuest?.id;
        }

        if (guestId) {
          // Book the guest (deducts second credit from same pack)
          await supabase.rpc("tu_book_class", {
            p_student_id: guestId,
            p_session_id: parsed.data.session_id,
            p_pack_id: parsed.data.pack_id,
          });

          systemLog({
            category: "booking",
            level: "info",
            message: "2x1 guest booked",
            route: "student/book",
            student_id: student.id,
            details: { guest_name, guest_id: guestId, session_id: parsed.data.session_id },
          });
        }
      } catch (guestErr) {
        console.error("[student/book] 2x1 guest booking failed:", guestErr);
        // Primary booking succeeded — don't fail the whole request
      }
    }

    // Fire-and-forget Telegram notification — never fails the booking
    try {
      const [sessionRes, studentRes] = await Promise.all([
        supabase
          .from("tu_class_sessions")
          .select(`
            start_time, teacher,
            definition:tu_class_definitions (name, name_es)
          `)
          .eq("id", parsed.data.session_id)
          .single<{
            start_time: string;
            teacher: string;
            definition: { name: string; name_es: string } | null;
          }>(),
        supabase
          .from("tu_students")
          .select("full_name, email")
          .eq("id", student.id)
          .single<{ full_name: string; email: string | null }>(),
      ]);

      const packRes = parsed.data.pack_id
        ? await supabase
            .from("tu_packs")
            .select("pack_type, total_classes, classes_used")
            .eq("id", parsed.data.pack_id)
            .single<{ pack_type: string; total_classes: number; classes_used: number }>()
        : null;

      const session = sessionRes.data;
      const studentData = studentRes.data;
      const pack = packRes?.data ?? null;

      await notifyClassBooking({
        studentName: studentData?.full_name ?? "Alumno",
        studentEmail: studentData?.email ?? undefined,
        className: session?.definition?.name_es ?? session?.definition?.name ?? "Clase",
        classDate: String(result.session_date ?? ""),
        classTime: session?.start_time ?? String(result.start_time ?? ""),
        teacher: session?.teacher ?? "Tata",
        packType: pack?.pack_type ?? "drop_in",
        creditsRemaining: pack
          ? pack.total_classes - (pack.classes_used ?? 0)
          : -1,
      });
    } catch (notifyErr) {
      console.error("[student/book] Telegram notification failed:", notifyErr);
    }

    systemLog({ category: "booking", level: "info", message: "Student booked class", route: "student/book", student_id: student.id, details: { booking_id: result.booking_id, session_id: parsed.data.session_id, pack_id: parsed.data.pack_id } });

    return NextResponse.json(
      {
        data: {
          booking_id: result.booking_id,
          session_date: result.session_date,
          start_time: result.start_time,
        },
        message: "Class booked successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    captureApiError("student/book", error);
    systemLog({ category: "booking", level: "error", message: "Student booking unexpected error", route: "student/book", details: { error: error instanceof Error ? error.message : String(error) } });
    console.error("[student/book]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
