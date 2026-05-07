import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/events
 * Public endpoint — returns upcoming active events for the homepage.
 * No authentication required.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ data: [] });
  }

  const supabase = createClient(url, key);
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("tu_events")
    .select("*")
    .eq("is_active", true)
    .eq("status", "upcoming")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(6);

  if (error) {
    console.error("[api/events]", error.message);
    return NextResponse.json({ data: [] });
  }

  return NextResponse.json({ data: data || [] });
}
