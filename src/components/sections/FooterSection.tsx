"use client";

import Image from "next/image";
import { t, type Lang } from "@/lib/translations";

export interface FooterSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
  openBooking: (service?: string, date?: string, time?: string) => void;
  showStickyBar: boolean;
}

export default function FooterSection({ lang, L, openBooking, showStickyBar }: FooterSectionProps) {
  return (
    <>
      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="pt-16 pb-36 border-t border-charcoal/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            <div>
              <Image
                src="/tu-logo.png"
                alt="TU."
                width={60}
                height={60}
                style={{ objectFit: "contain" }}
              />
              <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-4 max-w-xs">
                {L(t.transformative) as string}
              </p>
            </div>

            <div>
              <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40 mb-4">
                {L(t.connect) as string}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => openBooking()}
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  {L(t.bookASession) as string}
                </button>
                <a
                  href="https://instagram.com/tuisyou"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  @tuisyou
                </a>
                <a
                  href="https://instagram.com/justbyogabytuisyou"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  @justbyogabytuisyou
                </a>
                <a
                  href="https://wa.me/573166333663"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  WhatsApp
                </a>
                <a
                  href="mailto:tata@tuisyou.com"
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  tata@tuisyou.com
                </a>
                <a
                  href="/portal"
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  {lang === "en" ? "My Account" : "Mi Cuenta"}
                </a>
                <a
                  href="/faq"
                  className="block font-[family-name:var(--font-body)] text-sm text-charcoal/50 hover:text-rose transition-colors py-1"
                >
                  FAQ
                </a>
              </div>
            </div>

            <div>
              <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40 mb-4">
                {L(t.location) as string}
              </p>
              <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/50 leading-relaxed">
                {L(t.casaCarolina) as string}
                <br />
                Calle del Arzobispado, Cra. 5 #34-14
                <br />
                {L(t.centroHistorico) as string}
                <br />
                {L(t.cartagena) as string}
              </p>
              <div className="mt-4">
                <p className="font-[family-name:var(--font-body)] text-[9px] tracking-[0.15em] text-gold/70 mb-2">
                  JUSTBYOGA BY TUISYOU
                </p>
                <iframe
                  src="https://maps.google.com/maps?q=JustB%20Yoga%20by%20TUISYOU%2C%20Calle%20del%20Arzobispado%2C%20Cartagena%20de%20Indias&t=&z=17&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="160"
                  style={{ border: 0, borderRadius: "8px", opacity: 0.9 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="JUSTBYOGA BY TUISYOU - Casa Carolina, Cartagena"
                />
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-charcoal/5">
            <div className="divider-gold mb-8" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/30">
                  &copy; {new Date().getFullYear()} TU. by Tata Umana
                </p>
                <span className="text-charcoal/10">&middot;</span>
                <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.15em] text-gold/30">
                  JUSTBYOGA BY TUISYOU
                </p>
              </div>
              <div className="flex items-center gap-4">
                <a href="/terms" className="font-[family-name:var(--font-body)] text-[10px] text-charcoal/20 hover:text-charcoal/40 transition-colors">
                  {L({ en: "Terms", es: "Terminos" }) as string}
                </a>
                <a href="/privacy" className="font-[family-name:var(--font-body)] text-[10px] text-charcoal/20 hover:text-charcoal/40 transition-colors">
                  {L({ en: "Privacy", es: "Privacidad" }) as string}
                </a>
                <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/20">
                  Built by MachineMind
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ━━━ STICKY BOOK BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          transform: showStickyBar ? "translateY(0)" : "translateY(100%)",
          opacity: showStickyBar ? 1 : 0,
        }}
      >
        <div className="bg-white/90 backdrop-blur-xl border-t border-charcoal/5 px-6 lg:px-8 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="font-[family-name:var(--font-display)] text-charcoal text-lg">
                TU. by Tata Umana
              </p>
              <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40">
                {L(t.sessionsFrom) as string} &middot; Cartagena, Colombia
              </p>
            </div>
            <button
              onClick={() => openBooking()}
              className="btn-tactile w-full sm:w-auto px-8 py-3.5 bg-charcoal text-white font-[family-name:var(--font-body)] text-sm tracking-[0.2em] hover:bg-rose transition-colors duration-300 rounded-full"
            >
              {L(t.bookNow) as string}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
