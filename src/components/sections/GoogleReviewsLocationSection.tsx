"use client";

import { useEffect, useState } from "react";
import { type Lang } from "@/lib/translations";

export interface GoogleReviewsLocationSectionProps {
  lang: Lang;
}

/**
 * Real Google reviews + studio location.
 * Listing: "JustB Yoga by TUISYOU" — Casa Carolina Hotel, Centro Historico.
 * Reviews are verbatim from the Google Business Profile (5.0, July 2026).
 */
const GOOGLE_MAPS_URL = "https://maps.google.com/?cid=14299144872994951781";
const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=JustB+Yoga+by+TUISYOU,+Cartagena+de+Indias";
const MAP_EMBED_URL =
  "https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1sJustB+Yoga+by+TUISYOU,+Calle+del+Arzobispado,+Cartagena+de+Indias!6i17";

const reviews = [
  {
    quote:
      "JustB Shala is the most special place in Cartagena where the magic truly happens. The space itself is beautiful, but what makes it extraordinary is Tata — she has such a calming, healing presence.",
    name: "Elizabeth Lee",
  },
  {
    quote:
      "You get to live a one of a kind immersive experience with yoga, sound healing and aromatherapy. Honestly, I've never experienced a class like this before. Highly recommended!",
    name: "Francisco Millan",
  },
  {
    quote:
      "The most wonderful experience you'll have in Cartagena. Hidden gem inside Casa Carolina.",
    name: "Giles Gamon",
  },
];

const strings = {
  reviewsLabel: { en: "GOOGLE REVIEWS", es: "RESEÑAS EN GOOGLE" },
  reviewsTitle: {
    en: "What our students say",
    es: "Lo que dicen nuestros alumnos",
  },
  googleReview: { en: "Google review", es: "Reseña de Google" },
  viewOnGoogle: { en: "View on Google Maps", es: "Ver en Google Maps" },
  leaveReview: { en: "Leave us a review", es: "Déjanos una reseña" },
  locationLabel: { en: "FIND US", es: "ENCUÉNTRANOS" },
  locationTitle: {
    en: "In the heart of the Walled City",
    es: "En el corazón de la Ciudad Amurallada",
  },
  address1: { en: "Casa Carolina Hotel", es: "Casa Carolina Hotel" },
  address2: {
    en: "Calle del Arzobispado, Cra. 5 #34-14",
    es: "Calle del Arzobispado, Cra. 5 #34-14",
  },
  address3: {
    en: "Centro Historico, Cartagena de Indias",
    es: "Centro Histórico, Cartagena de Indias",
  },
  hoursLabel: { en: "HOURS", es: "HORARIO" },
  hoursWeek: {
    en: "Monday - Saturday - 7:00 AM - 9:00 PM",
    es: "Lunes - Sábado - 7:00 AM - 9:00 PM",
  },
  hoursSunday: {
    en: "Sunday - 9:00 AM - 12:00 PM",
    es: "Domingo - 9:00 AM - 12:00 PM",
  },
  directions: { en: "Get directions", es: "Cómo llegar" },
  whatsapp: { en: "Write on WhatsApp", es: "Escribir por WhatsApp" },
};

function Stars() {
  return (
    <div className="flex items-center gap-0.5" aria-label="5.0 stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="#C9A96E"
          aria-hidden="true"
        >
          <path d="M12 2l2.9 6.26L21.5 9.27l-4.75 4.63L17.8 20.5 12 17.27 6.2 20.5l1.05-6.6L2.5 9.27l6.6-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function GoogleReviewsLocationSection({
  lang,
}: GoogleReviewsLocationSectionProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % reviews.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const s = (key: keyof typeof strings) => strings[key][lang];

  return (
    <section id="location" className="py-24 md:py-32 bg-cream-warm">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* ━━━ Google reviews ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="text-center">
          <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-gold mb-4">
            {s("reviewsLabel")}
          </p>
          <h2
            className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-charcoal"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 300 }}
          >
            {s("reviewsTitle")}
          </h2>

          {/* Rating badge */}
          <div className="fade-in fade-in-delay-2 mt-6 inline-flex items-center gap-3 bg-white border border-charcoal/5 rounded-full px-6 py-3">
            <span
              className="font-[family-name:var(--font-display)] text-2xl text-charcoal"
              style={{ fontWeight: 400 }}
            >
              5.0
            </span>
            <Stars />
            <span className="font-[family-name:var(--font-body)] text-xs text-charcoal/40">
              Google
            </span>
          </div>

          {/* Rotating reviews */}
          <div className="relative min-h-[190px] md:min-h-[160px] flex items-center justify-center mt-10 quote-accent max-w-3xl mx-auto">
            {reviews.map((review, i) => (
              <div
                key={review.name}
                className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 px-2"
                style={{
                  opacity: active === i ? 1 : 0,
                  transform: active === i ? "translateY(0)" : "translateY(12px)",
                  pointerEvents: active === i ? "auto" : "none",
                }}
              >
                <p
                  className="font-[family-name:var(--font-display)] text-charcoal leading-relaxed italic"
                  style={{ fontSize: "clamp(1.05rem, 2vw, 1.35rem)", fontWeight: 300 }}
                >
                  &ldquo;{review.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-px w-8 bg-rose/30" />
                  <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/40">
                    {review.name}
                  </span>
                  <Stars />
                  <div className="h-px w-8 bg-rose/30" />
                </div>
                <p className="mt-2 font-[family-name:var(--font-body)] text-[10px] tracking-[0.15em] text-charcoal/25 uppercase">
                  {s("googleReview")}
                </p>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="p-3 group"
                aria-label={`Review ${i + 1}`}
              >
                <div
                  className="rounded-full transition-all duration-500"
                  style={{
                    background:
                      active === i ? "rgba(184,119,119,0.6)" : "rgba(44,44,44,0.12)",
                    height: 8,
                    width: active === i ? 28 : 8,
                  }}
                />
              </button>
            ))}
          </div>

          {/* Review CTAs */}
          <div className="fade-in mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-tactile px-8 py-3.5 border border-charcoal/15 text-charcoal/60 font-[family-name:var(--font-body)] text-xs tracking-[0.2em] hover:border-gold hover:text-gold transition-colors duration-300 rounded-full"
            >
              {s("viewOnGoogle")}
            </a>
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-tactile px-8 py-3.5 border-2 border-gold text-gold font-[family-name:var(--font-body)] text-xs tracking-[0.2em] hover:bg-gold hover:text-charcoal transition-colors duration-300 rounded-full"
            >
              {s("leaveReview")}
            </a>
          </div>
        </div>

        {/* ━━━ Location ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="mt-20 md:mt-24 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div className="fade-in">
            <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-gold mb-4">
              {s("locationLabel")}
            </p>
            <h3
              className="font-[family-name:var(--font-display)] text-charcoal mb-6"
              style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 300 }}
            >
              {s("locationTitle")}
            </h3>
            <div className="font-[family-name:var(--font-body)] text-sm text-charcoal/60 leading-relaxed space-y-1">
              <p className="text-charcoal/80">{s("address1")}</p>
              <p>{s("address2")}</p>
              <p>{s("address3")}</p>
            </div>
            <div className="mt-6">
              <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-charcoal/30 mb-2">
                {s("hoursLabel")}
              </p>
              <div className="font-[family-name:var(--font-body)] text-sm text-charcoal/50 space-y-0.5">
                <p>{s("hoursWeek")}</p>
                <p>{s("hoursSunday")}</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tactile px-8 py-3.5 bg-charcoal text-white font-[family-name:var(--font-body)] text-xs tracking-[0.2em] hover:bg-rose transition-colors duration-300 rounded-full text-center"
              >
                {s("directions")}
              </a>
              <a
                href="https://wa.me/573166333663"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tactile px-8 py-3.5 border border-charcoal/15 text-charcoal/60 font-[family-name:var(--font-body)] text-xs tracking-[0.2em] hover:border-rose hover:text-rose transition-colors duration-300 rounded-full text-center"
              >
                {s("whatsapp")}
              </a>
            </div>
          </div>

          <div className="fade-in fade-in-delay-2">
            <div className="rounded-2xl overflow-hidden border border-charcoal/5 shadow-sm">
              <iframe
                src={MAP_EMBED_URL}
                width="100%"
                height="380"
                style={{ border: 0, display: "block" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="JustB Yoga by TUISYOU - Casa Carolina Hotel, Cartagena"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
