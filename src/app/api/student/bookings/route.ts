import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getColombiaToday } from "@/lib/timezone";

/**
 * GET /api/student/bookings
 * Returns the current student's bookings with session and class details.
 *
 * Query params:
 *   status  — filter by booking status (confirmed, cancelled, no_show)
 *   upcoming — if "true", only future sessions (default: true)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = request.nextUrl;
    const statusFilter = searchParams.get("status");
    const upcoming = searchParams.get("upcoming") !== "false";

    let query = supabase
      .from("tu_class_bookings")
      .select(
        `
        id,
        status,
        checked_in,
        checked_in_at,
        cancelled_at,
        cancel_reason,
        created_at,
        pack_id,
        session:tu_class_sessions (
          id,
          session_date,
          start_time,
          teacher,
          capacity,
          enrolled,
          status,
          definition:tu_class_definitions (
            name,
            name_es,
            style,
            level,
            duration_minutes,
            price_cop,
            price_usd,
            location
          )
        )
      `,
      )
      .eq("student_id", student.id)
      .order("created_at", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("[student/bookings]", error.message);
      return NextResponse.json(
        { error: "Failed to fetch bookings" },
        { status: 500 },
      );
    }

    // Filter to upcoming sessions if requested
    type BookingRow = Record<string, unknown>;
    let filtered: BookingRow[] = (bookings as BookingRow[]) || [];
    if (upcoming) {
      const today = getColombiaToday();
      filtered = filtered.filter((b) => {
        const session = b.session as { session_date: string } | null;
        return session && session.session_date >= today;
      });
    }

    return NextResponse.json({
      data: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("[student/bookings]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
