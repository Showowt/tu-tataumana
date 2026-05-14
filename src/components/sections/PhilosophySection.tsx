"use client";

import { t, type Lang } from "@/lib/translations";

export interface PhilosophySectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
}

export default function PhilosophySection({ lang, L }: PhilosophySectionProps) {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <p
          className="blur-in font-[family-name:var(--font-display)] text-charcoal leading-relaxed"
          style={{
            fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
            fontWeight: 300,
            fontStyle: "italic",
            lineHeight: 1.8,
          }}
        >
          {L(t.philosophy) as string}
        </p>
        <div className="blur-in blur-in-delay-2 mt-10 flex items-center justify-center gap-4">
          <div className="h-px w-12 bg-rose/30 line-draw" />
          <span className="font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-charcoal/40">
            TATA UMANA
          </span>
          <div className="h-px w-12 bg-rose/30" />
        </div>
        <p className="fade-in fade-in-delay-3 mt-4 font-[family-name:var(--font-body)] text-sm text-charcoal/40">
          {L(t.wellnessLead) as string} &middot; {L(t.founderOf) as string}{" "}
          <a
            href="https://instagram.com/justbyogabytuisyou"
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose/60 hover:text-rose transition-colors underline underline-offset-2 decoration-rose/20 hover:decoration-rose/50"
          >
            JustbYoga
          </a>{" "}
          &middot; Cartagena, Colombia
        </p>
      </div>
    </section>
  );
}
