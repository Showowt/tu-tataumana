import { createClient } from "@supabase/supabase-js";
import { getPackDefinition, type PackDefinition } from "@/lib/constants/packs";

/**
 * Resolve a pack definition by pack_type — DB pricing card first, code constant fallback.
 *
 * tu_pricing_cards is the admin-editable source of truth (label, prices,
 * total_classes, expiration_days). Cards created in /admin/precios become
 * purchasable/creatable without a deploy. PACK_DEFINITIONS remains the fallback
 * for legacy/def-only types (e.g. ANNIVERSARY_5EXP) and if the DB read fails,
 * so behavior degrades to pre-resolver semantics, never worse.
 *
 * Server-side only (uses service role when available).
 */
export async function resolvePackDef(
  packType: string,
): Promise<PackDefinition | undefined> {
  const type = (packType || "").trim();
  if (!type) return undefined;

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const db = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: card } = await db
      .from("tu_pricing_cards")
      .select(
        "label, label_es, subtitle_en, subtitle_es, price_cop, price_usd, category, sort_order, total_classes, expiration_days",
      )
      .eq("pack_type", type)
      .eq("is_active", true)
      .not("total_classes", "is", null)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (card && typeof card.total_classes === "number") {
      return {
        type,
        name: { en: card.label, es: card.label_es || card.label },
        description: { en: card.subtitle_en || "", es: card.subtitle_es || "" },
        totalClasses: card.total_classes,
        priceCop: card.price_cop,
        priceUsd: card.price_usd,
        expirationDays:
          card.expiration_days && card.expiration_days > 0
            ? card.expiration_days
            : 30,
        isPromo: card.category === "promo",
        isActive: true,
        sortOrder: card.sort_order ?? 50,
      };
    }
  } catch (error) {
    console.error(
      "[pack-resolver]",
      error instanceof Error ? error.message : String(error),
    );
  }

  return getPackDefinition(type);
}
