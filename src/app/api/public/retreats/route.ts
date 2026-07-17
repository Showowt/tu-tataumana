import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CACHE_TTL = 5 * 60 * 1000;
let _cache: { data: unknown; ts: number } | null = null;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  }

  const { data, error } = await getSupabase()
    .from("tu_retreats")
    .select("id, title_en, title_es, subtitle_en, subtitle_es, description_en, description_es, price_cop, price_usd, price_unit, capacity_en, capacity_es, includes_en, includes_es, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[public/retreats]", error.message);
    return NextResponse.json({ data: [] }, { status: 500 });
  }

  const result = { data: data || [] };
  _cache = { data: result, ts: Date.now() };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
