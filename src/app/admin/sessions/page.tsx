"use client";

import { useEffect, useState, useCallback } from "react";
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

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genWeeks, setGenWeeks] = useState(4);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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
                            <span className="text-xs text-[#2C2C2C]/40">
                              {s.enrolled}/{s.capacity}
                            </span>

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
