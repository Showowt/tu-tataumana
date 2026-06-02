"use client";

import { useEffect, useState, useCallback } from "react";
import { t, type Lang } from "@/lib/translations";

interface PricingCardData {
  id: string;
  label: string;
  label_es: string | null;
  subtitle_en: string | null;
  subtitle_es: string | null;
  price_cop: number;
  price_usd: number;
  highlight: boolean;
  category: string;
  sort_order: number;
}

function formatCOP(n: number): string {
  return "$" + n.toLocaleString("es-CO");
}

export interface WeeklyScheduleSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
  openBooking: (service?: string, date?: string, time?: string) => void;
  closedDates: string[];
}

// ─── Schedule types ───────────────────────────────────────────────────────────

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

/** Convert "09:30:00" or "09:30" to "9:30 AM" */
function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

// Fallback schedule — used immediately while API loads, never shows blank
const FALLBACK_SCHEDULE: ScheduleDay[] = [
  { day: "Monday", dayEs: "Lunes", dayShort: "MON", dayIndex: 1, classes: [
    { time: "9:30 AM", name: "Stress Release", teacher: "Special Class" },
    { time: "11:00 AM", name: "Sculpt Your Body", teacher: "Special Class" },
    { time: "7:15 PM", name: "Hatha Flow", teacher: "Violeta" },
  ]},
  { day: "Tuesday", dayEs: "Martes", dayShort: "TUE", dayIndex: 2, classes: [
    { time: "9:30 AM", name: "Yogalates", teacher: "Special Class" },
    { time: "5:30 PM", name: "Inner Journey Meditation", teacher: "Alvaro", note: "(solo en español)" },
    { time: "7:15 PM", name: "Hatha", teacher: "Alejandro" },
  ]},
  { day: "Wednesday", dayEs: "Miercoles", dayShort: "WED", dayIndex: 3, classes: [
    { time: "9:30 AM", name: "Yogalates", teacher: "Special Class" },
    { time: "10:45 AM", name: "Pilates Flow", teacher: "Special Class" },
    { time: "5:30 PM", name: "Sound Therapy", teacher: "Leandra" },
    { time: "7:15 PM", name: "Hatha Flow", teacher: "Violeta" },
  ]},
  { day: "Thursday", dayEs: "Jueves", dayShort: "THU", dayIndex: 4, classes: [
    { time: "9:30 AM", name: "Yogalates", teacher: "Special Class" },
    { time: "7:15 PM", name: "Hatha", teacher: "Alejandro" },
  ]},
  { day: "Friday", dayEs: "Viernes", dayShort: "FRI", dayIndex: 5, classes: [
    { time: "10:00 AM", name: "Yogalates", teacher: "Special Class" },
    { time: "7:00 PM", name: "Hatha Flow", teacher: "Betty & Violeta" },
  ]},
  { day: "Saturday", dayEs: "Sabado", dayShort: "SAT", dayIndex: 6, classes: [
    { time: "11:00 AM", name: "Yogalates", teacher: "Special Class" },
    { time: "6:00 PM", name: "Inner Journey Meditation", teacher: "Alvaro", note: "(solo en español)" },
  ]},
  { day: "Sunday", dayEs: "Domingo", dayShort: "SUN", dayIndex: 0, classes: [
    { time: "9:00 AM", name: "Just Hatha Flow", teacher: "Alejandro" },
    { time: "10:30 AM", name: "Inner Journey Meditation", teacher: "Alvaro", note: "(solo en español)" },
  ]},
];

/** Fetch schedule from DB — falls back to hardcoded data if API fails */
function useScheduleData(): { schedule: ScheduleDay[]; loading: boolean } {
  const [schedule, setSchedule] = useState<ScheduleDay[]>(FALLBACK_SCHEDULE);
  const [loading, setLoading] = useState(false); // Start as NOT loading — show fallback immediately

  useEffect(() => {
    fetch("/api/public/schedule")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const days: ScheduleDay[] = (data.schedule || []).map(
          (day: { day_of_week: number; day_name: string; day_name_es: string; day_short: string; classes: { name: string; name_es: string; start_time: string; teacher: string; description: string | null; description_es: string | null; note: string | null }[] }) => ({
            day: day.day_name,
            dayEs: day.day_name_es,
            dayShort: day.day_short,
            dayIndex: day.day_of_week,
            classes: day.classes.map((cls) => ({
              time: formatTime12(cls.start_time),
              name: cls.name,
              note: cls.note || undefined,
              teacher: cls.teacher || undefined,
              desc: cls.description || cls.description_es
                ? { en: cls.description || "", es: cls.description_es || "" }
                : undefined,
            })),
          }),
        );
        if (days.length > 0) setSchedule(days);
      })
      .catch((err) => {
        console.error("[WeeklyScheduleSection] API failed, using fallback:", err);
        // Keep fallback — already set as default
      });
  }, []);

  return { schedule, loading };
}

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * Get Colombia date/time components using Intl API (no UTC conversion bugs).
 * toISOString() converts to UTC which shifts the date after 7 PM Colombia.
 */
function getColombiaNow(): { dateStr: string; hours: number; minutes: number; dayOfWeek: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
  const year = parseInt(get("year"));
  const month = parseInt(get("month"));
  const day = parseInt(get("day"));
  const hours = parseInt(get("hour"));
  const minutes = parseInt(get("minute"));
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const dateObj = new Date(year, month - 1, day, 12, 0, 0);

  return { dateStr, hours, minutes, dayOfWeek: dateObj.getDay() };
}

function getNextDateForDay(dayIndex: number): string {
  const colombia = getColombiaNow();
  let daysUntil = dayIndex - colombia.dayOfWeek;
  if (daysUntil < 0) daysUntil += 7;
  // daysUntil === 0 means today — show today so users can book same-day classes
  const [y, m, d] = colombia.dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + daysUntil, 12, 0, 0);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

/**
 * Check if a class is bookable — must be at least 2 hours before class time.
 * Uses Colombia timezone via Intl API (no UTC conversion bugs).
 */
function isClassBookable(dateStr: string, timeStr: string): boolean {
  const colombia = getColombiaNow();

  // Future dates are always bookable
  if (dateStr > colombia.dateStr) return true;

  // Past dates are never bookable
  if (dateStr < colombia.dateStr) return false;

  // Today — check 2-hour window
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return false;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  const nowMinutes = colombia.hours * 60 + colombia.minutes;
  const classMinutes = hours * 60 + minutes;
  return (classMinutes - nowMinutes) >= 120;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeeklyScheduleSection({ lang, L, openBooking, closedDates }: WeeklyScheduleSectionProps) {
  const { schedule: weeklySchedule } = useScheduleData();

  // DB-driven pricing cards
  const [pricingCards, setPricingCards] = useState<PricingCardData[]>([]);
  const loadPricing = useCallback(async () => {
    try {
      const res = await fetch("/api/public/pricing", { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.cards?.length > 0) setPricingCards(data.cards);
    } catch {}
  }, []);
  useEffect(() => { loadPricing(); }, [loadPricing]);

  const groupCards = pricingCards.filter((c) => c.category === "group" || c.category === "promo" || c.category === "private");
  const packCards = pricingCards.filter((c) => c.category === "pack");

  return (
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

        {/* Pricing cards — DB-driven from tu_pricing_cards */}
        {groupCards.length > 0 && (
        <div className="fade-in mt-12 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 stagger-reveal">
          {groupCards.map((card) => (
            <button
              key={card.id}
              onClick={() => openBooking(lang === "es" && card.label_es ? card.label_es : card.label)}
              className={`btn-tactile schedule-promo-card rounded-2xl border p-4 sm:p-5 text-center transition-all duration-500 cursor-pointer ${
                card.highlight
                  ? "border-rose-soft/30 bg-rose-soft/10 hover:border-rose-soft/50 hover:bg-rose-soft/15"
                  : "border-gold/10 bg-white/[0.03] hover:border-gold/30 hover:bg-white/[0.06]"
              }`}
            >
              <p className={`font-[family-name:var(--font-body)] text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] mb-2 ${
                card.highlight ? "text-rose-soft" : "text-gold/70"
              }`}>
                {card.label}
              </p>
              <p className="font-[family-name:var(--font-display)] text-xl sm:text-2xl text-white">
                {formatCOP(card.price_cop)}
              </p>
              <p className="font-[family-name:var(--font-body)] text-[10px] sm:text-xs text-white/30 mt-1">
                COP &middot; ${card.price_usd} USD &middot; {lang === "es" ? (card.subtitle_es || card.subtitle_en || "") : (card.subtitle_en || "")}
              </p>
              <p className={`font-[family-name:var(--font-body)] text-[9px] tracking-[0.15em] mt-3 transition-colors ${
                card.highlight ? "text-rose-soft/70 hover:text-rose-soft" : "text-gold/50 hover:text-gold"
              }`}>
                {lang === "en" ? "BOOK NOW" : "RESERVAR"}
              </p>
            </button>
          ))}
        </div>
        )}

        {/* Premium packs row — DB-driven */}
        {packCards.length > 0 && (
        <div className="fade-in mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {packCards.map((card) => (
            <button
              key={card.id}
              onClick={() => openBooking(card.label)}
              className="btn-tactile schedule-promo-card rounded-2xl border border-gold/10 bg-white/[0.03] p-4 sm:p-5 text-center hover:border-gold/30 hover:bg-white/[0.06] transition-all duration-500 cursor-pointer"
            >
              <p className="font-[family-name:var(--font-body)] text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] text-gold/70 mb-2">
                {card.label}
              </p>
              <p className="font-[family-name:var(--font-display)] text-xl sm:text-2xl text-white">
                {formatCOP(card.price_cop)}
              </p>
              <p className="font-[family-name:var(--font-body)] text-[10px] sm:text-xs text-white/30 mt-1">
                COP &middot; ${card.price_usd} USD &middot; {lang === "es" ? (card.subtitle_es || card.subtitle_en || "") : (card.subtitle_en || "")}
              </p>
              <p className="font-[family-name:var(--font-body)] text-[9px] tracking-[0.15em] text-gold/50 mt-3 hover:text-gold transition-colors">
                {lang === "en" ? "BOOK NOW" : "RESERVAR"}
              </p>
            </button>
          ))}
        </div>
        )}

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
  );
}
