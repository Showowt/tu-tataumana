import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let _cache: { data: unknown; ts: number } | null = null;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

/**
 * GET /api/public/pricing
 * Returns active pricing cards sorted by sort_order.
 * Cached for 5 minutes.
 */
export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  }

  const supabase = getSupabase();

  const { data: cards, error } = await supabase
    .from("tu_pricing_cards")
    .select("id, label, label_es, subtitle_en, subtitle_es, price_cop, price_usd, pack_type, highlight, category, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[public/pricing]", error.message);
    return NextResponse.json({ cards: [] }, { status: 500 });
  }

  const result = { cards: cards || [] };
  _cache = { data: result, ts: Date.now() };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
