"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

// Signature components (client-only)
const TULogoAliveNew = dynamic(() => import("@/components/TULogoAliveNew"), {
  ssr: false,
});
const AuroraGlow = dynamic(() => import("@/components/AuroraGlow"), {
  ssr: false,
});
const ChakraNavigation = dynamic(
  () => import("@/components/ChakraNavigation"),
  { ssr: false },
);
const MoonPhase = dynamic(() => import("@/components/MoonPhase"), {
  ssr: false,
});
const SoundWaveVisualizer = dynamic(
  () => import("@/components/SoundWaveVisualizer"),
  { ssr: false },
);
const ConsoleEasterEgg = dynamic(
  () => import("@/components/ConsoleEasterEgg"),
  { ssr: false },
);
const WhatsAppButton = dynamic(() => import("@/components/WhatsAppButton"), {
  ssr: false,
});
const KonamiEasterEgg = dynamic(() => import("@/components/KonamiEasterEgg"), {
  ssr: false,
});
const ChatBot = dynamic(() => import("@/components/ChatBot"), {
  ssr: false,
});
const ScrollProgress = dynamic(() => import("@/components/ScrollProgress"), {
  ssr: false,
});
const BreathingGuide = dynamic(() => import("@/components/BreathingGuide"), {
  ssr: false,
});
const CursorTrail = dynamic(() => import("@/components/CursorTrail"), {
  ssr: false,
});
// Cinematic Enhancement Components
const CinematicLoader = dynamic(() => import("@/components/CinematicLoader"), {
  ssr: false,
});
const MagneticButton = dynamic(() => import("@/components/MagneticButton"), {
  ssr: false,
});
const LotusSpinner = dynamic(() => import("@/components/LotusSpinner"), {
  ssr: false,
});
const JustbYogaAcademy = dynamic(
  () => import("@/components/JustbYogaAcademy"),
  { ssr: false },
);

// Custom service icons - elegant SVG symbols instead of emojis
const ServiceIcon = ({
  type,
  className = "",
}: {
  type: string;
  className?: string;
}) => {
  const icons: Record<string, React.ReactElement> = {
    yoga: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={className}
        strokeWidth="1.5"
      >
        <circle cx="24" cy="10" r="4" stroke="currentColor" />
        <path
          d="M24 14v10M24 24l-8 12M24 24l8 12M16 20l8 4 8-4"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </svg>
    ),
    sound: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={className}
        strokeWidth="1.5"
      >
        <circle cx="24" cy="24" r="6" stroke="currentColor" />
        <path
          d="M24 6v4M24 38v4M6 24h4M38 24h4"
          stroke="currentColor"
          strokeLinecap="round"
        />
        <circle cx="24" cy="24" r="14" stroke="currentColor" opacity="0.4" />
        <circle cx="24" cy="24" r="20" stroke="currentColor" opacity="0.2" />
      </svg>
    ),
    energy: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={className}
        strokeWidth="1.5"
      >
        <path
          d="M24 4l-4 16h8l-4 24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="24" r="18" stroke="currentColor" opacity="0.3" />
      </svg>
    ),
    moon: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={className}
        strokeWidth="1.5"
      >
        <path
          d="M36 24c0 8-6.5 14.5-14.5 14.5A14.5 14.5 0 017 24c0-8 6.5-14.5 14.5-14.5 0 0-5.5 6-5.5 14.5s5.5 14.5 5.5 14.5"
          stroke="currentColor"
          strokeLinecap="round"
        />
        <circle cx="34" cy="12" r="1.5" fill="currentColor" />
        <circle cx="40" cy="20" r="1" fill="currentColor" />
      </svg>
    ),
    transform: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={className}
        strokeWidth="1.5"
      >
        <path
          d="M8 24c0-8.8 7.2-16 16-16M40 24c0 8.8-7.2 16-16 16"
          stroke="currentColor"
          strokeLinecap="round"
        />
        <path
          d="M24 8l4-4M24 8l-4-4M24 40l4 4M24 40l-4 4"
          stroke="currentColor"
          strokeLinecap="round"
        />
        <circle cx="24" cy="24" r="4" stroke="currentColor" />
      </svg>
    ),
    group: (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={className}
        strokeWidth="1.5"
      >
        <circle cx="24" cy="14" r="5" stroke="currentColor" />
        <circle cx="12" cy="18" r="4" stroke="currentColor" opacity="0.6" />
        <circle cx="36" cy="18" r="4" stroke="currentColor" opacity="0.6" />
        <path
          d="M16 36c0-4.4 3.6-8 8-8s8 3.6 8 8"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </svg>
    ),
  };
  return icons[type] || null;
};

const services = [
  {
    icon: "yoga",
    name: "Private Yoga",
    nameEs: "Yoga Privado",
    desc: "Personalized 1-on-1 sessions in Hatha, Vinyasa, Kundalini, Yin, or Ashtanga — tailored to your body, your breath, your intention.",
    descEs:
      "Sesiones personalizadas 1-a-1 en Hatha, Vinyasa, Kundalini, Yin o Ashtanga.",
    price: "From $95",
    duration: "60-90 min",
    featured: false,
  },
  {
    icon: "sound",
    name: "Sound Healing",
    nameEs: "Sanación con Sonido",
    desc: "Crystal bowls, tuning forks, and ancestral instruments guide you into deep restoration. More than relaxation — cellular reprogramming.",
    descEs: "Cuencos de cristal, diapasones e instrumentos ancestrales.",
    price: "From $120",
    duration: "75 min",
    featured: true,
  },
  {
    icon: "energy",
    name: "Reiki & IET",
    nameEs: "Reiki & Terapia Energética",
    desc: "Integrated Energy Therapy and Reiki to release stored trauma, clear energetic blocks, and restore your natural flow.",
    descEs:
      "Liberar traumas, limpiar bloqueos energéticos y restaurar tu flujo natural.",
    price: "From $110",
    duration: "60 min",
    featured: false,
  },
  {
    icon: "moon",
    name: "Sacred Ceremonies",
    nameEs: "Ceremonias Sagradas",
    desc: "Intention-setting rituals, cacao ceremonies, and full moon gatherings held in the sacred spaces of Cartagena.",
    descEs:
      "Rituales de intención, ceremonias de cacao y reuniones de luna llena.",
    price: "From $150",
    duration: "2-3 hours",
    featured: true,
  },
  {
    icon: "transform",
    name: "Body Reprogramming",
    nameEs: "Reprogramación Corporal",
    desc: "A comprehensive multi-modality experience combining yoga, breathwork, sound, energy work, and Ayurvedic principles.",
    descEs:
      "Una experiencia integral que combina yoga, respiración, sonido y Ayurveda.",
    price: "From $250",
    duration: "3 hours",
    featured: false,
  },
  {
    icon: "group",
    name: "Group Journeys",
    nameEs: "Viajes Grupales",
    desc: "For private groups traveling nationally and internationally — curated wellness journeys for 2-20 people.",
    descEs: "Para grupos privados que viajan — viajes de bienestar curados.",
    price: "Custom",
    duration: "Custom",
    featured: false,
  },
];

const credentials = [
  { label: "Practice", value: "23+", suffix: "Years", icon: "✦" },
  { label: "Reiki", value: "Master", suffix: "Level", icon: "◈" },
  {
    label: "Education",
    value: "Master's",
    suffix: "in Luxury Goods",
    icon: "◇",
  },
  {
    label: "Certifications",
    value: "IET, NLP",
    suffix: "& Ayurveda",
    icon: "❋",
  },
  {
    label: "Role",
    value: "Lead",
    suffix: "Instructor, Casa Carolina",
    icon: "◎",
  },
];

const pressLogos = [
  { name: "VOGUE", style: "italic" },
  { name: "FORBES", style: "normal" },
  { name: "DINERS", style: "italic" },
];

const testimonials = [
  {
    text: "Tata's presence alone is healing. Her sound healing session rewired something deep inside me. I flew from New York just to work with her.",
    author: "Sarah M.",
    location: "New York",
    initials: "SM",
  },
  {
    text: "In 23 years of yoga practice, I've never experienced a teacher with Tata's depth of knowledge and intuitive understanding.",
    author: "James R.",
    location: "London",
    initials: "JR",
  },
  {
    text: "The cacao ceremony was transformative. Tata creates a space where you feel safe to release what you've been carrying.",
    author: "María L.",
    location: "Bogotá",
    initials: "ML",
  },
];

export default function Home() {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set(),
  );
  const [bookingStep, setBookingStep] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [contentReady, setContentReady] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Handle cinematic loader completion
  const handleLoaderComplete = useCallback(() => {
    setIsLoading(false);
    // Small delay before revealing content for smooth transition
    setTimeout(() => setContentReady(true), 100);
  }, []);

  // Intersection observer for reveal animations
  useEffect(() => {
    if (!contentReady) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" },
    );

    document.querySelectorAll("[data-reveal]").forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [contentReady]);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const isVisible = (id: string) => visibleSections.has(id);

  const bookingSteps = ["Service", "Schedule", "Details", "Confirm"];

  return (
    <div className="relative bg-cream min-h-screen">
      {/* Cinematic Page Load Sequence */}
      {isLoading && (
        <CinematicLoader onComplete={handleLoaderComplete} minDuration={2800} />
      )}

      {/* Signature Experience Components */}
      <AuroraGlow />
      <KonamiEasterEgg />
      <ChakraNavigation />
      <ConsoleEasterEgg />
      <WhatsAppButton />
      <ChatBot />
      <ScrollProgress />
      <BreathingGuide />
      <CursorTrail />

      {/* ═══════════════════════════════════════════════════════════════════
          NAVIGATION — Refined minimal with animated logo
          ═══════════════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-3 md:px-6 md:py-5 lg:px-12">
        <div className="glass-dark max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <a
            href="#hero"
            className="flex items-center gap-3 md:gap-4 group min-h-[44px]"
          >
            <TULogoAliveNew
              size={36}
              variant="rose"
              showText={false}
              interactive={false}
            />
            <div className="hidden sm:block">
              <span className="font-body text-[10px] md:text-[11px] tracking-[0.3em] text-rose-soft block">
                TATA UMAÑA
              </span>
              <span className="font-body text-[8px] md:text-[9px] tracking-[0.2em] text-cream/40">
                WELLNESS CURATOR
              </span>
            </div>
          </a>

          <div className="hidden lg:flex items-center gap-12">
            {[
              { label: "About", href: "#about" },
              { label: "Services", href: "#services" },
              { label: "Retreats", href: "#retreats" },
              { label: "Digital", href: "#content" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="font-body text-[11px] tracking-[0.15em] text-cream/60 hover:text-rose-soft focus-visible:text-rose-soft transition-colors relative group py-2 outline-none"
              >
                {item.label.toUpperCase()}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-rose-soft transition-all duration-300 group-hover:w-full group-focus-visible:w-full" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="hidden sm:block">
              <MoonPhase />
            </div>
            <a
              href="#book"
              className="font-body text-[10px] md:text-[11px] tracking-[0.1em] bg-rose-deep hover:bg-rose-soft text-cream px-5 md:px-6 py-3 transition-all duration-300 min-h-[44px] flex items-center active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
            >
              RESERVE
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO — Editorial asymmetric layout with animated logo
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="min-h-screen flex items-center justify-center relative overflow-hidden bg-charcoal"
      >
        {/* Subtle texture */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, #D4A5A5 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal via-transparent to-charcoal opacity-60" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-rose-deep/5 to-transparent" />

        {/* Main content - asymmetric grid */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-12 gap-8 lg:gap-4 items-center min-h-screen pt-24 pb-20 md:py-32">
          {/* Left: Typography */}
          <div className="lg:col-span-6 lg:col-start-1 order-2 lg:order-1 text-center lg:text-left">
            <p
              className="font-body text-[10px] tracking-[0.4em] text-gold mb-8 opacity-0"
              style={{ animation: "fadeInUp 0.8s ease-out 0.2s forwards" }}
            >
              CARTAGENA, COLOMBIA
            </p>

            <h1
              className="font-display text-[clamp(2.5rem,8vw,6rem)] text-cream font-light leading-[0.95] mb-8 opacity-0"
              style={{ animation: "fadeInUp 0.8s ease-out 0.4s forwards" }}
            >
              Come Home
              <br />
              <span className="text-rose-soft italic">to Yourself</span>
            </h1>

            <div
              className="flex items-center justify-center lg:justify-start gap-4 mb-10 opacity-0"
              style={{ animation: "fadeInUp 0.8s ease-out 0.6s forwards" }}
            >
              <div className="w-12 md:w-16 h-px bg-gradient-to-r from-gold to-transparent" />
              <span className="font-body text-[10px] tracking-[0.2em] text-cream/40">
                23 YEARS OF PRACTICE
              </span>
              <div className="w-12 md:w-16 h-px bg-gradient-to-l from-gold to-transparent lg:hidden" />
            </div>

            <p
              className="font-display text-lg md:text-xl text-cream/60 max-w-md leading-relaxed mb-12 opacity-0"
              style={{ animation: "fadeInUp 0.8s ease-out 0.7s forwards" }}
            >
              Yoga, Reiki, Ayurveda, sound healing & ceremonial practice —
              distilled into transformative experiences that reconnect you with
              what matters most.
            </p>

            <div
              className="flex flex-col sm:flex-row gap-4 opacity-0 justify-center lg:justify-start"
              style={{ animation: "fadeInUp 0.8s ease-out 0.9s forwards" }}
            >
              <MagneticButton
                href="#book"
                variant="primary"
                className="text-[11px] md:text-[12px]"
              >
                BOOK AN EXPERIENCE
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </MagneticButton>
              <MagneticButton
                href="#services"
                variant="secondary"
                className="text-[11px] md:text-[12px]"
              >
                EXPLORE
              </MagneticButton>
            </div>
          </div>

          {/* Right: Animated Logo - Hidden on mobile, shown at top on tablet+ */}
          <div
            className="lg:col-span-5 lg:col-start-8 flex justify-center lg:justify-end opacity-0 order-1 lg:order-2"
            style={{ animation: "fadeIn 1.2s ease-out 0.5s forwards" }}
          >
            <div className="hidden md:block">
              <TULogoAliveNew size={280} variant="rose" showText={true} />
            </div>
            <div className="md:hidden">
              <TULogoAliveNew size={180} variant="rose" showText={false} />
            </div>
          </div>
        </div>

        {/* Cinematic Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <span className="font-body text-[9px] tracking-[0.3em] text-cream/30 rotate-90 origin-center translate-y-8">
            SCROLL
          </span>
          <div className="relative">
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-rose-soft/30 to-transparent" />
            {/* Animated scroll dot */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-3 bg-gradient-to-b from-rose-soft to-gold rounded-full"
              style={{
                animation: "scrollPulse 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ABOUT — Editorial split layout
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="about"
        data-reveal
        className={`py-32 md:py-40 px-6 bg-cream transition-all duration-1000 ${
          isVisible("about")
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-12"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="flex items-center gap-4 mb-6">
            <span className="font-body text-[10px] tracking-[0.3em] text-rose-deep">
              01
            </span>
            <div className="w-12 h-px bg-rose-deep/30" />
            <span className="font-body text-[10px] tracking-[0.3em] text-rose-deep">
              ABOUT
            </span>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
            {/* Left column - larger */}
            <div className="lg:col-span-7">
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-light mb-10 leading-[1.1]">
                Where Science
                <br />
                <span className="italic text-rose-deep">Meets Soul</span>
              </h2>

              <div className="space-y-6 text-charcoal/70">
                <p className="font-display text-lg leading-relaxed">
                  Tata Umaña is a wellness curator, yoga teacher, Reiki Master,
                  and ceremonial guide with over 23 years of dedicated practice.
                </p>
                <p className="font-display text-lg leading-relaxed">
                  Rooted in yoga, Ayurveda, energetic medicine, and sound
                  healing, her work is enriched by ongoing studies in integrated
                  medicine and Neuro-Linguistic Programming. With a Master's
                  degree in Luxury Goods, Tata brings a refined understanding of
                  aesthetics, presence, and experience design.
                </p>
                <p className="font-display text-lg leading-relaxed">
                  As the Wellness Lead at Casa Carolina — nominated for
                  Colombia's Best Hotel Spa in the 2025 World Spa Awards — she
                  anchors one of the most meaningful wellness destinations in
                  the country.
                </p>
              </div>
            </div>

            {/* Right column - credentials - WHERE SOUL LIVES */}
            <div className="lg:col-span-5">
              <div className="credentials-card relative bg-charcoal p-8 md:p-10 lg:p-12 overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-rose-deep/20 rounded-full blur-3xl animate-pulse" />
                <div
                  className="absolute -bottom-10 -left-10 w-32 h-32 bg-gold/10 rounded-full blur-2xl"
                  style={{ animation: "pulse 4s ease-in-out infinite 1s" }}
                />

                {/* Header with breathing animation */}
                <div className="relative flex items-center gap-3 mb-10">
                  <div className="w-2 h-2 bg-gold rounded-full animate-pulse" />
                  <p className="font-body text-[10px] tracking-[0.3em] text-gold">
                    CREDENTIALS
                  </p>
                  <div className="flex-1 h-px bg-gradient-to-r from-gold/50 to-transparent" />
                </div>

                {/* Credentials with staggered reveal and hover effects */}
                <div className="relative space-y-6">
                  {credentials.map((cred, i) => (
                    <div
                      key={i}
                      className="group credential-item relative flex items-start gap-4 p-4 -mx-4 rounded-sm transition-all duration-500 hover:bg-white/5 cursor-default"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                      }}
                    >
                      {/* Icon with glow */}
                      <span
                        className="text-rose-soft text-lg mt-0.5 transition-all duration-300 group-hover:text-gold group-hover:scale-110"
                        style={{ textShadow: "0 0 20px rgba(212,165,165,0.5)" }}
                      >
                        {cred.icon}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <span className="font-body text-[9px] tracking-[0.2em] text-cream/40 block mb-1">
                          {cred.label.toUpperCase()}
                        </span>
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-display text-2xl md:text-3xl text-cream transition-colors group-hover:text-rose-soft">
                            {cred.value}
                          </span>
                          <span className="font-display text-sm text-cream/50">
                            {cred.suffix}
                          </span>
                        </div>
                      </div>

                      {/* Hover line indicator */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-gold transition-all duration-300 group-hover:h-full rounded-full" />
                    </div>
                  ))}
                </div>

                {/* Recognition - Press logos with premium feel */}
                <div className="relative mt-10 pt-8 border-t border-white/10">
                  <p className="font-body text-[9px] tracking-[0.3em] text-cream/30 mb-8 text-center">
                    AS FEATURED IN
                  </p>
                  <div className="flex justify-center items-center gap-8 md:gap-12">
                    {pressLogos.map((pub, i) => (
                      <div key={pub.name} className="group relative">
                        <span
                          className={`font-display text-lg md:text-xl text-cream/30 transition-all duration-500 group-hover:text-gold group-hover:scale-105 inline-block ${pub.style === "italic" ? "italic" : ""}`}
                          style={{
                            letterSpacing: "0.1em",
                          }}
                        >
                          {pub.name}
                        </span>
                        {/* Underline glow on hover */}
                        <div className="absolute -bottom-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decorative corner elements */}
                <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-gold/20" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-gold/20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SERVICES — Refined bento grid with custom icons
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="services"
        data-reveal
        className={`py-20 md:py-32 lg:py-40 px-4 md:px-6 bg-charcoal transition-all duration-1000 ${
          isVisible("services")
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-12"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10 md:mb-16">
            <div className="flex items-center gap-4">
              <span className="font-body text-[10px] tracking-[0.3em] text-gold">
                02
              </span>
              <div className="w-12 h-px bg-gold/30" />
              <span className="font-body text-[10px] tracking-[0.3em] text-gold">
                OFFERINGS
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl text-cream font-light">
              Your Journey
            </h2>
          </div>

          {/* Services grid - mobile optimized */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-1">
            {services.map((service, i) => (
              <div
                key={i}
                className={`group relative bg-charcoal-light/30 border border-white/5 p-6 md:p-8 lg:p-10 transition-all duration-500 hover:bg-charcoal-light/50 hover:border-rose-soft/20 active:bg-charcoal-light/60 ${
                  service.featured ? "lg:row-span-2" : ""
                }`}
              >
                {/* Icon */}
                <ServiceIcon
                  type={service.icon}
                  className="w-10 h-10 md:w-12 md:h-12 text-rose-soft mb-4 md:mb-6 transition-colors group-hover:text-gold"
                />

                {/* Content */}
                <h3 className="font-display text-xl md:text-2xl text-cream mb-2">
                  {service.name}
                </h3>
                <p className="font-body text-[9px] md:text-[10px] tracking-[0.15em] text-rose-muted mb-4 md:mb-6">
                  {service.nameEs.toUpperCase()}
                </p>

                <p
                  className={`font-display text-sm text-cream/50 leading-relaxed mb-6 md:mb-8 ${
                    service.featured ? "" : "line-clamp-3"
                  }`}
                >
                  {service.desc}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-4 md:pt-6 border-t border-white/5">
                  <div>
                    <span className="font-body text-gold text-sm">
                      {service.price}
                    </span>
                    <span className="font-body text-cream/30 text-xs ml-2">
                      / {service.duration}
                    </span>
                  </div>
                  <a
                    href="#book"
                    className="font-body text-[10px] tracking-[0.1em] text-rose-soft border border-rose-soft/30 px-4 py-3 min-h-[44px] transition-all hover:bg-rose-soft hover:text-charcoal hover:border-rose-soft group-hover:bg-rose-soft group-hover:text-charcoal group-hover:border-rose-soft active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal inline-flex items-center justify-center"
                  >
                    RESERVE
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          TESTIMONIALS — Full-width cinematic slider
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="testimonials"
        data-reveal
        className={`py-32 md:py-40 px-6 bg-cream-warm transition-all duration-1000 ${
          isVisible("testimonials")
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-12"
        }`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <span className="font-body text-[10px] tracking-[0.3em] text-rose-deep">
              03
            </span>
            <div className="w-12 h-px bg-rose-deep/30" />
            <span className="font-body text-[10px] tracking-[0.3em] text-rose-deep">
              VOICES
            </span>
          </div>

          {/* Main testimonial */}
          <div className="relative min-h-[300px]">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-all duration-700 ${
                  i === activeTestimonial
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4 pointer-events-none"
                }`}
              >
                <blockquote className="mb-12">
                  <p className="font-display text-2xl md:text-3xl lg:text-4xl text-charcoal leading-relaxed italic">
                    &ldquo;{t.text}&rdquo;
                  </p>
                </blockquote>

                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-charcoal flex items-center justify-center">
                    <span className="font-body text-sm text-cream">
                      {t.initials}
                    </span>
                  </div>
                  <div>
                    <p className="font-body text-sm text-charcoal">
                      {t.author}
                    </p>
                    <p className="font-body text-xs text-charcoal/50">
                      {t.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation dots */}
          <div className="flex items-center gap-3 mt-12">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                aria-label={`View testimonial ${i + 1} of ${testimonials.length}`}
                aria-current={i === activeTestimonial ? "true" : "false"}
                className={`transition-all duration-300 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream-warm ${
                  i === activeTestimonial
                    ? "w-8 h-1 bg-rose-deep"
                    : "w-3 h-1 bg-charcoal/20 hover:bg-charcoal/40"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          RETREATS — Full-width hero card
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="retreats"
        data-reveal
        className={`py-32 md:py-40 px-6 bg-cream transition-all duration-1000 ${
          isVisible("retreats")
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-12"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <span className="font-body text-[10px] tracking-[0.3em] text-rose-deep">
              04
            </span>
            <div className="w-12 h-px bg-rose-deep/30" />
            <span className="font-body text-[10px] tracking-[0.3em] text-rose-deep">
              RETREATS
            </span>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <h2 className="font-display text-4xl md:text-5xl text-charcoal font-light mb-6 leading-[1.1]">
                Immerse
                <br />
                <span className="italic text-rose-deep">Completely</span>
              </h2>
              <p className="font-display text-lg text-charcoal/60 mb-8">
                Multi-day transformative retreats in Cartagena and beyond.
                Limited to small groups for deep, personalized attention.
              </p>
              <a
                href="#book"
                className="inline-flex items-center gap-3 font-body text-[11px] tracking-[0.15em] text-rose-deep hover:text-charcoal transition-colors group"
              >
                VIEW UPCOMING RETREATS
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-charcoal overflow-hidden">
                <div className="aspect-[16/9] bg-gradient-to-br from-charcoal via-charcoal-light to-charcoal flex items-center justify-center relative">
                  <div className="absolute inset-0 opacity-20">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 30% 40%, rgba(212,165,165,0.3) 0%, transparent 50%)",
                      }}
                    />
                  </div>
                  <div className="text-center z-10 p-8">
                    <p className="font-body text-[10px] tracking-[0.4em] text-gold mb-4">
                      NEXT RETREAT
                    </p>
                    <h3 className="font-display text-4xl md:text-5xl text-cream mb-4">
                      Return to Stillness
                    </h3>
                    <div className="flex items-center justify-center gap-4 text-cream/50 font-body text-sm">
                      <span>Cartagena</span>
                      <span className="w-1 h-1 bg-gold rounded-full" />
                      <span>4 Days</span>
                      <span className="w-1 h-1 bg-gold rounded-full" />
                      <span>6 Guests Max</span>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-10 grid md:grid-cols-3 gap-6">
                  {[
                    { label: "Investment", value: "From $1,800 USD" },
                    { label: "Deposit", value: "$500 USD" },
                    { label: "Includes", value: "All modalities & meals" },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="font-body text-[9px] tracking-[0.2em] text-gold mb-2">
                        {item.label.toUpperCase()}
                      </p>
                      <p className="font-display text-cream">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="px-8 md:px-10 pb-8 md:pb-10">
                  <button className="w-full font-body text-[11px] tracking-[0.15em] bg-rose-deep hover:bg-rose-soft text-cream py-4 min-h-[56px] transition-all duration-300 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal">
                    JOIN THE WAITLIST
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          DIGITAL CONTENT — With sound visualizer
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="content"
        data-reveal
        className={`py-32 md:py-40 px-6 bg-charcoal transition-all duration-1000 ${
          isVisible("content")
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-12"
        }`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-16">
            <span className="font-body text-[10px] tracking-[0.3em] text-gold">
              05
            </span>
            <div className="w-12 h-px bg-gold/30" />
            <span className="font-body text-[10px] tracking-[0.3em] text-gold">
              DIGITAL SANCTUARY
            </span>
          </div>

          <h2 className="font-display text-4xl md:text-5xl text-cream font-light mb-6">
            Take the Practice Home
          </h2>
          <p className="font-display text-lg text-cream/50 max-w-xl mx-auto mb-16">
            Guided meditations, sound healing sessions, yoga flows, and
            masterclasses — available wherever you are.
          </p>

          <div className="mb-16">
            <SoundWaveVisualizer bars={24} height={80} />
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-md mx-auto mb-12">
            <div className="border border-white/10 p-8">
              <p className="font-body text-[10px] tracking-[0.2em] text-cream/40 mb-3">
                MONTHLY
              </p>
              <p className="font-display text-4xl text-cream mb-1">$19</p>
              <p className="font-body text-[10px] text-cream/30">USD</p>
            </div>
            <div className="border-2 border-gold p-8 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 font-body text-[9px] tracking-[0.1em] bg-gold text-charcoal px-3 py-1">
                SAVE 20%
              </span>
              <p className="font-body text-[10px] tracking-[0.2em] text-gold mb-3">
                ANNUAL
              </p>
              <p className="font-display text-4xl text-cream mb-1">$182</p>
              <p className="font-body text-[10px] text-cream/30">USD / year</p>
            </div>
          </div>

          <button className="font-body text-[11px] tracking-[0.15em] border border-rose-soft text-rose-soft hover:bg-rose-soft hover:text-charcoal px-10 py-4 min-h-[56px] transition-all duration-300 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal">
            COMING SOON — JOIN WAITLIST
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          BOOKING — Full booking system with calendar and payment
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="book"
        data-reveal
        className={`transition-all duration-1000 ${
          isVisible("book")
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-12"
        }`}
      >
        <JustbYogaAcademy />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER — Minimal refined
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className="bg-charcoal py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-12 md:gap-8 mb-16">
            {/* Logo & tagline */}
            <div className="md:col-span-4">
              <TULogoAliveNew
                size={80}
                variant="rose"
                showText={false}
                interactive={false}
              />
              <p className="font-display text-lg text-cream/50 italic mt-6 max-w-xs">
                &ldquo;Wellness is not a destination. It&apos;s a return to what
                you already are.&rdquo;
              </p>
            </div>

            {/* Links */}
            <div className="md:col-span-2 md:col-start-7">
              <p className="font-body text-[10px] tracking-[0.2em] text-gold mb-6">
                EXPLORE
              </p>
              <div className="space-y-3">
                {["About", "Services", "Retreats", "Digital"].map((link) => (
                  <a
                    key={link}
                    href={`#${link.toLowerCase()}`}
                    className="font-body text-sm text-cream/40 hover:text-rose-soft transition-colors block"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="md:col-span-3">
              <p className="font-body text-[10px] tracking-[0.2em] text-gold mb-6">
                CONNECT
              </p>
              <div className="space-y-3">
                <a
                  href="#"
                  className="font-body text-sm text-cream/40 hover:text-rose-soft transition-colors block"
                >
                  Instagram
                </a>
                <a
                  href="#"
                  className="font-body text-sm text-cream/40 hover:text-rose-soft transition-colors block"
                >
                  WhatsApp
                </a>
                <a
                  href="#"
                  className="font-body text-sm text-cream/40 hover:text-rose-soft transition-colors block"
                >
                  Email
                </a>
              </div>
            </div>

            {/* Location */}
            <div className="md:col-span-3">
              <p className="font-body text-[10px] tracking-[0.2em] text-gold mb-6">
                LOCATION
              </p>
              <p className="font-display text-cream/40">
                Cartagena de Indias
                <br />
                Colombia
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="font-body text-[10px] tracking-[0.1em] text-cream/20">
              2026 TU. BY TATA UMAÑA
            </span>
            <span className="font-body text-[10px] tracking-[0.1em] text-cream/20">
              BUILT BY MACHINEMIND
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
