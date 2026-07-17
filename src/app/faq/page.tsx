"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Lang = "en" | "es";

interface FAQ {
  q: { en: string; es: string };
  a: { en: string; es: string };
  category: string;
}

const FALLBACK_FAQS: FAQ[] = [
  // Booking
  {
    category: "booking",
    q: { en: "How do I book a class?", es: "¿Cómo reservo una clase?" },
    a: {
      en: "Create an account or log in, then go to your Portal > Schedule. Select the day and class you want, and click to book. You'll need an active pack or can purchase a walk-in class.",
      es: "Crea una cuenta o inicia sesión, luego ve a tu Portal > Horario. Selecciona el día y la clase que quieres, y haz clic para reservar. Necesitas un pack activo o puedes comprar una clase individual.",
    },
  },
  {
    category: "booking",
    q: { en: "How far in advance can I book?", es: "¿Con cuánta anticipación puedo reservar?" },
    a: {
      en: "You can book up to 4 weeks in advance. Bookings close 2 hours before class starts.",
      es: "Puedes reservar hasta 4 semanas antes. Las reservas cierran 2 horas antes del inicio de la clase.",
    },
  },
  {
    category: "booking",
    q: { en: "What is the cancellation policy?", es: "¿Cuál es la política de cancelación?" },
    a: {
      en: "You can cancel for free up to 24 hours before class. Late cancellations or no-shows forfeit the class credit. This helps ensure spots are available for everyone.",
      es: "Puedes cancelar gratis hasta 24 horas antes de la clase. Las cancelaciones tardías o no-shows pierden el crédito de clase. Esto ayuda a garantizar cupos para todos.",
    },
  },
  {
    category: "booking",
    q: { en: "What if a class is full?", es: "¿Qué pasa si una clase está llena?" },
    a: {
      en: "You can join the waitlist. If someone cancels, you'll be notified automatically so you can grab the spot.",
      es: "Puedes unirte a la lista de espera. Si alguien cancela, te notificaremos automáticamente para que puedas tomar el cupo.",
    },
  },
  // Classes
  {
    category: "classes",
    q: { en: "What should I bring to class?", es: "¿Qué debo llevar a la clase?" },
    a: {
      en: "Wear comfortable clothes you can move in. Bring water and a small towel. Mats are provided at the studio, but you're welcome to bring your own.",
      es: "Usa ropa cómoda en la que puedas moverte. Trae agua y una toalla pequeña. Los mats están disponibles en el estudio, pero puedes traer el tuyo.",
    },
  },
  {
    category: "classes",
    q: { en: "I'm a beginner — which class should I start with?", es: "Soy principiante — ¿con cuál clase debo empezar?" },
    a: {
      en: "Hatha Yoga and Yin Yoga are perfect for beginners — gentle pace with detailed guidance. Vinyasa Flow is great if you want something more dynamic. All our teachers adapt to every level in the room.",
      es: "Hatha Yoga y Yin Yoga son perfectos para principiantes — ritmo suave con guía detallada. Vinyasa Flow es genial si quieres algo más dinámico. Todos nuestros profesores se adaptan a cada nivel en la sala.",
    },
  },
  {
    category: "classes",
    q: { en: "Are classes in English or Spanish?", es: "¿Las clases son en inglés o español?" },
    a: {
      en: "Most classes are bilingual (English and Spanish). Meditación Viaje Interior is in Spanish only. Our teachers naturally guide in both languages.",
      es: "La mayoría de las clases son bilingües (inglés y español). Meditación Viaje Interior es solo en español. Nuestros profesores guían naturalmente en ambos idiomas.",
    },
  },
  {
    category: "classes",
    q: { en: "How long are the classes?", es: "¿Cuánto duran las clases?" },
    a: {
      en: "Most group classes are 60 minutes. Sound healing sessions are 75-90 minutes. Private sessions are 60 minutes.",
      es: "La mayoría de las clases grupales son de 60 minutos. Las sesiones de sanación con sonido son de 75-90 minutos. Las sesiones privadas son de 60 minutos.",
    },
  },
  {
    category: "classes",
    q: { en: "What time should I arrive?", es: "¿A qué hora debo llegar?" },
    a: {
      en: "Please arrive 10 minutes before class. This gives you time to settle in, set up your mat, and transition into the practice space. Late arrivals may not be admitted to preserve the experience for everyone.",
      es: "Por favor llega 10 minutos antes de la clase. Esto te da tiempo para instalarte, preparar tu mat y hacer la transición al espacio de práctica. Las llegadas tarde pueden no ser admitidas para preservar la experiencia de todos.",
    },
  },
  // Pricing & Packs
  {
    category: "pricing",
    q: { en: "How much does a single class cost?", es: "¿Cuánto cuesta una clase individual?" },
    a: {
      en: "A walk-in class is $80,000 COP (~$21 USD). On Tuesdays (Industry Rate) and Fridays (Open Flow), it's $45,000 COP (~$12 USD).",
      es: "Una clase individual cuesta $80,000 COP (~$21 USD). Los martes (Tarifa Industria) y viernes (Open Flow), es $45,000 COP (~$12 USD).",
    },
  },
  {
    category: "pricing",
    q: { en: "What packs are available?", es: "¿Qué packs están disponibles?" },
    a: {
      en: "Just Flow Pack (6 classes, $295,000 COP / $78 USD, 45 days), TU Healing Pack (8 classes, $420,000 COP / $111 USD, 60 days), TU Balance Pack (12 classes, $630,000 COP / $166 USD, 90 days), and Unlimited Monthly ($1,050,000 COP / $277 USD).",
      es: "Just Flow Pack (6 clases, $295,000 COP / $78 USD, 45 días), TU Healing Pack (8 clases, $420,000 COP / $111 USD, 60 días), TU Balance Pack (12 clases, $630,000 COP / $166 USD, 90 días), e Ilimitado Mensual ($1,050,000 COP / $277 USD).",
    },
  },
  {
    category: "pricing",
    q: { en: "Do packs expire?", es: "¿Los packs expiran?" },
    a: {
      en: "Yes. Each pack has an expiration window from the date of purchase: Just Flow (45 days), TU Healing (60 days), TU Balance (90 days), Unlimited (30 days). Use your credits within that window.",
      es: "Sí. Cada pack tiene una ventana de vencimiento desde la fecha de compra: Just Flow (45 días), TU Healing (60 días), TU Balance (90 días), Ilimitado (30 días). Usa tus créditos dentro de esa ventana.",
    },
  },
  // Payment
  {
    category: "payment",
    q: { en: "What payment methods do you accept?", es: "¿Qué métodos de pago aceptan?" },
    a: {
      en: "Credit/debit cards (Visa, Mastercard, Amex) via Wompi (4% processing fee), Nequi, Bancolombia transfer, and for international clients: Zelle and PayPal. Cash is not accepted.",
      es: "Tarjetas de crédito/débito (Visa, Mastercard, Amex) vía Wompi (4% comisión), Nequi, transferencia Bancolombia, y para clientes internacionales: Zelle y PayPal. No se acepta efectivo.",
    },
  },
  {
    category: "payment",
    q: { en: "How does payment confirmation work?", es: "¿Cómo funciona la confirmación de pago?" },
    a: {
      en: "Card payments are confirmed automatically. For Nequi, Bancolombia, Zelle, or PayPal, send your receipt via WhatsApp to +57 316 633 3663. Your pack will be activated within 24 hours.",
      es: "Los pagos con tarjeta se confirman automáticamente. Para Nequi, Bancolombia, Zelle o PayPal, envía tu comprobante por WhatsApp al +57 316 633 3663. Tu pack se activará en 24 horas.",
    },
  },
  // Location
  {
    category: "location",
    q: { en: "Where are the classes?", es: "¿Dónde son las clases?" },
    a: {
      en: "At Casa Carolina, Centro Histórico, Cartagena de Indias, Colombia. It's a beautifully restored colonial house in the heart of the walled city.",
      es: "En Casa Carolina, Centro Histórico, Cartagena de Indias, Colombia. Es una hermosa casa colonial restaurada en el corazón de la ciudad amurallada.",
    },
  },
  // Private sessions
  {
    category: "private",
    q: { en: "What private services does Tata offer?", es: "¿Qué servicios privados ofrece Tata?" },
    a: {
      en: "Discovery consultations ($22 USD), personalized yoga ($50 USD/hr), virtual sessions ($45 USD/hr), energy work including quantum surgery and cleansing ceremonies, and a 3-month transformation program ($2,046 USD).",
      es: "Consultas de descubrimiento ($22 USD), yoga personalizado ($50 USD/hr), sesiones virtuales ($45 USD/hr), trabajo energético incluyendo cirugía cuántica y ceremonias de limpieza, y un programa de transformación de 3 meses ($2,046 USD).",
    },
  },
  {
    category: "private",
    q: { en: "Can I book a private session if I'm not in Cartagena?", es: "¿Puedo reservar una sesión privada si no estoy en Cartagena?" },
    a: {
      en: "Yes! Tata offers virtual video sessions ($45 USD/hr) for yoga, meditation, energy work, and the transformation program. WhatsApp +57 316 633 3663 to schedule.",
      es: "¡Sí! Tata ofrece sesiones virtuales por video ($45 USD/hr) para yoga, meditación, trabajo energético y el programa de transformación. WhatsApp +57 316 633 3663 para agendar.",
    },
  },
];

const categories = [
  { key: "all", en: "All", es: "Todo" },
  { key: "booking", en: "Booking", es: "Reservas" },
  { key: "classes", en: "Classes", es: "Clases" },
  { key: "pricing", en: "Pricing & Packs", es: "Precios y Packs" },
  { key: "payment", en: "Payment", es: "Pagos" },
  { key: "location", en: "Location", es: "Ubicación" },
  { key: "private", en: "Private Sessions", es: "Sesiones Privadas" },
];

export default function FAQPage() {
  const [lang, setLang] = useState<Lang>("es");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>(FALLBACK_FAQS);

  useEffect(() => {
    fetch("/api/public/faq")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data?.length) {
          setFaqs(d.data.map((f: { question_en: string; question_es: string; answer_en: string; answer_es: string; category: string }) => ({
            q: { en: f.question_en, es: f.question_es },
            a: { en: f.answer_en, es: f.answer_es },
            category: f.category,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const filtered = activeCategory === "all"
    ? faqs
    : faqs.filter((f) => f.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <header className="border-b border-[#2C2C2C]/5 bg-white/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-xl text-[#2C2C2C]"
          >
            TU.
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang("es")}
              className={`text-xs tracking-[0.2em] ${lang === "es" ? "text-[#B87777] border-b border-[#B87777]" : "text-[#2C2C2C]/40"}`}
            >
              ES
            </button>
            <span className="text-[#2C2C2C]/20">|</span>
            <button
              onClick={() => setLang("en")}
              className={`text-xs tracking-[0.2em] ${lang === "en" ? "text-[#B87777] border-b border-[#B87777]" : "text-[#2C2C2C]/40"}`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <p className="text-[10px] tracking-[0.3em] text-[#B87777] uppercase mb-3">
            {lang === "en" ? "HELP CENTER" : "CENTRO DE AYUDA"}
          </p>
          <h1
            className="text-3xl md:text-4xl text-[#2C2C2C] mb-4"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            {lang === "en" ? "Frequently Asked Questions" : "Preguntas Frecuentes"}
          </h1>
          <p className="text-sm text-[#2C2C2C]/50 max-w-md mx-auto" style={{ fontFamily: "Outfit, sans-serif" }}>
            {lang === "en"
              ? "Everything you need to know about classes, booking, and your practice at TU."
              : "Todo lo que necesitas saber sobre clases, reservas y tu práctica en TU."}
          </p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setOpenIndex(null); }}
              className={`px-4 py-2 rounded-full text-xs tracking-[0.1em] transition-all duration-300 ${
                activeCategory === cat.key
                  ? "bg-[#2C2C2C] text-white"
                  : "bg-[#2C2C2C]/5 text-[#2C2C2C]/60 hover:bg-[#2C2C2C]/10"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {cat[lang]}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-2">
          {filtered.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.q.en}
                className={`border rounded-xl transition-all duration-300 ${
                  isOpen ? "border-[#B87777]/30 bg-white shadow-sm" : "border-[#2C2C2C]/8 bg-white/60"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span
                    className="text-sm text-[#2C2C2C] pr-4"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {faq.q[lang]}
                  </span>
                  <svg
                    className={`w-4 h-4 text-[#B87777] shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5">
                    <p
                      className="text-sm text-[#2C2C2C]/60 leading-relaxed"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {faq.a[lang]}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions */}
        <div className="mt-16 text-center rounded-2xl border border-[#B87777]/20 bg-[#B87777]/5 p-8 md:p-10">
          <h2
            className="text-xl text-[#2C2C2C] mb-3"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            {lang === "en" ? "Still have questions?" : "¿Aún tienes preguntas?"}
          </h2>
          <p
            className="text-sm text-[#2C2C2C]/50 mb-6"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {lang === "en"
              ? "I'd love to help you personally. Reach out anytime."
              : "Me encantaría ayudarte personalmente. Escríbeme cuando quieras."}
          </p>
          <a
            href="https://wa.me/573166333663"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-3 bg-[#2C2C2C] text-white text-xs tracking-[0.2em] rounded-full hover:bg-[#B87777] transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            WHATSAPP TATA
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>

        {/* Back to site */}
        <div className="text-center mt-10">
          <Link
            href="/"
            className="text-xs text-[#2C2C2C]/40 hover:text-[#2C2C2C]/60 transition-colors"
          >
            &larr; {lang === "en" ? "Back to site" : "Volver al sitio"}
          </Link>
        </div>
      </div>
    </div>
  );
}
