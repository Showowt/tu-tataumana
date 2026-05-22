"use client";

import { useState } from "react";
import Link from "next/link";

type Lang = "en" | "es";

const L = (lang: Lang, en: string, es: string) => (lang === "en" ? en : es);

export default function PrivacyPage() {
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
          {L(lang, "Privacy Policy", "Politica de Privacidad")}
        </h1>
        <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
          {L(lang, "Last updated: May 2026", "Ultima actualizacion: Mayo 2026")}
        </p>

        <div className="space-y-6 text-sm text-[#2C2C2C]/70 leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              1. {L(lang, "Information We Collect", "Informacion que Recopilamos")}
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{L(lang, "Name, email address, and phone number (provided during registration)", "Nombre, correo electronico y numero de telefono (proporcionados durante el registro)")}</li>
              <li>{L(lang, "Emergency contact information (optional)", "Informacion de contacto de emergencia (opcional)")}</li>
              <li>{L(lang, "Booking history and class attendance records", "Historial de reservas y registros de asistencia")}</li>
              <li>{L(lang, "Payment transaction records (we do not store credit card numbers)", "Registros de transacciones de pago (no almacenamos numeros de tarjeta de credito)")}</li>
              <li>{L(lang, "Language preferences", "Preferencias de idioma")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              2. {L(lang, "How We Use Your Information", "Como Usamos tu Informacion")}
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{L(lang, "Managing your bookings and class registrations", "Gestionar tus reservas y registros de clases")}</li>
              <li>{L(lang, "Processing payments through secure third-party providers (Square, Wompi)", "Procesar pagos a traves de proveedores seguros de terceros (Square, Wompi)")}</li>
              <li>{L(lang, "Sending booking confirmations and class reminders", "Enviar confirmaciones de reserva y recordatorios de clase")}</li>
              <li>{L(lang, "Communicating about schedule changes, promotions, or studio updates", "Comunicar cambios de horario, promociones o novedades del estudio")}</li>
              <li>{L(lang, "Improving our services and your experience", "Mejorar nuestros servicios y tu experiencia")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              3. {L(lang, "Data Storage & Security", "Almacenamiento y Seguridad de Datos")}
            </h2>
            <p>
              {L(
                lang,
                "Your data is stored securely using Supabase (PostgreSQL) with row-level security policies. Authentication is handled through industry-standard protocols. Payment processing is handled by PCI-compliant third-party providers — we never store your credit card information.",
                "Tus datos se almacenan de forma segura usando Supabase (PostgreSQL) con politicas de seguridad a nivel de fila. La autenticacion se maneja mediante protocolos estandar de la industria. El procesamiento de pagos es manejado por proveedores de terceros con cumplimiento PCI — nunca almacenamos tu informacion de tarjeta de credito.",
              )}
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              4. {L(lang, "Third-Party Services", "Servicios de Terceros")}
            </h2>
            <p>
              {L(
                lang,
                "We use the following third-party services that may process your data:",
                "Utilizamos los siguientes servicios de terceros que pueden procesar tus datos:",
              )}
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Square / Wompi</strong> — {L(lang, "Payment processing", "Procesamiento de pagos")}</li>
              <li><strong>Supabase</strong> — {L(lang, "Database and authentication", "Base de datos y autenticacion")}</li>
              <li><strong>Vercel</strong> — {L(lang, "Website hosting", "Alojamiento web")}</li>
              <li><strong>WhatsApp</strong> — {L(lang, "Booking communications", "Comunicaciones de reservas")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              5. {L(lang, "Your Rights", "Tus Derechos")}
            </h2>
            <p>
              {L(
                lang,
                "Under Colombian data protection law (Ley 1581 de 2012), you have the right to:",
                "Bajo la ley colombiana de proteccion de datos (Ley 1581 de 2012), tienes derecho a:",
              )}
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>{L(lang, "Access your personal data", "Acceder a tus datos personales")}</li>
              <li>{L(lang, "Update or correct your information", "Actualizar o corregir tu informacion")}</li>
              <li>{L(lang, "Request deletion of your account and data", "Solicitar la eliminacion de tu cuenta y datos")}</li>
              <li>{L(lang, "Revoke consent for data processing", "Revocar el consentimiento para el procesamiento de datos")}</li>
            </ul>
            <p className="mt-2">
              {L(
                lang,
                "To exercise these rights, contact us at tataumana@gmail.com.",
                "Para ejercer estos derechos, contactanos en tataumana@gmail.com.",
              )}
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[#2C2C2C] mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              6. {L(lang, "Data Retention", "Retencion de Datos")}
            </h2>
            <p>
              {L(
                lang,
                "We retain your personal data for as long as your account is active. If you request deletion, we will remove your data within 30 days, except where retention is required by law (e.g., financial records).",
                "Conservamos tus datos personales mientras tu cuenta este activa. Si solicitas la eliminacion, borraremos tus datos dentro de 30 dias, excepto donde la retencion sea requerida por ley (ej. registros financieros).",
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
                "For privacy-related inquiries, contact us at tataumana@gmail.com or via WhatsApp at +57 316 633 3663.",
                "Para consultas relacionadas con privacidad, contactanos en tataumana@gmail.com o via WhatsApp al +57 316 633 3663.",
              )}
            </p>
            <p className="mt-2 text-xs text-[#2C2C2C]/40">
              TU. by Tata Umana — Centro Historico, Cartagena de Indias, Colombia
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-[#2C2C2C]/5 flex gap-4">
          <Link
            href="/terms"
            className="text-[10px] tracking-[0.15em] uppercase text-[#B87777] hover:underline"
          >
            {L(lang, "Terms of Service", "Terminos y Condiciones")}
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
