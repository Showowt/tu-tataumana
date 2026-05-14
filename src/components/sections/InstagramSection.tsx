"use client";

import Image from "next/image";
import { type Lang } from "@/lib/translations";

export interface InstagramSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
}

const galleryImages = [
  { src: "/practice-1.jpg", alt: "Yoga practice at Casa Carolina" },
  { src: "/class-group.jpg", alt: "Group yoga class" },
  { src: "/class-seated.jpg", alt: "Seated meditation" },
  { src: "/practice-2.jpg", alt: "Healing session" },
  { src: "/class-savasana.jpg", alt: "Savasana relaxation" },
  { src: "/teachers-hero.jpg", alt: "TU teachers community" },
];

export default function InstagramSection({ lang }: InstagramSectionProps) {
  return (
    <section className="py-20 md:py-28 bg-cream-warm">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.4em] text-rose mb-4">
            {lang === "en" ? "FOLLOW THE JOURNEY" : "SIGUE EL CAMINO"}
          </p>
          <h2
            className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-charcoal"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300, lineHeight: 1.15 }}
          >
            @tuisyou
          </h2>
          <p className="fade-in fade-in-delay-2 font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-3">
            {lang === "en"
              ? "Moments from the practice, the community, the healing"
              : "Momentos de la práctica, la comunidad, la sanación"}
          </p>
        </div>

        {/* Image grid */}
        <div className="fade-in grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-10">
          {galleryImages.map((img, idx) => (
            <a
              key={img.src}
              href="https://instagram.com/tuisyou"
              target="_blank"
              rel="noopener noreferrer"
              className={`relative overflow-hidden rounded-xl group ${
                idx === 0 ? "row-span-2 aspect-[3/4]" : "aspect-square"
              }`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/30 transition-colors duration-500 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </a>
          ))}
        </div>

        {/* Profile card */}
        <div className="fade-in max-w-lg mx-auto">
          <a
            href="https://instagram.com/tuisyou"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-5 rounded-2xl border border-charcoal/8 bg-white p-5 hover:border-rose/20 hover:shadow-lg transition-all duration-500"
          >
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] p-[2px] shrink-0">
              <div className="w-full h-full rounded-full bg-cream-warm flex items-center justify-center">
                <span className="font-[family-name:var(--font-display)] text-lg text-charcoal">TU.</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-[family-name:var(--font-display)] text-base text-charcoal">@tuisyou</span>
                <svg className="w-4 h-4 text-[#3897f0]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40">
                Yoga &middot; Sound Healing &middot; Reiki &middot; Cartagena
              </p>
            </div>

            {/* Follow */}
            <span className="shrink-0 px-5 py-2 rounded-full bg-charcoal text-white font-[family-name:var(--font-body)] text-xs tracking-[0.1em] group-hover:bg-rose transition-colors duration-500">
              FOLLOW
            </span>
          </a>
        </div>

        {/* Second handle */}
        <p className="text-center mt-4">
          <a
            href="https://instagram.com/justbyogabytuisyou"
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-body)] text-xs text-charcoal/30 hover:text-rose transition-colors"
          >
            {lang === "en" ? "Also follow" : "También sigue"} @justbyogabytuisyou
          </a>
        </p>
      </div>
    </section>
  );
}
