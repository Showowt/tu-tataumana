import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/lib/admin-auth";
import { getColombiaToday } from "@/lib/timezone";

/**
 * GET /api/admin/closed-dates
 * Returns all future closed dates. Public read.
 */
export async function GET() {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("tu_closed_dates")
      .select("date, reason")
      .gte("date", getColombiaToday())
      .order("date", { ascending: true });

    if (error) {
      console.error("[API/closed-dates] GET", error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error("[API/closed-dates] GET", err);
    return NextResponse.json({ data: [] });
  }
}

/**
 * POST /api/admin/closed-dates
 * Close a date. Admin only.
 * Body: { date: string, reason?: string }
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, reason } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("tu_closed_dates")
      .upsert({ date, reason: reason || null }, { onConflict: "date" })
      .select()
      .single();

    if (error) {
      console.error("[API/closed-dates] POST", error);
      return NextResponse.json({ error: "Failed to close date" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[API/closed-dates] POST", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/closed-dates
 * Reopen a date. Admin only.
 * Body: { date: string }
 */
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { error } = await supabase
      .from("tu_closed_dates")
      .delete()
      .eq("date", date);

    if (error) {
      console.error("[API/closed-dates] DELETE", error);
      return NextResponse.json({ error: "Failed to reopen date" }, { status: 500 });
    }

    return NextResponse.json({ message: "Date reopened" });
  } catch (err) {
    console.error("[API/closed-dates] DELETE", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
