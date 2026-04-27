import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const ADMIN_KEY = process.env.TU_ADMIN_KEY || "tata2026";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// GET — public, returns all closed dates
export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ data: [] });
    }

    const { data, error } = await supabase
      .from("tu_closed_dates")
      .select("date, reason")
      .gte("date", new Date().toISOString().split("T")[0])
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

// POST — admin only, add a closed date
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, reason, adminKey } = body;

    if (adminKey !== ADMIN_KEY) return unauthorized();
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

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

// DELETE — admin only, reopen a date
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { date, adminKey } = body;

    if (adminKey !== ADMIN_KEY) return unauthorized();
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

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
