"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Lenis from "lenis";
import { createBrowserClient } from "@supabase/ssr";
import BookingModal from "@/components/BookingModal";
import { t, type Lang } from "@/lib/translations";

// ─── Section components ───────────────────────────────────────────────────────
import StickyNav from "@/components/sections/StickyNav";
import HeroSection from "@/components/sections/HeroSection";
import MayEventsSection from "@/components/sections/MayEventsSection";
import PhilosophySection from "@/components/sections/PhilosophySection";
import FeaturedPressSection from "@/components/sections/FeaturedPressSection";
import ThePracticeSection from "@/components/sections/ThePracticeSection";
import ServicesSection, { services } from "@/components/sections/ServicesSection";
import WeeklyScheduleSection from "@/components/sections/WeeklyScheduleSection";
import TeachersSection from "@/components/sections/TeachersSection";
import PaymentMethodsSection from "@/components/sections/PaymentMethodsSection";
import BookingHighlightSection from "@/components/sections/BookingHighlightSection";
import RetreatsSection from "@/components/sections/RetreatsSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import InstagramSection from "@/components/sections/InstagramSection";
import FooterSection from "@/components/sections/FooterSection";

const ChatBot = dynamic(() => import("@/components/ChatBot"), { ssr: false });
const WhatsAppButton = dynamic(() => import("@/components/WhatsAppButton"), {
  ssr: false,
});

// ─── Workshop event target: May 22, 2026, 6:00 PM Colombia (UTC-5) ───────────
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
  const [countdownReady, setCountdownReady] = useState(false);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const sectionsRef = useScrollReveal();

  const L = useCallback(
    (key: Record<Lang, string | readonly string[]>) => key[lang],
    [lang]
  );

  // Hero entrance delay
  useEffect(() => {
    const timer = setTimeout(() => setHeroLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Lenis smooth scroll
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

  // Sticky bar + scroll progress
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
      setActiveTestimonial((prev) => (prev + 1) % 3);
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
        setCountdownReady(true);
        return;
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
      setCountdownReady(true);
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

  const workshopPassed = countdownReady && WORKSHOP_TARGET.getTime() <= Date.now();

  return (
    <main ref={sectionsRef} className="w-full overflow-x-hidden">

      <StickyNav
        lang={lang}
        L={L}
        showStickyBar={showStickyBar}
        scrollProgress={scrollProgress}
        isLoggedIn={isLoggedIn}
        openBooking={openBooking}
        setLang={setLang}
      />

      <HeroSection
        lang={lang}
        L={L}
        heroLoaded={heroLoaded}
        openBooking={openBooking}
      />

      <MayEventsSection
        lang={lang}
        L={L}
        workshopPassed={workshopPassed}
        countdownReady={countdownReady}
        countdown={countdown}
        openBooking={openBooking}
      />

      <PhilosophySection lang={lang} L={L} />

      <FeaturedPressSection lang={lang} L={L} />

      <div className="divider-gold my-0" />

      <ThePracticeSection lang={lang} L={L} />

      <div className="divider-gold my-0" />

      <ServicesSection lang={lang} L={L} openBooking={openBooking} />

      {/* Warm gradient into dark schedule */}
      <div className="section-fade-to-dark" />

      <WeeklyScheduleSection
        lang={lang}
        L={L}
        openBooking={openBooking}
        closedDates={closedDates}
      />

      {/* Warm gradient out of dark schedule */}
      <div className="section-fade-from-dark" />

      <TeachersSection lang={lang} L={L} />

      <PaymentMethodsSection lang={lang} L={L} openBooking={openBooking} />

      <div className="section-fade-to-dark" />

      <BookingHighlightSection lang={lang} L={L} openBooking={openBooking} />

      <div className="section-fade-from-dark" />

      <RetreatsSection lang={lang} L={L} />

      <TestimonialsSection
        lang={lang}
        L={L}
        activeTestimonial={activeTestimonial}
        setActiveTestimonial={setActiveTestimonial}
      />

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
          <div className="fade-in fade-in-delay-2 mt-10 flex flex-col sm:flex-row gap-4 justify-center">
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

      <InstagramSection lang={lang} L={L} />

      <FooterSection
        lang={lang}
        L={L}
        openBooking={openBooking}
        showStickyBar={showStickyBar}
      />

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
