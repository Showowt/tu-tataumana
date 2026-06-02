"use client";

import Image from "next/image";
import { t, type Lang } from "@/lib/translations";

export interface MayEventsSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
  workshopPassed: boolean;
  countdownReady: boolean;
  countdown: { days: number; hours: number; minutes: number; seconds: number };
  openBooking: (service?: string, date?: string, time?: string) => void;
}

export default function MayEventsSection({
  lang,
  L,
  workshopPassed,
  countdownReady,
  countdown,
  openBooking,
}: MayEventsSectionProps) {
  if (workshopPassed) return null;

  return (
    <section className="relative py-16 md:py-24 bg-charcoal overflow-clip grain-overlay">
      {/* Radial glow accents */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(201,169,110,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="fade-in inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gold/20 bg-gold/5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.3em] text-gold">
              {lang === "en" ? "SPECIAL EVENTS" : "EVENTOS ESPECIALES"}
            </span>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

          {/* LEFT — TU Naturaleza Habla (May 22) */}
          <div className="fade-in rounded-2xl border border-gold/20 bg-white/[0.03] overflow-hidden flex flex-col">
            <div className="relative">
              <Image
                src="/event-may22.png"
                alt="TU Naturaleza Habla — Sound healing event May 22 at Casa Carolina Cartagena"
                width={848}
                height={1200}
                className="w-full h-auto"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="p-6 md:p-8 flex flex-col flex-1">
              {/* Countdown — hidden until client-side timer kicks in to prevent flash of zeros */}
              <div className={`flex items-center justify-center gap-3 mb-6 transition-opacity duration-500 ${countdownReady ? "opacity-100" : "opacity-0"}`}>
                {[
                  { value: countdown.days, label: L(t.countdownDays) as string },
                  { value: countdown.hours, label: L(t.countdownHours) as string },
                  { value: countdown.minutes, label: L(t.countdownMinutes) as string },
                  { value: countdown.seconds, label: L(t.countdownSeconds) as string },
                ].map((unit) => (
                  <div key={unit.label} className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center gold-breath">
                      <span className="font-[family-name:var(--font-display)] text-lg text-white tabular-nums">
                        {String(unit.value).padStart(2, "0")}
                      </span>
                    </div>
                    <span className="font-[family-name:var(--font-body)] text-[8px] tracking-[0.2em] text-white/25 mt-1">
                      {unit.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <button
                  onClick={() => openBooking("TU Naturaleza Habla — Sound Healing")}
                  className="btn-tactile w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-gold text-charcoal font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-white transition-all duration-500 rounded-full"
                >
                  {L(t.workshopReserve) as string}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
                <p className="font-[family-name:var(--font-body)] text-[10px] text-white/25 text-center mt-3">
                  {L(t.workshopLimited) as string}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — Especial Aniversario Promo */}
          <div className="fade-in fade-in-delay-1 rounded-2xl border border-rose-soft/20 bg-white/[0.03] overflow-hidden flex flex-col">
            <div className="relative">
              <Image
                src="/promo-mothers.png"
                alt="Especial Aniversario — Anniversary Special 4 classes for $160,000 COP at JustbYoga Cartagena"
                width={900}
                height={1200}
                className="w-full h-auto"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="p-6 md:p-8 flex flex-col flex-1">
              <div className="mt-auto">
                <button
                  onClick={() => openBooking(lang === "en" ? "Especial Aniversario — 4 Classes" : "Especial Aniversario — 4 Clases")}
                  className="btn-tactile w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-rose-soft text-white font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-white hover:text-charcoal transition-all duration-500 rounded-full"
                >
                  {lang === "en" ? "RESERVE PROMO" : "RESERVAR PROMO"}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
                <p className="font-[family-name:var(--font-body)] text-[10px] text-white/25 text-center mt-3">
                  {lang === "en" ? "Anniversary Special" : "Especial Aniversario"}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
