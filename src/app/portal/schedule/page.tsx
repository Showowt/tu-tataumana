"use client";

import { useEffect, useState, useCallback } from "react";
import { formatTime, TIMEZONE } from "@/lib/constants/business-rules";

interface SessionData {
  id: string;
  session_date: string;
  start_time: string;
  teacher: string;
  capacity: number;
  enrolled: number;
  status: string;
  definition: {
    name: string;
    name_es: string;
    description: string | null;
    description_es: string | null;
    style: string;
    level: string;
    duration_minutes: number;
    price_cop: number;
    price_usd: number;
    location: string;
  };
}

interface PackData {
  id: string;
  pack_type: string;
  classes_remaining: number;
  total_classes: number;
  status: string;
}

interface StudentProfile {
  id: string;
  preferred_lang: "en" | "es";
}

export default function SchedulePage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [packs, setPacks] = useState<PackData[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string>("");

  const lang = profile?.preferred_lang || "es";

  const getWeekDates = useCallback(() => {
    // Use Colombia timezone to avoid UTC date shift after 7 PM
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const [y, m, d] = todayStr.split("-").map(Number);
    const start = new Date(y, m - 1, d + weekOffset * 7, 12, 0, 0);
    const end = new Date(y, m - 1, d + weekOffset * 7 + 6, 12, 0, 0);
    const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    return { from: fmt(start), to: fmt(end) };
  }, [weekOffset]);

  const loadSchedule = useCallback(async () => {
    const { from, to } = getWeekDates();
    const res = await fetch(`/api/schedule?from=${from}&to=${to}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions || []);
    }
  }, [getWeekDates]);

  useEffect(() => {
    async function load() {
      const [profileRes, packsRes] = await Promise.all([
        fetch("/api/student/profile"),
        fetch("/api/student/packs?status=active"),
      ]);
      if (profileRes.ok) {
        const p = await profileRes.json();
        setProfile(p.data);
      }
      if (packsRes.ok) {
        const pk = await packsRes.json();
        setPacks(pk.data || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  async function handleBook(sessionId: string) {
    setBookingId(sessionId);
    setBookingStatus("");

    // Find best pack to use (first active with remaining credits)
    const usablePack = packs.find(
      (p) => p.status === "active" && (p.total_classes === -1 || p.classes_remaining > 0),
    );

    if (!usablePack) {
      setBookingStatus("__no_credits__");
      return;
    }

    const res = await fetch("/api/student/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        pack_id: usablePack.id,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      setBookingStatus(data.error || "Booking failed");
      return;
    }

    setBookingStatus(lang === "es" ? "Reservado" : "Booked!");

    // Refresh schedule and packs
    await loadSchedule();
    const packsRes = await fetch("/api/student/packs?status=active");
    if (packsRes.ok) {
      const pk = await packsRes.json();
      setPacks(pk.data || []);
    }

    setTimeout(() => {
      setBookingId(null);
      setBookingStatus("");
    }, 2000);
  }

  // Group sessions by date
  const grouped = sessions.reduce<Record<string, SessionData[]>>((acc, s) => {
    if (!acc[s.session_date]) acc[s.session_date] = [];
    acc[s.session_date].push(s);
    return acc;
  }, {});

  const { from, to } = getWeekDates();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-xl text-[#2C2C2C]"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          {lang === "es" ? "Horario de Clases" : "Class Schedule"}
        </h1>

        {/* Credits badge */}
        <div className="text-right">
          <p className="text-[9px] text-[#2C2C2C]/40 uppercase tracking-wider">
            {lang === "es" ? "Créditos" : "Credits"}
          </p>
          <p className="text-lg text-[#B87777]" style={{ fontFamily: "Cormorant Garamond, serif" }}>
            {packs.some((p) => p.total_classes === -1)
              ? "∞"
              : packs.reduce((s, p) => s + p.classes_remaining, 0)}
          </p>
        </div>
      </div>

      {/* Low credits warning banner */}
      {(() => {
        const hasUnlimited = packs.some((p) => p.total_classes === -1);
        const totalRemaining = packs.reduce((s, p) => s + p.classes_remaining, 0);
        if (!hasUnlimited && totalRemaining > 0 && totalRemaining <= 2) {
          return (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs text-amber-700">
                {lang === "es"
                  ? `Te ${totalRemaining === 1 ? "queda" : "quedan"} ${totalRemaining} ${totalRemaining === 1 ? "credito" : "creditos"}`
                  : `You have ${totalRemaining} credit${totalRemaining === 1 ? "" : "s"} left`}
              </p>
              <a
                href="/portal/packs"
                className="text-[10px] tracking-[0.15em] uppercase px-3 py-1 bg-amber-600 text-white hover:bg-[#B87777] transition-colors"
              >
                {lang === "es" ? "Renovar Pack" : "Renew Pack"}
              </a>
            </div>
          );
        }
        return null;
      })()}

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-white border border-[#2C2C2C]/5 px-4 py-2">
        <button
          onClick={() => setWeekOffset((w) => Math.max(w - 1, 0))}
          disabled={weekOffset === 0}
          className="text-sm text-[#2C2C2C]/50 hover:text-[#2C2C2C] disabled:opacity-20 transition-colors"
        >
          &larr;
        </button>
        <span className="text-xs text-[#2C2C2C]/60">
          {new Date(from).toLocaleDateString(lang === "es" ? "es-CO" : "en-US", {
            month: "short",
            day: "numeric",
          })}{" "}
          &mdash;{" "}
          {new Date(to).toLocaleDateString(lang === "es" ? "es-CO" : "en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <button
          onClick={() => setWeekOffset((w) => Math.min(w + 1, 3))}
          disabled={weekOffset >= 3}
          className="text-sm text-[#2C2C2C]/50 hover:text-[#2C2C2C] disabled:opacity-20 transition-colors"
        >
          &rarr;
        </button>
      </div>

      {/* Sessions by day */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">
            {lang === "es"
              ? "No hay clases programadas esta semana"
              : "No classes scheduled this week"}
          </p>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, daySessions]) => {
            const dateObj = new Date(date + "T12:00:00");
            const dayLabel = dateObj.toLocaleDateString(
              lang === "es" ? "es-CO" : "en-US",
              { weekday: "long", month: "long", day: "numeric" },
            );

            const isToday = date === new Intl.DateTimeFormat("en-CA", {
              timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
            }).format(new Date());

            return (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <h3
                    className="text-sm text-[#2C2C2C] capitalize"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {dayLabel}
                  </h3>
                  {isToday && (
                    <span className="text-[8px] tracking-wider text-[#B87777] bg-[#B87777]/10 px-2 py-0.5 uppercase">
                      {lang === "es" ? "Hoy" : "Today"}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {daySessions.map((s) => {
                    const def = s.definition;
                    const spotsLeft = s.capacity - s.enrolled;
                    const isFull = spotsLeft <= 0;
                    const isBooking = bookingId === s.id;

                    // Check if session is in the past or within 2h cutoff
                    const sessionDT = new Date(
                      `${s.session_date}T${s.start_time}`,
                    );
                    const cutoff = new Date(
                      sessionDT.getTime() - 2 * 60 * 60 * 1000,
                    );
                    const isPast = new Date() > cutoff;

                    return (
                      <div
                        key={s.id}
                        className="bg-white border border-[#2C2C2C]/5 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-[#2C2C2C]">
                                {formatTime(s.start_time)}
                              </span>
                              <span className="text-[10px] text-[#2C2C2C]/30">
                                {def.duration_minutes}min
                              </span>
                            </div>
                            <p className="text-sm text-[#2C2C2C]">
                              {lang === "es" ? def.name_es : def.name}
                            </p>
                            <p className="text-xs text-[#2C2C2C]/40 mt-0.5">
                              {s.teacher} · {def.style} · {def.level === "all" ? (lang === "es" ? "Todos" : "All levels") : def.level}
                            </p>
                            <p className="text-xs text-[#2C2C2C]/30 mt-0.5">
                              {def.location}
                            </p>
                          </div>

                          <div className="text-right flex flex-col items-end gap-2">
                            <span
                              className={`text-[10px] tracking-wider uppercase ${
                                isFull
                                  ? "text-red-400"
                                  : spotsLeft <= 3
                                    ? "text-amber-500"
                                    : "text-[#2C2C2C]/30"
                              }`}
                            >
                              {isFull
                                ? lang === "es"
                                  ? "Lleno"
                                  : "Full"
                                : `${spotsLeft} ${lang === "es" ? "cupos" : "spots"}`}
                            </span>

                            {isBooking && bookingStatus ? (
                              bookingStatus === "__no_credits__" ? (
                                <div className="text-right">
                                  <p className="text-[10px] text-red-500 mb-1">
                                    {lang === "es"
                                      ? "Sin creditos disponibles"
                                      : "No credits available"}
                                  </p>
                                  <a
                                    href="/portal/packs"
                                    className="text-[10px] text-[#B87777] underline"
                                  >
                                    {lang === "es" ? "Comprar Pack" : "Buy Pack"}
                                  </a>
                                </div>
                              ) : (
                                <span
                                  className={`text-[10px] px-3 py-1 ${
                                    bookingStatus.includes("Reservado") || bookingStatus.includes("Booked")
                                      ? "text-green-600 bg-green-50"
                                      : "text-red-500 bg-red-50"
                                  }`}
                                >
                                  {bookingStatus}
                                </span>
                              )
                            ) : (
                              <button
                                onClick={() => handleBook(s.id)}
                                disabled={isFull || isPast || isBooking}
                                className="text-[10px] tracking-[0.15em] uppercase px-4 py-1.5 bg-[#2C2C2C] text-white hover:bg-[#B87777] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                              >
                                {isPast
                                  ? lang === "es"
                                    ? "Cerrado"
                                    : "Closed"
                                  : lang === "es"
                                    ? "Reservar"
                                    : "Book"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
      )}

      {/* No credits CTA */}
      {packs.length === 0 && (
        <div className="bg-[#C9A96E]/10 border border-[#C9A96E]/20 p-4 text-center">
          <p className="text-sm text-[#2C2C2C]/60 mb-2">
            {lang === "es"
              ? "Necesitas un pack para reservar clases"
              : "You need a pack to book classes"}
          </p>
          <a
            href="/portal/packs"
            className="inline-block px-6 py-2 bg-[#C9A96E] text-white text-xs tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors"
          >
            {lang === "es" ? "Ver Packs" : "View Packs"}
          </a>
        </div>
      )}
    </div>
  );
}
