"use client";

import { type Lang } from "@/lib/translations";

export interface TestimonialsSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
  activeTestimonial: number;
  setActiveTestimonial: (i: number) => void;
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

export default function TestimonialsSection({
  lang,
  L,
  activeTestimonial,
  setActiveTestimonial,
}: TestimonialsSectionProps) {
  return (
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
  );
}
