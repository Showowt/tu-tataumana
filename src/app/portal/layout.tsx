"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Lang = "en" | "es";

const tabs = [
  {
    href: "/portal",
    label: { en: "Home", es: "Inicio" },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: "/portal/schedule",
    label: { en: "Schedule", es: "Horario" },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    href: "/portal/bookings",
    label: { en: "Bookings", es: "Reservas" },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    href: "/portal/packs",
    label: { en: "Packs", es: "Packs" },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
      </svg>
    ),
  },
  {
    href: "/portal/waitlist",
    label: { en: "Waitlist", es: "Espera" },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/portal/profile",
    label: { en: "Profile", es: "Perfil" },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [lang, setLang] = useState<Lang>("es");

  // Read student's preferred language from profile
  useEffect(() => {
    fetch("/api/student/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.preferred_lang) {
          setLang(json.data.preferred_lang);
        }
      })
      .catch(() => {});
  }, []);

  const isActive = (href: string) =>
    href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* Desktop top bar */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-[#2C2C2C]/5">
        <a href="/" className="flex items-center gap-2">
          <span
            className="text-xl text-[#2C2C2C]"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            TU.
          </span>
          <span className="text-[9px] tracking-[0.2em] text-[#B87777] uppercase">
            Portal
          </span>
        </a>

        <nav className="flex items-center gap-6">
          {tabs.map((tab) => (
            <a
              key={tab.href}
              href={tab.href}
              className={`text-xs tracking-[0.1em] uppercase transition-colors ${
                isActive(tab.href)
                  ? "text-[#B87777]"
                  : "text-[#2C2C2C]/50 hover:text-[#2C2C2C]"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {tab.label[lang]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {/* Language toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLang("es")}
              className={`text-[10px] tracking-[0.15em] transition-colors ${lang === "es" ? "text-[#B87777]" : "text-[#2C2C2C]/30 hover:text-[#2C2C2C]/50"}`}
            >
              ES
            </button>
            <span className="text-[#2C2C2C]/15 text-[10px]">|</span>
            <button
              onClick={() => setLang("en")}
              className={`text-[10px] tracking-[0.15em] transition-colors ${lang === "en" ? "text-[#B87777]" : "text-[#2C2C2C]/30 hover:text-[#2C2C2C]/50"}`}
            >
              EN
            </button>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs text-[#2C2C2C]/40 hover:text-[#B87777] transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {signingOut
              ? lang === "es" ? "Saliendo..." : "Signing out..."
              : lang === "es" ? "Cerrar sesion" : "Sign out"}
          </button>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#2C2C2C]/5">
        <a href="/" className="flex items-center gap-2">
          <span
            className="text-lg text-[#2C2C2C]"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            TU.
          </span>
          <span className="text-[8px] tracking-[0.2em] text-[#B87777] uppercase">
            Portal
          </span>
        </a>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLang("es")}
              className={`text-[9px] ${lang === "es" ? "text-[#B87777]" : "text-[#2C2C2C]/30"}`}
            >
              ES
            </button>
            <span className="text-[#2C2C2C]/15 text-[9px]">|</span>
            <button
              onClick={() => setLang("en")}
              className={`text-[9px] ${lang === "en" ? "text-[#B87777]" : "text-[#2C2C2C]/30"}`}
            >
              EN
            </button>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs text-[#2C2C2C]/40"
          >
            {signingOut ? "..." : lang === "es" ? "Salir" : "Out"}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-6">{children}</main>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#2C2C2C]/5 flex items-center justify-around py-2 z-50">
        {tabs.map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
              isActive(tab.href)
                ? "text-[#B87777]"
                : "text-[#2C2C2C]/30"
            }`}
          >
            {tab.icon}
            <span className="text-[9px] tracking-wide">
              {tab.label[lang]}
            </span>
          </a>
        ))}
      </nav>
    </div>
  );
}
