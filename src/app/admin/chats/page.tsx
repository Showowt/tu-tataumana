"use client";

import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Admin > Chats — who is trying to come, before any payment exists.
// 1. Reservas web sin pago (tu_bookings status=new) — the "show up unpaid" people
// 2. Conversaciones del chat de la página (tu_chat_sessions transcripts)
// 3. Intentos de reserva abandonados (tu_leads source=booking_abandoned)
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  session_id: string;
  messages: ChatMessage[];
  message_count: number;
  first_message: string | null;
  last_message: string | null;
  last_activity: string;
  extracted_name: string | null;
  extracted_email: string | null;
  extracted_phone: string | null;
  intent: string | null;
  lead_score: number;
  created_at: string;
}

interface PendingBooking {
  id: number;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  service: string | null;
  class_date: string | null;
  class_time: string | null;
  class_name: string | null;
  payment_method: string | null;
}

interface AbandonedLead {
  id: number;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  service_interest: string | null;
  preferred_date: string | null;
  booking_step: string | null;
  warmth: string | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  nequi: "Nequi",
  bancolombia: "Bancolombia",
  zelle: "Zelle",
  wompi: "Tarjeta (Wompi)",
};

const INTENT_META: Record<string, { label: string; cls: string }> = {
  ready_to_book: { label: "Quiere reservar", cls: "bg-[#B87777] text-white" },
  interested: { label: "Interesado", cls: "bg-[#B87777]/15 text-[#B87777]" },
  needs_help: { label: "Necesita ayuda", cls: "bg-amber-100 text-amber-700" },
  browsing: { label: "Explorando", cls: "bg-[#2C2C2C]/5 text-[#2C2C2C]/50" },
};

function todayBogota(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(`${d}T12:00:00`);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Bogota",
  });
}

function fmtTime12(t: string | null): string {
  if (!t) return "";
  const m = t.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  let h = parseInt(m[1], 10);
  const ampm = /pm/i.test(t) ? "PM" : /am/i.test(t) ? "AM" : h >= 12 ? "PM" : "AM";
  if (/pm/i.test(t) && h < 12) h += 12;
  const h12 = h % 12 || 12;
  return `${h12}:${m[2]} ${ampm}`;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `hace ${Math.max(mins, 1)} min`;
  if (mins < 60 * 24) return `hace ${Math.round(mins / 60)} h`;
  if (mins < 60 * 24 * 7) return `hace ${Math.round(mins / (60 * 24))} d`;
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "America/Bogota",
  });
}

/** Colombian-aware wa.me target: 10 digits starting with 3 → prefix 57 */
function waNumber(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 10 && digits.startsWith("3")) return `57${digits}`;
  if (digits.length >= 10) return digits;
  return null;
}

function waLink(phone: string, text: string): string | null {
  const num = waNumber(phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

export default function AdminChatsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [pending, setPending] = useState<PendingBooking[]>([]);
  const [leads, setLeads] = useState<AbandonedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [archiving, setArchiving] = useState<number | null>(null);

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/chats?days=45");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setPending(data.pending || []);
        setLeads(data.leads || []);
      } else if (res.status === 401) {
        showMessage("No autorizado. Inicia sesion como admin.");
      } else {
        showMessage("Error cargando datos");
      }
    } catch {
      showMessage("Error de conexion / Connection error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleArchive(id: number) {
    setArchiving(id);
    try {
      const res = await fetch("/api/admin/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, action: "archive" }),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((p) => p.id !== id));
        showMessage("Reserva marcada como gestionada ✓");
      } else {
        const data = await res.json().catch(() => null);
        showMessage(data?.error || "No se pudo archivar");
      }
    } catch {
      showMessage("Error de conexion / Connection error");
    }
    setArchiving(null);
  }

  const today = todayBogota();
  const upcoming = pending.filter((p) => !p.class_date || p.class_date >= today);
  const past = pending.filter((p) => p.class_date && p.class_date < today);

  // Hide abandoned leads that already became a pending web reservation
  const pendingKeys = new Set(
    pending.flatMap((p) =>
      [p.phone?.replace(/[^\d]/g, ""), p.email?.toLowerCase()].filter(Boolean)
    )
  );
  const uniqueLeads = leads.filter((l) => {
    const phoneKey = l.phone?.replace(/[^\d]/g, "");
    const emailKey = l.email?.toLowerCase();
    return !(phoneKey && pendingKeys.has(phoneKey)) && !(emailKey && pendingKeys.has(emailKey));
  });

  const readyCount = sessions.filter((s) => s.intent === "ready_to_book").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl text-[#2C2C2C]"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          Chats <span className="text-[#B87777]">&amp; Interesados</span>
        </h1>
        <p className="text-xs text-[#2C2C2C]/40 mt-1">
          Personas que quieren venir pero aun no han pagado: reservas web sin
          pago, conversaciones del chat de la pagina y reservas abandonadas.
        </p>
      </div>

      {/* Toast */}
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#2C2C2C] text-white text-xs px-4 py-2.5 shadow-lg">
          {message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sin pago confirmado", value: upcoming.length },
          { label: "Conversaciones (45d)", value: sessions.length },
          { label: "Quieren reservar", value: readyCount },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#2C2C2C]/5 p-4 text-center">
            <p
              className="text-2xl text-[#B87777]"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              {loading ? "·" : s.value}
            </p>
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#2C2C2C]/40 mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#2C2C2C]/5 p-5 animate-pulse">
              <div className="h-3 bg-[#2C2C2C]/5 w-1/3 mb-2" />
              <div className="h-3 bg-[#2C2C2C]/5 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ---------------------------------------------------------------- */}
          {/* 1. Pending web reservations (no confirmed payment)               */}
          {/* ---------------------------------------------------------------- */}
          <section>
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-[#2C2C2C]/50 mb-1">
              ⏳ Reservas web sin pago confirmado
            </h2>
            <p className="text-[11px] text-[#2C2C2C]/35 mb-3">
              Llenaron el formulario de reserva pero el pago nunca se confirmo.
              Escribeles para confirmar — su cupo NO esta asegurado. Marca{" "}
              <span className="text-[#B87777]">✓ Gestionada</span> cuando ya la
              resolviste (tambien desaparece del resumen de Telegram).
            </p>

            {upcoming.length === 0 && past.length === 0 ? (
              <div className="bg-white border border-[#2C2C2C]/5 p-6 text-center text-xs text-[#2C2C2C]/35">
                No hay reservas web pendientes. ✨
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((p) => (
                  <PendingCard
                    key={p.id}
                    booking={p}
                    archiving={archiving === p.id}
                    onArchive={() => handleArchive(p.id)}
                  />
                ))}
                {past.length > 0 && (
                  <button
                    onClick={() => setShowPast((v) => !v)}
                    className="text-[10px] tracking-[0.15em] uppercase text-[#2C2C2C]/35 hover:text-[#B87777] transition-colors py-2"
                  >
                    {showPast ? "Ocultar" : "Ver"} {past.length} con fecha pasada{" "}
                    {showPast ? "▲" : "▼"}
                  </button>
                )}
                {showPast &&
                  past.map((p) => (
                    <PendingCard
                      key={p.id}
                      booking={p}
                      isPast
                      archiving={archiving === p.id}
                      onArchive={() => handleArchive(p.id)}
                    />
                  ))}
              </div>
            )}
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* 2. Chat transcripts                                              */}
          {/* ---------------------------------------------------------------- */}
          <section>
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-[#2C2C2C]/50 mb-1">
              💬 Conversaciones del chat de la pagina
            </h2>
            <p className="text-[11px] text-[#2C2C2C]/35 mb-3">
              Transcripciones completas del chat &quot;YOU&quot; del sitio web.
              Toca una conversacion para leerla entera.
            </p>

            {sessions.length === 0 ? (
              <div className="bg-white border border-[#2C2C2C]/5 p-6 text-center text-xs text-[#2C2C2C]/35">
                Aun no hay conversaciones guardadas. Se guardan automaticamente
                a partir de hoy — las conversaciones anteriores no quedaron
                registradas.
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => {
                  const meta = INTENT_META[s.intent || "browsing"] || INTENT_META.browsing;
                  const isOpen = expanded === s.session_id;
                  const contact = s.extracted_phone || s.extracted_email;
                  return (
                    <div key={s.session_id} className="bg-white border border-[#2C2C2C]/5">
                      <button
                        onClick={() => setExpanded(isOpen ? null : s.session_id)}
                        className="w-full text-left p-4 hover:bg-[#FAF8F5] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] tracking-wider uppercase px-2 py-1 ${meta.cls}`}>
                              {meta.label}
                            </span>
                            <span className="text-[10px] text-[#2C2C2C]/30">
                              {s.message_count} msjs · interes {s.lead_score}/100
                            </span>
                            {contact && (
                              <span className="text-[10px] text-[#B87777]">
                                {s.extracted_phone || s.extracted_email}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#2C2C2C]/30">
                            {fmtWhen(s.last_activity)} {isOpen ? "▲" : "▼"}
                          </span>
                        </div>
                        <p className="text-xs text-[#2C2C2C]/70 mt-2 line-clamp-2">
                          {s.first_message || "(sin mensaje)"}
                        </p>
                      </button>

                      {isOpen && (
                        <div className="border-t border-[#2C2C2C]/5 p-4 space-y-2 max-h-96 overflow-y-auto bg-[#FAF8F5]">
                          {(s.messages || []).map((m, i) => (
                            <div
                              key={i}
                              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                                  m.role === "user"
                                    ? "bg-[#B87777] text-white"
                                    : "bg-white text-[#2C2C2C]/80 border border-[#2C2C2C]/5"
                                }`}
                              >
                                {m.content}
                              </div>
                            </div>
                          ))}
                          {s.extracted_phone && (
                            <div className="pt-2">
                              <a
                                href={
                                  waLink(
                                    s.extracted_phone,
                                    "Hola! Soy Tata de TU. Vi tu mensaje en la pagina — ¿te ayudo a confirmar tu reserva?"
                                  ) || "#"
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block text-[10px] tracking-[0.15em] uppercase bg-[#25D366] text-white px-3 py-2"
                              >
                                WhatsApp →
                              </a>
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

          {/* ---------------------------------------------------------------- */}
          {/* 3. Abandoned booking attempts                                    */}
          {/* ---------------------------------------------------------------- */}
          <section>
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-[#2C2C2C]/50 mb-1">
              Reservas abandonadas (dejaron sus datos)
            </h2>
            <p className="text-[11px] text-[#2C2C2C]/35 mb-3">
              Empezaron a reservar, dejaron nombre o contacto, y cerraron antes
              de terminar.
            </p>

            {uniqueLeads.length === 0 ? (
              <div className="bg-white border border-[#2C2C2C]/5 p-6 text-center text-xs text-[#2C2C2C]/35">
                Sin intentos abandonados recientes.
              </div>
            ) : (
              <div className="space-y-2">
                {uniqueLeads.map((l) => {
                  const wa = l.phone
                    ? waLink(
                        l.phone,
                        `Hola${l.name ? ` ${l.name.split(" ")[0]}` : ""}! Soy Tata de TU. Vi que empezaste a reservar${l.service_interest ? ` ${l.service_interest}` : ""} en la pagina — ¿te ayudo a completar tu reserva?`
                      )
                    : null;
                  return (
                    <div
                      key={l.id}
                      className="bg-white border border-[#2C2C2C]/5 p-4 flex items-center justify-between gap-3 flex-wrap"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-[#2C2C2C]">
                          {l.name || "Sin nombre"}{" "}
                          {l.warmth === "hot" && (
                            <span className="text-[9px] tracking-wider uppercase bg-[#B87777] text-white px-1.5 py-0.5 ml-1">
                              Caliente
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-[#2C2C2C]/40 mt-0.5">
                          {[l.service_interest, l.preferred_date && fmtDate(l.preferred_date), l.phone, l.email]
                            .filter(Boolean)
                            .join(" · ")}{" "}
                          · {fmtWhen(l.created_at)}
                        </p>
                      </div>
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] tracking-[0.15em] uppercase bg-[#25D366] text-white px-3 py-2 shrink-0"
                        >
                          WhatsApp →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function PendingCard({
  booking,
  isPast = false,
  archiving,
  onArchive,
}: {
  booking: PendingBooking;
  isPast?: boolean;
  archiving: boolean;
  onArchive: () => void;
}) {
  const className = booking.class_name || booking.service || "Clase";
  const wa = booking.phone
    ? waLink(
        booking.phone,
        `Hola${booking.name ? ` ${booking.name.split(" ")[0]}` : ""}! Soy Tata de TU. Vi tu reserva para ${className}${booking.class_date ? ` el ${fmtDate(booking.class_date)}` : ""}${booking.class_time ? ` a las ${fmtTime12(booking.class_time)}` : ""}. Para asegurar tu cupo solo falta confirmar el pago — ¿te ayudo?`
      )
    : null;

  return (
    <div
      className={`bg-white border p-4 flex items-center justify-between gap-3 flex-wrap ${
        isPast ? "border-[#2C2C2C]/5 opacity-60" : "border-[#B87777]/25"
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm text-[#2C2C2C]">
          {booking.name || "Sin nombre"}
          <span className="text-[#2C2C2C]/40"> · {className}</span>
        </p>
        <p className="text-[10px] text-[#2C2C2C]/40 mt-0.5">
          {[
            booking.class_date && fmtDate(booking.class_date),
            booking.class_time && fmtTime12(booking.class_time),
            booking.payment_method
              ? `eligio ${PAYMENT_LABELS[booking.payment_method] || booking.payment_method}`
              : "sin metodo de pago",
            booking.phone,
          ]
            .filter(Boolean)
            .join(" · ")}{" "}
          · reservo {fmtWhen(booking.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] tracking-[0.15em] uppercase bg-[#25D366] text-white px-3 py-2"
          >
            WhatsApp →
          </a>
        )}
        <button
          onClick={onArchive}
          disabled={archiving}
          className="text-[10px] tracking-[0.15em] uppercase border border-[#2C2C2C]/15 text-[#2C2C2C]/50 hover:border-[#B87777] hover:text-[#B87777] px-3 py-2 transition-colors disabled:opacity-40"
        >
          {archiving ? "..." : "✓ Gestionada"}
        </button>
      </div>
    </div>
  );
}
