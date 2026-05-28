"use client";

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

const teachers: Teacher[] = [
  {
    name: "Tata",
    role: { en: "Founder & Lead Teacher", es: "Fundadora & Teacher Principal" },
    bio: {
      es: "Guardiana de espacios sagrados, guía del alma y del cuerpo que recuerda. Tata te acompaña a través del yoga, la energía, el toque y la palabra, a volver a ti — a tu verdad, a tu poder, a tu centro. Su enseñanza es medicina: suave pero firme, mística pero presente, amorosa pero clara. En cada clase, Tata abre portales donde el cuerpo respira, el corazón se calma y el alma florece.",
      en: "Guardian of sacred spaces, guide of the soul and the body that remembers. Tata walks with you through yoga, energy, touch and word, back to yourself — to your truth, your power, your center. Her teaching is medicine: gentle yet firm, mystical yet present, loving yet clear. In every class, Tata opens portals where the body breathes, the heart calms and the soul blooms.",
    },
    image: "/practice-2.jpg",
    specialties: ["Sound Healing", "Reiki", "Kundalini", "Vinyasa", "Ceremonies"],
    isLead: true,
  },
  {
    name: "Betty",
    role: { en: "Yoga Teacher", es: "Teacher de Yoga" },
    bio: {
      es: "Psicóloga e instructora de yoga, Betty guía una práctica consciente para volver al cuerpo y al momento presente. Sus clases integran meditación y reprogramación mental, invitando a soltar el control, reconectar con tu autenticidad y habitarte con más amor.",
      en: "Psychologist and yoga instructor, Betty guides a conscious practice to return to the body and the present moment. Her classes integrate meditation and mental reprogramming, inviting you to release control, reconnect with your authenticity and inhabit yourself with more love.",
    },
    image: "/teacher-betty.png",
    specialties: ["Yoga", "Meditation", "Psychology"],
    isLead: false,
  },
  {
    name: "Violeta",
    role: { en: "Yoga Teacher", es: "Teacher de Yoga" },
    bio: {
      es: "Artista del movimiento y creadora visual, Violeta explora la danza y la sensibilidad del cuerpo en conexión con la tierra, teniendo el yoga como su eje central. Su práctica integra el trabajo con la fascia y el movimiento consciente, creando espacios donde la presencia, la suavidad y la expresión se encuentran.",
      en: "Movement artist and visual creator, Violeta explores dance and body sensitivity in connection with the earth, with yoga as her central axis. Her practice integrates fascia work and conscious movement, creating spaces where presence, softness and expression meet.",
    },
    image: "/teacher-violeta.png",
    specialties: ["Yoga", "Movement", "Fascia"],
    isLead: false,
  },
  {
    name: "Álvaro",
    role: { en: "Meditation Guide", es: "Guía de Meditación" },
    bio: {
      es: "A través de la meditación y la palabra consciente, Álvaro guía espacios de conexión profunda con el ser y la salud mental. Integrando su mirada desde la ontología, acompaña procesos de comprensión, liberación y transformación interior. Sus encuentros invitan a pausar, respirar y reconectar con lo esencial, cultivando paz, claridad y presencia.",
      en: "Through meditation and conscious word, Álvaro guides spaces of deep connection with being and mental health. Integrating his perspective from ontology, he accompanies processes of understanding, liberation and inner transformation. His sessions invite you to pause, breathe and reconnect with the essential, cultivating peace, clarity and presence.",
    },
    image: "/teacher-alvaro.png",
    specialties: ["Meditation", "Ontology", "Mindfulness"],
    isLead: false,
  },
  {
    name: "Leandra",
    role: { en: "Sound Therapy Teacher", es: "Teacher de Terapia de Sonido" },
    bio: {
      es: "Leandra guia sesiones de sanacion con sonido que conectan cuerpo, mente y espiritu. A traves de cuencos tibetanos y frecuencias armonicas, crea espacios de profunda relajacion y transformacion interior.",
      en: "Leandra guides sound healing sessions that connect body, mind and spirit. Through Tibetan bowls and harmonic frequencies, she creates spaces of deep relaxation and inner transformation.",
    },
    image: "/teacher-leandra.jpg",
    specialties: ["Sound Healing", "Sound Therapy", "Meditation"],
    isLead: false,
  },
  {
    name: "Alejandro",
    role: { en: "Yoga Teacher", es: "Teacher de Yoga" },
    bio: {
      es: "Alejandro guía prácticas que combinan fuerza y calma, invitando a cada estudiante a explorar su potencial a través de posturas conscientes y respiración profunda.",
      en: "Alejandro guides practices that combine strength and calm, inviting each student to explore their potential through conscious postures and deep breathing.",
    },
    image: "/teacher-alejandro.png",
    specialties: ["Hatha", "Hip Opening", "Yoga"],
    isLead: false,
  },
];

export default function TeachersSection({ lang, L }: TeachersSectionProps) {
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
