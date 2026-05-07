/**
 * Admin Payments API
 * TU. by Tata Umana — WellnessOS v1.0
 *
 * GET /api/admin/payments
 * Returns all transactions with student info joined.
 * Optional ?status=pending|approved|declined|voided|error filter.
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
  const status = searchParams.get("status");

  let query = supabase
    .from("tu_transactions")
    .select(
      `
      *,
      student:tu_students (id, full_name, email)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin/payments GET]", error.message);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data || [] });
}
