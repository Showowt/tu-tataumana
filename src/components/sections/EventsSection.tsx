"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Lang } from "@/lib/translations";

interface HomepageEvent {
  id: string;
  title: string;
  title_es: string;
  description: string | null;
  description_es: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  price_cop: number;
  image_url: string | null;
  cta_text: string | null;
  cta_text_es: string | null;
  booking_service: string | null;
  accent_color: string | null;
}

interface EventsSectionProps {
  lang: Lang;
  openBooking: (service?: string) => void;
}

export default function EventsSection({ lang, openBooking }: EventsSectionProps) {
  const [events, setEvents] = useState<HomepageEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/events?homepage=true")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => {
        setEvents(json.data || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || events.length === 0) return null;

  return (
    <section className="relative py-16 md:py-24 bg-charcoal overflow-clip grain-overlay">
      {/* Radial glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(201,169,110,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="fade-in inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gold/20 bg-gold/5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.3em] text-gold">
              {lang === "en" ? "SPECIAL EVENTS" : "EVENTOS ESPECIALES"}
            </span>
          </div>
        </div>

        {/* Events grid */}
        <div
          className={`grid grid-cols-1 ${events.length > 1 ? "md:grid-cols-2" : "md:max-w-lg md:mx-auto"} gap-6 md:gap-8`}
        >
          {events.map((event, i) => {
            const isRose = event.accent_color === "rose";
            const borderClass = isRose
              ? "border-rose-soft/20"
              : "border-gold/20";
            const btnClass = isRose
              ? "bg-rose-soft text-white hover:bg-white hover:text-charcoal"
              : "bg-gold text-charcoal hover:bg-white";
            const ctaText =
              lang === "en"
                ? event.cta_text || "RESERVE YOUR SPOT"
                : event.cta_text_es || "RESERVA TU CUPO";
            const title = lang === "en" ? event.title : event.title_es;

            return (
              <div
                key={event.id}
                className={`fade-in ${i > 0 ? "fade-in-delay-1" : ""} rounded-2xl border ${borderClass} bg-white/[0.03] overflow-hidden flex flex-col`}
              >
                {event.image_url && (
                  <div className="relative">
                    <Image
                      src={event.image_url}
                      alt={title}
                      width={900}
                      height={1200}
                      className="w-full h-auto"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                )}

                <div className="p-6 md:p-8 flex flex-col flex-1">
                  {!event.image_url && (
                    <h3
                      className="font-[family-name:var(--font-display)] text-white text-xl mb-2"
                      style={{ fontWeight: 300 }}
                    >
                      {title}
                    </h3>
                  )}
                  {!event.image_url && event.price_cop > 0 && (
                    <p className="font-[family-name:var(--font-body)] text-gold text-lg mb-1">
                      ${event.price_cop.toLocaleString("es-CO")} COP
                    </p>
                  )}
                  {!event.image_url && event.start_time && (
                    <p className="font-[family-name:var(--font-body)] text-[11px] text-white/40 mb-4">
                      {new Date(event.event_date + "T12:00:00").toLocaleDateString(
                        lang === "es" ? "es-CO" : "en-US",
                        { weekday: "long", month: "long", day: "numeric" },
                      )}{" "}
                      · {event.start_time.slice(0, 5)}
                      {event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ""}
                    </p>
                  )}

                  <div className="mt-auto">
                    <button
                      onClick={() =>
                        openBooking(
                          event.booking_service || event.title_es || event.title,
                        )
                      }
                      className={`btn-tactile w-full inline-flex items-center justify-center gap-3 px-8 py-4 ${btnClass} font-[family-name:var(--font-body)] text-sm tracking-[0.25em] transition-all duration-500 rounded-full`}
                    >
                      {ctaText}
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                        />
                      </svg>
                    </button>
                    <p className="font-[family-name:var(--font-body)] text-[10px] text-white/25 text-center mt-3">
                      {lang === "en"
                        ? "Limited availability"
                        : "Cupos limitados"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
