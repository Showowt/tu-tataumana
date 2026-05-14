"use client";

import { t, type Lang } from "@/lib/translations";

export interface PaymentMethodsSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
  openBooking: (service?: string, date?: string, time?: string) => void;
}

export default function PaymentMethodsSection({ lang, L, openBooking }: PaymentMethodsSectionProps) {
  return (
    <section id="payment" className="py-20 md:py-28 bg-cream-warm">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="fade-in font-[family-name:var(--font-body)] text-xs tracking-[0.3em] text-charcoal/40 mb-4">
            {L(t.paymentLabel) as string}
          </p>
          <h2
            className="fade-in fade-in-delay-1 font-[family-name:var(--font-display)] text-charcoal"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300 }}
          >
            {L(t.paymentTitle) as string}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-reveal">
          {/* Wompi — Card Payment (opens booking modal) */}
          <button
            onClick={() => openBooking()}
            className="fade-in fade-in-delay-1 group flex items-center gap-5 p-6 rounded-2xl border-2 border-gold/25 bg-white hover:border-gold/50 hover:shadow-lg transition-all duration-500 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center shrink-0 group-hover:bg-gold/25 transition-colors">
              <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                Credit / Debit Card
              </p>
              <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-0.5">
                {L(t.paymentCardDesc) as string}
              </p>
              <p className="font-[family-name:var(--font-body)] text-[10px] text-rose/50 mt-0.5">
                {lang === "en" ? "+4% processing fee applies" : "+4% comisión de procesamiento"}
              </p>
            </div>
            <svg className="w-5 h-5 text-charcoal/20 group-hover:text-gold group-hover:translate-x-1 transition-all shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>

          {/* Nequi */}
          <div className="fade-in fade-in-delay-2 flex items-center gap-5 p-6 rounded-2xl border border-charcoal/8 bg-white">
            <div className="w-12 h-12 rounded-full bg-[#E6007E]/10 flex items-center justify-center shrink-0">
              <span className="font-[family-name:var(--font-body)] text-sm font-bold text-[#E6007E]">N</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                Nequi
              </p>
              <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-0.5">
                {L(t.paymentNequiDesc) as string}
              </p>
            </div>
            <p className="font-mono text-sm text-charcoal/70 shrink-0">3185083035</p>
          </div>

          {/* Bancolombia */}
          <div className="fade-in fade-in-delay-3 flex items-center gap-5 p-6 rounded-2xl border border-charcoal/8 bg-white">
            <div className="w-12 h-12 rounded-full bg-[#FDDA24]/20 flex items-center justify-center shrink-0">
              <span className="font-[family-name:var(--font-body)] text-sm font-bold text-[#0033A0]">B</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                Bancolombia
              </p>
              <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-0.5">
                {L(t.paymentBancoDesc) as string}
              </p>
            </div>
            <p className="font-mono text-sm text-charcoal/70 shrink-0">207-859047-00</p>
          </div>

          {/* Zelle / PayPal */}
          <div className="fade-in fade-in-delay-4 flex items-center gap-5 p-6 rounded-2xl border border-charcoal/8 bg-white">
            <div className="w-12 h-12 rounded-full bg-[#6C3EC1]/10 flex items-center justify-center shrink-0">
              <span className="font-[family-name:var(--font-body)] text-sm font-bold text-[#6C3EC1]">Z</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                Zelle / PayPal
              </p>
              <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-0.5">
                {L(t.paymentZelleDesc) as string}
              </p>
            </div>
            <p className="font-mono text-sm text-charcoal/70 shrink-0">+1 917 453 8307</p>
          </div>
        </div>

        {/* Receipt notice */}
        <div className="fade-in fade-in-delay-5 mt-6 text-center">
          <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40">
            {L(t.paymentReceipt) as string}:{" "}
            <a href="https://wa.me/573185083035" target="_blank" rel="noopener noreferrer" className="text-rose hover:text-rose-soft underline underline-offset-2 transition-colors">
              +57 318 508 3035
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
