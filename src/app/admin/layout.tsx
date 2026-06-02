"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

const tabs = [
  { href: "/admin", label: "Hoy", icon: "\u25C9" },
  { href: "/admin/bookings", label: "Reservas", icon: "\u25CB" },
  { href: "/admin/horario", label: "Horario", icon: "\u25A4" },
  { href: "/admin/sessions", label: "Clases", icon: "\u25A6" },
  { href: "/admin/events", label: "Eventos", icon: "\u2726" },
  { href: "/admin/private", label: "Privadas", icon: "\u2727" },
  { href: "/admin/students", label: "Alumnos", icon: "\u25CE" },
  { href: "/admin/packs", label: "Packs", icon: "\u25C6" },
  { href: "/admin/payments", label: "Pagos", icon: "\u25C8" },
  { href: "/admin/discounts", label: "Descuentos", icon: "\u25D9" },
  { href: "/admin/pricing", label: "Precios", icon: "\u25B2" },
  { href: "/admin/team", label: "Equipo", icon: "\u25C7" },
  { href: "/admin/settings", label: "Config", icon: "\u25CE" },
  { href: "/admin/logs", label: "Logs", icon: "\u25A3" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-16 md:pb-0">
      {/* Top header */}
      <header className="bg-white border-b border-[#2C2C2C]/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="text-lg text-[#2C2C2C]"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            TU. <span className="text-[#B87777]">Admin</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/portal"
            className="text-[9px] tracking-[0.15em] text-[#2C2C2C]/30 uppercase hover:text-[#B87777] transition-colors"
          >
            Portal
          </Link>
          <Link
            href="/"
            className="text-[9px] tracking-[0.15em] text-[#2C2C2C]/30 uppercase hover:text-[#B87777] transition-colors"
          >
            Sitio
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-[9px] tracking-[0.15em] text-red-300 uppercase hover:text-red-500 transition-colors disabled:opacity-30"
          >
            {loggingOut ? "..." : "Salir"}
          </button>
        </div>
      </header>

      {/* Desktop top nav */}
      <nav className="hidden md:flex border-b border-[#2C2C2C]/5 bg-white">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 py-3 text-center text-[10px] tracking-[0.15em] uppercase transition-colors border-b-2 ${
                isActive
                  ? "text-[#B87777] border-[#B87777]"
                  : "text-[#2C2C2C]/30 border-transparent hover:text-[#2C2C2C]/60"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <main>{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#2C2C2C]/5 flex z-50">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${
                isActive ? "text-[#B87777]" : "text-[#2C2C2C]/25"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="text-[9px] tracking-wider uppercase">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
