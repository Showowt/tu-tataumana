"use client";

import { type Lang } from "@/lib/translations";

export interface FeaturedPressSectionProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
}

export default function FeaturedPressSection({ lang, L }: FeaturedPressSectionProps) {
  return (
    <section className="py-12 md:py-16">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <p className="fade-in font-[family-name:var(--font-body)] text-[10px] tracking-[0.4em] text-charcoal/30 text-center mb-10">
          {lang === "en" ? "AS FEATURED IN" : "DESTACADA EN"}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Vogue */}
          <a
            href="https://www.vogue.com/article/cartagena-wellness-destination"
            target="_blank"
            rel="noopener noreferrer"
            className="fade-in group relative flex flex-col p-8 md:p-10 rounded-2xl border border-charcoal/5 bg-white hover:border-rose/20 hover:shadow-xl hover:shadow-rose/5 transition-all duration-500"
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="font-[family-name:var(--font-display)] text-2xl md:text-3xl tracking-[0.15em] text-charcoal/80 group-hover:text-charcoal transition-colors" style={{ fontWeight: 300 }}>
                VOGUE
              </span>
              <div className="h-px flex-1 bg-charcoal/5 group-hover:bg-rose/15 transition-colors" />
              <svg className="w-4 h-4 text-charcoal/15 group-hover:text-rose group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-lg md:text-xl text-charcoal/70 group-hover:text-charcoal transition-colors leading-relaxed" style={{ fontWeight: 300 }}>
              {lang === "en"
                ? "Cartagena as a Wellness Destination"
                : "Cartagena como Destino de Bienestar"}
            </h3>
            <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/35 mt-3 leading-relaxed">
              {lang === "en"
                ? "How Tata Umana and Casa Carolina are redefining holistic wellness in Colombia's most storied city."
                : "Cómo Tata Umaña y Casa Carolina están redefiniendo el bienestar holístico en la ciudad más histórica de Colombia."}
            </p>
            <span className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-rose/0 group-hover:text-rose/60 transition-all mt-5">
              {lang === "en" ? "READ ARTICLE" : "LEER ARTÍCULO"}
            </span>
          </a>

          {/* Diners */}
          <a
            href="https://revistadiners.com.co/estilo-de-vida/casa-carolina-el-patrimonio-historico-de-cartagena-que-renacio-junto-a-su-duena/"
            target="_blank"
            rel="noopener noreferrer"
            className="fade-in fade-in-delay-1 group relative flex flex-col p-8 md:p-10 rounded-2xl border border-charcoal/5 bg-white hover:border-gold/20 hover:shadow-xl hover:shadow-gold/5 transition-all duration-500"
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="font-[family-name:var(--font-display)] text-2xl md:text-3xl tracking-[0.15em] text-charcoal/80 group-hover:text-charcoal transition-colors" style={{ fontWeight: 300 }}>
                DINERS
              </span>
              <div className="h-px flex-1 bg-charcoal/5 group-hover:bg-gold/15 transition-colors" />
              <svg className="w-4 h-4 text-charcoal/15 group-hover:text-gold group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-lg md:text-xl text-charcoal/70 group-hover:text-charcoal transition-colors leading-relaxed" style={{ fontWeight: 300 }}>
              {lang === "en"
                ? "Casa Carolina: The Historic Heritage That Was Reborn"
                : "Casa Carolina: El Patrimonio Histórico que Renació"}
            </h3>
            <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/35 mt-3 leading-relaxed">
              {lang === "en"
                ? "The story of how a colonial Cartagena mansion became a sanctuary for transformation, guided by its visionary owner."
                : "La historia de cómo una mansión colonial de Cartagena se convirtió en un santuario de transformación, guiado por su visionaria dueña."}
            </p>
            <span className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-gold/0 group-hover:text-gold/60 transition-all mt-5">
              {lang === "en" ? "READ ARTICLE" : "LEER ARTÍCULO"}
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
