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

interface AvailableSession {
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
    style: string;
  } | null;
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

  // Reschedule modal state
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingData | null>(null);
  const [availableSessions, setAvailableSessions] = useState<AvailableSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Transfer modal state
  const [transferBooking, setTransferBooking] = useState<BookingData | null>(null);
  const [transferSearch, setTransferSearch] = useState("");
  const [transferResults, setTransferResults] = useState<{ id: string; full_name: string; email: string }[]>([]);

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
  // Reschedule: open modal + fetch available sessions
  // ---------------------------------------------------------------------------

  async function openRescheduleModal(booking: BookingData) {
    setRescheduleBooking(booking);
    setSessionsLoading(true);
    try {
      // Fetch next 21 days of scheduled sessions
      const today = getToday();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 21);
      const to = futureDate.toLocaleDateString("en-CA");

      const res = await fetch(
        `/api/admin/sessions?from=${today}&to=${to}&status=scheduled`
      );
      if (res.ok) {
        const data = await res.json();
        // Filter out full sessions and the current session
        const sessions = (data.data || []).filter(
          (s: AvailableSession) =>
            s.id !== booking.session?.id &&
            (s.enrolled || 0) < s.capacity
        );
        setAvailableSessions(sessions);
      }
    } catch {
      showMessage("Error cargando sesiones");
    }
    setSessionsLoading(false);
  }

  async function handleReschedule(newSessionId: string) {
    if (!rescheduleBooking) return;
    setActionLoading(rescheduleBooking.id);
    try {
      const res = await fetch("/api/admin/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: rescheduleBooking.id,
          action: "reschedule",
          new_session_id: newSessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error al reagendar");
      } else {
        showMessage("Reserva reagendada");
        setRescheduleBooking(null);
        await loadBookings();
      }
    } catch {
      showMessage("Error de conexion");
    }
    setActionLoading(null);
  }

  // ---------------------------------------------------------------------------
  // Transfer: open modal + search students
  // ---------------------------------------------------------------------------

  function openTransferModal(booking: BookingData) {
    setTransferBooking(booking);
    setTransferSearch("");
    setTransferResults([]);
  }

  useEffect(() => {
    if (!transferBooking || transferSearch.trim().length < 2) {
      setTransferResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/students?search=${encodeURIComponent(transferSearch.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          // Filter out the current booking's student
          setTransferResults(
            (data.data || [])
              .filter((s: { id: string }) => s.id !== transferBooking.student?.id)
              .map((s: { id: string; full_name: string; email: string }) => ({
                id: s.id,
                full_name: s.full_name,
                email: s.email,
              }))
          );
        }
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [transferSearch, transferBooking]);

  async function handleTransfer(newStudentId: string) {
    if (!transferBooking) return;
    setActionLoading(transferBooking.id);
    try {
      const res = await fetch("/api/admin/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: transferBooking.id,
          action: "transfer",
          new_student_id: newStudentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error al transferir");
      } else {
        showMessage("Reserva transferida");
        setTransferBooking(null);
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
                          onClick={() => openRescheduleModal(b)}
                          disabled={actionLoading === b.id}
                          className="text-[9px] text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-30 text-center"
                        >
                          Cambiar sesion
                        </button>
                        <button
                          onClick={() => openTransferModal(b)}
                          disabled={actionLoading === b.id}
                          className="text-[9px] text-purple-400 hover:text-purple-600 transition-colors disabled:opacity-30 text-center"
                        >
                          Transferir
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
      {/* Transfer Modal */}
      {transferBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setTransferBooking(null)}
          />
          <div className="relative bg-white w-full max-w-md max-h-[60vh] flex flex-col sm:rounded-none shadow-xl">
            <div className="p-4 border-b border-[#2C2C2C]/5">
              <div className="flex items-center justify-between">
                <h2
                  className="text-lg text-[#2C2C2C]"
                  style={{ fontFamily: "Cormorant Garamond, serif" }}
                >
                  Transferir Reserva
                </h2>
                <button
                  onClick={() => setTransferBooking(null)}
                  className="text-[#2C2C2C]/30 hover:text-[#2C2C2C] text-lg"
                >
                  ✕
                </button>
              </div>
              <p className="text-[10px] text-[#2C2C2C]/40 mt-1">
                De: {transferBooking.student?.full_name || "Alumno"} —{" "}
                {transferBooking.session?.definition?.name_es || "Clase"}
              </p>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                placeholder="Buscar alumno destino..."
                value={transferSearch}
                onChange={(e) => setTransferSearch(e.target.value)}
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#B87777]"
                autoFocus
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {transferResults.length === 0 && transferSearch.length >= 2 && (
                  <p className="text-[10px] text-[#2C2C2C]/30 text-center py-4">
                    No se encontraron alumnos
                  </p>
                )}
                {transferResults.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleTransfer(s.id)}
                    disabled={actionLoading === transferBooking.id}
                    className="w-full text-left p-3 border border-[#2C2C2C]/5 hover:border-[#B87777]/40 hover:bg-[#B87777]/3 transition-colors disabled:opacity-30"
                  >
                    <p className="text-sm text-[#2C2C2C]">{s.full_name}</p>
                    <p className="text-[10px] text-[#2C2C2C]/30">{s.email}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setRescheduleBooking(null)}
          />
          {/* Modal */}
          <div className="relative bg-white w-full max-w-md max-h-[80vh] flex flex-col sm:rounded-none shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-[#2C2C2C]/5">
              <div className="flex items-center justify-between">
                <h2
                  className="text-lg text-[#2C2C2C]"
                  style={{ fontFamily: "Cormorant Garamond, serif" }}
                >
                  Reagendar Reserva
                </h2>
                <button
                  onClick={() => setRescheduleBooking(null)}
                  className="text-[#2C2C2C]/30 hover:text-[#2C2C2C] text-lg"
                >
                  ✕
                </button>
              </div>
              <p className="text-[10px] text-[#2C2C2C]/40 mt-1">
                {rescheduleBooking.student?.full_name || "Alumno"} —{" "}
                {rescheduleBooking.session?.definition?.name_es ||
                  rescheduleBooking.session?.definition?.name ||
                  "Clase"}{" "}
                ({rescheduleBooking.session?.session_date
                  ? formatSessionDate(rescheduleBooking.session.session_date)
                  : ""}{" "}
                {rescheduleBooking.session?.start_time
                  ? formatTime(rescheduleBooking.session.start_time)
                  : ""})
              </p>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sessionsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : availableSessions.length === 0 ? (
                <p className="text-sm text-[#2C2C2C]/40 text-center py-8">
                  No hay sesiones disponibles en las proximas 3 semanas
                </p>
              ) : (
                availableSessions.map((s) => {
                  const def = s.definition;
                  const spotsLeft = s.capacity - (s.enrolled || 0);
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleReschedule(s.id)}
                      disabled={actionLoading === rescheduleBooking.id}
                      className="w-full text-left p-3 border border-[#2C2C2C]/5 hover:border-[#B87777]/40 hover:bg-[#B87777]/3 transition-colors disabled:opacity-30"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-[#2C2C2C]">
                            {def?.name_es || def?.name || "Clase"}
                            {def?.style && (
                              <span className="text-[9px] text-[#C9A96E] ml-1.5">
                                {def.style}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-[#2C2C2C]/40 mt-0.5">
                            {formatSessionDate(s.session_date)}{" "}
                            {formatTime(s.start_time)} — {s.teacher}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className={`text-[10px] ${spotsLeft <= 2 ? "text-amber-500" : "text-[#2C2C2C]/30"}`}>
                            {spotsLeft} {spotsLeft === 1 ? "cupo" : "cupos"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
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
