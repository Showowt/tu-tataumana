"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { t, type Lang } from "@/lib/translations";

export interface TeachersSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
}

interface Teacher {
  name: string;
  role: { en: string; es: string };
  bio: { en: string; es: string };
  image: string;
  specialties: string[];
  isLead: boolean;
}

// Fallback data — used until API responds
const FALLBACK_TEACHERS: Teacher[] = [
  { name: "Tata", role: { en: "Founder & Lead Teacher", es: "Fundadora & Teacher Principal" }, bio: { es: "Guardiana de espacios sagrados, guía del alma y del cuerpo que recuerda.", en: "Guardian of sacred spaces, guide of the soul and the body that remembers." }, image: "/practice-2.jpg", specialties: ["Sound Healing", "Reiki", "Kundalini", "Vinyasa", "Ceremonies"], isLead: true },
];

function mapAPITeacher(t: { name: string; role_en: string; role_es: string; bio_en: string; bio_es: string; image_url: string; specialties: string[]; is_lead: boolean }): Teacher {
  return { name: t.name, role: { en: t.role_en, es: t.role_es }, bio: { en: t.bio_en, es: t.bio_es }, image: t.image_url, specialties: t.specialties || [], isLead: t.is_lead };
}

export default function TeachersSection({ lang, L }: TeachersSectionProps) {
  const [teachers, setTeachers] = useState<Teacher[]>(FALLBACK_TEACHERS);

  useEffect(() => {
    fetch("/api/public/teachers")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data?.length) setTeachers(d.data.map(mapAPITeacher)); })
      .catch(() => {});
  }, []);
  return (
    <section id="teachers" className="py-28 md:py-36 bg-white">
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-20 md:mb-28">
          <p className="fade-in font-[family-name:var(--font-body)] text-[10px] tracking-[0.4em] text-gold mb-5">
            JUST B YOGA BY TUISYOU
          </p>
          <h2
            className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-charcoal"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 300, lineHeight: 1.1 }}
          >
            {L(t.teachersTitle1) as string}{" "}
            <span className="italic text-rose">{L(t.teachersTitle2) as string}</span>
          </h2>
        </div>

        {/* ── TATA — Lead Teacher Hero ── */}
        <div className="fade-in mb-24 md:mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Image */}
            <div className="w-full">
              <div className="relative aspect-[4/5] rounded-sm overflow-hidden">
                <Image
                  src={teachers[0].image}
                  alt={`${teachers[0].name} — ${teachers[0].role[lang]}`}
                  fill
                  className="object-cover"
                  style={{ objectPosition: "center 20%" }}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>

            {/* Content */}
            <div className="text-center lg:text-left">
              <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.3em] text-gold mb-4">
                {teachers[0].role[lang].toUpperCase()}
              </p>
              <h3
                className="font-[family-name:var(--font-display)] text-charcoal mb-8"
                style={{ fontSize: "clamp(2.8rem, 4.5vw, 4rem)", fontWeight: 300, lineHeight: 1 }}
              >
                {teachers[0].name}
              </h3>

              <p className="font-[family-name:var(--font-body)] text-[15px] text-charcoal/50 leading-[1.9] mb-10">
                {teachers[0].bio[lang]}
              </p>

              <div className="flex flex-wrap justify-center lg:justify-start gap-2.5 mb-10">
                {teachers[0].specialties.map((s) => (
                  <span
                    key={s}
                    className="px-4 py-2 border border-charcoal/8 font-[family-name:var(--font-body)] text-[10px] tracking-[0.15em] text-charcoal/40"
                  >
                    {s.toUpperCase()}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-charcoal/8" />
                <span className="font-[family-name:var(--font-body)] text-[9px] tracking-[0.3em] text-charcoal/25">
                  30+ {lang === "en" ? "YEARS" : "AÑOS"}
                </span>
                <div className="h-px flex-1 bg-charcoal/8" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Other Teachers — Clean Compact Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teachers.filter((tc) => !tc.isLead).map((teacher, i) => (
            <div
              key={teacher.name}
              className={`fade-in fade-in-delay-${i + 1} group`}
            >
              {/* Photo */}
              <div className="relative aspect-[3/4] rounded-sm overflow-hidden mb-5">
                <Image
                  src={teacher.image}
                  alt={`${teacher.name} — ${teacher.role[lang]}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  style={{ objectPosition: "center 30%" }}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {/* Subtle warm overlay at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#2C2C2C]/40 via-transparent to-transparent" />

                {/* Name on image */}
                <div className="absolute bottom-4 left-5 right-5">
                  <h3
                    className="font-[family-name:var(--font-display)] text-white"
                    style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", fontWeight: 300, lineHeight: 1.1 }}
                  >
                    {teacher.name}
                  </h3>
                  <p className="font-[family-name:var(--font-body)] text-[9px] tracking-[0.2em] text-white/60 mt-1">
                    {teacher.specialties.join(" · ").toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Bio below photo */}
              <p className="font-[family-name:var(--font-body)] text-[12px] text-charcoal/50 leading-[1.8] px-1">
                {teacher.bio[lang]}
              </p>
            </div>
          ))}
        </div>

        {/* ── Closing statement ── */}
        <div className="fade-in mt-24 md:mt-32 text-center max-w-2xl mx-auto">
          <div className="h-px w-16 bg-rose/30 mx-auto mb-10" />
          <p
            className="font-[family-name:var(--font-display)] text-charcoal/70 italic leading-relaxed"
            style={{ fontSize: "clamp(1.15rem, 2vw, 1.4rem)", fontWeight: 300 }}
          >
            {L(t.teachersClosing) as string}
          </p>
          <p
            className="font-[family-name:var(--font-display)] text-charcoal mt-3 italic"
            style={{ fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)", fontWeight: 400 }}
          >
            {L(t.teachersClosingSub) as string}
          </p>
          <div className="h-px w-16 bg-rose/30 mx-auto mt-10" />
        </div>
      </div>
    </section>
  );
}
