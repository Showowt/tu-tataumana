import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { z } from "zod";
import { notifyNextOnWaitlist } from "@/app/api/student/waitlist/route";

const CancelSchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID"),
  reason: z.string().max(500).optional().nullable(),
});

/**
 * POST /api/student/cancel
 * Cancels a class booking for the authenticated student.
 * Uses the tu_cancel_booking database function for atomic transaction.
 * Enforces 24-hour cancellation window.
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
    const parsed = CancelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    // Call atomic cancel function
    const { data, error } = await supabase.rpc("tu_cancel_booking", {
      p_booking_id: parsed.data.booking_id,
      p_student_id: student.id,
      p_reason: parsed.data.reason || null,
    });

    if (error) {
      console.error("[student/cancel]", error.message);
      return NextResponse.json(
        { error: "Cancellation failed: " + error.message },
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

    // Notify waitlisted students that a spot opened
    if (result.session_id) {
      notifyNextOnWaitlist(result.session_id as string).catch(() => {});
    } else {
      // Fallback: look up session_id from the booking
      const { data: booking } = await supabase
        .from("tu_bookings")
        .select("session_id")
        .eq("id", parsed.data.booking_id)
        .single();
      if (booking?.session_id) {
        notifyNextOnWaitlist(booking.session_id).catch(() => {});
      }
    }

    return NextResponse.json({
      data: { refunded_credit: result.refunded_credit },
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("[student/cancel]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
