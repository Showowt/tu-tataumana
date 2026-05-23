import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/bookings
 *
 * Fetches bookings with full student + session + class details.
 * Supports filters: status, date range, search (student name).
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;
  const params = request.nextUrl.searchParams;

  const status = params.get("status"); // confirmed, no_show, cancelled, checked_in
  const dateFrom = params.get("from"); // YYYY-MM-DD
  const dateTo = params.get("to"); // YYYY-MM-DD
  const search = params.get("search"); // student name
  const limit = Math.min(Number(params.get("limit") || 200), 500);

  // Build query with joins
  let query = supabase
    .from("tu_class_bookings")
    .select(
      `
      id,
      status,
      checked_in,
      checked_in_at,
      pack_id,
      cancel_reason,
      cancelled_at,
      created_at,
      student:tu_students!student_id (
        id,
        full_name,
        email,
        phone
      ),
      session:tu_class_sessions!session_id (
        id,
        session_date,
        start_time,
        teacher,
        capacity,
        enrolled,
        status,
        definition:tu_class_definitions!definition_id (
          name,
          name_es,
          style
        )
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  // Status filter
  if (status === "checked_in") {
    query = query.eq("checked_in", true);
  } else if (status && status !== "all") {
    query = query.eq("status", status);
  }

  // Date range filter (filter by session date via inner join)
  // We filter by created_at since session_date is on the joined table
  if (dateFrom) {
    query = query.gte("created_at", `${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    query = query.lte("created_at", `${dateTo}T23:59:59`);
  }

  const { data: bookings, error } = await query;

  if (error) {
    console.error("[admin/bookings] Query failed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }

  // Server-side search filter (student name) since Supabase can't filter on joined columns easily
  let filtered = bookings || [];

  if (search && search.trim().length > 0) {
    const term = search.toLowerCase().trim();
    filtered = filtered.filter((b) => {
      const student = b.student as { full_name?: string; email?: string } | null;
      const name = student?.full_name?.toLowerCase() || "";
      const email = student?.email?.toLowerCase() || "";
      return name.includes(term) || email.includes(term);
    });
  }

  // Also filter by session_date if dateFrom/dateTo provided (more accurate than created_at)
  if (dateFrom || dateTo) {
    filtered = filtered.filter((b) => {
      const session = b.session as { session_date?: string } | null;
      const sessionDate = session?.session_date;
      if (!sessionDate) return true;
      if (dateFrom && sessionDate < dateFrom) return false;
      if (dateTo && sessionDate > dateTo) return false;
      return true;
    });
  }

  // Stats
  const stats = {
    total: filtered.length,
    confirmed: filtered.filter((b) => b.status === "confirmed" && !b.checked_in).length,
    checked_in: filtered.filter((b) => b.checked_in).length,
    no_show: filtered.filter((b) => b.status === "no_show").length,
    cancelled: filtered.filter((b) => b.status === "cancelled").length,
  };

  return NextResponse.json({ data: filtered, stats });
}
