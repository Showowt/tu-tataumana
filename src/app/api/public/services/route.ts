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
    .from("tu_services")
    .select("id, name_en, name_es, description_en, description_es, price_cop, price_usd, duration, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[public/services]", error.message);
    return NextResponse.json({ data: [] }, { status: 500 });
  }

  const result = { data: data || [] };
  _cache = { data: result, ts: Date.now() };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
