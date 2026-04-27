"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

const ChatBot = dynamic(() => import("@/components/ChatBot"), { ssr: false });
const WhatsAppButton = dynamic(() => import("@/components/WhatsAppButton"), {
  ssr: false,
});

// ─── Data ────────────────────────────────────────────────────────────────────

const services = [
  {
    name: "Private Yoga",
    description:
      "Personalized sessions in Hatha, Vinyasa, Kundalini, Yin, or Ashtanga — tailored to your body and intention.",
    price: "From $95",
    duration: "60–90 min",
  },
  {
    name: "Sound Healing",
    description:
      "Crystal bowls, tuning forks, and ancestral instruments guide you into deep cellular restoration.",
    price: "From $120",
    duration: "75 min",
  },
  {
    name: "Reiki & Energy Work",
    description:
      "Integrated Energy Therapy and Usui Reiki to clear blockages and restore your natural flow.",
    price: "From $110",
    duration: "60 min",
  },
  {
    name: "Sacred Ceremonies",
    description:
      "Cacao, breathwork, and ancestral rituals designed for deep transformation under the Cartagena sky.",
    price: "From $150",
    duration: "90–120 min",
  },
  {
    name: "Body Reprogramming",
    description:
      "NLP-informed somatic release combining movement, breath, and intention to rewrite stored patterns.",
    price: "From $130",
    duration: "75 min",
  },
  {
    name: "Group Journeys",
    description:
      "Intimate group experiences limited to 6 participants. Shared energy, individual attention.",
    price: "From $65/person",
    duration: "90 min",
  },
];

const retreats = [
  {
    title: "Return to Self",
    subtitle: "3-Day Immersive Retreat",
    description:
      "Three days of yoga, sound healing, ceremony, and Ayurvedic nourishment at a private villa overlooking the Caribbean.",
    price: "From $1,800",
    capacity: "6 guests maximum",
    includes: "All sessions, meals, accommodation, airport transfer",
  },
  {
    title: "Deep Reset",
    subtitle: "5-Day Transformation",
    description:
      "Five days to completely rewire. Daily yoga, energy work, one-on-one sessions with Tata, and a closing ceremony under the stars.",
    price: "From $3,200",
    capacity: "4 guests maximum",
    includes: "Everything included — arrive with nothing but yourself",
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

// ─── Booking form ────────────────────────────────────────────────────────────

function BookingSection() {
  const [step, setStep] = useState<"select" | "details" | "sent">("select");
  const [selectedService, setSelectedService] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Build WhatsApp message with booking details
    const text = encodeURIComponent(
      `Hi Tata! I'd like to book a session.\n\nService: ${selectedService}\nName: ${name}\nDate: ${date}\nMessage: ${message || "None"}`
    );
    window.open(`https://wa.me/573001234567?text=${text}`, "_blank");
    setStep("sent");
  };

  if (step === "sent") {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-rose/10 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-rose"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-3xl text-charcoal mb-3">
          Request Sent
        </h3>
        <p className="font-[family-name:var(--font-body)] text-charcoal/60 max-w-md mx-auto">
          Tata will confirm your session within 24 hours. Check your WhatsApp
          for a direct message.
        </p>
        <button
          onClick={() => {
            setStep("select");
            setSelectedService("");
            setName("");
            setEmail("");
            setPhone("");
            setDate("");
            setMessage("");
          }}
          className="mt-8 font-[family-name:var(--font-body)] text-sm tracking-widest text-rose hover:text-charcoal transition-colors"
        >
          BOOK ANOTHER SESSION
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 mb-12">
        <div
          className={`h-0.5 w-12 rounded-full transition-colors duration-500 ${
            step === "select" ? "bg-rose" : "bg-rose/30"
          }`}
        />
        <div
          className={`h-0.5 w-12 rounded-full transition-colors duration-500 ${
            step === "details" ? "bg-rose" : "bg-rose/30"
          }`}
        />
      </div>

      {step === "select" && (
        <div className="space-y-3">
          <p className="font-[family-name:var(--font-body)] text-sm tracking-widest text-charcoal/50 text-center mb-8">
            SELECT YOUR EXPERIENCE
          </p>
          {services.map((s) => (
            <button
              key={s.name}
              onClick={() => {
                setSelectedService(s.name);
                setStep("details");
              }}
              className="w-full text-left p-5 rounded-2xl border border-charcoal/5 hover:border-rose/20 hover:bg-rose/[0.02] transition-all duration-300 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-[family-name:var(--font-display)] text-xl text-charcoal group-hover:text-rose transition-colors">
                    {s.name}
                  </h4>
                  <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-1">
                    {s.duration} &middot; {s.price}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-charcoal/20 group-hover:text-rose/60 transition-all group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === "details" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <button
            type="button"
            onClick={() => setStep("select")}
            className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 hover:text-charcoal transition-colors flex items-center gap-2"
          >
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
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            Back
          </button>

          <div className="bg-rose/[0.04] rounded-2xl p-5 mb-2">
            <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/50">
              Selected
            </p>
            <p className="font-[family-name:var(--font-display)] text-xl text-charcoal">
              {selectedService}
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-5 py-4 rounded-xl border border-charcoal/8 bg-transparent font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/30 focus:border-rose/30 focus:outline-none transition-colors"
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-5 py-4 rounded-xl border border-charcoal/8 bg-transparent font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/30 focus:border-rose/30 focus:outline-none transition-colors"
            />
            <input
              type="tel"
              placeholder="WhatsApp number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-5 py-4 rounded-xl border border-charcoal/8 bg-transparent font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/30 focus:border-rose/30 focus:outline-none transition-colors"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-5 py-4 rounded-xl border border-charcoal/8 bg-transparent font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/30 focus:border-rose/30 focus:outline-none transition-colors"
            />
            <textarea
              placeholder="Anything Tata should know? (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-5 py-4 rounded-xl border border-charcoal/8 bg-transparent font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/30 focus:border-rose/30 focus:outline-none transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-charcoal text-white font-[family-name:var(--font-body)] text-sm tracking-widest hover:bg-rose transition-colors duration-500"
          >
            REQUEST BOOKING
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const sectionsRef = useScrollReveal();

  useEffect(() => {
    const timer = setTimeout(() => setHeroLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBooking = useCallback(() => {
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <main ref={sectionsRef}>
      {/* ━━━ HERO — Fullscreen Video ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: heroLoaded ? 1 : 0,
            transition: "opacity 1.5s ease",
          }}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 video-overlay" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
          {/* Logo */}
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

          {/* Tagline */}
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
            Come Home to Yourself
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
            Yoga &middot; Sound Healing &middot; Reiki &middot; Ceremonies
            &middot; Retreats
          </p>

          {/* CTA */}
          <button
            onClick={scrollToBooking}
            className="mt-10 px-10 py-4 border border-white/30 text-white font-[family-name:var(--font-body)] text-sm tracking-[0.25em] hover:bg-white hover:text-charcoal transition-all duration-500"
            style={{
              opacity: heroLoaded ? 1 : 0,
              transform: heroLoaded ? "translateY(0)" : "translateY(16px)",
              transition:
                "opacity 1.2s ease 1.2s, transform 1.2s ease 1.2s, background-color 0.5s, color 0.5s, border-color 0.5s",
            }}
          >
            BOOK A SESSION
          </button>

          {/* Scroll indicator */}
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
          <div className="flex items-center justify-center gap-12 md:gap-16 flex-wrap">
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

      {/* ━━━ PHILOSOPHY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p
            className="fade-in font-[family-name:var(--font-display)] text-charcoal leading-relaxed"
            style={{ fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)", fontWeight: 300 }}
          >
            23 years of practice distilled into experiences that reconnect you
            with what matters most. Not a spa. Not a class. A return to the
            version of yourself that has always been waiting.
          </p>
          <div className="fade-in fade-in-delay-2 mt-10 flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-rose/30" />
            <span className="font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-charcoal/40">
              TATA UMANA
            </span>
            <div className="h-px w-12 bg-rose/30" />
          </div>
          <p className="fade-in fade-in-delay-3 mt-4 font-[family-name:var(--font-body)] text-sm text-charcoal/40">
            Lead Instructor, Casa Carolina &middot; Cartagena, Colombia
          </p>
        </div>
      </section>

      {/* ━━━ SERVICES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-charcoal/40 mb-4">
              OFFERINGS
            </p>
            <h2
              className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-charcoal"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300 }}
            >
              Six Modalities, One Intention
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, i) => (
              <div
                key={service.name}
                className={`fade-in fade-in-delay-${Math.min(i + 1, 5)} service-card p-8 rounded-2xl border border-charcoal/5 bg-cream/50`}
              >
                <h3 className="font-[family-name:var(--font-display)] text-2xl text-charcoal mb-3">
                  {service.name}
                </h3>
                <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/50 leading-relaxed mb-6">
                  {service.description}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-charcoal/5">
                  <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/70">
                    {service.price}
                  </span>
                  <span className="font-[family-name:var(--font-body)] text-xs text-charcoal/35">
                    {service.duration}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="fade-in text-center mt-14">
            <button
              onClick={scrollToBooking}
              className="cta-button px-10 py-4 border border-charcoal text-charcoal font-[family-name:var(--font-body)] text-sm tracking-[0.2em]"
            >
              <span>BOOK YOUR EXPERIENCE</span>
            </button>
          </div>
        </div>
      </section>

      {/* ━━━ RETREATS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-charcoal/40 mb-4">
              IMMERSIVE EXPERIENCES
            </p>
            <h2
              className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-charcoal"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300 }}
            >
              Retreats in Cartagena
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {retreats.map((retreat, i) => (
              <div
                key={retreat.title}
                className={`fade-in fade-in-delay-${i + 1} booking-glow rounded-3xl overflow-hidden bg-white`}
              >
                <div className="p-10">
                  <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-rose/60 mb-3">
                    {retreat.subtitle.toUpperCase()}
                  </p>
                  <h3 className="font-[family-name:var(--font-display)] text-3xl text-charcoal mb-4">
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
                    <span className="font-[family-name:var(--font-display)] text-2xl text-charcoal">
                      {retreat.price}
                    </span>
                    <button
                      onClick={scrollToBooking}
                      className="font-[family-name:var(--font-body)] text-sm tracking-[0.15em] text-rose hover:text-charcoal transition-colors"
                    >
                      INQUIRE
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ TESTIMONIALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32 bg-charcoal">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="relative min-h-[200px] flex items-center justify-center">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
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
                  className="font-[family-name:var(--font-display)] text-white/90 leading-relaxed italic"
                  style={{ fontSize: "clamp(1.1rem, 2vw, 1.4rem)", fontWeight: 300 }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-8 flex items-center gap-3">
                  <div className="h-px w-8 bg-rose-soft/30" />
                  <span className="font-[family-name:var(--font-body)] text-sm text-white/40">
                    {t.name}, {t.location}
                  </span>
                  <div className="h-px w-8 bg-rose-soft/30" />
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-12">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className="w-1.5 h-1.5 rounded-full transition-all duration-500"
                style={{
                  background:
                    activeTestimonial === i
                      ? "rgba(212,165,165,0.8)"
                      : "rgba(255,255,255,0.2)",
                  width: activeTestimonial === i ? 24 : 6,
                }}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ BOOKING — The Star ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="book" className="py-24 md:py-32 bg-cream">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-charcoal/40 mb-4">
              YOUR NEXT STEP
            </p>
            <h2
              className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-charcoal"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300 }}
            >
              Book Your Session
            </h2>
            <p className="fade-in fade-in-delay-2 font-[family-name:var(--font-body)] text-charcoal/50 mt-4 max-w-lg mx-auto">
              Select an experience below. Tata personally reviews every booking
              request and will confirm within 24 hours.
            </p>
          </div>

          <div className="fade-in fade-in-delay-3">
            <BookingSection />
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="py-16 border-t border-charcoal/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {/* Brand */}
            <div>
              <Image
                src="/tu-logo.png"
                alt="TU."
                width={60}
                height={60}
                style={{ objectFit: "contain" }}
              />
              <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-4 max-w-xs">
                Transformative wellness experiences in Cartagena, Colombia.
              </p>
            </div>

            {/* Quick links */}
            <div>
              <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40 mb-4">
                QUICK LINKS
              </p>
              <div className="space-y-3">
                {[
                  { label: "Book a Session", href: "#book" },
                  { label: "Instagram", href: "https://instagram.com/tuisyou" },
                  {
                    label: "WhatsApp",
                    href: "https://wa.me/573001234567",
                  },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      link.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40 mb-4">
                LOCATION
              </p>
              <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/50 leading-relaxed">
                Casa Carolina
                <br />
                Centro Historico
                <br />
                Cartagena de Indias, Colombia
              </p>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-charcoal/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/30">
              &copy; {new Date().getFullYear()} TU. by Tata Umana. All rights
              reserved.
            </p>
            <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/20">
              Built by MachineMind
            </p>
          </div>
        </div>
      </footer>

      {/* ━━━ Floating Elements ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ChatBot />
      <WhatsAppButton />
    </main>
  );
}
