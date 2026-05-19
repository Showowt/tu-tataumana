/**
 * GET /api/admin/logs
 * Returns system logs for admin dashboard.
 * Query: ?category=error&level=error&limit=50&offset=0&search=payment
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;
  const { searchParams } = request.nextUrl;

  const category = searchParams.get("category");
  const level = searchParams.get("level");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");
  const search = searchParams.get("search");

  let query = supabase
    .from("tu_system_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);
  if (level) query = query.eq("level", level);
  if (search) query = query.ilike("message", `%${search}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error("[admin/logs]", error.message);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data || [], total: count || 0 });
}
