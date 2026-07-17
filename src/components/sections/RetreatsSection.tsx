"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/translations";

export interface RetreatsSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
}

interface RetreatDisplay {
  title: string;
  subtitle: string;
  description: string;
  price: string;
  capacity: string;
  includes: string;
}

function formatRetreatPrice(cop: number, usd: number, unit: string): string {
  const copM = cop >= 1000000 ? `$${(cop / 1000000).toFixed(cop % 1000000 === 0 ? 0 : 2)}M COP` : `$${cop.toLocaleString("es-CO")} COP`;
  const suffix = unit === "per hour" ? "/hr" : "";
  return `$${usd.toLocaleString()} USD${suffix} · ${copM}${suffix}`;
}

export default function RetreatsSection({ lang, L }: RetreatsSectionProps) {
  const fallbackRetreats: RetreatDisplay[] = [
    {
      title: L(t.retreatTuisyouTitle) as string,
      subtitle: L(t.retreatTuisyouSub) as string,
      description: L(t.retreatTuisyouDesc) as string,
      price: "$2,046 USD · $7.75M COP",
      capacity: L(t.retreatTuisyouCapacity) as string,
      includes: L(t.retreatTuisyouIncludes) as string,
    },
    {
      title: L(t.retreatLeadershipTitle) as string,
      subtitle: L(t.retreatLeadershipSub) as string,
      description: L(t.retreatLeadershipDesc) as string,
      price: "$322 USD · $1.22M COP/hr",
      capacity: L(t.retreatLeadershipCapacity) as string,
      includes: L(t.retreatLeadershipIncludes) as string,
    },
  ];

  const [retreats, setRetreats] = useState<RetreatDisplay[]>(fallbackRetreats);

  useEffect(() => {
    fetch("/api/public/retreats")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data?.length) {
          setRetreats(d.data.map((r: { title_en: string; title_es: string; subtitle_en: string | null; subtitle_es: string | null; description_en: string | null; description_es: string | null; price_cop: number; price_usd: number; price_unit: string; capacity_en: string | null; capacity_es: string | null; includes_en: string | null; includes_es: string | null }) => ({
            title: lang === "en" ? r.title_en : r.title_es,
            subtitle: lang === "en" ? (r.subtitle_en || "") : (r.subtitle_es || ""),
            description: lang === "en" ? (r.description_en || "") : (r.description_es || ""),
            price: formatRetreatPrice(r.price_cop, r.price_usd, r.price_unit),
            capacity: lang === "en" ? (r.capacity_en || "") : (r.capacity_es || ""),
            includes: lang === "en" ? (r.includes_en || "") : (r.includes_es || ""),
          })));
        }
      })
      .catch(() => {});
  }, [lang]);

  return (
    <section id="retreats" className="py-32 md:py-44">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-charcoal/40 mb-4">
            {L(t.immersive) as string}
          </p>
          <h2
            className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-charcoal"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 300,
            }}
          >
            {L(t.retreatsTitle) as string}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {retreats.map((retreat, i) => (
            <div
              key={retreat.title}
              className={`fade-in fade-in-delay-${i + 1} booking-glow rounded-3xl overflow-hidden bg-white`}
            >
              <div className="p-8 sm:p-10">
                <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-rose/60 mb-3">
                  {retreat.subtitle.toUpperCase()}
                </p>
                <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-charcoal mb-4">
                  {retreat.title}
                </h3>
                <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/50 leading-relaxed mb-8">
                  {retreat.description}
                </p>
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-rose/40" />
                    <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/60">
                      {retreat.capacity}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-rose/40" />
                    <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/60">
                      {retreat.includes}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-charcoal/5">
                  <span className="font-[family-name:var(--font-display)] text-xl sm:text-2xl text-charcoal">
                    {retreat.price}
                  </span>
                  <button
                    onClick={() => window.open(`https://wa.me/573166333663?text=${encodeURIComponent(`Hola Tata! Me interesa ${retreat.title}. ¿Puedes darme más información? / I'm interested in ${retreat.title}. Can you give me more info?`)}`, "_blank")}
                    className="btn-tactile font-[family-name:var(--font-body)] text-sm tracking-[0.15em] text-rose hover:text-charcoal transition-colors py-2"
                  >
                    {L(t.inquire) as string}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
