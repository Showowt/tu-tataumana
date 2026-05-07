"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import Lenis from "lenis";
import { createBrowserClient } from "@supabase/ssr";
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
  note?: string;
  teacher?: string;
  desc?: { es: string; en: string };
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
      { time: "9:30 AM", name: "Stress Release", teacher: "Harold", desc: { es: "Libera tensión y estrés a través de movimiento consciente y respiración profunda.", en: "Release tension and stress through conscious movement and deep breathing." } },
      { time: "11:00 AM", name: "Sculpt Your Body", teacher: "Karla", desc: { es: "Tonifica y fortalece tu cuerpo con movimientos precisos y controlados.", en: "Tone and strengthen your body with precise, controlled movements." } },
      { time: "7:15 PM", name: "Open Flow", teacher: "Violeta", desc: { es: "Secuencias fluidas para liberar, expandir y equilibrar tu energía.", en: "Fluid sequences to release, expand and balance your energy." } },
    ],
  },
  {
    day: "Tuesday",
    dayEs: "Martes",
    dayShort: "TUE",
    dayIndex: 2,
    classes: [
      { time: "9:30 AM", name: "Yoga for the Back", teacher: "Tata", desc: { es: "Cuida tu espalda, mejora tu postura y alivia tensiones.", en: "Care for your back, improve your posture and relieve tension." } },
      { time: "5:30 PM", name: "Meditación Viaje Interior", note: "(solo en español)", teacher: "Álvaro", desc: { es: "Meditación guiada para volver a ti y encontrar paz interior.", en: "Guided meditation to return to yourself and find inner peace." } },
      { time: "7:15 PM", name: "Hip Opening · Hatha", teacher: "Alejandro", desc: { es: "Abre tus caderas y libera tensión profunda con posturas conscientes de hatha.", en: "Open your hips and release deep tension with conscious hatha postures." } },
    ],
  },
  {
    day: "Wednesday",
    dayEs: "Miércoles",
    dayShort: "WED",
    dayIndex: 3,
    classes: [
      { time: "9:30 AM", name: "Yogalates", teacher: "Harold", desc: { es: "Fusión de yoga y pilates para fortalecer, estirar y equilibrar.", en: "Fusion of yoga and pilates to strengthen, stretch and balance." } },
      { time: "10:45 AM", name: "Pilates Flow", teacher: "Harold", desc: { es: "Fortalece, alinea y tonifica tu cuerpo con fluidez desde el centro.", en: "Strengthen, align and tone your body with fluidity from the core." } },
      { time: "7:15 PM", name: "Open Flow", teacher: "Violeta", desc: { es: "Secuencias fluidas para liberar, expandir y equilibrar tu energía.", en: "Fluid sequences to release, expand and balance your energy." } },
    ],
  },
  {
    day: "Thursday",
    dayEs: "Jueves",
    dayShort: "THU",
    dayIndex: 4,
    classes: [
      { time: "9:30 AM", name: "Yoga Intro", teacher: "Tata", desc: { es: "Práctica accesible para descubrir el yoga y activar tu cuerpo.", en: "Accessible practice to discover yoga and activate your body." } },
      { time: "5:30 PM", name: "Sound Healing", teacher: "Tata", desc: { es: "Relajación profunda a través de sonidos sanadores que armonizan tu energía.", en: "Deep relaxation through healing sounds that harmonize your energy." } },
      { time: "7:15 PM", name: "Hip Opening", teacher: "Alejandro", desc: { es: "Abre tus caderas y libera tensión profunda con movimiento consciente.", en: "Open your hips and release deep tension with conscious movement." } },
    ],
  },
  {
    day: "Friday",
    dayEs: "Viernes",
    dayShort: "FRI",
    dayIndex: 5,
    classes: [
      { time: "10:00 AM", name: "Power Yoga", teacher: "Tata", desc: { es: "Fuerza, alineación y presencia para activar tu poder interior.", en: "Strength, alignment and presence to activate your inner power." } },
      { time: "7:00 PM", name: "Open Flow", teacher: "Betty & Violeta", desc: { es: "Fluye, suelta y recarga tu energía para cerrar la semana en balance.", en: "Flow, release and recharge your energy to close the week in balance." } },
    ],
  },
  {
    day: "Saturday",
    dayEs: "Sábado",
    dayShort: "SAT",
    dayIndex: 6,
    classes: [
      { time: "11:00 AM", name: "Sun Salutation", teacher: "Tata", desc: { es: "Salud al sol: movimiento consciente para despertar y agradecer.", en: "Sun salute: conscious movement to awaken and give thanks." } },
      { time: "6:00 PM", name: "Meditación Viaje Interior", note: "(solo en español)", teacher: "Álvaro", desc: { es: "Meditación guiada para volver a ti y encontrar paz interior.", en: "Guided meditation to return to yourself and find inner peace." } },
    ],
  },
  {
    day: "Sunday",
    dayEs: "Domingo",
    dayShort: "SUN",
    dayIndex: 0,
    classes: [
      { time: "9:00 AM", name: "Just Hatha Flow", teacher: "Alejandro", desc: { es: "Flujo suave de hatha yoga para conectar cuerpo, mente y respiración.", en: "Gentle hatha yoga flow to connect body, mind and breath." } },
      { time: "10:30 AM", name: "Meditación Viaje Interior", note: "(solo en español)", teacher: "Álvaro", desc: { es: "Un viaje hacia adentro a través de la meditación y la quietud.", en: "A journey inward through meditation and stillness." } },
    ],
  },
];

function getNextDateForDay(dayIndex: number): string {
  // Use Colombia timezone to determine "today"
  const now = new Date();
  const colombiaNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const todayDay = colombiaNow.getDay();
  let daysUntil = dayIndex - todayDay;
  if (daysUntil < 0) daysUntil += 7;
  // daysUntil === 0 means today — show today so users can book same-day classes
  const next = new Date(colombiaNow);
  next.setDate(colombiaNow.getDate() + daysUntil);
  return next.toISOString().split("T")[0];
}

/**
 * Check if a class is bookable — must be at least 2 hours before class time.
 * Uses Colombia timezone (UTC-5, no DST).
 */
function isClassBookable(dateStr: string, timeStr: string): boolean {
  const now = new Date();
  const colombiaNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const todayStr = colombiaNow.toISOString().split("T")[0];

  // Future dates are always bookable
  if (dateStr > todayStr) return true;

  // Past dates are never bookable
  if (dateStr < todayStr) return false;

  // Today — check 2-hour window
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return false;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  const nowMinutes = colombiaNow.getHours() * 60 + colombiaNow.getMinutes();
  const classMinutes = hours * 60 + minutes;
  return (classMinutes - nowMinutes) >= 120;
}

// ─── Teachers ─────────────────────────────────────────────────────────────────

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
      es: "Guardiana de espacios sagrados, gu\u00EDa del alma y del cuerpo que recuerda. Tata te acompa\u00F1a a trav\u00E9s del yoga, la energ\u00EDa, el toque y la palabra, a volver a ti \u2014 a tu verdad, a tu poder, a tu centro. Su ense\u00F1anza es medicina: suave pero firme, m\u00EDstica pero presente, amorosa pero clara. En cada clase, Tata abre portales donde el cuerpo respira, el coraz\u00F3n se calma y el alma florece.",
      en: "Guardian of sacred spaces, guide of the soul and the body that remembers. Tata walks with you through yoga, energy, touch and word, back to yourself \u2014 to your truth, your power, your center. Her teaching is medicine: gentle yet firm, mystical yet present, loving yet clear. In every class, Tata opens portals where the body breathes, the heart calms and the soul blooms.",
    },
    image: "/practice-2.jpg",
    specialties: ["Sound Healing", "Reiki", "Kundalini", "Vinyasa", "Ceremonies"],
    isLead: true,
  },
  {
    name: "Betty Quintana",
    role: { en: "Teacher", es: "Teacher" },
    bio: {
      es: "Psic\u00F3loga e instructora de yoga, Betty gu\u00EDa una pr\u00E1ctica consciente para volver al cuerpo y al momento presente. Sus clases integran meditaci\u00F3n y reprogramaci\u00F3n mental, invitando a soltar el control, reconectar con tu autenticidad y habitarte con m\u00E1s amor.",
      en: "Psychologist and yoga instructor, Betty guides a conscious practice to return to the body and the present moment. Her classes integrate meditation and mental reprogramming, inviting you to release control, reconnect with your authenticity and inhabit yourself with more love.",
    },
    image: "/class-seated.jpg",
    specialties: ["Meditation", "Psychology", "Yoga"],
    isLead: false,
  },
  {
    name: "Violeta",
    role: { en: "Teacher", es: "Teacher" },
    bio: {
      es: "Artista del movimiento y creadora visual, Violeta explora la danza y la sensibilidad del cuerpo en conexi\u00F3n con la tierra, teniendo el yoga como su eje central. Su pr\u00E1ctica integra el trabajo con la fascia y el movimiento consciente, creando espacios donde la presencia, la suavidad y la expresi\u00F3n se encuentran.",
      en: "Movement artist and visual creator, Violeta explores dance and body sensitivity in connection with the earth, with yoga as her central axis. Her practice integrates fascia work and conscious movement, creating spaces where presence, softness and expression meet.",
    },
    image: "/practice-1.jpg",
    specialties: ["Movement", "Fascia", "Dance"],
    isLead: false,
  },
  {
    name: "\u00C1lvaro",
    role: { en: "Teacher", es: "Teacher" },
    bio: {
      es: "A trav\u00E9s de la meditaci\u00F3n y la palabra consciente, \u00C1lvaro gu\u00EDa espacios de conexi\u00F3n profunda con el ser y la salud mental. Integrando su mirada desde la ontolog\u00EDa, acompa\u00F1a procesos de comprensi\u00F3n, liberaci\u00F3n y transformaci\u00F3n interior. Sus encuentros invitan a pausar, respirar y reconectar con lo esencial, cultivando paz, claridad y presencia.",
      en: "Through meditation and conscious word, \u00C1lvaro guides spaces of deep connection with being and mental health. Integrating his perspective from ontology, he accompanies processes of understanding, liberation and inner transformation. His sessions invite you to pause, breathe and reconnect with the essential, cultivating peace, clarity and presence.",
    },
    image: "/class-savasana.jpg",
    specialties: ["Meditation", "Ontology", "Mindfulness"],
    isLead: false,
  },
  {
    name: "Harold",
    role: { en: "Teacher", es: "Teacher" },
    bio: {
      es: "Harold lleva la energía del movimiento consciente a cada clase, guiando prácticas dinámicas que fortalecen el cuerpo y enfocan la mente. Su enseñanza combina disciplina y fluidez para una experiencia transformadora.",
      en: "Harold brings the energy of conscious movement to every class, guiding dynamic practices that strengthen the body and focus the mind. His teaching combines discipline and fluidity for a transformative experience.",
    },
    image: "/class-seated.jpg",
    specialties: ["Vinyasa", "Pilates", "Yoga Flow"],
    isLead: false,
  },
  {
    name: "Alejandro",
    role: { en: "Teacher", es: "Teacher" },
    bio: {
      es: "Alejandro guía prácticas que combinan fuerza y calma, invitando a cada estudiante a explorar su potencial a través de posturas conscientes y respiración profunda.",
      en: "Alejandro guides practices that combine strength and calm, inviting each student to explore their potential through conscious postures and deep breathing.",
    },
    image: "/class-savasana.jpg",
    specialties: ["Hatha", "Power Yoga", "Yoga"],
    isLead: false,
  },
  {
    name: "Karla",
    role: { en: "Teacher", es: "Teacher" },
    bio: {
      es: "Karla crea espacios de práctica amorosos y accesibles, donde cada persona puede conectar con su cuerpo y encontrar equilibrio a su propio ritmo.",
      en: "Karla creates loving and accessible practice spaces where each person can connect with their body and find balance at their own pace.",
    },
    image: "/practice-1.jpg",
    specialties: ["Yoga Flow", "Yoga"],
    isLead: false,
  },
];
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
const WORKSHOP_TARGET = new Date("2026-05-22T23:00:00Z"); // 6:00 PM COT = 23:00 UTC

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

    const children = el.querySelectorAll(".fade-in, .clip-reveal, .clip-reveal-left, .clip-reveal-up, .blur-in, .line-draw, .text-reveal, .stagger-reveal");
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, []);

  return ref;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselectedService, setPreselectedService] = useState("");
  const [preselectedDate, setPreselectedDate] = useState("");
  const [preselectedTime, setPreselectedTime] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  // Lenis smooth scroll — buttery scroll feel
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  // Show sticky bar + scroll progress
  useEffect(() => {
    const handler = () => {
      setShowStickyBar(window.scrollY > window.innerHeight * 0.7);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? Math.min(window.scrollY / docHeight, 1) : 0);
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

  // Hero parallax on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroVideo = document.querySelector('.hero-video') as HTMLElement;
      if (heroVideo && scrollY < window.innerHeight) {
        heroVideo.style.transform = `scale(${1.02 + scrollY * 0.0003})`;
        heroVideo.style.opacity = `${Math.max(0, 1 - scrollY / (window.innerHeight * 1.2))}`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch closed dates
  useEffect(() => {
    fetch("/api/admin/closed-dates")
      .then((r) => r.json())
      .then((json) => setClosedDates((json.data || []).map((d: { date: string }) => d.date)))
      .catch(() => {});
  }, []);

  // Check auth state
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
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
    <main ref={sectionsRef} className="w-full overflow-x-hidden">
      {/* ━━━ SCROLL PROGRESS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        className="scroll-progress"
        style={{ transform: `scaleX(${scrollProgress})`, opacity: showStickyBar ? 1 : 0 }}
      />

      {/* ━━━ STICKY NAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav
        className={`nav-sticky fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-5 md:px-8 border-b ${
          showStickyBar
            ? "bg-cream/90 backdrop-blur-xl border-charcoal/5 shadow-[0_1px_20px_rgba(0,0,0,0.04)]"
            : "bg-transparent border-transparent"
        }`}
        style={{ height: 56 }}
      >
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2.5 group"
          aria-label="Scroll to top"
        >
          <Image
            src="/tu-logo.png"
            alt="TU."
            width={28}
            height={28}
            className={`transition-all duration-500 ${showStickyBar ? "opacity-100" : "opacity-0 -translate-y-2"}`}
            style={{ objectFit: "contain" }}
          />
          <span
            className={`font-[family-name:var(--font-display)] text-sm tracking-[0.15em] transition-all duration-500 ${
              showStickyBar ? "text-charcoal/70 opacity-100" : "text-white/80 opacity-0 -translate-y-2"
            }`}
            style={{ fontWeight: 300 }}
          >
            TATA UMANA
          </span>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openBooking()}
            className={`px-4 py-1.5 rounded-full font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] transition-all duration-500 ${
              showStickyBar
                ? "bg-rose text-white hover:bg-charcoal opacity-100 translate-y-0"
                : "bg-white/15 backdrop-blur-md text-white hover:bg-white/25 opacity-0 translate-y-2 pointer-events-none"
            }`}
            style={{ minHeight: 36 }}
          >
            {lang === "en" ? "BOOK NOW" : "RESERVAR"}
          </button>
          <Link
            href={isLoggedIn ? "/portal" : "/login"}
            className={`px-3.5 py-1.5 rounded-full backdrop-blur-md border font-[family-name:var(--font-body)] text-[10px] tracking-[0.15em] no-underline transition-all duration-500 ${
              showStickyBar
                ? "bg-charcoal/5 border-charcoal/8 text-charcoal/60 hover:bg-charcoal/10"
                : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
            }`}
            style={{ minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {isLoggedIn
              ? lang === "en" ? "My Account" : "Mi Cuenta"
              : lang === "en" ? "Sign In" : "Entrar"}
          </Link>
          <button
            onClick={() => setLang(lang === "en" ? "es" : "en")}
            className={`px-2.5 py-1.5 rounded-full backdrop-blur-md border font-[family-name:var(--font-body)] text-[10px] tracking-[0.15em] transition-all duration-500 ${
              showStickyBar
                ? "bg-charcoal/5 border-charcoal/8 text-charcoal/60 hover:bg-charcoal/10"
                : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
            }`}
            style={{ minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label="Toggle language"
          >
            {lang === "en" ? "ES" : "EN"}
          </button>
        </div>
      </nav>

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
              transition:
                "opacity 1.2s ease 1.2s, transform 1.2s ease 1.2s",
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

      {/* ━━━ MAY EVENTS — Two-column: TU Naturaleza + Mayo Mes Mamá ━━━━━━━━ */}
      {!workshopPassed && (
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
                  {lang === "en" ? "MAY EVENTS" : "EVENTOS DE MAYO"}
                </span>
              </div>
            </div>

            {/* Two-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

              {/* LEFT — TU Naturaleza Habla (May 22) */}
              <div className="fade-in rounded-2xl border border-gold/20 bg-white/[0.03] overflow-hidden flex flex-col">
                <div className="relative aspect-[3/4] max-h-[500px]">
                  <Image
                    src="/event-may22.png"
                    alt="TU Naturaleza Habla — Sound healing event May 22 at Casa Carolina Cartagena"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div className="p-6 md:p-8 flex flex-col flex-1">
                  {/* Countdown */}
                  <div className="flex items-center justify-center gap-3 mb-6">
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
                    <a
                      href="https://checkout.wompi.co/l/h3WPfP"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-tactile w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-gold text-charcoal font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-white transition-all duration-500 rounded-full"
                    >
                      {L(t.workshopReserve) as string}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </a>
                    <p className="font-[family-name:var(--font-body)] text-[10px] text-white/25 text-center mt-3">
                      {L(t.workshopLimited) as string}
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT — Mayo Mes Mamá Promo */}
              <div className="fade-in fade-in-delay-1 rounded-2xl border border-rose-soft/20 bg-white/[0.03] overflow-hidden flex flex-col">
                <div className="relative aspect-[3/4] max-h-[500px]">
                  <Image
                    src="/promo-mothers.png"
                    alt="Edición Especial Mamás — Mother's Month 4 classes for $160,000 COP at JustbYoga Cartagena"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div className="p-6 md:p-8 flex flex-col flex-1">
                  <div className="mt-auto">
                    <button
                      onClick={() => openBooking(lang === "en" ? "Mayo Mes Mamá — 4 Classes" : "Mayo Mes Mamá — 4 Clases")}
                      className="btn-tactile w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-rose-soft text-white font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-white hover:text-charcoal transition-all duration-500 rounded-full"
                    >
                      {lang === "en" ? "RESERVE PROMO" : "RESERVAR PROMO"}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                    <p className="font-[family-name:var(--font-body)] text-[10px] text-white/25 text-center mt-3">
                      {lang === "en" ? "Valid for May 2026" : "Válido para mayo 2026"}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ━━━ PHILOSOPHY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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

      {/* ━━━ AS FEATURED IN — Editorial Press Section ━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <p className="fade-in font-[family-name:var(--font-body)] text-[10px] tracking-[0.4em] text-charcoal/30 text-center mb-10">
            {lang === "en" ? "AS FEATURED IN" : "DESTACADA EN"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Vogue */}
            <a
              href="https://www.vogue.com/article/cartagena-wellness-destination"
              target="_blank"
              rel="noopener noreferrer"
              className="fade-in group relative flex flex-col p-8 md:p-10 rounded-2xl border border-charcoal/5 bg-white hover:border-rose/20 hover:shadow-xl hover:shadow-rose/5 transition-all duration-500"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="font-[family-name:var(--font-display)] text-2xl md:text-3xl tracking-[0.15em] text-charcoal/80 group-hover:text-charcoal transition-colors" style={{ fontWeight: 300 }}>
                  VOGUE
                </span>
                <div className="h-px flex-1 bg-charcoal/5 group-hover:bg-rose/15 transition-colors" />
                <svg className="w-4 h-4 text-charcoal/15 group-hover:text-rose group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg md:text-xl text-charcoal/70 group-hover:text-charcoal transition-colors leading-relaxed" style={{ fontWeight: 300 }}>
                {lang === "en"
                  ? "Cartagena as a Wellness Destination"
                  : "Cartagena como Destino de Bienestar"}
              </h3>
              <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/35 mt-3 leading-relaxed">
                {lang === "en"
                  ? "How Tata Umana and Casa Carolina are redefining holistic wellness in Colombia's most storied city."
                  : "Cómo Tata Umaña y Casa Carolina están redefiniendo el bienestar holístico en la ciudad más histórica de Colombia."}
              </p>
              <span className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-rose/0 group-hover:text-rose/60 transition-all mt-5">
                {lang === "en" ? "READ ARTICLE" : "LEER ARTÍCULO"}
              </span>
            </a>

            {/* Diners */}
            <a
              href="https://revistadiners.com.co/estilo-de-vida/casa-carolina-el-patrimonio-historico-de-cartagena-que-renacio-junto-a-su-duena/"
              target="_blank"
              rel="noopener noreferrer"
              className="fade-in fade-in-delay-1 group relative flex flex-col p-8 md:p-10 rounded-2xl border border-charcoal/5 bg-white hover:border-gold/20 hover:shadow-xl hover:shadow-gold/5 transition-all duration-500"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="font-[family-name:var(--font-display)] text-2xl md:text-3xl tracking-[0.15em] text-charcoal/80 group-hover:text-charcoal transition-colors" style={{ fontWeight: 300 }}>
                  DINERS
                </span>
                <div className="h-px flex-1 bg-charcoal/5 group-hover:bg-gold/15 transition-colors" />
                <svg className="w-4 h-4 text-charcoal/15 group-hover:text-gold group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg md:text-xl text-charcoal/70 group-hover:text-charcoal transition-colors leading-relaxed" style={{ fontWeight: 300 }}>
                {lang === "en"
                  ? "Casa Carolina: The Historic Heritage That Was Reborn"
                  : "Casa Carolina: El Patrimonio Histórico que Renació"}
              </h3>
              <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/35 mt-3 leading-relaxed">
                {lang === "en"
                  ? "The story of how a colonial Cartagena mansion became a sanctuary for transformation, guided by its visionary owner."
                  : "La historia de cómo una mansión colonial de Cartagena se convirtió en un santuario de transformación, guiado por su visionaria dueña."}
              </p>
              <span className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-gold/0 group-hover:text-gold/60 transition-all mt-5">
                {lang === "en" ? "READ ARTICLE" : "LEER ARTÍCULO"}
              </span>
            </a>
          </div>
        </div>
      </section>

      <div className="divider-gold my-0" />

      {/* ━━━ THE PRACTICE — Glass Gallery ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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

      <div className="divider-gold my-0" />

      {/* ━━━ SERVICES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="services" className="py-24 md:py-32 bg-cream">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-reveal">
            {services.map((service, i) => (
              <div
                key={service.name}
                className={`fade-in fade-in-delay-${Math.min(i + 1, 5)} service-card group relative p-6 sm:p-8 ${i % 3 === 1 ? 'rounded-none' : 'rounded-2xl'} border border-charcoal/5 bg-white cursor-pointer`}
                onClick={() => window.open(`https://wa.me/573185083035?text=${encodeURIComponent(`Hola Tata! Me interesa ${lang === "en" ? service.name : service.nameEs}. ¿Tienes disponibilidad? / I'm interested in ${service.name}. Do you have availability?`)}`, "_blank")}
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

      {/* Warm gradient into dark schedule */}
      <div className="section-fade-to-dark" />

      {/* ━━━ WEEKLY SCHEDULE — Cinematic Dark Section ━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="schedule" className="relative py-24 md:py-32 bg-charcoal overflow-clip grain-overlay">
        {/* Background video */}
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            style={{ opacity: 0.15, filter: "brightness(0.8) saturate(1.2)", transform: "scale(1.25)", transformOrigin: "center 25%" }}
          >
            <source src="/schedule-video.mp4" type="video/mp4" />
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

        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
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
            <p className="fade-in fade-in-delay-3 font-[family-name:var(--font-body)] text-[11px] text-gold/40 mt-3 italic">
              {lang === "en"
                ? "Bilingual classes except Meditación Viaje Interior (solo en español)"
                : "Clases bilingües excepto Meditación Viaje Interior (solo en español)"}
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
                style={{ filter: "brightness(0.95) contrast(1.05) saturate(1.1)", transform: "scale(1.25)", transformOrigin: "center 25%" }}
              >
                <source src="/schedule-video.mp4" type="video/mp4" />
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
                  onClick={() => document.getElementById("schedule-grid")?.scrollIntoView({ behavior: "smooth" })}
                  className="hidden sm:block px-6 py-3 rounded-full border border-white/20 text-white font-[family-name:var(--font-body)] text-xs tracking-[0.2em] hover:bg-white hover:text-charcoal transition-all duration-500"
                >
                  {L(t.bookNow) as string}
                </button>
              </div>
            </div>
          </div>

          {/* Schedule grid */}
          <div id="schedule-grid"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-reveal">
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
                    {day.classes.map((cls, clsIdx) => {
                      const bookable = !isClosed && isClassBookable(nextDate, cls.time);
                      return (
                      <button
                        key={`${day.day}-${clsIdx}`}
                        disabled={!bookable}
                        onClick={() =>
                          bookable && openBooking(
                            cls.name,
                            nextDate,
                            cls.time
                          )
                        }
                        className={`w-full px-5 py-4 flex items-start gap-4 group transition-all duration-300 text-left ${!bookable ? "cursor-not-allowed" : "hover:bg-white/[0.04]"}`}
                      >
                        {/* Time */}
                        <span className={`font-[family-name:var(--font-body)] text-sm w-[76px] tabular-nums shrink-0 pt-0.5 ${!bookable ? "text-white/15" : "text-gold/50"}`}>
                          {cls.time}
                        </span>

                        {/* Class info */}
                        <span className="flex-1 min-w-0">
                          {/* Row 1: Class name + teacher */}
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className={`font-[family-name:var(--font-display)] text-[15px] md:text-base transition-colors duration-300 ${!bookable ? "text-white/25" : "text-white/80 group-hover:text-rose-soft"}`}>
                              {cls.name}
                            </span>
                            {cls.note && <span className={`text-[11px] ${!bookable ? "text-white/10" : "text-gold/50"}`}>{cls.note}</span>}
                            {cls.teacher && (
                              <span className={`font-[family-name:var(--font-display)] italic text-[13px] ${!bookable ? "text-white/10" : "text-white/25"}`}>
                                con {cls.teacher}
                              </span>
                            )}
                          </span>
                          {/* Row 2: Description */}
                          {cls.desc && (
                            <span className={`block mt-1 font-[family-name:var(--font-body)] text-[11px] md:text-[12px] leading-relaxed ${!bookable ? "text-white/8" : "text-white/25"}`}>
                              {cls.desc[lang]}
                            </span>
                          )}
                        </span>

                        {/* Arrow */}
                        {bookable && (
                        <svg
                          className="w-3.5 h-3.5 shrink-0 mt-1 text-white/0 group-hover:text-gold/60 transition-all duration-300 group-hover:translate-x-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        )}
                      </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {/* Pricing cards */}
          <div className="fade-in mt-12 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 stagger-reveal">
            {[
              { label: "WALK-IN CLASS", cop: "$80,000", usd: "$22", sub: lang === "en" ? "Single class" : "Clase individual", featured: false },
              { label: "PROMO 2x1", cop: "$80,000", usd: "$22", sub: lang === "en" ? "Bring a friend" : "Trae un amigo", featured: false },
              { label: "MARTES INDUSTRIA", cop: "$45,000", usd: "$12", sub: lang === "en" ? "Tuesdays only" : "Solo martes", featured: false },
              { label: "VIERNES OPEN FLOW", cop: "$45,000", usd: "$12", sub: lang === "en" ? "Fridays only" : "Solo viernes", featured: false },
              { label: "PRIVATE SESSION", cop: "$190,000", usd: "$51", sub: lang === "en" ? "One on One Experience" : "Experiencia Uno a Uno", featured: false },
              { label: "MAYO MES MAMÁ", cop: "$160,000", usd: "$43", sub: lang === "en" ? "Mother's Month · 4 classes" : "Mes de las Madres · 4 clases", featured: true },
            ].map((promo) => (
              <button
                key={promo.label}
                onClick={() => openBooking(promo.label)}
                className={`btn-tactile schedule-promo-card rounded-2xl border p-4 sm:p-5 text-center transition-all duration-500 cursor-pointer ${
                  promo.featured
                    ? "border-gold bg-gold/[0.15] col-span-2 sm:col-span-1 ring-2 ring-gold/30 shadow-lg shadow-gold/10"
                    : "border-gold/10 bg-white/[0.03] hover:border-gold/30 hover:bg-white/[0.06]"
                }`}
              >
                {promo.featured && (
                  <span className="inline-block mb-2 px-2 py-0.5 bg-gold/20 text-gold text-[7px] tracking-[0.2em] rounded-full font-[family-name:var(--font-body)] gold-breath">
                    {lang === "en" ? "PROMO OF THE MONTH" : "PROMO DEL MES"}
                  </span>
                )}
                <p className={`font-[family-name:var(--font-body)] text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] mb-2 ${promo.featured ? "text-gold" : "text-gold/70"}`}>
                  {promo.label}
                </p>
                <p className="font-[family-name:var(--font-display)] text-xl sm:text-2xl text-white">
                  {promo.cop}
                </p>
                <p className="font-[family-name:var(--font-body)] text-[10px] sm:text-xs text-white/30 mt-1">
                  COP &middot; {promo.usd} USD &middot; {promo.sub}
                </p>
                <p className="font-[family-name:var(--font-body)] text-[9px] tracking-[0.15em] text-gold/50 mt-3 hover:text-gold transition-colors">
                  {lang === "en" ? "BOOK NOW" : "RESERVAR"}
                </p>
              </button>
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
              <button
                key={promo.label}
                onClick={() => openBooking(promo.label)}
                className="btn-tactile schedule-promo-card rounded-2xl border border-gold/10 bg-white/[0.03] p-4 sm:p-5 text-center hover:border-gold/30 hover:bg-white/[0.06] transition-all duration-500 cursor-pointer"
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
                <p className="font-[family-name:var(--font-body)] text-[9px] tracking-[0.15em] text-gold/50 mt-3 hover:text-gold transition-colors">
                  {lang === "en" ? "BOOK NOW" : "RESERVAR"}
                </p>
              </button>
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

      {/* Warm gradient out of dark schedule */}
      <div className="section-fade-from-dark" />

      {/* ━━━ MEET OUR TEACHERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
                    30+ {lang === "en" ? "YEARS" : "A\u00D1OS"}
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

      {/* ━━━ PAYMENT METHODS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="payment" className="py-20 md:py-28 bg-cream-warm">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-charcoal/40 mb-4">
              {L(t.paymentLabel) as string}
            </p>
            <h2
              className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-charcoal"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300 }}
            >
              {L(t.paymentTitle) as string}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-reveal">
            {/* Wompi — Card Payment */}
            <a
              href="https://checkout.wompi.co/l/h3WPfP"
              target="_blank"
              rel="noopener noreferrer"
              className="fade-in fade-in-delay-1 group flex items-center gap-5 p-6 rounded-2xl border-2 border-gold/25 bg-white hover:border-gold/50 hover:shadow-lg transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center shrink-0 group-hover:bg-gold/25 transition-colors">
                <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                  Credit / Debit Card
                </p>
                <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-0.5">
                  {L(t.paymentCardDesc) as string}
                </p>
                <p className="font-[family-name:var(--font-body)] text-[10px] text-rose/50 mt-0.5">
                  {lang === "en" ? "+4% processing fee applies" : "+4% comisión de procesamiento"}
                </p>
              </div>
              <svg className="w-5 h-5 text-charcoal/20 group-hover:text-gold group-hover:translate-x-1 transition-all shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </a>

            {/* Nequi */}
            <div className="fade-in fade-in-delay-2 flex items-center gap-5 p-6 rounded-2xl border border-charcoal/8 bg-white">
              <div className="w-12 h-12 rounded-full bg-[#E6007E]/10 flex items-center justify-center shrink-0">
                <span className="font-[family-name:var(--font-body)] text-sm font-bold text-[#E6007E]">N</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                  Nequi
                </p>
                <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-0.5">
                  {L(t.paymentNequiDesc) as string}
                </p>
              </div>
              <p className="font-mono text-sm text-charcoal/70 shrink-0">3185083035</p>
            </div>

            {/* Bancolombia */}
            <div className="fade-in fade-in-delay-3 flex items-center gap-5 p-6 rounded-2xl border border-charcoal/8 bg-white">
              <div className="w-12 h-12 rounded-full bg-[#FDDA24]/20 flex items-center justify-center shrink-0">
                <span className="font-[family-name:var(--font-body)] text-sm font-bold text-[#0033A0]">B</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                  Bancolombia
                </p>
                <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-0.5">
                  {L(t.paymentBancoDesc) as string}
                </p>
              </div>
              <p className="font-mono text-sm text-charcoal/70 shrink-0">207-859047-00</p>
            </div>

            {/* Zelle / PayPal */}
            <div className="fade-in fade-in-delay-4 flex items-center gap-5 p-6 rounded-2xl border border-charcoal/8 bg-white">
              <div className="w-12 h-12 rounded-full bg-[#6C3EC1]/10 flex items-center justify-center shrink-0">
                <span className="font-[family-name:var(--font-body)] text-sm font-bold text-[#6C3EC1]">Z</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                  Zelle / PayPal
                </p>
                <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-0.5">
                  {L(t.paymentZelleDesc) as string}
                </p>
              </div>
              <p className="font-mono text-sm text-charcoal/70 shrink-0">+1 917 453 8307</p>
            </div>
          </div>

          {/* Receipt notice */}
          <div className="fade-in fade-in-delay-5 mt-6 text-center">
            <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40">
              {L(t.paymentReceipt) as string}:{" "}
              <a href="https://wa.me/573185083035" target="_blank" rel="noopener noreferrer" className="text-rose hover:text-rose-soft underline underline-offset-2 transition-colors">
                +57 318 508 3035
              </a>
            </p>
          </div>
        </div>
      </section>

      <div className="section-fade-to-dark" />

      {/* ━━━ BOOKING HIGHLIGHT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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

      <div className="section-fade-from-dark" />

      {/* ━━━ RETREATS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="retreats" className="py-32 md:py-44">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
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
                      onClick={() => window.open(`https://wa.me/573185083035?text=${encodeURIComponent(`Hola Tata! Me interesa ${retreat.title}. ¿Puedes darme más información? / I'm interested in ${retreat.title}. Can you give me more info?`)}`, "_blank")}
                      className="btn-tactile font-[family-name:var(--font-body)] text-sm tracking-[0.15em] text-rose hover:text-charcoal transition-colors py-2"
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
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="relative min-h-[200px] flex items-center justify-center quote-accent">
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
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2
            className="fade-in font-[family-name:var(--font-display)] text-charcoal"
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
              fontWeight: 300,
            }}
          >
            {L(t.finalCta) as string}
          </h2>
          <div className="fade-in fade-in-delay-2 mt-10 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
              className="btn-tactile px-10 py-5 bg-charcoal text-white font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-rose transition-colors duration-500 rounded-full"
            >
              {L(t.enquireWithTata) as string}
            </button>
            <button
              onClick={() => document.getElementById("schedule")?.scrollIntoView({ behavior: "smooth" })}
              className="btn-tactile px-10 py-5 border-2 border-gold text-gold font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-gold hover:text-charcoal transition-colors duration-500 rounded-full"
            >
              {L(t.bookYourClass) as string}
            </button>
          </div>
        </div>
      </section>

      {/* ━━━ INSTAGRAM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="pt-16 pb-36 border-t border-charcoal/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
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
                  @tuisyou
                </a>
                <a
                  href="https://instagram.com/justbyogabytuisyou"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  @justbyogabytuisyou
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
                <a
                  href="/portal"
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  {lang === "en" ? "My Account" : "Mi Cuenta"}
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
              <div className="mt-4">
                <p className="font-[family-name:var(--font-body)] text-[9px] tracking-[0.15em] text-gold/70 mb-2">
                  JUSTBYOGA BY TUISYOU
                </p>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3924.0!2d-75.5506!3d10.4236!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTDCsDI1JzI1LjAiTiA3NcKwMzMnMDIuMiJX!5e0!3m2!1sen!2sco!4v1"
                  width="100%"
                  height="160"
                  style={{ border: 0, borderRadius: "8px", opacity: 0.9 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="JUSTBYOGA BY TUISYOU - Casa Carolina, Cartagena"
                />
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-charcoal/5">
            <div className="divider-gold mb-8" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/30">
                  &copy; {new Date().getFullYear()} TU. by Tata Umana
                </p>
                <span className="text-charcoal/10">&middot;</span>
                <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.15em] text-gold/30">
                  JUSTBYOGA BY TUISYOU
                </p>
              </div>
              <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/20">
                Built by MachineMind
              </p>
            </div>
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
        <div className="bg-white/90 backdrop-blur-xl border-t border-charcoal/5 px-6 lg:px-8 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
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
              className="btn-tactile w-full sm:w-auto px-8 py-3.5 bg-charcoal text-white font-[family-name:var(--font-body)] text-sm tracking-[0.2em] hover:bg-rose transition-colors duration-300 rounded-full"
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
