"use client";

import Image from "next/image";
import { t, type Lang } from "@/lib/translations";

export interface ThePracticeSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
}

export default function ThePracticeSection({ lang, L }: ThePracticeSectionProps) {
  return (
    <section id="practice" className="py-28 md:py-40 bg-white overflow-clip">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-charcoal/40 mb-4">
            {L(t.thePractice) as string}
          </p>
          <h2
            className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-charcoal"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 300,
            }}
          >
            {L(t.whereTransformation) as string}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Video — landscape, spans left side */}
          <div className="fade-in fade-in-delay-1 md:col-span-7 md:row-span-2 glass-frame" style={{ minHeight: "400px" }}>
            <video
              autoPlay
              muted
              loop
              playsInline
              className="inline-video"
              style={{ minHeight: "100%", transform: "scale(1.25)", transformOrigin: "center 25%" }}
            >
              <source src="/class-video.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Upper right — sound healing experience with headphones */}
          <div className="clip-reveal md:col-span-5 glass-frame aspect-[4/3] md:aspect-auto editorial-tilt-right">
            <Image
              src="/practice-1.jpg"
              alt="Sound healing experience with headphones at TUISYOU wellness event in Cartagena Colombia"
              width={1067}
              height={1600}
              className="object-cover w-full h-full img-editorial"
              style={{ objectPosition: "center 35%" }}
            />
          </div>

          {/* Lower right — Tata leading group yoga session */}
          <div className="clip-reveal-left md:col-span-5 glass-frame aspect-[4/3] md:aspect-auto editorial-tilt-left">
            <Image
              src="/practice-2.jpg"
              alt="Tata Umana leading yoga and sound healing session at TUISYOU wellness event in Cartagena Colombia"
              width={1067}
              height={1600}
              className="object-cover w-full h-full img-editorial"
              style={{ objectPosition: "center 30%" }}
            />
          </div>

          {/* Group photo — full width, tall to show all faces */}
          <div className="fade-in fade-in-delay-4 md:col-span-12 glass-frame" style={{ height: "clamp(420px, 50vw, 700px)" }}>
            <Image
              src="/yoga-class.jpg"
              alt="Group yoga class at Casa Carolina Cartagena — JustbYoga by TUISYOU daily wellness classes with sound bowls and mats"
              width={900}
              height={1600}
              className="object-cover w-full h-full"
              style={{ objectPosition: "center 55%" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
