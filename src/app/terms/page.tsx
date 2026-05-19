"use client";

import { useState } from "react";
import Link from "next/link";

type Lang = "en" | "es";

const L = (lang: Lang, en: string, es: string) => (lang === "en" ? en : es);

export default function TermsPage() {
  const [lang, setLang] = useState<Lang>("es");

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#2C2C2C]/5">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="text-xl text-[#2C2C2C]"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            TU.
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLang("es")}
            className={`text-[10px] tracking-[0.15em] ${lang === "es" ? "text-[#B87777]" : "text-[#2C2C2C]/30"}`}
          >
            ES
          </button>
          <span className="text-[#2C2C2C]/15 text-[10px]">|</span>
          <button
            onClick={() => setLang("en")}
            className={`text-[10px] tracking-[0.15em] ${lang === "en" ? "text-[#B87777]" : "text-[#2C2C2C]/30"}`}
          >
            EN
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <h1
          className="text-3xl text-[#2C2C2C]"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          {L(lang, "Terms of Service", "Terminos y Condiciones")}
        </h1>
        <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
          {L(lang, "Last updated: May 2026", "Ultima actualizacion: Mayo 2026")}
        </p>

        <div className="space-y-6 text-sm text-[#2C2C2C]/70 leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              1. {L(lang, "Acceptance", "Aceptacion")}
            </h2>
            <p>
              {L(
                lang,
                "By creating an account or booking a class at TU. by Tata Umana, you agree to these Terms of Service. If you do not agree, please do not use our services.",
                "Al crear una cuenta o reservar una clase en TU. by Tata Umana, aceptas estos Terminos y Condiciones. Si no estas de acuerdo, por favor no utilices nuestros servicios.",
              )}
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              2. {L(lang, "Services", "Servicios")}
            </h2>
            <p>
              {L(
                lang,
                "TU. provides yoga and wellness classes, private sessions, retreats, and special events at our studio in Cartagena de Indias, Colombia. Class schedules, pricing, and availability are subject to change.",
                "TU. ofrece clases de yoga y bienestar, sesiones privadas, retiros y eventos especiales en nuestro estudio en Cartagena de Indias, Colombia. Los horarios, precios y disponibilidad estan sujetos a cambios.",
              )}
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              3. {L(lang, "Bookings & Cancellations", "Reservas y Cancelaciones")}
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{L(lang, "Classes must be booked at least 2 hours before the scheduled start time.", "Las clases deben reservarse al menos 2 horas antes de la hora de inicio.")}</li>
              <li>{L(lang, "Free cancellation is available up to 24 hours before class. Cancellations within 24 hours forfeit the class credit.", "La cancelacion gratuita esta disponible hasta 24 horas antes de la clase. Cancelaciones dentro de las 24 horas pierden el credito de clase.")}</li>
              <li>{L(lang, "No-shows forfeit the class credit with no refund.", "Las ausencias pierden el credito de clase sin reembolso.")}</li>
              <li>{L(lang, "Maximum 5 concurrent bookings per student.", "Maximo 5 reservas activas por alumno.")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              4. {L(lang, "Packs & Payments", "Packs y Pagos")}
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{L(lang, "Class packs expire after the specified period (14-90 days depending on pack type). Unused credits are not refundable after expiration.", "Los packs de clases expiran despues del periodo indicado (14-90 dias segun el tipo de pack). Los creditos no utilizados no son reembolsables despues del vencimiento.")}</li>
              <li>{L(lang, "Payments are processed through Square, Wompi, Nequi, Bancolombia, Zelle, or cash.", "Los pagos se procesan a traves de Square, Wompi, Nequi, Bancolombia, Zelle o efectivo.")}</li>
              <li>{L(lang, "All prices are listed in Colombian Pesos (COP). USD prices are approximate conversions.", "Todos los precios estan en Pesos Colombianos (COP). Los precios en USD son conversiones aproximadas.")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              5. {L(lang, "Health & Safety", "Salud y Seguridad")}
            </h2>
            <p>
              {L(
                lang,
                "You participate in classes at your own risk. Please inform your teacher of any injuries, medical conditions, or pregnancy before class. TU. is not responsible for injuries sustained during classes. Consult your physician before beginning any exercise program.",
                "Participas en las clases bajo tu propio riesgo. Por favor informa a tu profesor de cualquier lesion, condicion medica o embarazo antes de la clase. TU. no se hace responsable por lesiones durante las clases. Consulta a tu medico antes de iniciar cualquier programa de ejercicios.",
              )}
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              6. {L(lang, "Account", "Cuenta")}
            </h2>
            <p>
              {L(
                lang,
                "You are responsible for maintaining the confidentiality of your account credentials. One account per person. Sharing accounts or class credits is not permitted.",
                "Eres responsable de mantener la confidencialidad de tus credenciales de cuenta. Una cuenta por persona. Compartir cuentas o creditos de clases no esta permitido.",
              )}
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              7. {L(lang, "Contact", "Contacto")}
            </h2>
            <p>
              {L(
                lang,
                "For questions about these terms, contact us at tataumana@gmail.com or via WhatsApp at +57 318 508 3035.",
                "Para preguntas sobre estos terminos, contactanos en tataumana@gmail.com o via WhatsApp al +57 318 508 3035.",
              )}
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-[#2C2C2C]/5 flex gap-4">
          <Link
            href="/privacy"
            className="text-[10px] tracking-[0.15em] uppercase text-[#B87777] hover:underline"
          >
            {L(lang, "Privacy Policy", "Politica de Privacidad")}
          </Link>
          <Link
            href="/faq"
            className="text-[10px] tracking-[0.15em] uppercase text-[#2C2C2C]/40 hover:text-[#2C2C2C]"
          >
            FAQ
          </Link>
        </div>
      </main>
    </div>
  );
}
