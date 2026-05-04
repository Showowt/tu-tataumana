import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { z } from "zod";

const BookSchema = z.object({
  session_id: z.string().uuid("Invalid session ID"),
  pack_id: z.string().uuid("Invalid pack ID").optional().nullable(),
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

    // Call atomic booking function
    const { data, error } = await supabase.rpc("tu_book_class", {
      p_student_id: student.id,
      p_session_id: parsed.data.session_id,
      p_pack_id: parsed.data.pack_id || null,
    });

    if (error) {
      console.error("[student/book]", error.message);
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
    console.error("[student/book]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
