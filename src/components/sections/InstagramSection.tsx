"use client";

import { type Lang } from "@/lib/translations";

export interface InstagramSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
}

export default function InstagramSection({ lang, L }: InstagramSectionProps) {
  return (
    <section className="py-20 md:py-28 bg-cream-warm">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <a
          href="https://instagram.com/tuisyou"
          target="_blank"
          rel="noopener noreferrer"
          className="fade-in group block rounded-3xl border border-charcoal/8 bg-white p-8 md:p-10 hover:border-rose/20 hover:shadow-lg transition-all duration-500"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            {/* Profile avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] p-[3px] shrink-0">
              <div className="w-full h-full rounded-full bg-cream-warm flex items-center justify-center overflow-hidden">
                <span className="font-[family-name:var(--font-display)] text-2xl text-charcoal">TU.</span>
              </div>
            </div>

            {/* Profile info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <h3 className="font-[family-name:var(--font-display)] text-xl text-charcoal">
                  @tuisyou
                </h3>
                <svg className="w-4.5 h-4.5 text-[#3897f0]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/70 mb-3">
                TU. By Tata Umana | Energy Mentor | Holistic Healing
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-6">
                <span className="font-[family-name:var(--font-body)] text-xs text-charcoal/40">
                  <span className="font-medium text-charcoal/70">686</span> posts
                </span>
                <span className="font-[family-name:var(--font-body)] text-xs text-charcoal/40">
                  <span className="font-medium text-charcoal/70">5K</span> followers
                </span>
              </div>
              <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-3 leading-relaxed max-w-md">
                Healing Cartagena · IET · Yoga · Ayurveda · Reiki · Sacred Ceremonies
              </p>
            </div>

            {/* Follow CTA */}
            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-charcoal text-white font-[family-name:var(--font-body)] text-sm tracking-[0.1em] group-hover:bg-rose transition-colors duration-500">
                FOLLOW
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
