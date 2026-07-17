"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/translations";

export interface ServicesSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
  openBooking: (service?: string, date?: string, time?: string) => void;
}

interface ServiceData {
  name: string;
  nameEs: string;
  price: string;
  duration: string;
}

const FALLBACK_SERVICES: ServiceData[] = [
  { name: "Discovery Session", nameEs: "Consulta de Descubrimiento", price: "$85,000 COP / $22 USD", duration: "30 min" },
  { name: "Personalized Yoga", nameEs: "Yoga Personalizado", price: "$190,000 COP / $50 USD", duration: "60 min" },
  { name: "Video Connection", nameEs: "Video Conexión", price: "$170,000 COP / $45 USD", duration: "60 min" },
  { name: "Quantum Surgery", nameEs: "Cirugía Cuántica", price: "$360,000 COP / $95 USD", duration: "60 min" },
  { name: "Superior Connection", nameEs: "Conexión Superior", price: "$730,000 COP / $193 USD", duration: "75 min" },
  { name: "Energy Cleansing", nameEs: "Limpiezas Energéticas", price: "$485,000 COP / $128 USD", duration: "75 min" },
  { name: "Sacred Ceremonies", nameEs: "Ceremonias Simbólicas", price: "$3,500,000 COP / $924 USD", duration: "Custom" },
  { name: "Leadership Integration", nameEs: "Integración Grupal de Liderazgo", price: "$1,220,000 COP / $322 USD", duration: "Per hour" },
  { name: "TUISYOU Program", nameEs: "Programa TUISYOU Personalizado", price: "$7,750,000 COP / $2,046 USD", duration: "3 months" },
];

function formatPrice(cop: number, usd: number): string {
  const copStr = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(cop);
  return `${copStr} / $${usd} USD`;
}

const descriptionKeys = [
  "discovery", "yoga", "video", "quantum", "superior",
  "cleansing", "ceremonies", "leadership", "tuisyou",
] as const;

export default function ServicesSection({ lang, L, openBooking }: ServicesSectionProps) {
  const [services, setServices] = useState<ServiceData[]>(FALLBACK_SERVICES);

  useEffect(() => {
    fetch("/api/public/services")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data?.length) {
          setServices(d.data.map((s: { name_en: string; name_es: string; price_cop: number; price_usd: number; duration: string }) => ({
            name: s.name_en,
            nameEs: s.name_es,
            price: formatPrice(s.price_cop, s.price_usd),
            duration: s.duration,
          })));
        }
      })
      .catch(() => {});
  }, []);
  return (
    <section id="services" className="py-24 md:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-charcoal/40 mb-4">
            {L(t.servicesLabel) as string}
          </p>
          <h2
            className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-charcoal"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 300,
            }}
          >
            {L(t.servicesTitle) as string}
          </h2>
          <p className="fade-in fade-in-delay-2 font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-4 max-w-lg mx-auto">
            {L(t.servicesSubtitle) as string}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-reveal">
          {services.map((service, i) => (
            <div
              key={service.name}
              className={`fade-in fade-in-delay-${Math.min(i + 1, 5)} service-card group relative p-6 sm:p-8 ${i % 3 === 1 ? 'rounded-none' : 'rounded-2xl'} border border-charcoal/5 bg-white cursor-pointer`}
              onClick={() => window.open(`https://wa.me/573166333663?text=${encodeURIComponent(`Hola Tata! Me interesa ${lang === "en" ? service.name : service.nameEs}. ¿Tienes disponibilidad? / I'm interested in ${service.name}. Do you have availability?`)}`, "_blank")}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl text-charcoal group-hover:text-rose transition-colors duration-300">
                  {lang === "en" ? service.name : service.nameEs}
                </h3>
                <span className="font-[family-name:var(--font-body)] text-[10px] tracking-wider text-charcoal/25 whitespace-nowrap mt-1">
                  {service.duration}
                </span>
              </div>
              {lang === "en" && (
                <p className="font-[family-name:var(--font-body)] text-xs text-rose/50 italic mb-3">
                  {service.nameEs}
                </p>
              )}
              <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/50 leading-relaxed mb-6">
                {t.serviceDescriptions[lang][descriptionKeys[i]]}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-charcoal/5">
                <span className="font-[family-name:var(--font-body)] text-xs sm:text-sm text-charcoal/70 font-medium">
                  {service.price}
                </span>
                <span className="font-[family-name:var(--font-body)] text-xs tracking-[0.15em] text-rose/0 group-hover:text-rose transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                  {L(t.book) as string}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Yoga 10-pack callout */}
        <div className="fade-in mt-8 rounded-2xl border border-rose/10 bg-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl text-charcoal">
              {L(t.yoga10Pack) as string}
            </p>
            <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-1">
              {L(t.yoga10PackSub) as string}
            </p>
          </div>
          <div className="text-right">
            <p className="font-[family-name:var(--font-display)] text-2xl text-charcoal">
              $1,500,000 <span className="text-base text-charcoal/40">COP</span>
            </p>
            <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40">
              $396 USD
            </p>
          </div>
        </div>

        {/* Video Connection 30-min option */}
        <div className="fade-in mt-3 rounded-2xl border border-charcoal/5 bg-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl text-charcoal">
              {L(t.video30) as string}
            </p>
            <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-1">
              {L(t.video30Sub) as string}
            </p>
          </div>
          <div className="text-right">
            <p className="font-[family-name:var(--font-display)] text-2xl text-charcoal">
              $120,000 <span className="text-base text-charcoal/40">COP</span>
            </p>
            <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40">
              $32 USD
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export { FALLBACK_SERVICES as services };
