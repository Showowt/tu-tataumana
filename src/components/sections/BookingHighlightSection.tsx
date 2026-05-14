"use client";

import { t, type Lang } from "@/lib/translations";

export interface BookingHighlightSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
  openBooking: (service?: string, date?: string, time?: string) => void;
}

export default function BookingHighlightSection({ lang, L, openBooking }: BookingHighlightSectionProps) {
  return (
    <section className="py-20 md:py-28 bg-charcoal relative overflow-clip grain-overlay">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(184,119,119,1) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-white/30 mb-6">
          {L(t.yourNextStep) as string}
        </p>
        <h2
          className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-white mb-4"
          style={{
            fontSize: "clamp(2.2rem, 6vw, 4rem)",
            fontWeight: 300,
            letterSpacing: "-0.02em",
          }}
        >
          {L(t.readyToBegin) as string}
        </h2>
        <p className="fade-in fade-in-delay-2 font-[family-name:var(--font-body)] text-white/40 max-w-md mx-auto mb-10">
          {L(t.ctaSub) as string}
        </p>

        <button
          onClick={() => openBooking()}
          className="btn-tactile fade-in fade-in-delay-3 inline-flex items-center gap-3 px-12 py-5 bg-white text-charcoal font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-rose hover:text-white transition-all duration-500 rounded-full"
        >
          {L(t.bookSession) as string}
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </button>

        {/* Trust signals */}
        <div className="fade-in fade-in-delay-4 mt-12 flex items-center justify-center gap-8 flex-wrap">
          {(L(t.trustSignals) as string[]).map((signal) => (
            <span
              key={signal}
              className="font-[family-name:var(--font-body)] text-xs text-white/20 tracking-wider"
            >
              {signal}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
