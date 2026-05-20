import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { systemLog } from "@/lib/system-log";

/**
 * GET /api/student/packs
 * Returns the current student's packs (active, expired, exhausted).
 *
 * Query params:
 *   status — filter by pack status (active, expired, exhausted, cancelled)
 *            defaults to "active" if not specified
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
    const statusFilter = searchParams.get("status") || "active";

    let query = supabase
      .from("tu_packs")
      .select("*")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: packs, error } = await query;

    if (error) {
      systemLog({ category: "error", level: "error", message: "Student packs query failed", route: "student/packs", student_id: student.id, details: { error: error.message, code: error.code, status_filter: statusFilter } });
      console.error("[student/packs]", error.message);
      return NextResponse.json(
        { error: "Failed to fetch packs" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: packs || [],
      total: (packs || []).length,
    });
  } catch (error) {
    console.error("[student/packs]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
