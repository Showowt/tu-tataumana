"use client";

import Image from "next/image";
import { t, type Lang } from "@/lib/translations";

export interface HeroSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
  heroLoaded: boolean;
  openBooking: (service?: string, date?: string, time?: string) => void;
}

export default function HeroSection({ lang, L, heroLoaded, openBooking }: HeroSectionProps) {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="hero-video absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: heroLoaded ? 1 : 0,
          transition: "opacity 2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 video-overlay" />
      <div className="absolute inset-0 film-grain" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        <div
          style={{
            opacity: heroLoaded ? 1 : 0,
            transform: heroLoaded ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 1.2s ease 0.3s, transform 1.2s ease 0.3s",
          }}
        >
          <Image
            src="/tu-logo.png"
            alt="TU. by Tata Umana"
            width={140}
            height={140}
            className="brightness-0 invert"
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        <h1
          className="font-[family-name:var(--font-display)] text-white text-center mt-8"
          style={{
            fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
            fontWeight: 300,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            opacity: heroLoaded ? 1 : 0,
            transform: heroLoaded ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 1.2s ease 0.6s, transform 1.2s ease 0.6s",
          }}
        >
          {L(t.heroTitle) as string}
        </h1>

        <p
          className="font-[family-name:var(--font-body)] text-white/60 text-center mt-4 max-w-md"
          style={{
            fontSize: "clamp(0.85rem, 1.5vw, 1rem)",
            fontWeight: 300,
            letterSpacing: "0.08em",
            opacity: heroLoaded ? 1 : 0,
            transform: heroLoaded ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 1.2s ease 0.9s, transform 1.2s ease 0.9s",
          }}
        >
          {L(t.heroSubtitle) as string}
        </p>

        <div
          className="mt-10 flex flex-col sm:flex-row gap-4"
          style={{
            opacity: heroLoaded ? 1 : 0,
            transform: heroLoaded ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 1.2s ease 1.2s, transform 1.2s ease 1.2s",
          }}
        >
          <button
            onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
            className="btn-tactile px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-white hover:text-charcoal transition-all duration-500"
          >
            {L(t.heroBookTata) as string}
          </button>
          <button
            onClick={() => document.getElementById("schedule")?.scrollIntoView({ behavior: "smooth" })}
            className="btn-tactile px-8 py-4 border border-gold/50 text-gold font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-gold hover:text-charcoal transition-all duration-500"
          >
            {L(t.heroYogaClasses) as string}
          </button>
        </div>

        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          style={{
            opacity: heroLoaded ? 0.4 : 0,
            transition: "opacity 1.5s ease 2s",
            animation: "gentlePulse 3s ease-in-out infinite",
          }}
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
