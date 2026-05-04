import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/**
 * GET /api/schedule
 * Public schedule — returns upcoming class sessions with definition details.
 *
 * Query params:
 *   from  — start date (YYYY-MM-DD), defaults to today
 *   to    — end date (YYYY-MM-DD), defaults to from + 7 days
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const today = new Date().toISOString().split("T")[0];
    const from = searchParams.get("from") || today;

    let to = searchParams.get("to");
    if (!to) {
      const d = new Date(from);
      d.setDate(d.getDate() + 7);
      to = d.toISOString().split("T")[0];
    }

    // Validate date range (max 30 days)
    const diff =
      (new Date(to).getTime() - new Date(from).getTime()) /
      (1000 * 60 * 60 * 24);
    if (diff > 30 || diff < 0) {
      return NextResponse.json(
        { error: "Date range must be 0-30 days" },
        { status: 400 },
      );
    }

    // Fetch sessions with joined definition data
    const { data: sessions, error } = await supabase
      .from("tu_class_sessions")
      .select(
        `
        id,
        session_date,
        start_time,
        teacher,
        capacity,
        enrolled,
        status,
        notes,
        definition:tu_class_definitions (
          id,
          name,
          name_es,
          description,
          description_es,
          style,
          level,
          duration_minutes,
          price_cop,
          price_usd,
          location
        )
      `,
      )
      .gte("session_date", from)
      .lte("session_date", to)
      .eq("status", "scheduled")
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("[schedule]", error.message);
      return NextResponse.json(
        { error: "Failed to fetch schedule" },
        { status: 500 },
      );
    }

    // Also fetch active class definitions for "full schedule" display
    const { data: definitions } = await supabase
      .from("tu_class_definitions")
      .select("*")
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    return NextResponse.json({
      sessions: sessions || [],
      definitions: definitions || [],
      from,
      to,
    });
  } catch (error) {
    console.error("[schedule]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
