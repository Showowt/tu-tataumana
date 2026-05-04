import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/lib/admin-auth";

/**
 * GET /api/admin/dashboard
 * Admin dashboard stats: today's classes, revenue, student counts, etc.
 *
 * Query params:
 *   date — specific date (default: today)
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  const date =
    request.nextUrl.searchParams.get("date") ||
    new Date().toISOString().split("T")[0];

  // Today's sessions
  const { data: todaySessions } = await supabase
    .from("tu_class_sessions")
    .select(
      `
      id, session_date, start_time, teacher, capacity, enrolled, status,
      definition:tu_class_definitions (name, name_es, style)
    `,
    )
    .eq("session_date", date)
    .order("start_time", { ascending: true });

  // Today's bookings count
  const { data: todayBookings } = await supabase
    .from("tu_class_bookings")
    .select("id, status, checked_in, session_id")
    .in(
      "session_id",
      (todaySessions || []).map((s: { id: string }) => s.id),
    );

  // Active students count
  const { count: totalStudents } = await supabase
    .from("tu_students")
    .select("id", { count: "exact", head: true });

  // Active packs count
  const { count: activePacks } = await supabase
    .from("tu_packs")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  // This week's revenue (from transactions)
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const { data: weekTransactions } = await supabase
    .from("tu_transactions")
    .select("amount, currency, status")
    .gte("created_at", weekStart.toISOString())
    .lte("created_at", weekEnd.toISOString())
    .eq("status", "approved");

  const weekRevenueCop = (weekTransactions || [])
    .filter((t: { currency: string }) => t.currency === "COP")
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  // Upcoming events
  const { data: upcomingEvents } = await supabase
    .from("tu_events")
    .select("id, title, title_es, event_date, start_time, capacity, enrolled, status")
    .gte("event_date", date)
    .eq("is_active", true)
    .order("event_date", { ascending: true })
    .limit(5);

  const confirmedToday = (todayBookings || []).filter(
    (b: { status: string }) => b.status === "confirmed",
  ).length;

  const checkedInToday = (todayBookings || []).filter(
    (b: { checked_in: boolean }) => b.checked_in === true,
  ).length;

  return NextResponse.json({
    date,
    today: {
      sessions: todaySessions || [],
      total_sessions: (todaySessions || []).length,
      confirmed_bookings: confirmedToday,
      checked_in: checkedInToday,
      total_capacity: (todaySessions || []).reduce(
        (sum: number, s: { capacity: number }) => sum + s.capacity,
        0,
      ),
      total_enrolled: (todaySessions || []).reduce(
        (sum: number, s: { enrolled: number }) => sum + s.enrolled,
        0,
      ),
    },
    overview: {
      total_students: totalStudents || 0,
      active_packs: activePacks || 0,
      week_revenue_cop: weekRevenueCop,
    },
    upcoming_events: upcomingEvents || [],
  });
}
