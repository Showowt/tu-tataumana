"use client";

import Image from "next/image";
import Link from "next/link";
import { t, type Lang } from "@/lib/translations";

export interface StickyNavProps {
  lang: Lang;
  L: (key: Record<Lang, string | readonly string[]>) => string | readonly string[];
  showStickyBar: boolean;
  scrollProgress: number;
  isLoggedIn: boolean;
  openBooking: (service?: string, date?: string, time?: string) => void;
  setLang: (lang: Lang) => void;
}

export default function StickyNav({
  lang,
  L,
  showStickyBar,
  scrollProgress,
  isLoggedIn,
  openBooking,
  setLang,
}: StickyNavProps) {
  return (
    <>
      {/* ━━━ SCROLL PROGRESS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        className="scroll-progress"
        style={{ transform: `scaleX(${scrollProgress})`, opacity: showStickyBar ? 1 : 0 }}
      />

      {/* ━━━ STICKY NAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav
        className={`nav-sticky fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-5 md:px-8 border-b ${
          showStickyBar
            ? "bg-cream/90 backdrop-blur-xl border-charcoal/5 shadow-[0_1px_20px_rgba(0,0,0,0.04)]"
            : "bg-transparent border-transparent"
        }`}
        style={{ height: 56 }}
      >
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2.5 group"
          aria-label="Scroll to top"
        >
          <Image
            src="/tu-logo.png"
            alt="TU."
            width={28}
            height={28}
            className={`transition-all duration-500 ${showStickyBar ? "opacity-100" : "opacity-0 -translate-y-2"}`}
            style={{ objectFit: "contain" }}
          />
          <span
            className={`font-[family-name:var(--font-display)] text-sm tracking-[0.15em] transition-all duration-500 ${
              showStickyBar ? "text-charcoal/70 opacity-100" : "text-white/80 opacity-0 -translate-y-2"
            }`}
            style={{ fontWeight: 300 }}
          >
            TATA UMANA
          </span>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openBooking()}
            className={`px-4 py-1.5 rounded-full font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] transition-all duration-500 ${
              showStickyBar
                ? "bg-rose text-white hover:bg-charcoal opacity-100 translate-y-0"
                : "bg-white/15 backdrop-blur-md text-white hover:bg-white/25 opacity-0 translate-y-2 pointer-events-none"
            }`}
            style={{ minHeight: 36 }}
          >
            {lang === "en" ? "BOOK NOW" : "RESERVAR"}
          </button>
          <Link
            href={isLoggedIn ? "/portal" : "/login"}
            className={`px-3.5 py-1.5 rounded-full backdrop-blur-md border font-[family-name:var(--font-body)] text-[10px] tracking-[0.15em] no-underline transition-all duration-500 ${
              showStickyBar
                ? "bg-charcoal/5 border-charcoal/8 text-charcoal/60 hover:bg-charcoal/10"
                : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
            }`}
            style={{ minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {isLoggedIn
              ? lang === "en" ? "My Account" : "Mi Cuenta"
              : lang === "en" ? "Sign In" : "Entrar"}
          </Link>
          <button
            onClick={() => setLang(lang === "en" ? "es" : "en")}
            className={`px-2.5 py-1.5 rounded-full backdrop-blur-md border font-[family-name:var(--font-body)] text-[10px] tracking-[0.15em] transition-all duration-500 ${
              showStickyBar
                ? "bg-charcoal/5 border-charcoal/8 text-charcoal/60 hover:bg-charcoal/10"
                : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
            }`}
            style={{ minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label="Toggle language"
          >
            {lang === "en" ? "ES" : "EN"}
          </button>
        </div>
      </nav>
    </>
  );
}
