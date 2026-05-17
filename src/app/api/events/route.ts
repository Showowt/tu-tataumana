import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/events
 * Public endpoint — returns upcoming active events.
 * Query params:
 *   homepage=true — only return events flagged for homepage display
 */
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ data: [] });
  }

  const supabase = createClient(url, key);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const homepage = request.nextUrl.searchParams.get("homepage");

  let query = supabase
    .from("tu_events")
    .select("*")
    .eq("is_active", true)
    .eq("status", "upcoming")
    .gte("event_date", today)
    .order("display_order", { ascending: true })
    .order("event_date", { ascending: true })
    .limit(6);

  if (homepage === "true") {
    query = query.eq("show_on_homepage", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[api/events]", error.message);
    return NextResponse.json({ data: [] });
  }

  return NextResponse.json({ data: data || [] });
}
