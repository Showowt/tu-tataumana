"use client";

import { useEffect, useState, useCallback } from "react";
import { formatTime } from "@/lib/constants/business-rules";

interface SessionDef {
  name: string;
  name_es: string;
  style: string;
}

interface TodaySession {
  id: string;
  session_date: string;
  start_time: string;
  teacher: string;
  capacity: number;
  enrolled: number;
  status: string;
  definition: SessionDef;
}

interface RosterStudent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  notes: string | null;
}

interface RosterBooking {
  id: string;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  pack_id: string | null;
  created_at: string;
  student: RosterStudent;
}

interface DashboardData {
  date: string;
  today: {
    sessions: TodaySession[];
    total_sessions: number;
    confirmed_bookings: number;
    checked_in: number;
    total_capacity: number;
    total_enrolled: number;
  };
  overview: {
    total_students: number;
    active_packs: number;
    week_revenue_cop: number;
  };
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Roster expansion
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterBooking[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) {
        if (res.status === 401) {
          setError("No autorizado. Inicia sesión como admin.");
          setLoading(false);
          return;
        }
        throw new Error("Failed to load");
      }
      const data = await res.json();
      setDashboard(data);
    } catch {
      setError("Error cargando dashboard");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const loadRoster = useCallback(async (sessionId: string) => {
    setRosterLoading(true);
    try {
      const res = await fetch(
        `/api/admin/session-roster?session_id=${sessionId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setRoster(data.bookings || []);
      }
    } catch {
      // fail silently
    }
    setRosterLoading(false);
  }, []);

  function toggleSession(sessionId: string) {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      setRoster([]);
    } else {
      setExpandedSession(sessionId);
      loadRoster(sessionId);
    }
  }

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
        if (expandedSession) await loadRoster(expandedSession);
        await loadDashboard();
      }
    } catch {
      showMessage("Error de conexión");
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
        if (expandedSession) await loadRoster(expandedSession);
        await loadDashboard();
      }
    } catch {
      showMessage("Error de conexión");
    }
    setActionLoading(null);
  }

  async function handleUndoCheckIn(bookingId: string) {
    setActionLoading(bookingId);
    try {
      const res = await fetch("/api/admin/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          action: "undo_check_in",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error");
      } else {
        showMessage("Check-in deshecho");
        if (expandedSession) await loadRoster(expandedSession);
        await loadDashboard();
      }
    } catch {
      showMessage("Error de conexión");
    }
    setActionLoading(null);
  }

  async function handleCompleteSession(sessionId: string) {
    if (!confirm("¿Completar esta sesión? Los no confirmados se marcarán como no-show.")) return;
    setActionLoading(sessionId);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", session_id: sessionId }),
      });
      if (res.ok) {
        showMessage("Sesión completada");
        await loadDashboard();
        setExpandedSession(null);
      }
    } catch {
      showMessage("Error");
    }
    setActionLoading(null);
  }

  async function handleCancelSession(sessionId: string) {
    if (!confirm("¿Cancelar esta sesión? Se reembolsarán todos los créditos.")) return;
    setActionLoading(sessionId);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          session_id: sessionId,
          reason: "Cancelada por admin",
        }),
      });
      if (res.ok) {
        showMessage("Sesión cancelada");
        await loadDashboard();
        setExpandedSession(null);
      }
    } catch {
      showMessage("Error");
    }
    setActionLoading(null);
  }

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  function formatCOP(amount: number): string {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <a
          href="/login?redirect=/admin"
          className="inline-block mt-4 px-6 py-2 bg-[#2C2C2C] text-white text-xs tracking-[0.15em] uppercase"
        >
          Iniciar Sesión
        </a>
      </div>
    );
  }

  if (!dashboard) return null;

  const { today, overview } = dashboard;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Toast */}
      {message && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#2C2C2C] text-white text-sm px-4 py-3 text-center md:left-auto md:right-4 md:max-w-sm">
          {message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1
          className="text-2xl text-[#2C2C2C]"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          Hoy
        </h1>
        <p className="text-xs text-[#2C2C2C]/40 mt-0.5">
          {new Date(dashboard.date).toLocaleDateString("es-CO", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Clases Hoy" value={today.total_sessions} />
        <StatCard label="Confirmadas" value={today.confirmed_bookings} accent />
        <StatCard label="Check-in" value={today.checked_in} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Alumnos" value={overview.total_students} />
        <StatCard label="Packs Activos" value={overview.active_packs} />
        <StatCard
          label="Semana"
          value={overview.week_revenue_cop > 0 ? formatCOP(overview.week_revenue_cop) : "$0"}
          small
        />
      </div>

      {/* Today's Sessions */}
      <section>
        <h2 className="text-[10px] tracking-[0.2em] text-[#B87777] uppercase mb-3">
          Sesiones de Hoy
        </h2>

        {today.sessions.length === 0 ? (
          <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
            <p className="text-sm text-[#2C2C2C]/40">
              No hay clases programadas hoy
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {today.sessions.map((s) => {
              const def = s.definition;
              const isExpanded = expandedSession === s.id;
              const isCancelled = s.status === "cancelled";
              const isCompleted = s.status === "completed";
              const spotsLeft = s.capacity - s.enrolled;

              return (
                <div key={s.id}>
                  {/* Session card */}
                  <button
                    onClick={() => !isCancelled && toggleSession(s.id)}
                    disabled={isCancelled}
                    className={`w-full text-left bg-white border p-4 transition-colors ${
                      isCancelled
                        ? "border-red-200 opacity-50"
                        : isCompleted
                          ? "border-green-200"
                          : isExpanded
                            ? "border-[#B87777]/30"
                            : "border-[#2C2C2C]/5 active:bg-[#FAF8F5]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#2C2C2C]">
                            {formatTime(s.start_time)}
                          </span>
                          {isCompleted && (
                            <span className="text-[8px] tracking-wider text-green-600 bg-green-50 px-2 py-0.5 uppercase">
                              Completada
                            </span>
                          )}
                          {isCancelled && (
                            <span className="text-[8px] tracking-wider text-red-400 bg-red-50 px-2 py-0.5 uppercase">
                              Cancelada
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#2C2C2C] mt-0.5">
                          {def?.name_es || def?.name || "—"}
                        </p>
                        <p className="text-xs text-[#2C2C2C]/40">
                          {s.teacher} · {def?.style || ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-xl text-[#B87777]"
                          style={{
                            fontFamily: "Cormorant Garamond, serif",
                          }}
                        >
                          {s.enrolled}/{s.capacity}
                        </p>
                        <p
                          className={`text-[9px] uppercase ${
                            spotsLeft <= 0
                              ? "text-red-400"
                              : spotsLeft <= 3
                                ? "text-amber-500"
                                : "text-[#2C2C2C]/30"
                          }`}
                        >
                          {spotsLeft <= 0
                            ? "Lleno"
                            : `${spotsLeft} cupos`}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Expanded roster */}
                  {isExpanded && (
                    <div className="bg-[#FAF8F5] border-x border-b border-[#B87777]/20 p-4 space-y-3">
                      {rosterLoading ? (
                        <div className="flex justify-center py-4">
                          <div className="w-4 h-4 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : roster.length === 0 ? (
                        <p className="text-xs text-[#2C2C2C]/40 text-center py-4">
                          Sin reservas
                        </p>
                      ) : (
                        <>
                          {roster
                            .filter((b) => b.status !== "cancelled")
                            .map((b) => (
                              <div
                                key={b.id}
                                className="bg-white border border-[#2C2C2C]/5 p-3 flex items-center gap-3"
                              >
                                {/* Student info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-[#2C2C2C] truncate">
                                    {b.student?.full_name || "—"}
                                  </p>
                                  <p className="text-[10px] text-[#2C2C2C]/30 truncate">
                                    {b.student?.phone || b.student?.email || ""}
                                  </p>
                                </div>

                                {/* Status + Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {b.checked_in ? (
                                    <>
                                      <span className="text-[9px] tracking-wider text-green-600 bg-green-50 px-2 py-1 uppercase">
                                        OK
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleUndoCheckIn(b.id)
                                        }
                                        disabled={actionLoading === b.id}
                                        className="text-[9px] text-[#2C2C2C]/20 hover:text-red-400 transition-colors disabled:opacity-30"
                                      >
                                        deshacer
                                      </button>
                                    </>
                                  ) : b.status === "no_show" ? (
                                    <span className="text-[9px] tracking-wider text-red-400 bg-red-50 px-2 py-1 uppercase">
                                      No asistió
                                    </span>
                                  ) : b.status === "confirmed" ? (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleCheckIn(b.id)
                                        }
                                        disabled={actionLoading === b.id}
                                        className="px-4 py-2 bg-[#2C2C2C] text-white text-[10px] tracking-[0.1em] uppercase active:bg-[#B87777] transition-colors disabled:opacity-30"
                                      >
                                        {actionLoading === b.id
                                          ? "..."
                                          : "Check-in"}
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleNoShow(b.id)
                                        }
                                        disabled={actionLoading === b.id}
                                        className="text-[9px] text-red-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                      >
                                        NS
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[9px] text-[#2C2C2C]/30 uppercase">
                                      {b.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </>
                      )}

                      {/* Session actions */}
                      {!isCompleted && !isCancelled && (
                        <div className="flex gap-2 pt-2 border-t border-[#2C2C2C]/5">
                          <button
                            onClick={() => handleCompleteSession(s.id)}
                            disabled={actionLoading === s.id}
                            className="flex-1 py-2 bg-green-600 text-white text-[10px] tracking-[0.1em] uppercase active:bg-green-700 transition-colors disabled:opacity-30"
                          >
                            Completar Sesión
                          </button>
                          <button
                            onClick={() => handleCancelSession(s.id)}
                            disabled={actionLoading === s.id}
                            className="py-2 px-4 border border-red-200 text-red-400 text-[10px] tracking-[0.1em] uppercase hover:bg-red-50 transition-colors disabled:opacity-30"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div className="bg-white border border-[#2C2C2C]/5 p-3">
      <p className="text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
        {label}
      </p>
      <p
        className={`${small ? "text-sm" : "text-xl"} ${accent ? "text-[#B87777]" : "text-[#2C2C2C]"}`}
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        {value}
      </p>
    </div>
  );
}
