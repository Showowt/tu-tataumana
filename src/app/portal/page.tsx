"use client";

import { useEffect, useState } from "react";
import { formatTime } from "@/lib/constants/business-rules";

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  preferred_lang: "en" | "es";
}

interface BookingData {
  id: string;
  status: string;
  checked_in: boolean;
  session: {
    session_date: string;
    start_time: string;
    teacher: string;
    definition: {
      name: string;
      name_es: string;
      style: string;
      location: string;
      duration_minutes: number;
    };
  };
}

interface PackData {
  id: string;
  pack_type: string;
  classes_remaining: number;
  total_classes: number;
  status: string;
  expires_at: string;
}

export default function PortalDashboard() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [packs, setPacks] = useState<PackData[]>([]);
  const [loading, setLoading] = useState(true);

  const lang = profile?.preferred_lang || "es";

  useEffect(() => {
    async function load() {
      const [profileRes, bookingsRes, packsRes] = await Promise.all([
        fetch("/api/student/profile"),
        fetch("/api/student/bookings?status=confirmed&upcoming=true"),
        fetch("/api/student/packs?status=active"),
      ]);

      if (profileRes.ok) {
        const p = await profileRes.json();
        setProfile(p.data);
      }
      if (bookingsRes.ok) {
        const b = await bookingsRes.json();
        setBookings(b.data || []);
      }
      if (packsRes.ok) {
        const pk = await packsRes.json();
        setPacks(pk.data || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const greeting = lang === "es" ? "Hola" : "Hello";
  const firstName = profile?.full_name?.split(" ")[0] || "";

  const totalCredits = packs.reduce((sum, p) => {
    if (p.total_classes === -1) return sum + 999;
    return sum + p.classes_remaining;
  }, 0);

  const hasUnlimited = packs.some((p) => p.total_classes === -1);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Greeting */}
      <div>
        <h1
          className="text-2xl text-[#2C2C2C]"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-[#2C2C2C]/50 mt-1">
          {lang === "es"
            ? "Bienvenida a tu espacio de bienestar"
            : "Welcome to your wellness space"}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 border border-[#2C2C2C]/5">
          <p className="text-[10px] tracking-[0.2em] text-[#B87777] uppercase mb-1">
            {lang === "es" ? "Próximas Clases" : "Upcoming Classes"}
          </p>
          <p
            className="text-3xl text-[#2C2C2C]"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            {bookings.length}
          </p>
        </div>
        <div className="bg-white p-4 border border-[#2C2C2C]/5">
          <p className="text-[10px] tracking-[0.2em] text-[#B87777] uppercase mb-1">
            {lang === "es" ? "Créditos Disponibles" : "Credits Available"}
          </p>
          <p
            className="text-3xl text-[#2C2C2C]"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            {hasUnlimited ? "∞" : totalCredits}
          </p>
        </div>
      </div>

      {/* Upcoming bookings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-lg text-[#2C2C2C]"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            {lang === "es" ? "Próximas Reservas" : "Upcoming Bookings"}
          </h2>
          <a
            href="/portal/schedule"
            className="text-[10px] tracking-[0.15em] text-[#C9A96E] uppercase hover:text-[#B87777] transition-colors"
          >
            {lang === "es" ? "Ver Horario" : "View Schedule"}
          </a>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white border border-[#2C2C2C]/5 p-6 text-center">
            <p className="text-sm text-[#2C2C2C]/40 mb-3">
              {lang === "es"
                ? "No tienes clases reservadas"
                : "No upcoming bookings"}
            </p>
            <a
              href="/portal/schedule"
              className="inline-block px-6 py-2 bg-[#2C2C2C] text-white text-xs tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors"
            >
              {lang === "es" ? "Reservar Clase" : "Book a Class"}
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.slice(0, 3).map((b) => {
              const sess = b.session;
              const def = sess?.definition;
              if (!sess || !def) return null;

              const dateObj = new Date(sess.session_date + "T12:00:00");
              const dayName = dateObj.toLocaleDateString(
                lang === "es" ? "es-CO" : "en-US",
                { weekday: "short", month: "short", day: "numeric" },
              );

              return (
                <div
                  key={b.id}
                  className="bg-white border border-[#2C2C2C]/5 p-4 flex items-center gap-4"
                >
                  <div className="text-center min-w-[50px]">
                    <p className="text-[10px] text-[#B87777] uppercase">
                      {dayName}
                    </p>
                    <p
                      className="text-lg text-[#2C2C2C]"
                      style={{ fontFamily: "Cormorant Garamond, serif" }}
                    >
                      {formatTime(sess.start_time)}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2C2C2C] truncate">
                      {lang === "es" ? def.name_es : def.name}
                    </p>
                    <p className="text-xs text-[#2C2C2C]/40">
                      {sess.teacher} · {def.style} · {def.duration_minutes}min
                    </p>
                  </div>
                  {b.checked_in && (
                    <span className="text-[9px] tracking-wider text-green-600 bg-green-50 px-2 py-0.5 uppercase">
                      {lang === "es" ? "Check-in" : "Checked in"}
                    </span>
                  )}
                </div>
              );
            })}
            {bookings.length > 3 && (
              <a
                href="/portal/bookings"
                className="block text-center text-xs text-[#B87777] py-2"
              >
                {lang === "es"
                  ? `Ver todas (${bookings.length})`
                  : `View all (${bookings.length})`}
              </a>
            )}
          </div>
        )}
      </section>

      {/* Active packs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-lg text-[#2C2C2C]"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            {lang === "es" ? "Mis Packs" : "My Packs"}
          </h2>
          <a
            href="/portal/packs"
            className="text-[10px] tracking-[0.15em] text-[#C9A96E] uppercase hover:text-[#B87777] transition-colors"
          >
            {lang === "es" ? "Ver Todos" : "View All"}
          </a>
        </div>

        {packs.length === 0 ? (
          <div className="bg-white border border-[#2C2C2C]/5 p-6 text-center">
            <p className="text-sm text-[#2C2C2C]/40 mb-3">
              {lang === "es"
                ? "No tienes packs activos"
                : "No active packs"}
            </p>
            <a
              href="/portal/packs"
              className="inline-block px-6 py-2 bg-[#C9A96E] text-white text-xs tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors"
            >
              {lang === "es" ? "Comprar Pack" : "Buy a Pack"}
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {packs.map((p) => {
              const isUnlimited = p.total_classes === -1;
              const expiresDate = new Date(p.expires_at);
              const daysLeft = Math.ceil(
                (expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              );

              return (
                <div
                  key={p.id}
                  className="bg-white border border-[#2C2C2C]/5 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-[#2C2C2C]">
                      {p.pack_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-[#2C2C2C]/40">
                      {daysLeft > 0
                        ? `${daysLeft} ${lang === "es" ? "días restantes" : "days left"}`
                        : lang === "es"
                          ? "Expirado"
                          : "Expired"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-2xl text-[#B87777]"
                      style={{ fontFamily: "Cormorant Garamond, serif" }}
                    >
                      {isUnlimited ? "∞" : p.classes_remaining}
                    </p>
                    <p className="text-[9px] text-[#2C2C2C]/30 uppercase">
                      {lang === "es" ? "clases" : "classes"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
