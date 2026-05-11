"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { formatTime } from "@/lib/constants/business-rules";

interface SessionDef {
  name: string;
  name_es: string;
  style: string;
  level: string;
  duration_minutes: number;
  location: string;
}

interface SessionData {
  id: string;
  session_date: string;
  start_time: string;
  teacher: string;
  capacity: number;
  enrolled: number;
  status: string;
  definition: SessionDef;
}

interface ClosedDate {
  date: string;
  reason: string | null;
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genWeeks, setGenWeeks] = useState(4);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Capacity editing
  const [editingCapacity, setEditingCapacity] = useState<string | null>(null);
  const [capacityValue, setCapacityValue] = useState("");
  const capacityInputRef = useRef<HTMLInputElement>(null);

  // Closed dates
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [closedLoading, setClosedLoading] = useState(true);
  const [newClosedDate, setNewClosedDate] = useState("");
  const [newClosedReason, setNewClosedReason] = useState("");
  const [closedActionLoading, setClosedActionLoading] = useState(false);
  const [showClosedDates, setShowClosedDates] = useState(false);

  const getWeekDates = useCallback(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      from: start.toISOString().split("T")[0],
      to: end.toISOString().split("T")[0],
    };
  }, [weekOffset]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const { from, to } = getWeekDates();
    try {
      const res = await fetch(`/api/admin/sessions?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data || []);
      }
    } catch {
      // fail silently
    }
    setLoading(false);
  }, [getWeekDates]);

  const loadClosedDates = useCallback(async () => {
    setClosedLoading(true);
    try {
      const res = await fetch("/api/admin/closed-dates");
      if (res.ok) {
        const data = await res.json();
        setClosedDates(data.data || []);
      }
    } catch {
      // fail silently
    }
    setClosedLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
    loadClosedDates();
  }, [loadSessions, loadClosedDates]);

  async function handleGenerate() {
    if (!confirm(`¿Generar sesiones para ${genWeeks} semanas?`)) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", weeks: genWeeks }),
      });
      const data = await res.json();
      showMessage(data.message || "Sesiones generadas");
      await loadSessions();
    } catch {
      showMessage("Error generando sesiones");
    }
    setGenerating(false);
  }

  async function handleCancel(sessionId: string) {
    if (!confirm("¿Cancelar esta sesión?")) return;
    setActionLoading(sessionId);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", session_id: sessionId }),
      });
      if (res.ok) {
        showMessage("Sesión cancelada");
        await loadSessions();
      }
    } catch {
      showMessage("Error");
    }
    setActionLoading(null);
  }

  async function handleComplete(sessionId: string) {
    if (!confirm("¿Completar esta sesión?")) return;
    setActionLoading(sessionId);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", session_id: sessionId }),
      });
      if (res.ok) {
        showMessage("Sesión completada");
        await loadSessions();
      }
    } catch {
      showMessage("Error");
    }
    setActionLoading(null);
  }

  // --- Capacity editing ---
  function startEditCapacity(session: SessionData) {
    setEditingCapacity(session.id);
    setCapacityValue(String(session.capacity));
    setTimeout(() => capacityInputRef.current?.select(), 50);
  }

  async function saveCapacity(sessionId: string) {
    const newCap = parseInt(capacityValue, 10);
    if (isNaN(newCap) || newCap < 1) {
      setEditingCapacity(null);
      return;
    }

    // Find current session to skip if unchanged
    const current = sessions.find((s) => s.id === sessionId);
    if (current && current.capacity === newCap) {
      setEditingCapacity(null);
      return;
    }

    setActionLoading(sessionId);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_capacity",
          session_id: sessionId,
          capacity: newCap,
        }),
      });
      if (res.ok) {
        showMessage(`Capacidad actualizada a ${newCap}`);
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, capacity: newCap } : s)),
        );
      } else {
        showMessage("Error actualizando capacidad");
      }
    } catch {
      showMessage("Error");
    }
    setEditingCapacity(null);
    setActionLoading(null);
  }

  // --- Closed dates ---
  async function handleCloseDate() {
    if (!newClosedDate) return;
    setClosedActionLoading(true);
    try {
      const res = await fetch("/api/admin/closed-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newClosedDate,
          reason: newClosedReason || null,
        }),
      });
      if (res.ok) {
        showMessage(`${newClosedDate} cerrado`);
        setNewClosedDate("");
        setNewClosedReason("");
        await loadClosedDates();
      } else {
        showMessage("Error cerrando fecha");
      }
    } catch {
      showMessage("Error");
    }
    setClosedActionLoading(false);
  }

  async function handleReopenDate(date: string) {
    if (!confirm(`¿Reabrir ${date}?`)) return;
    setClosedActionLoading(true);
    try {
      const res = await fetch("/api/admin/closed-dates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (res.ok) {
        showMessage(`${date} reabierto`);
        await loadClosedDates();
      } else {
        showMessage("Error reabriendo fecha");
      }
    } catch {
      showMessage("Error");
    }
    setClosedActionLoading(false);
  }

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  // Group sessions by date
  const grouped = sessions.reduce<Record<string, SessionData[]>>((acc, s) => {
    if (!acc[s.session_date]) acc[s.session_date] = [];
    acc[s.session_date].push(s);
    return acc;
  }, {});

  const { from, to } = getWeekDates();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Toast */}
      {message && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#2C2C2C] text-white text-sm px-4 py-3 text-center md:left-auto md:right-4 md:max-w-sm">
          {message}
        </div>
      )}

      <h1
        className="text-2xl text-[#2C2C2C]"
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        Gestión de Clases
      </h1>

      {/* Generate sessions */}
      <div className="bg-white border border-[#C9A96E]/20 p-4">
        <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase mb-3">
          Generar Sesiones
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">
              Semanas
            </label>
            <select
              value={genWeeks}
              onChange={(e) => setGenWeeks(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
            >
              {[1, 2, 3, 4, 6, 8].map((w) => (
                <option key={w} value={w}>
                  {w} {w === 1 ? "semana" : "semanas"}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2 bg-[#C9A96E] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30"
          >
            {generating ? "Generando..." : "Generar"}
          </button>
        </div>
      </div>

      {/* Closed Dates Manager */}
      <div className="bg-white border border-[#B87777]/20 p-4">
        <button
          onClick={() => setShowClosedDates(!showClosedDates)}
          className="w-full flex items-center justify-between"
        >
          <p className="text-[10px] tracking-[0.2em] text-[#B87777] uppercase">
            Días Cerrados
            {closedDates.length > 0 && (
              <span className="ml-2 text-[#B87777]/60">
                ({closedDates.length})
              </span>
            )}
          </p>
          <span className="text-xs text-[#2C2C2C]/30">
            {showClosedDates ? "▲" : "▼"}
          </span>
        </button>

        {showClosedDates && (
          <div className="mt-4 space-y-4">
            {/* Add new closed date */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newClosedDate}
                  onChange={(e) => setNewClosedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="flex-1 px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#B87777]"
                />
                <button
                  onClick={handleCloseDate}
                  disabled={closedActionLoading || !newClosedDate}
                  className="px-4 py-2 bg-[#B87777] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#a06666] transition-colors disabled:opacity-30"
                >
                  Cerrar
                </button>
              </div>
              <input
                type="text"
                value={newClosedReason}
                onChange={(e) => setNewClosedReason(e.target.value)}
                placeholder="Razón (opcional): ej. Festivo, Mantenimiento..."
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-xs text-[#2C2C2C] focus:outline-none focus:border-[#B87777] placeholder:text-[#2C2C2C]/20"
              />
            </div>

            {/* List closed dates */}
            {closedLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-4 h-4 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : closedDates.length === 0 ? (
              <p className="text-xs text-[#2C2C2C]/30 text-center py-2">
                No hay días cerrados programados
              </p>
            ) : (
              <div className="space-y-1">
                {closedDates.map((cd) => {
                  const dateObj = new Date(cd.date + "T12:00:00");
                  const label = dateObj.toLocaleDateString("es-CO", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <div
                      key={cd.date}
                      className="flex items-center justify-between px-3 py-2 bg-[#B87777]/5 border border-[#B87777]/10"
                    >
                      <div>
                        <span className="text-sm text-[#2C2C2C] capitalize">
                          {label}
                        </span>
                        {cd.reason && (
                          <span className="ml-2 text-xs text-[#2C2C2C]/40">
                            — {cd.reason}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleReopenDate(cd.date)}
                        disabled={closedActionLoading}
                        className="text-[9px] text-[#B87777] hover:text-red-600 transition-colors disabled:opacity-30 uppercase tracking-wider"
                      >
                        reabrir
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-white border border-[#2C2C2C]/5 px-4 py-2">
        <button
          onClick={() => setWeekOffset((w) => Math.max(w - 1, -2))}
          className="text-sm text-[#2C2C2C]/50 hover:text-[#2C2C2C] transition-colors"
        >
          &larr;
        </button>
        <span className="text-xs text-[#2C2C2C]/60">
          {new Date(from).toLocaleDateString("es-CO", {
            month: "short",
            day: "numeric",
          })}{" "}
          &mdash;{" "}
          {new Date(to).toLocaleDateString("es-CO", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <button
          onClick={() => setWeekOffset((w) => Math.min(w + 1, 8))}
          className="text-sm text-[#2C2C2C]/50 hover:text-[#2C2C2C] transition-colors"
        >
          &rarr;
        </button>
      </div>

      {/* Sessions by day */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">
            No hay sesiones esta semana
          </p>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, daySessions]) => {
            const dateObj = new Date(date + "T12:00:00");
            const dayLabel = dateObj.toLocaleDateString("es-CO", {
              weekday: "long",
              month: "long",
              day: "numeric",
            });
            const isToday = date === new Date().toISOString().split("T")[0];

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
                      Hoy
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {daySessions.map((s) => {
                    const def = s.definition;
                    const isCancelled = s.status === "cancelled";
                    const isCompleted = s.status === "completed";
                    const isEditingThis = editingCapacity === s.id;

                    return (
                      <div
                        key={s.id}
                        className={`bg-white border p-4 ${
                          isCancelled
                            ? "border-red-200 opacity-50"
                            : isCompleted
                              ? "border-green-200"
                              : "border-[#2C2C2C]/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#2C2C2C]">
                                {formatTime(s.start_time)}
                              </span>
                              {isCompleted && (
                                <span className="text-[8px] text-green-600 uppercase">
                                  completada
                                </span>
                              )}
                              {isCancelled && (
                                <span className="text-[8px] text-red-400 uppercase">
                                  cancelada
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[#2C2C2C]">
                              {def?.name_es || "—"}
                            </p>
                            <p className="text-xs text-[#2C2C2C]/40">
                              {s.teacher} · {def?.style} · {def?.location}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {/* Capacity — tappable to edit */}
                            {isEditingThis ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-[#2C2C2C]/40">
                                  {s.enrolled}/
                                </span>
                                <input
                                  ref={capacityInputRef}
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={capacityValue}
                                  onChange={(e) =>
                                    setCapacityValue(e.target.value)
                                  }
                                  onBlur={() => saveCapacity(s.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveCapacity(s.id);
                                    if (e.key === "Escape")
                                      setEditingCapacity(null);
                                  }}
                                  className="w-12 px-1 py-0.5 text-xs text-right border border-[#C9A96E] bg-[#C9A96E]/5 focus:outline-none"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  !isCancelled &&
                                  !isCompleted &&
                                  startEditCapacity(s)
                                }
                                disabled={isCancelled || isCompleted}
                                title={
                                  isCancelled || isCompleted
                                    ? undefined
                                    : "Toca para cambiar cupos"
                                }
                                className="focus:outline-none"
                              >
                                {(() => {
                                  const pct = s.capacity > 0 ? (s.enrolled / s.capacity) * 100 : 0;
                                  const isFull = s.enrolled >= s.capacity;
                                  let badgeClass = "bg-green-100 text-green-700 border-green-200";
                                  if (isCancelled || isCompleted) {
                                    badgeClass = "bg-[#2C2C2C]/5 text-[#2C2C2C]/40 border-transparent";
                                  } else if (isFull) {
                                    badgeClass = "bg-red-100 text-red-700 border-red-200";
                                  } else if (pct > 80) {
                                    badgeClass = "bg-rose-100 text-rose-700 border-rose-200";
                                  } else if (pct >= 50) {
                                    badgeClass = "bg-amber-100 text-amber-700 border-amber-200";
                                  }
                                  return (
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold border rounded-full ${badgeClass} ${!isCancelled && !isCompleted ? "hover:opacity-80 cursor-pointer" : ""}`}
                                    >
                                      {s.enrolled}/{s.capacity}
                                    </span>
                                  );
                                })()}
                              </button>
                            )}

                            {!isCancelled && !isCompleted && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleComplete(s.id)}
                                  disabled={actionLoading === s.id}
                                  className="text-[9px] text-green-600 hover:text-green-800 transition-colors disabled:opacity-30"
                                >
                                  completar
                                </button>
                                <button
                                  onClick={() => handleCancel(s.id)}
                                  disabled={actionLoading === s.id}
                                  className="text-[9px] text-red-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                >
                                  cancelar
                                </button>
                              </div>
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
    </div>
  );
}
