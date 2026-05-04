import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/lib/admin-auth";

/**
 * GET /api/admin/session-roster?session_id=xxx
 * Returns full roster for a specific class session.
 * Includes student details, check-in status, and pack info.
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id query parameter required" },
      { status: 400 },
    );
  }

  // Get session details
  const { data: session, error: sessError } = await supabase
    .from("tu_class_sessions")
    .select(
      `
      *,
      definition:tu_class_definitions (
        name, name_es, style, level, duration_minutes, price_cop, price_usd
      )
    `,
    )
    .eq("id", sessionId)
    .single();

  if (sessError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Get all bookings for this session with student details
  const { data: bookings, error: bookError } = await supabase
    .from("tu_class_bookings")
    .select(
      `
      id,
      status,
      checked_in,
      checked_in_at,
      cancelled_at,
      pack_id,
      created_at,
      student:tu_students (
        id, full_name, email, phone, notes
      )
    `,
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (bookError) {
    console.error("[admin/session-roster]", bookError.message);
    return NextResponse.json({ error: "Failed to fetch roster" }, { status: 500 });
  }

  return NextResponse.json({
    session,
    bookings: bookings || [],
    confirmed: (bookings || []).filter((b: Record<string, unknown>) => b.status === "confirmed").length,
    checked_in: (bookings || []).filter((b: Record<string, unknown>) => b.checked_in === true).length,
  });
}
