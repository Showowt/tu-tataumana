"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import BookingModal from "@/components/BookingModal";
import { t, type Lang } from "@/lib/translations";

const ChatBot = dynamic(() => import("@/components/ChatBot"), { ssr: false });
const WhatsAppButton = dynamic(() => import("@/components/WhatsAppButton"), {
  ssr: false,
});

// ─── Data ────────────────────────────────────────────────────────────────────

const services = [
  {
    name: "Discovery Session",
    nameEs: "Consulta de Descubrimiento",
    price: "$85,000 COP / $23 USD",
    duration: "30 min",
  },
  {
    name: "Personalized Yoga",
    nameEs: "Yoga Personalizado",
    price: "$190,000 COP / $51 USD",
    duration: "60 min",
  },
  {
    name: "Video Connection",
    nameEs: "Video Conexión",
    price: "$170,000 COP / $46 USD",
    duration: "60 min",
  },
  {
    name: "Quantum Surgery",
    nameEs: "Cirugía Cuántica",
    price: "$320,000 COP / $86 USD",
    duration: "60 min",
  },
  {
    name: "Superior Connection",
    nameEs: "Conexión Superior",
    price: "$730,000 COP / $197 USD",
    duration: "75 min",
  },
  {
    name: "Energy Cleansing",
    nameEs: "Limpiezas Energéticas",
    price: "$485,000 COP / $131 USD",
    duration: "75 min",
  },
  {
    name: "Sacred Ceremonies",
    nameEs: "Ceremonias Simbólicas",
    price: "$3,500,000 COP / $945 USD",
    duration: "Custom",
  },
  {
    name: "Leadership Integration",
    nameEs: "Integración Grupal de Liderazgo",
    price: "$1,220,000 COP / $330 USD",
    duration: "Per hour",
  },
  {
    name: "TUISYOU Program",
    nameEs: "Programa TUISYOU Personalizado",
    price: "$7,750,000 COP / $2,095 USD",
    duration: "3 months",
  },
];

// ─── Weekly Schedule ─────────────────────────────────────────────────────────

interface ScheduleClass {
  time: string;
  name: string;
}

interface ScheduleDay {
  day: string;
  dayEs: string;
  dayShort: string;
  dayIndex: number;
  classes: ScheduleClass[];
}

const weeklySchedule: ScheduleDay[] = [
  {
    day: "Monday",
    dayEs: "Lunes",
    dayShort: "MON",
    dayIndex: 1,
    classes: [
      { time: "9:30 AM", name: "Yoga Conscious" },
      { time: "7:15 PM", name: "Yoga Conscious" },
    ],
  },
  {
    day: "Tuesday",
    dayEs: "Martes",
    dayShort: "TUE",
    dayIndex: 2,
    classes: [
      { time: "9:30 AM", name: "Back Care Yoga" },
      { time: "7:15 PM", name: "Hip Opener · Hatha" },
    ],
  },
  {
    day: "Wednesday",
    dayEs: "Miércoles",
    dayShort: "WED",
    dayIndex: 3,
    classes: [
      { time: "9:30 AM", name: "Yoga Conscious" },
      { time: "10:45 AM", name: "Pilates" },
      { time: "7:15 PM", name: "Open Flow" },
    ],
  },
  {
    day: "Thursday",
    dayEs: "Jueves",
    dayShort: "THU",
    dayIndex: 4,
    classes: [
      { time: "9:30 AM", name: "Yoga Intro · Power Up" },
      { time: "5:30 PM", name: "Sound Healing" },
      { time: "7:15 PM", name: "Hip Opener" },
    ],
  },
  {
    day: "Friday",
    dayEs: "Viernes",
    dayShort: "FRI",
    dayIndex: 5,
    classes: [
      { time: "10:00 AM", name: "Power Yoga · Postura" },
      { time: "7:00 PM", name: "Open Flow" },
    ],
  },
  {
    day: "Saturday",
    dayEs: "Sábado",
    dayShort: "SAT",
    dayIndex: 6,
    classes: [
      { time: "11:00 AM", name: "Sun Salutation" },
      { time: "6:00 PM", name: "Inner Journey · Meditation" },
    ],
  },
  {
    day: "Sunday",
    dayEs: "Domingo",
    dayShort: "SUN",
    dayIndex: 0,
    classes: [
      { time: "9:00 AM", name: "Just Hatha Flow" },
      { time: "10:30 AM", name: "Inner Journey · Meditation" },
    ],
  },
];

function getNextDateForDay(dayIndex: number): string {
  const today = new Date();
  const todayDay = today.getDay();
  let daysUntil = dayIndex - todayDay;
  if (daysUntil <= 0) daysUntil += 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return next.toISOString().split("T")[0];
}

const testimonials = [
  {
    quote:
      "Tata has a gift that transcends technique. One session changed how I breathe, how I sleep, how I move through the world.",
    name: "Sarah M.",
    location: "New York",
  },
  {
    quote:
      "I came for yoga. I left with a completely different relationship to my body. This is not your average wellness experience.",
    name: "Carolina R.",
    location: "Bogota",
  },
  {
    quote:
      "The retreat was the most transformative week of my life. Tata creates a space where healing just happens naturally.",
    name: "James K.",
    location: "London",
  },
];

// ─── Workshop event target: May 1, 2026, 5:30 PM Colombia (UTC-5) ────────
const WORKSHOP_TARGET = new Date("2026-05-01T22:30:00Z"); // 5:30 PM COT = 22:30 UTC

// ─── Scroll reveal hook ──────────────────────────────────────────────────────

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    const children = el.querySelectorAll(".fade-in");
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, []);

  return ref;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselectedService, setPreselectedService] = useState("");
  const [preselectedDate, setPreselectedDate] = useState("");
  const [preselectedTime, setPreselectedTime] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const sectionsRef = useScrollReveal();

  const L = useCallback(
    (key: Record<Lang, string | readonly string[]>) => key[lang],
    [lang]
  );

  const descriptionKeys = [
    "discovery", "yoga", "video", "quantum", "superior",
    "cleansing", "ceremonies", "leadership", "tuisyou",
  ] as const;

  useEffect(() => {
    const timer = setTimeout(() => setHeroLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Show sticky bar after scrolling past hero
  useEffect(() => {
    const handler = () => {
      setShowStickyBar(window.scrollY > window.innerHeight * 0.7);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for workshop
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = WORKSHOP_TARGET.getTime() - now;
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch closed dates
  useEffect(() => {
    fetch("/api/admin/closed-dates")
      .then((r) => r.json())
      .then((json) => setClosedDates((json.data || []).map((d: { date: string }) => d.date)))
      .catch(() => {});
  }, []);

  const openBooking = useCallback(
    (serviceName?: string, date?: string, time?: string) => {
      setPreselectedService(serviceName || "");
      setPreselectedDate(date || "");
      setPreselectedTime(time || "");
      setBookingOpen(true);
    },
    []
  );

  const workshopPassed = WORKSHOP_TARGET.getTime() <= Date.now();

  return (
    <main ref={sectionsRef} className="overflow-x-hidden w-full">
      {/* ━━━ LANGUAGE TOGGLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <button
        onClick={() => setLang(lang === "en" ? "es" : "en")}
        className="fixed top-4 right-4 z-[60] px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-[family-name:var(--font-body)] text-xs tracking-[0.15em] hover:bg-white/20 transition-all duration-300"
        style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
        aria-label="Toggle language"
      >
        {lang === "en" ? "ES" : "EN"}
      </button>

      {/* ━━━ HERO — Fullscreen Cinematic Video ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 300,
              letterSpacing: "0.02em",
              lineHeight: 1.2,
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

          <button
            onClick={() => openBooking()}
            className="mt-10 px-10 py-4 border border-white/30 text-white font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-white hover:text-charcoal transition-all duration-500"
            style={{
              opacity: heroLoaded ? 1 : 0,
              transform: heroLoaded ? "translateY(0)" : "translateY(16px)",
              transition:
                "opacity 1.2s ease 1.2s, transform 1.2s ease 1.2s, background-color 0.5s, color 0.5s, border-color 0.5s",
            }}
          >
            {L(t.bookSession) as string}
          </button>

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

      {/* ━━━ PRESS BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-12 border-b border-charcoal/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center gap-6 sm:gap-12 md:gap-16 flex-wrap">
            {["VOGUE", "FORBES", "CARIBBEAN JOURNAL", "DINERS"].map(
              (press) => (
                <span
                  key={press}
                  className="press-logo font-[family-name:var(--font-display)] text-charcoal text-sm md:text-base tracking-[0.2em] font-light select-none"
                >
                  {press}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* ━━━ WORKSHOP EVENT — Countdown ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {!workshopPassed && (
        <section className="relative py-20 md:py-28 bg-charcoal overflow-hidden">
          {/* Radial glow accents */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none"
            style={{
              background: "radial-gradient(ellipse, rgba(201,169,110,0.15) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-[400px] h-[400px] pointer-events-none"
            style={{
              background: "radial-gradient(ellipse, rgba(184,119,119,0.1) 0%, transparent 70%)",
            }}
          />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            {/* Anniversary badge */}
            <div className="fade-in inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gold/20 bg-gold/5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <span className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.3em] text-gold">
                {L(t.workshopCelebration) as string}
              </span>
            </div>

            <p className="fade-in font-[family-name:var(--font-body)] text-[10px] tracking-[0.4em] text-white/30 mb-4">
              {L(t.workshopLabel) as string}
            </p>

            <h2
              className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-white"
              style={{
                fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
                fontWeight: 300,
                lineHeight: 1.1,
              }}
            >
              {L(t.workshopTitle) as string}
            </h2>
            <p className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-rose-soft italic mt-2" style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)" }}>
              {L(t.workshopSubtitle) as string}
            </p>

            <p className="fade-in fade-in-delay-2 font-[family-name:var(--font-body)] text-sm text-white/40 mt-4">
              {L(t.workshopDate) as string}
            </p>
            <p className="fade-in fade-in-delay-2 font-[family-name:var(--font-body)] text-xs text-white/25 mt-1">
              {L(t.workshopLocation) as string}
            </p>

            {/* Countdown */}
            <div className="fade-in fade-in-delay-3 mt-10 flex items-center justify-center gap-3 sm:gap-6">
              {[
                { value: countdown.days, label: L(t.countdownDays) as string },
                { value: countdown.hours, label: L(t.countdownHours) as string },
                { value: countdown.minutes, label: L(t.countdownMinutes) as string },
                { value: countdown.seconds, label: L(t.countdownSeconds) as string },
              ].map((unit) => (
                <div key={unit.label} className="flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm flex items-center justify-center">
                    <span className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-white tabular-nums">
                      {String(unit.value).padStart(2, "0")}
                    </span>
                  </div>
                  <span className="font-[family-name:var(--font-body)] text-[9px] tracking-[0.3em] text-white/25 mt-2">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div className="fade-in fade-in-delay-4 mt-10 flex items-center justify-center gap-4 sm:gap-8">
              <div className="px-6 py-4 rounded-2xl border border-gold/20 bg-gold/5">
                <p className="font-[family-name:var(--font-body)] text-[9px] tracking-[0.3em] text-gold/70 mb-1">
                  {L(t.workshopPresale) as string}
                </p>
                <p className="font-[family-name:var(--font-display)] text-2xl text-white">
                  $150,000
                </p>
                <p className="font-[family-name:var(--font-body)] text-[10px] text-white/30">COP</p>
              </div>
              <div className="px-6 py-4 rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                <p className="font-[family-name:var(--font-body)] text-[9px] tracking-[0.3em] text-white/40 mb-1">
                  {L(t.workshopRegular) as string}
                </p>
                <p className="font-[family-name:var(--font-display)] text-2xl text-white/60">
                  $180,000
                </p>
                <p className="font-[family-name:var(--font-body)] text-[10px] text-white/20">COP</p>
              </div>
            </div>

            <p className="fade-in fade-in-delay-4 font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-rose-soft/60 mt-6">
              {L(t.workshopLimited) as string}
            </p>

            <a
              href="https://checkout.wompi.co/l/h3WPfP"
              target="_blank"
              rel="noopener noreferrer"
              className="fade-in fade-in-delay-5 mt-8 inline-flex items-center gap-3 px-10 py-4 bg-gold text-charcoal font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-white transition-all duration-500 rounded-full"
            >
              {L(t.workshopReserve) as string}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </div>
        </section>
      )}

      {/* ━━━ PHILOSOPHY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p
            className="fade-in font-[family-name:var(--font-display)] text-charcoal leading-relaxed"
            style={{
              fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
              fontWeight: 300,
            }}
          >
            {L(t.philosophy) as string}
          </p>
          <div className="fade-in fade-in-delay-2 mt-10 flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-rose/30" />
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

      {/* ━━━ THE PRACTICE — Glass Gallery ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
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

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 auto-rows-[280px] md:auto-rows-[320px]">
            <div className="fade-in fade-in-delay-1 md:col-span-7 md:row-span-2 glass-frame">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="inline-video"
              >
                <source src="/class-video.mp4" type="video/mp4" />
              </video>
            </div>

            <div className="fade-in fade-in-delay-2 md:col-span-5 glass-frame">
              <Image
                src="/class-savasana.jpg"
                alt="Savasana class at Casa Carolina"
                width={800}
                height={600}
                className="object-cover w-full h-full"
              />
            </div>

            <div className="fade-in fade-in-delay-3 md:col-span-5 glass-frame">
              <Image
                src="/class-seated.jpg"
                alt="Seated meditation class"
                width={800}
                height={600}
                className="object-cover w-full h-full"
              />
            </div>

            <div className="fade-in fade-in-delay-4 md:col-span-12 glass-frame" style={{ height: 360 }}>
              <Image
                src="/yoga-class.jpg"
                alt="Yoga class at Casa Carolina — JustbYoga by TUISYOU"
                width={1400}
                height={800}
                className="object-cover w-full h-full"
                style={{ objectPosition: "center 35%" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ SERVICES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32 bg-cream">
        <div className="max-w-6xl mx-auto px-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, i) => (
              <div
                key={service.name}
                className={`fade-in fade-in-delay-${Math.min(i + 1, 5)} service-card group relative p-6 sm:p-8 rounded-2xl border border-charcoal/5 bg-white cursor-pointer`}
                onClick={() => openBooking(service.name)}
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
                $388 USD
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
                $33 USD
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ WEEKLY SCHEDULE — Cinematic Dark Section ━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative py-24 md:py-32 bg-charcoal overflow-hidden">
        {/* Background video */}
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            style={{ opacity: 0.15, filter: "brightness(0.8) saturate(1.2)" }}
          >
            <source src="/class-video.mp4" type="video/mp4" />
          </video>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(44,44,44,0.85) 0%, rgba(44,44,44,0.7) 40%, rgba(44,44,44,0.85) 100%)",
            }}
          />
        </div>

        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(184,119,119,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(201,169,110,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.4em] text-gold mb-4">
              {L(t.scheduleLabel) as string}
            </p>
            <h2
              className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-white"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                fontWeight: 300,
                lineHeight: 1.1,
              }}
            >
              {L(t.scheduleTitle1) as string}
              <br />
              <span className="text-rose-soft italic">{L(t.scheduleTitle2) as string}</span>
            </h2>
            <p className="fade-in fade-in-delay-2 font-[family-name:var(--font-body)] text-sm text-white/40 mt-6 max-w-md mx-auto">
              {L(t.scheduleSub) as string}
            </p>
          </div>

          {/* Featured video showcase */}
          <div className="fade-in fade-in-delay-2 mb-14 relative">
            <div className="schedule-video-frame rounded-3xl overflow-hidden" style={{ aspectRatio: "16/7" }}>
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.95) contrast(1.05) saturate(1.1)" }}
              >
                <source src="/class-video.mp4" type="video/mp4" />
              </video>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(to top, rgba(44,44,44,0.6) 0%, transparent 40%)",
                }}
              />
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-8 right-4 sm:right-8 flex items-end justify-between">
                <div>
                  <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.3em] text-white/50">
                    {L(t.casaCarolina) as string} &middot; CARTAGENA
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-white text-lg sm:text-2xl mt-1">
                    {L(t.whereThePractice) as string}
                  </p>
                </div>
                <button
                  onClick={() => openBooking()}
                  className="hidden sm:block px-6 py-3 rounded-full border border-white/20 text-white font-[family-name:var(--font-body)] text-xs tracking-[0.2em] hover:bg-white hover:text-charcoal transition-all duration-500"
                >
                  {L(t.bookNow) as string}
                </button>
              </div>
            </div>
          </div>

          {/* Schedule grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {weeklySchedule.map((day, dayIdx) => {
              const nextDate = getNextDateForDay(day.dayIndex);
              const isClosed = closedDates.includes(nextDate);
              return (
              <div
                key={day.day}
                className={`fade-in fade-in-delay-${Math.min(dayIdx + 1, 5)}`}
              >
                <div className={`schedule-day-card rounded-2xl overflow-hidden border backdrop-blur-sm transition-all duration-500 ${isClosed ? "border-white/[0.04] bg-white/[0.02] opacity-50" : "border-white/[0.06] bg-white/[0.04] hover:border-rose/20"}`}>
                  <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
                    <span className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.3em] text-gold w-10">
                      {day.dayShort}
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-lg text-white/90">
                      {lang === "en" ? day.day : day.dayEs}
                    </span>
                    {isClosed && (
                      <span className="ml-auto font-[family-name:var(--font-body)] text-[9px] tracking-[0.2em] text-rose/60 bg-rose/10 px-3 py-1 rounded-full">
                        {lang === "en" ? "CLOSED" : "CERRADO"}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {day.classes.map((cls, clsIdx) => (
                      <button
                        key={`${day.day}-${clsIdx}`}
                        disabled={isClosed}
                        onClick={() =>
                          !isClosed && openBooking(
                            cls.name,
                            nextDate,
                            cls.time
                          )
                        }
                        className={`w-full px-5 py-3.5 flex items-center justify-between group transition-all duration-300 ${isClosed ? "cursor-not-allowed" : "hover:bg-white/[0.04]"}`}
                      >
                        <div className="flex items-center gap-4">
                          <span className={`font-[family-name:var(--font-body)] text-sm w-[72px] text-left tabular-nums ${isClosed ? "text-white/15 line-through" : "text-white/25"}`}>
                            {cls.time}
                          </span>
                          <span className={`font-[family-name:var(--font-display)] text-[15px] transition-colors duration-300 ${isClosed ? "text-white/25 line-through" : "text-white/70 group-hover:text-rose-soft"}`}>
                            {cls.name}
                          </span>
                        </div>
                        {!isClosed && (
                        <svg
                          className="w-3.5 h-3.5 text-white/0 group-hover:text-gold/60 transition-all duration-300 group-hover:translate-x-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {/* Pricing cards */}
          <div className="fade-in mt-12 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "WALK-IN CLASS", cop: "$80,000", usd: "$22", sub: lang === "en" ? "Single class" : "Clase individual" },
              { label: "PROMO 2x1", cop: "$80,000", usd: "$22", sub: lang === "en" ? "Bring a friend" : "Trae un amigo" },
              { label: "MARTES INDUSTRIA", cop: "$45,000", usd: "$12", sub: lang === "en" ? "Tuesdays only" : "Solo martes" },
              { label: "VIERNES OPEN FLOW", cop: "$45,000", usd: "$12", sub: lang === "en" ? "Fridays only" : "Solo viernes" },
              { label: "PROMO MES MUJER", cop: "$160,000", usd: "$43", sub: lang === "en" ? "Special promo" : "Promo especial" },
              { label: "TU INTRO PACK", cop: "$160,000", usd: "$43", sub: lang === "en" ? "4 classes" : "4 clases" },
            ].map((promo) => (
              <div
                key={promo.label}
                className="schedule-promo-card rounded-2xl border border-gold/10 bg-white/[0.03] p-4 sm:p-5 text-center hover:border-gold/30 hover:bg-white/[0.06] transition-all duration-500"
              >
                <p className="font-[family-name:var(--font-body)] text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] text-gold/70 mb-2">
                  {promo.label}
                </p>
                <p className="font-[family-name:var(--font-display)] text-xl sm:text-2xl text-white">
                  {promo.cop}
                </p>
                <p className="font-[family-name:var(--font-body)] text-[10px] sm:text-xs text-white/30 mt-1">
                  COP &middot; {promo.usd} USD &middot; {promo.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Premium packs row */}
          <div className="fade-in mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: "JUST FLOW PACK", cop: "$295,000", usd: "$80", sub: lang === "en" ? "6 classes" : "6 clases" },
              { label: "TU HEALING PACK", cop: "$420,000", usd: "$114", sub: lang === "en" ? "8 classes" : "8 clases" },
              { label: "TU EQUILIBRIUM", cop: "$630,000", usd: "$170", sub: lang === "en" ? "12 classes" : "12 clases" },
              { label: "TU LIFE PACK", cop: "$1,050,000", usd: "$284", sub: "Unlimited" },
            ].map((promo) => (
              <div
                key={promo.label}
                className="schedule-promo-card rounded-2xl border border-gold/10 bg-white/[0.03] p-4 sm:p-5 text-center hover:border-gold/30 hover:bg-white/[0.06] transition-all duration-500"
              >
                <p className="font-[family-name:var(--font-body)] text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] text-gold/70 mb-2">
                  {promo.label}
                </p>
                <p className="font-[family-name:var(--font-display)] text-xl sm:text-2xl text-white">
                  {promo.cop}
                </p>
                <p className="font-[family-name:var(--font-body)] text-[10px] sm:text-xs text-white/30 mt-1">
                  COP &middot; {promo.usd} USD &middot; {promo.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Booking rules — prominent gold card */}
          <div className="fade-in mt-12 rounded-3xl border-2 border-gold/30 bg-gradient-to-br from-gold/[0.08] to-white/[0.03] p-8 sm:p-10 relative overflow-hidden">
            {/* Decorative corner glow */}
            <div
              className="absolute top-0 right-0 w-[200px] h-[200px] pointer-events-none"
              style={{ background: "radial-gradient(ellipse at top right, rgba(201,169,110,0.15) 0%, transparent 70%)" }}
            />

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-gold font-medium">
                  {L(t.bookingRules) as string}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
                {(L(t.rules) as string[]).map((rule) => (
                  <div key={rule} className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-gold/50 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <p className="font-[family-name:var(--font-body)] text-sm text-white/50 leading-relaxed">
                      {rule}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-gold/10">
                <p className="font-[family-name:var(--font-body)] text-xs text-gold/40 italic text-center">
                  {lang === "en"
                    ? "You will be asked to confirm these rules when booking"
                    : "Se te pedirá confirmar estas reglas al reservar"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ BOOKING HIGHLIGHT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-20 md:py-28 bg-charcoal relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(184,119,119,1) 0%, transparent 60%)",
          }}
        />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-white/30 mb-6">
            {L(t.yourNextStep) as string}
          </p>
          <h2
            className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-white mb-4"
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              fontWeight: 300,
            }}
          >
            {L(t.readyToBegin) as string}
          </h2>
          <p className="fade-in fade-in-delay-2 font-[family-name:var(--font-body)] text-white/40 max-w-md mx-auto mb-10">
            {L(t.ctaSub) as string}
          </p>

          <button
            onClick={() => openBooking()}
            className="fade-in fade-in-delay-3 inline-flex items-center gap-3 px-12 py-5 bg-white text-charcoal font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-rose hover:text-white transition-all duration-500 rounded-full"
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

      {/* ━━━ RETREATS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-charcoal/40 mb-4">
              {L(t.immersive) as string}
            </p>
            <h2
              className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-charcoal"
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 300,
              }}
            >
              {L(t.retreatsTitle) as string}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: L(t.retreatTuisyouTitle) as string,
                subtitle: L(t.retreatTuisyouSub) as string,
                description: L(t.retreatTuisyouDesc) as string,
                price: "$2,095 USD · $7.75M COP",
                capacity: L(t.retreatTuisyouCapacity) as string,
                includes: L(t.retreatTuisyouIncludes) as string,
              },
              {
                title: L(t.retreatLeadershipTitle) as string,
                subtitle: L(t.retreatLeadershipSub) as string,
                description: L(t.retreatLeadershipDesc) as string,
                price: "$330 USD · $1.22M COP/hr",
                capacity: L(t.retreatLeadershipCapacity) as string,
                includes: L(t.retreatLeadershipIncludes) as string,
              },
            ].map((retreat, i) => (
              <div
                key={retreat.title}
                className={`fade-in fade-in-delay-${i + 1} booking-glow rounded-3xl overflow-hidden bg-white`}
              >
                <div className="p-8 sm:p-10">
                  <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-rose/60 mb-3">
                    {retreat.subtitle.toUpperCase()}
                  </p>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-charcoal mb-4">
                    {retreat.title}
                  </h3>
                  <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/50 leading-relaxed mb-8">
                    {retreat.description}
                  </p>
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-rose/40" />
                      <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/60">
                        {retreat.capacity}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-1 rounded-full bg-rose/40" />
                      <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/60">
                        {retreat.includes}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-charcoal/5">
                    <span className="font-[family-name:var(--font-display)] text-xl sm:text-2xl text-charcoal">
                      {retreat.price}
                    </span>
                    <button
                      onClick={() => openBooking(retreat.title)}
                      className="font-[family-name:var(--font-body)] text-sm tracking-[0.15em] text-rose hover:text-charcoal transition-colors py-2"
                    >
                      {L(t.inquire) as string}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ TESTIMONIALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32 bg-cream-warm">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="relative min-h-[200px] flex items-center justify-center">
            {testimonials.map((testimonial, i) => (
              <div
                key={testimonial.name}
                className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-700"
                style={{
                  opacity: activeTestimonial === i ? 1 : 0,
                  transform:
                    activeTestimonial === i
                      ? "translateY(0)"
                      : "translateY(12px)",
                  pointerEvents: activeTestimonial === i ? "auto" : "none",
                }}
              >
                <p
                  className="font-[family-name:var(--font-display)] text-charcoal leading-relaxed italic"
                  style={{
                    fontSize: "clamp(1.1rem, 2vw, 1.4rem)",
                    fontWeight: 300,
                  }}
                >
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-8 flex items-center gap-3">
                  <div className="h-px w-8 bg-rose/30" />
                  <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/40">
                    {testimonial.name}, {testimonial.location}
                  </span>
                  <div className="h-px w-8 bg-rose/30" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mt-12">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className="p-3 group"
                aria-label={`Testimonial ${i + 1}`}
              >
                <div
                  className="rounded-full transition-all duration-500"
                  style={{
                    background:
                      activeTestimonial === i
                        ? "rgba(184,119,119,0.6)"
                        : "rgba(44,44,44,0.12)",
                    height: 8,
                    width: activeTestimonial === i ? 28 : 8,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ FINAL CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="fade-in font-[family-name:var(--font-display)] text-charcoal"
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
              fontWeight: 300,
            }}
          >
            {L(t.finalCta) as string}
          </h2>
          <button
            onClick={() => openBooking()}
            className="fade-in fade-in-delay-2 mt-10 px-12 py-5 bg-charcoal text-white font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-rose transition-colors duration-500 rounded-full"
          >
            {L(t.bookYourSession) as string}
          </button>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="pt-16 pb-28 border-t border-charcoal/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            <div>
              <Image
                src="/tu-logo.png"
                alt="TU."
                width={60}
                height={60}
                style={{ objectFit: "contain" }}
              />
              <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-4 max-w-xs">
                {L(t.transformative) as string}
              </p>
            </div>

            <div>
              <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40 mb-4">
                {L(t.connect) as string}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => openBooking()}
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  {L(t.bookASession) as string}
                </button>
                <a
                  href="https://instagram.com/tuisyou"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  Instagram
                </a>
                <a
                  href="https://wa.me/573185083035"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  WhatsApp
                </a>
                <a
                  href="mailto:tata@tuisyou.com"
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  tata@tuisyou.com
                </a>
              </div>
            </div>

            <div>
              <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40 mb-4">
                {L(t.location) as string}
              </p>
              <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/50 leading-relaxed">
                {L(t.casaCarolina) as string}
                <br />
                {L(t.centroHistorico) as string}
                <br />
                {L(t.cartagena) as string}
              </p>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-charcoal/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/30">
              &copy; {new Date().getFullYear()} TU. by Tata Umana
            </p>
            <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/20">
              Built by MachineMind
            </p>
          </div>
        </div>
      </footer>

      {/* ━━━ STICKY BOOK BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          transform: showStickyBar ? "translateY(0)" : "translateY(100%)",
          opacity: showStickyBar ? 1 : 0,
        }}
      >
        <div className="bg-white/90 backdrop-blur-xl border-t border-charcoal/5 px-6 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="font-[family-name:var(--font-display)] text-charcoal text-lg">
                TU. by Tata Umana
              </p>
              <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40">
                {L(t.sessionsFrom) as string} &middot; Cartagena, Colombia
              </p>
            </div>
            <button
              onClick={() => openBooking()}
              className="w-full sm:w-auto px-8 py-3.5 bg-charcoal text-white font-[family-name:var(--font-body)] text-sm tracking-[0.2em] hover:bg-rose transition-colors duration-300 rounded-full"
            >
              {L(t.bookNow) as string}
            </button>
          </div>
        </div>
      </div>

      {/* ━━━ BOOKING MODAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        preselectedService={preselectedService}
        preselectedDate={preselectedDate}
        preselectedTime={preselectedTime}
        services={services}
      />

      {/* ━━━ Floating Elements ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ChatBot />
      <WhatsAppButton />
    </main>
  );
}
