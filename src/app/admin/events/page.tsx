"use client";

import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventData {
  id: string;
  title: string;
  title_es: string;
  description: string | null;
  description_es: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  capacity: number | null;
  enrolled: number;
  price_cop: number;
  price_usd: number;
  image_url: string | null;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CreateForm {
  title: string;
  title_es: string;
  event_date: string;
  start_time: string;
  end_time: string;
  price_cop: string;
  price_usd: string;
  capacity: string;
  location: string;
  description: string;
  description_es: string;
}

const EMPTY_FORM: CreateForm = {
  title: "",
  title_es: "",
  event_date: "",
  start_time: "",
  end_time: "",
  price_cop: "0",
  price_usd: "0",
  capacity: "",
  location: "TU. Studio",
  description: "",
  description_es: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime12(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${m} ${ampm}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  upcoming: { label: "Proximo", color: "text-[#C9A96E] bg-[#C9A96E]/10" },
  sold_out: { label: "Agotado", color: "text-[#B87777] bg-[#B87777]/10" },
  cancelled: { label: "Cancelado", color: "text-red-400 bg-red-50" },
  completed: { label: "Completado", color: "text-green-600 bg-green-50" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({ ...EMPTY_FORM });
  const [creating, setCreating] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit modal
  const [editEvent, setEditEvent] = useState<EventData | null>(null);
  const [editForm, setEditForm] = useState<CreateForm>({ ...EMPTY_FORM });

  // ------------------------------------------------------------------
  // Data loading
  // ------------------------------------------------------------------

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      // When viewing all, don't filter by active
      if (statusFilter === "all") {
        params.set("active", "false"); // trick: omit active filter by not setting it
        // Actually, for "all" we want no filters at all
        params.delete("active");
      }

      // Build URL — for "all" we need to pass status or active params to get everything
      let url = "/api/admin/events";
      if (statusFilter === "all") {
        // Pass active param to bypass the default upcoming-only filter
        url += "?active=true&status=upcoming";
        // Actually, we need ALL events. The API defaults to upcoming+active.
        // We'll just fetch each status and combine, or pass a special query.
        // Simpler: fetch with no default by passing both statuses.
        // Best approach: fetch all by using explicit status params.
      }

      // Fetch all events regardless of status/active
      const allParams = new URLSearchParams();
      if (statusFilter !== "all") {
        allParams.set("status", statusFilter);
      }

      // For "all", we need to get cancelled too — API defaults block that.
      // Solution: fetch multiple statuses and combine.
      let allEvents: EventData[] = [];

      if (statusFilter === "all") {
        const statuses = ["upcoming", "sold_out", "cancelled", "completed"];
        const fetches = statuses.map((s) =>
          fetch(`/api/admin/events?status=${s}`).then((r) =>
            r.ok ? r.json() : { data: [] },
          ),
        );
        const results = await Promise.all(fetches);
        for (const result of results) {
          allEvents = allEvents.concat(result.data || []);
        }
        // Sort: upcoming first by event_date asc, then rest
        allEvents.sort((a, b) => {
          const statusOrder: Record<string, number> = {
            upcoming: 0,
            sold_out: 1,
            completed: 2,
            cancelled: 3,
          };
          const orderA = statusOrder[a.status] ?? 4;
          const orderB = statusOrder[b.status] ?? 4;
          if (orderA !== orderB) return orderA - orderB;
          return a.event_date.localeCompare(b.event_date);
        });
      } else {
        const res = await fetch(`/api/admin/events?status=${statusFilter}`);
        if (res.ok) {
          const data = await res.json();
          allEvents = data.data || [];
        }
      }

      setEvents(allEvents);
    } catch {
      showMessage("Error cargando eventos", "error");
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // ------------------------------------------------------------------
  // Toast
  // ------------------------------------------------------------------

  function showMessage(msg: string, type: "success" | "error" = "success") {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 4000);
  }

  // ------------------------------------------------------------------
  // Create event
  // ------------------------------------------------------------------

  function updateForm(field: keyof CreateForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.title_es.trim() || !form.event_date) {
      showMessage("Titulo, titulo (ES) y fecha son requeridos", "error");
      return;
    }

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        action: "create",
        title: form.title.trim(),
        title_es: form.title_es.trim(),
        event_date: form.event_date,
      };

      if (form.start_time) payload.start_time = form.start_time;
      if (form.end_time) payload.end_time = form.end_time;
      if (form.location.trim()) payload.location = form.location.trim();
      if (form.capacity) payload.capacity = parseInt(form.capacity, 10);
      if (form.price_cop) payload.price_cop = parseInt(form.price_cop, 10);
      if (form.price_usd) payload.price_usd = parseInt(form.price_usd, 10);
      if (form.description.trim())
        payload.description = form.description.trim();
      if (form.description_es.trim())
        payload.description_es = form.description_es.trim();

      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.error || "Error creando evento", "error");
      } else {
        showMessage("Evento creado");
        setForm({ ...EMPTY_FORM });
        setShowCreate(false);
        await loadEvents();
      }
    } catch {
      showMessage("Error de conexion", "error");
    }
    setCreating(false);
  }

  // ------------------------------------------------------------------
  // Cancel event
  // ------------------------------------------------------------------

  async function handleCancel(eventId: string) {
    if (!confirm("Cancelar este evento?")) return;
    setActionLoading(eventId);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", event_id: eventId }),
      });

      if (res.ok) {
        showMessage("Evento cancelado");
        await loadEvents();
      } else {
        const data = await res.json();
        showMessage(data.error || "Error cancelando evento", "error");
      }
    } catch {
      showMessage("Error de conexion", "error");
    }
    setActionLoading(null);
  }

  // ------------------------------------------------------------------
  // Reactivate event
  // ------------------------------------------------------------------

  async function handleActivate(eventId: string) {
    if (!confirm("Reactivar este evento?")) return;
    setActionLoading(eventId);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate", event_id: eventId }),
      });

      if (res.ok) {
        showMessage("Evento reactivado");
        await loadEvents();
      } else {
        const data = await res.json();
        showMessage(data.error || "Error reactivando evento", "error");
      }
    } catch {
      showMessage("Error de conexion", "error");
    }
    setActionLoading(null);
  }

  // ------------------------------------------------------------------
  // Edit event
  // ------------------------------------------------------------------

  function openEditModal(ev: EventData) {
    setEditEvent(ev);
    setEditForm({
      title: ev.title,
      title_es: ev.title_es,
      event_date: ev.event_date,
      start_time: ev.start_time?.slice(0, 5) || "",
      end_time: ev.end_time?.slice(0, 5) || "",
      price_cop: String(ev.price_cop || 0),
      price_usd: String(ev.price_usd || 0),
      capacity: ev.capacity ? String(ev.capacity) : "",
      location: ev.location || "TU. Studio",
      description: ev.description || "",
      description_es: ev.description_es || "",
    });
  }

  function updateEditForm(field: keyof CreateForm, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleEditSave() {
    if (!editEvent) return;
    setActionLoading(editEvent.id);
    try {
      const payload: Record<string, unknown> = {
        action: "update",
        event_id: editEvent.id,
        title: editForm.title.trim(),
        title_es: editForm.title_es.trim(),
        event_date: editForm.event_date,
        location: editForm.location.trim() || "TU. Studio",
        description: editForm.description.trim() || null,
        description_es: editForm.description_es.trim() || null,
        start_time: editForm.start_time || null,
        end_time: editForm.end_time || null,
        price_cop: parseInt(editForm.price_cop, 10) || 0,
        price_usd: parseInt(editForm.price_usd, 10) || 0,
        capacity: editForm.capacity ? parseInt(editForm.capacity, 10) : null,
      };

      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error actualizando evento", "error");
      } else {
        showMessage("Evento actualizado");
        setEditEvent(null);
        await loadEvents();
      }
    } catch {
      showMessage("Error de conexion", "error");
    }
    setActionLoading(null);
  }

  // ------------------------------------------------------------------
  // Delete event
  // ------------------------------------------------------------------

  async function handleDelete(eventId: string) {
    if (!confirm("¿Eliminar este evento permanentemente?")) return;
    setActionLoading(eventId);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", event_id: eventId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error eliminando evento", "error");
      } else {
        showMessage("Evento eliminado");
        await loadEvents();
      }
    } catch {
      showMessage("Error de conexion", "error");
    }
    setActionLoading(null);
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Toast */}
      {message && (
        <div
          className={`fixed top-4 left-4 right-4 z-50 text-white text-sm px-4 py-3 text-center md:left-auto md:right-4 md:max-w-sm ${
            messageType === "error" ? "bg-red-500" : "bg-[#2C2C2C]"
          }`}
        >
          {message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl text-[#2C2C2C]"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          Eventos
        </h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-[#2C2C2C] text-white hover:bg-[#B87777] transition-colors"
        >
          {showCreate ? "Cerrar" : "+ Nuevo"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-[#C9A96E]/20 p-4 space-y-3">
          <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase">
            Crear Evento
          </p>

          {/* Title EN */}
          <div>
            <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">
              Title (English)
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
              placeholder="Sound Healing Journey"
              className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
            />
          </div>

          {/* Title ES */}
          <div>
            <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">
              Titulo (Espanol)
            </label>
            <input
              type="text"
              value={form.title_es}
              onChange={(e) => updateForm("title_es", e.target.value)}
              placeholder="Viaje de Sanacion Sonora"
              className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
            />
          </div>

          {/* Date + Times row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => updateForm("event_date", e.target.value)}
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">
                Inicio
              </label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => updateForm("start_time", e.target.value)}
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">
                Fin
              </label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => updateForm("end_time", e.target.value)}
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
              />
            </div>
          </div>

          {/* Prices + Capacity row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">
                Precio COP
              </label>
              <input
                type="number"
                value={form.price_cop}
                onChange={(e) => updateForm("price_cop", e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">
                Precio USD
              </label>
              <input
                type="number"
                value={form.price_usd}
                onChange={(e) => updateForm("price_usd", e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">
                Capacidad
              </label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => updateForm("capacity", e.target.value)}
                placeholder="Sin limite"
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">
              Ubicacion
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => updateForm("location", e.target.value)}
              placeholder="TU. Studio"
              className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
            />
          </div>

          {/* Description EN */}
          <div>
            <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">
              Description (English)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              rows={2}
              placeholder="Optional event description..."
              className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E] resize-none"
            />
          </div>

          {/* Description ES */}
          <div>
            <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">
              Descripcion (Espanol)
            </label>
            <textarea
              value={form.description_es}
              onChange={(e) => updateForm("description_es", e.target.value)}
              rows={2}
              placeholder="Descripcion opcional del evento..."
              className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E] resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={
              !form.title.trim() ||
              !form.title_es.trim() ||
              !form.event_date ||
              creating
            }
            className="w-full py-2 bg-[#C9A96E] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30"
          >
            {creating ? "Creando..." : "Crear Evento"}
          </button>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { key: "all", label: "Todos" },
            { key: "upcoming", label: "Proximos" },
            { key: "sold_out", label: "Agotados" },
            { key: "completed", label: "Completados" },
            { key: "cancelled", label: "Cancelados" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={`text-[10px] tracking-[0.15em] uppercase px-4 py-1.5 border transition-colors ${
              statusFilter === t.key
                ? "bg-[#2C2C2C] text-white border-[#2C2C2C]"
                : "text-[#2C2C2C]/40 border-[#2C2C2C]/10 hover:border-[#2C2C2C]/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Events list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">No hay eventos</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
            {events.length} {events.length === 1 ? "evento" : "eventos"}
          </p>

          {events.map((ev) => {
            const isCancelled = ev.status === "cancelled";
            const isCompleted = ev.status === "completed";
            const isSoldOut = ev.status === "sold_out";
            const badge = STATUS_CONFIG[ev.status] || {
              label: ev.status,
              color: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5",
            };

            const eventDateObj = new Date(ev.event_date + "T12:00:00");
            const isPast = eventDateObj < new Date();

            return (
              <div
                key={ev.id}
                className={`bg-white border p-4 ${
                  isCancelled
                    ? "border-red-200 opacity-50"
                    : isCompleted
                      ? "border-green-200 opacity-70"
                      : isSoldOut
                        ? "border-[#B87777]/30"
                        : "border-[#C9A96E]/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Title + Status badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[#2C2C2C]">
                        {ev.title_es}
                      </p>
                      <span
                        className={`text-[8px] tracking-wider uppercase px-2 py-0.5 ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* English title */}
                    <p className="text-[10px] text-[#2C2C2C]/40 mt-0.5">
                      {ev.title}
                    </p>

                    {/* Date + Time */}
                    <p className="text-xs text-[#2C2C2C]/60 mt-1 capitalize">
                      {formatEventDate(ev.event_date)}
                      {ev.start_time && (
                        <span className="text-[#C9A96E] ml-2">
                          {formatTime12(ev.start_time)}
                          {ev.end_time && ` - ${formatTime12(ev.end_time)}`}
                        </span>
                      )}
                    </p>

                    {/* Location + Price */}
                    <p className="text-[9px] text-[#2C2C2C]/20 mt-1">
                      {ev.location}
                      {ev.price_cop > 0 && (
                        <span> · {formatCOP(ev.price_cop)}</span>
                      )}
                      {ev.price_usd > 0 && <span> · ${ev.price_usd} USD</span>}
                      {ev.price_cop === 0 && ev.price_usd === 0 && (
                        <span> · Gratis</span>
                      )}
                    </p>

                    {/* Description preview */}
                    {ev.description_es && (
                      <p className="text-[10px] text-[#2C2C2C]/30 mt-1 line-clamp-2">
                        {ev.description_es}
                      </p>
                    )}
                  </div>

                  {/* Right side: enrollment + actions */}
                  <div className="text-right shrink-0 space-y-2">
                    {/* Enrollment count */}
                    <div>
                      <p
                        className="text-2xl text-[#B87777]"
                        style={{ fontFamily: "Cormorant Garamond, serif" }}
                      >
                        {ev.enrolled}
                      </p>
                      <p className="text-[9px] text-[#2C2C2C]/30">
                        {ev.capacity
                          ? `/ ${ev.capacity} cupos`
                          : "inscritos"}
                      </p>
                    </div>

                    {/* Actions */}
                    {!isCancelled && !isCompleted && (
                      <div className="flex flex-col gap-1.5 items-end">
                        <button
                          onClick={() => openEditModal(ev)}
                          disabled={actionLoading === ev.id}
                          className="text-[9px] text-blue-400 hover:text-blue-600 transition-colors disabled:opacity-30"
                        >
                          editar
                        </button>
                        {!isPast && (
                          <button
                            onClick={() => handleCancel(ev.id)}
                            disabled={actionLoading === ev.id}
                            className="text-[9px] text-red-300 hover:text-red-500 transition-colors disabled:opacity-30"
                          >
                            {actionLoading === ev.id ? "..." : "cancelar"}
                          </button>
                        )}
                      </div>
                    )}

                    {isCancelled && (
                      <div className="flex flex-col gap-1.5 items-end">
                        <button
                          onClick={() => handleActivate(ev.id)}
                          disabled={actionLoading === ev.id}
                          className="text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 bg-[#C9A96E] text-white hover:bg-[#B87777] transition-colors disabled:opacity-40"
                        >
                          {actionLoading === ev.id ? "..." : "reactivar"}
                        </button>
                        <button
                          onClick={() => handleDelete(ev.id)}
                          disabled={actionLoading === ev.id}
                          className="text-[9px] text-red-300 hover:text-red-500 transition-colors disabled:opacity-30"
                        >
                          eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditEvent(null)}
          />
          <div className="relative bg-white w-full max-w-md max-h-[85vh] flex flex-col sm:rounded-none shadow-xl">
            <div className="p-4 border-b border-[#2C2C2C]/5 flex items-center justify-between">
              <h2
                className="text-lg text-[#2C2C2C]"
                style={{ fontFamily: "Cormorant Garamond, serif" }}
              >
                Editar Evento
              </h2>
              <button
                onClick={() => setEditEvent(null)}
                className="text-[#2C2C2C]/30 hover:text-[#2C2C2C] text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">Title (English)</label>
                <input type="text" value={editForm.title} onChange={(e) => updateEditForm("title", e.target.value)}
                  className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]" />
              </div>
              <div>
                <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">Titulo (Espanol)</label>
                <input type="text" value={editForm.title_es} onChange={(e) => updateEditForm("title_es", e.target.value)}
                  className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">Fecha</label>
                  <input type="date" value={editForm.event_date} onChange={(e) => updateEditForm("event_date", e.target.value)}
                    className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]" />
                </div>
                <div>
                  <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">Inicio</label>
                  <input type="time" value={editForm.start_time} onChange={(e) => updateEditForm("start_time", e.target.value)}
                    className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]" />
                </div>
                <div>
                  <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">Fin</label>
                  <input type="time" value={editForm.end_time} onChange={(e) => updateEditForm("end_time", e.target.value)}
                    className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">Precio COP</label>
                  <input type="number" value={editForm.price_cop} onChange={(e) => updateEditForm("price_cop", e.target.value)}
                    className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]" />
                </div>
                <div>
                  <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">Precio USD</label>
                  <input type="number" value={editForm.price_usd} onChange={(e) => updateEditForm("price_usd", e.target.value)}
                    className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]" />
                </div>
                <div>
                  <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">Capacidad</label>
                  <input type="number" value={editForm.capacity} onChange={(e) => updateEditForm("capacity", e.target.value)}
                    placeholder="Sin limite"
                    className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">Ubicacion</label>
                <input type="text" value={editForm.location} onChange={(e) => updateEditForm("location", e.target.value)}
                  className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]" />
              </div>
              <div>
                <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">Description (English)</label>
                <textarea value={editForm.description} onChange={(e) => updateEditForm("description", e.target.value)}
                  rows={2} className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E] resize-none" />
              </div>
              <div>
                <label className="block text-[10px] text-[#2C2C2C]/40 mb-1">Descripcion (Espanol)</label>
                <textarea value={editForm.description_es} onChange={(e) => updateEditForm("description_es", e.target.value)}
                  rows={2} className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E] resize-none" />
              </div>
            </div>

            <div className="p-4 border-t border-[#2C2C2C]/5">
              <button
                onClick={handleEditSave}
                disabled={!editForm.title.trim() || !editForm.title_es.trim() || !editForm.event_date || actionLoading === editEvent.id}
                className="w-full py-2 bg-[#C9A96E] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30"
              >
                {actionLoading === editEvent.id ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
