"use client";

import { useEffect, useState, useCallback } from "react";

type Lang = "en" | "es";

interface WaitlistEntry {
  id: string;
  session_id: string;
  status: string;
  created_at: string;
  notified_at: string | null;
  session?: {
    session_date: string;
    start_time: string;
    definition?: {
      name: string;
      name_es: string;
      teacher: string;
    };
  };
}

const L = (lang: Lang, en: string, es: string) => (lang === "en" ? en : es);

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>("es");
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      // Get language preference
      const profileRes = await fetch("/api/student/profile");
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData?.data?.preferred_lang) {
          setLang(profileData.data.preferred_lang);
        }
      }

      const res = await fetch("/api/student/waitlist");
      if (res.status === 401) {
        window.location.href = "/login?redirect=/portal/waitlist";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setEntries(data.data || []);
      }
    } catch {
      // Silent fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  }

  async function handleLeave(entryId: string) {
    setRemoving(entryId);
    try {
      const res = await fetch(`/api/student/waitlist?id=${entryId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
        showMessage(L(lang, "Removed from waitlist", "Removido de la lista de espera"));
      } else {
        showMessage(L(lang, "Error removing from waitlist", "Error al remover de la lista"));
      }
    } catch {
      showMessage(L(lang, "Connection error", "Error de conexion"));
    }
    setRemoving(null);
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString(lang === "es" ? "es-CO" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatTime(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const display = h % 12 || 12;
    return `${display}:${String(m).padStart(2, "0")} ${period}`;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
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
        {L(lang, "Waitlist", "Lista de Espera")}
      </h1>

      <p className="text-xs text-[#2C2C2C]/40">
        {L(
          lang,
          "When a spot opens in a full class, you'll be notified automatically.",
          "Cuando se abra un cupo en una clase llena, seras notificado automaticamente.",
        )}
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center space-y-3">
          <div className="text-3xl opacity-20">🧘</div>
          <p className="text-sm text-[#2C2C2C]/40">
            {L(
              lang,
              "You're not on any waitlists right now.",
              "No estas en ninguna lista de espera.",
            )}
          </p>
          <a
            href="/portal/schedule"
            className="inline-block text-[10px] tracking-[0.15em] uppercase px-4 py-2 border border-[#B87777]/30 text-[#B87777] hover:bg-[#B87777] hover:text-white transition-colors"
          >
            {L(lang, "View Schedule", "Ver Horario")}
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
            {entries.length}{" "}
            {entries.length === 1
              ? L(lang, "class", "clase")
              : L(lang, "classes", "clases")}
          </p>

          {entries.map((entry) => {
            const session = entry.session;
            const def = session?.definition;
            const className = def
              ? lang === "es" && def.name_es
                ? def.name_es
                : def.name
              : L(lang, "Class", "Clase");

            return (
              <div
                key={entry.id}
                className="bg-white border border-[#2C2C2C]/5 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2C2C2C]">
                      {className}
                    </p>
                    {session && (
                      <p className="text-xs text-[#2C2C2C]/50 mt-0.5">
                        {formatDate(session.session_date)} ·{" "}
                        {formatTime(session.start_time)}
                      </p>
                    )}
                    {def?.teacher && (
                      <p className="text-[10px] text-[#2C2C2C]/30 mt-0.5">
                        {def.teacher}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[8px] tracking-wider uppercase px-2 py-0.5 text-amber-600 bg-amber-50">
                        {entry.notified_at
                          ? L(lang, "Spot Available!", "Cupo Disponible!")
                          : L(lang, "Waiting", "Esperando")}
                      </span>
                      <span className="text-[9px] text-[#2C2C2C]/20">
                        {L(lang, "Joined", "Desde")}{" "}
                        {new Date(entry.created_at).toLocaleDateString(
                          lang === "es" ? "es-CO" : "en-US",
                          { month: "short", day: "numeric" },
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLeave(entry.id)}
                    disabled={removing === entry.id}
                    className="text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 border border-[#2C2C2C]/10 text-[#2C2C2C]/40 hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-30"
                  >
                    {removing === entry.id
                      ? "..."
                      : L(lang, "Leave", "Salir")}
                  </button>
                </div>

                {entry.notified_at && (
                  <div className="mt-3 pt-3 border-t border-[#2C2C2C]/5">
                    <a
                      href="/portal/schedule"
                      className="text-[10px] tracking-[0.1em] uppercase text-[#B87777] hover:underline"
                    >
                      {L(lang, "Book Now →", "Reservar Ahora →")}
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
