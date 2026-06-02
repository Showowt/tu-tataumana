"use client";

import { useEffect, useState, useCallback } from "react";
import { formatTime } from "@/lib/constants/business-rules";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookingStudent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

interface SessionDefinition {
  name: string;
  name_es: string;
  style: string;
}

interface BookingSession {
  id: string;
  session_date: string;
  start_time: string;
  teacher: string;
  capacity: number;
  enrolled: number;
  status: string;
  definition: SessionDefinition | null;
}

interface BookingData {
  id: string;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  pack_id: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  guest_name: string | null;
  student: BookingStudent | null;
  session: BookingSession | null;
}

interface BookingStats {
  total: number;
  confirmed: number;
  checked_in: number;
  no_show: number;
  cancelled: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmada", color: "text-blue-600 bg-blue-50" },
  checked_in: { label: "Check-in", color: "text-green-600 bg-green-50" },
  no_show: { label: "No asistio", color: "text-red-500 bg-red-50" },
  cancelled: { label: "Cancelada", color: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5" },
  waitlisted: { label: "Lista espera", color: "text-amber-600 bg-amber-50" },
  completed: { label: "Completada", color: "text-green-600 bg-green-50" },
};

type TabKey = "today" | "week" | "all";
type StatusFilter = "all" | "confirmed" | "checked_in" | "no_show" | "cancelled";

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getToday(): string {
  const now = new Date();
  return now.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function getWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: monday.toLocaleDateString("en-CA"),
    to: sunday.toLocaleDateString("en-CA"),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("today");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  }

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // Date range based on tab
      if (tab === "today") {
        const today = getToday();
        params.set("from", today);
        params.set("to", today);
      } else if (tab === "week") {
        const { from, to } = getWeekRange();
        params.set("from", from);
        params.set("to", to);
      }

      // Status filter
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      // Search
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await fetch(`/api/admin/bookings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.data || []);
        setStats(data.stats || null);
      } else if (res.status === 401) {
        showMessage("No autorizado. Inicia sesion como admin.");
      }
    } catch {
      showMessage("Error cargando reservas");
    }
    setLoading(false);
  }, [tab, statusFilter, search]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ---------------------------------------------------------------------------
  // Check-in actions (reuse existing /api/admin/check-in endpoint)
  // ---------------------------------------------------------------------------

  async function handleCheckIn(bookingId: string) {
    setActionLoading(bookingId);
    try {
      const res = await fetch("/api/admin/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, action: "check_in" }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error");
      } else {
        showMessage("Check-in OK");
        await loadBookings();
      }
    } catch {
      showMessage("Error de conexion");
    }
    setActionLoading(null);
  }

  async function handleNoShow(bookingId: string) {
    setActionLoading(bookingId);
    try {
      const res = await fetch("/api/admin/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, action: "no_show" }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error");
      } else {
        showMessage("No-show marcado");
        await loadBookings();
      }
    } catch {
      showMessage("Error de conexion");
    }
    setActionLoading(null);
  }

  async function handleUndoCheckIn(bookingId: string) {
    setActionLoading(bookingId);
    try {
      const res = await fetch("/api/admin/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, action: "undo_check_in" }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error");
      } else {
        showMessage("Check-in deshecho");
        await loadBookings();
      }
    } catch {
      showMessage("Error de conexion");
    }
    setActionLoading(null);
  }

  async function handleCancelRefund(bookingId: string) {
    if (!confirm("¿Cancelar reserva y devolver credito al alumno?")) return;
    setActionLoading(bookingId);
    try {
      const res = await fetch("/api/admin/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, action: "cancel_refund" }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error");
      } else {
        showMessage(data.message || "Reserva cancelada");
        await loadBookings();
      }
    } catch {
      showMessage("Error de conexion");
    }
    setActionLoading(null);
  }

  // ---------------------------------------------------------------------------
  // Resolve display status (checked_in is a separate flag from status)
  // ---------------------------------------------------------------------------

  function getDisplayStatus(b: BookingData): string {
    if (b.checked_in) return "checked_in";
    return b.status;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Toast */}
      {message && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#2C2C2C] text-white text-sm px-4 py-3 text-center md:left-auto md:right-4 md:max-w-sm">
          {message}
        </div>
      )}

      {/* Header */}
      <h1
        className="text-2xl text-[#2C2C2C]"
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        Reservas
      </h1>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Confirmadas" value={stats.confirmed} accent />
          <StatCard label="Check-in" value={stats.checked_in} />
          <StatCard label="No-show" value={stats.no_show} />
          <StatCard label="Canceladas" value={stats.cancelled} />
        </div>
      )}

      {/* Date range tabs */}
      <div className="flex gap-2">
        {(
          [
            { key: "today", label: "Hoy" },
            { key: "week", label: "Semana" },
            { key: "all", label: "Todas" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[10px] tracking-[0.15em] uppercase px-4 py-1.5 border transition-colors ${
              tab === t.key
                ? "bg-[#2C2C2C] text-white border-[#2C2C2C]"
                : "text-[#2C2C2C]/40 border-[#2C2C2C]/10 hover:border-[#2C2C2C]/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 flex-wrap">
        {(
          [
            { key: "all", label: "Todas" },
            { key: "confirmed", label: "Confirmadas" },
            { key: "checked_in", label: "Check-in" },
            { key: "no_show", label: "No-show" },
            { key: "cancelled", label: "Canceladas" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`text-[9px] tracking-[0.1em] uppercase px-3 py-1 border transition-colors ${
              statusFilter === f.key
                ? "bg-[#B87777] text-white border-[#B87777]"
                : "text-[#2C2C2C]/30 border-[#2C2C2C]/5 hover:border-[#2C2C2C]/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar alumno..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#B87777]"
        style={{ fontFamily: "Outfit, sans-serif" }}
      />

      {/* Bookings list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">
            {tab === "today"
              ? "No hay reservas para hoy"
              : tab === "week"
                ? "No hay reservas esta semana"
                : "No hay reservas"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
            {bookings.length} {bookings.length === 1 ? "reserva" : "reservas"}
          </p>

          {bookings.map((b) => {
            const displayStatus = getDisplayStatus(b);
            const badge = STATUS_BADGES[displayStatus] || {
              label: b.status,
              color: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5",
            };

            const session = b.session;
            const student = b.student;
            const def = session?.definition;
            const className = def?.name_es || def?.name || "Clase";
            const sessionDate = session?.session_date
              ? formatSessionDate(session.session_date)
              : "";
            const sessionTime = session?.start_time
              ? formatTime(session.start_time)
              : "";

            return (
              <div
                key={b.id}
                className={`bg-white border p-4 ${
                  b.checked_in
                    ? "border-green-200"
                    : b.status === "confirmed"
                      ? "border-[#B87777]/15"
                      : b.status === "no_show"
                        ? "border-red-200"
                        : "border-[#2C2C2C]/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: student + class info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2C2C2C] truncate">
                      {student?.full_name || "Desconocido"}
                      {b.guest_name && (
                        <span className="text-[10px] text-[#C9A96E] ml-1.5">
                          → {b.guest_name}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-[#2C2C2C]/40 truncate">
                      {student?.phone || student?.email || ""}
                    </p>

                    {/* Class info */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-[#2C2C2C]/60">
                        {className}
                      </span>
                      {def?.style && (
                        <span className="text-[9px] text-[#C9A96E]">
                          {def.style}
                        </span>
                      )}
                    </div>

                    {/* Date + time + teacher */}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#2C2C2C]/30">
                        {sessionDate} {sessionTime}
                      </span>
                      {session?.teacher && (
                        <span className="text-[9px] text-[#2C2C2C]/20">
                          {session.teacher}
                        </span>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`text-[8px] tracking-wider uppercase px-2 py-0.5 ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                      {b.cancel_reason && (
                        <span className="text-[9px] text-[#2C2C2C]/20 italic">
                          {b.cancel_reason}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {b.checked_in ? (
                      <>
                        <span className="text-[9px] tracking-wider text-green-600 bg-green-50 px-2 py-1 uppercase">
                          OK
                        </span>
                        <button
                          onClick={() => handleUndoCheckIn(b.id)}
                          disabled={actionLoading === b.id}
                          className="text-[9px] text-[#2C2C2C]/20 hover:text-red-400 transition-colors disabled:opacity-30"
                        >
                          deshacer
                        </button>
                        <button
                          onClick={() => handleCancelRefund(b.id)}
                          disabled={actionLoading === b.id}
                          className="text-[9px] text-amber-500 hover:text-amber-700 transition-colors disabled:opacity-30"
                        >
                          cancelar + devolver
                        </button>
                      </>
                    ) : b.status === "no_show" ? (
                      <span className="text-[9px] tracking-wider text-red-400 bg-red-50 px-2 py-1 uppercase">
                        No asistio
                      </span>
                    ) : b.status === "confirmed" ? (
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => handleCheckIn(b.id)}
                          disabled={actionLoading === b.id}
                          className="px-4 py-2 bg-[#2C2C2C] text-white text-[10px] tracking-[0.1em] uppercase active:bg-[#B87777] transition-colors disabled:opacity-30"
                        >
                          {actionLoading === b.id ? "..." : "Check-in"}
                        </button>
                        <button
                          onClick={() => handleCancelRefund(b.id)}
                          disabled={actionLoading === b.id}
                          className="text-[9px] text-amber-500 hover:text-amber-700 transition-colors disabled:opacity-30 text-center"
                        >
                          Cancelar + Devolver
                        </button>
                        <button
                          onClick={() => handleNoShow(b.id)}
                          disabled={actionLoading === b.id}
                          className="text-[9px] text-red-300 hover:text-red-500 transition-colors disabled:opacity-30 text-center"
                        >
                          No-show
                        </button>
                      </div>
                    ) : b.status === "cancelled" ? (
                      <span className="text-[9px] text-[#2C2C2C]/20 uppercase">
                        {b.cancelled_at
                          ? new Date(b.cancelled_at).toLocaleDateString("es-CO", {
                              day: "numeric",
                              month: "short",
                            })
                          : ""}
                      </span>
                    ) : (
                      <span className="text-[9px] text-[#2C2C2C]/20 uppercase">
                        {b.status}
                      </span>
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="bg-white border border-[#2C2C2C]/5 p-3">
      <p className="text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
        {label}
      </p>
      <p
        className={`text-xl ${accent ? "text-[#B87777]" : "text-[#2C2C2C]"}`}
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        {value}
      </p>
    </div>
  );
}
