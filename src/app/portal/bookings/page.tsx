"use client";

import { useEffect, useState } from "react";
import { formatTime, canCancelBooking } from "@/lib/constants/business-rules";

interface BookingData {
  id: string;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  session: {
    session_date: string;
    start_time: string;
    teacher: string;
    status: string;
    definition: {
      name: string;
      name_es: string;
      style: string;
      duration_minutes: number;
      location: string;
    };
  };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");
  const lang = "es";

  async function loadBookings() {
    const upcoming = filter === "upcoming" ? "true" : "false";
    const res = await fetch(`/api/student/bookings?upcoming=${upcoming}`);

    // Session expired — force re-login
    if (res.status === 401) {
      window.location.href = "/login?redirect=/portal/bookings";
      return;
    }

    if (res.ok) {
      const data = await res.json();
      setBookings(data.data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    loadBookings();
  }, [filter]);

  async function handleCancel(bookingId: string) {
    if (
      !confirm(
        lang === "es"
          ? "¿Cancelar esta reserva? Tu crédito será reembolsado."
          : "Cancel this booking? Your credit will be refunded.",
      )
    ) {
      return;
    }

    setCancelling(bookingId);
    const res = await fetch("/api/student/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId }),
    });

    if (res.status === 401) {
      window.location.href = "/login?redirect=/portal/bookings";
      return;
    }

    const data = await res.json();
    setCancelling(null);

    if (!res.ok || data.error) {
      alert(data.error || "Cancellation failed");
      return;
    }

    await loadBookings();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1
        className="text-xl text-[#2C2C2C]"
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        {lang === "es" ? "Mis Reservas" : "My Bookings"}
      </h1>

      {/* Filter */}
      <div className="flex gap-2">
        {(["upcoming", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] tracking-[0.15em] uppercase px-4 py-1.5 border transition-colors ${
              filter === f
                ? "bg-[#2C2C2C] text-white border-[#2C2C2C]"
                : "text-[#2C2C2C]/40 border-[#2C2C2C]/10 hover:border-[#2C2C2C]/30"
            }`}
          >
            {f === "upcoming"
              ? lang === "es"
                ? "Próximas"
                : "Upcoming"
              : lang === "es"
                ? "Todas"
                : "All"}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {bookings.length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">
            {lang === "es" ? "No hay reservas" : "No bookings found"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => {
            const sess = b.session;
            const def = sess?.definition;
            if (!sess || !def) return null;

            const dateObj = new Date(sess.session_date + "T12:00:00");
            const dateLabel = dateObj.toLocaleDateString(
              lang === "es" ? "es-CO" : "en-US",
              { weekday: "short", month: "short", day: "numeric" },
            );

            const canCancel =
              b.status === "confirmed" &&
              canCancelBooking(sess.session_date, sess.start_time);

            const statusColors: Record<string, string> = {
              confirmed: "text-green-600 bg-green-50",
              cancelled: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5",
              no_show: "text-red-400 bg-red-50",
              waitlisted: "text-amber-500 bg-amber-50",
            };

            const statusLabels: Record<string, { en: string; es: string }> = {
              confirmed: { en: "Confirmed", es: "Confirmada" },
              cancelled: { en: "Cancelled", es: "Cancelada" },
              no_show: { en: "No Show", es: "No asistió" },
              waitlisted: { en: "Waitlisted", es: "En espera" },
            };

            return (
              <div
                key={b.id}
                className={`bg-white border border-[#2C2C2C]/5 p-4 ${
                  b.status === "cancelled" ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[#B87777]">{dateLabel}</span>
                      <span className="text-xs text-[#2C2C2C]/40">
                        {formatTime(sess.start_time)}
                      </span>
                    </div>
                    <p className="text-sm text-[#2C2C2C]">
                      {lang === "es" ? def.name_es : def.name}
                    </p>
                    <p className="text-xs text-[#2C2C2C]/40">
                      {sess.teacher} · {def.style} · {def.location}
                    </p>
                    {b.checked_in && (
                      <p className="text-[9px] text-green-600 mt-1">
                        ✓ {lang === "es" ? "Check-in completado" : "Checked in"}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-[9px] tracking-wider uppercase px-2 py-0.5 ${
                        statusColors[b.status] || "text-[#2C2C2C]/30"
                      }`}
                    >
                      {statusLabels[b.status]?.[lang] || b.status}
                    </span>

                    {canCancel && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={cancelling === b.id}
                        className="text-[9px] text-red-400 hover:text-red-600 underline underline-offset-2 transition-colors disabled:opacity-30"
                      >
                        {cancelling === b.id
                          ? "..."
                          : lang === "es"
                            ? "Cancelar"
                            : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
