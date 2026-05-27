"use client";

import { useEffect, useState, useCallback } from "react";

interface PrivateSession {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  service_type: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  price_cop: number;
  group_size: number;
  teacher: string;
  location: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  scheduled: number;
  completed: number;
  revenue: number;
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Agendada", color: "text-blue-600 bg-blue-50" },
  completed: { label: "Completada", color: "text-green-600 bg-green-50" },
  cancelled: { label: "Cancelada", color: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5" },
  no_show: { label: "No asistio", color: "text-red-500 bg-red-50" },
};

const PAYMENT_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "text-amber-600 bg-amber-50" },
  paid: { label: "Pagado", color: "text-green-600 bg-green-50" },
  partial: { label: "Parcial", color: "text-orange-500 bg-orange-50" },
};

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(amount);
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function formatDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
}

export default function AdminPrivatePage() {
  const [sessions, setSessions] = useState<PrivateSession[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    client_name: "", client_email: "", client_phone: "",
    service_type: "Private Yoga", session_date: "", start_time: "10:00",
    price_cop: 190000, group_size: 1, teacher: "Tata", notes: "",
  });
  const [creating, setCreating] = useState(false);

  function showMsg(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  }

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/private-sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data || []);
        setStats(data.stats || null);
      }
    } catch { showMsg("Error cargando sesiones"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  async function handleCreate() {
    if (!form.client_name.trim() || !form.session_date) {
      showMsg("Nombre y fecha son requeridos");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/private-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { showMsg(data.error || "Error"); }
      else {
        showMsg("Sesion privada creada");
        setShowForm(false);
        setForm({ client_name: "", client_email: "", client_phone: "", service_type: "Private Yoga", session_date: "", start_time: "10:00", price_cop: 190000, group_size: 1, teacher: "Tata", notes: "" });
        await loadSessions();
      }
    } catch { showMsg("Error de conexion"); }
    setCreating(false);
  }

  async function updateSession(id: string, updates: Record<string, unknown>) {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/private-sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) { showMsg("Actualizado"); await loadSessions(); }
      else { showMsg("Error al actualizar"); }
    } catch { showMsg("Error"); }
    setActionLoading(null);
  }

  const SERVICE_TYPES = ["Private Yoga", "Sound Healing Private", "Reiki", "Energy Cleansing", "Discovery Session", "Group Private", "Corporate Session", "Retreat"];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {message && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#2C2C2C] text-white text-sm px-4 py-3 text-center md:left-auto md:right-4 md:max-w-sm">
          {message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl text-[#2C2C2C]" style={{ fontFamily: "Cormorant Garamond, serif" }}>
          Sesiones Privadas
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-[#2C2C2C] text-white hover:bg-[#B87777] transition-colors"
        >
          {showForm ? "Cerrar" : "+ Nueva"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white border border-[#2C2C2C]/5 p-3">
            <p className="text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">Agendadas</p>
            <p className="text-xl text-[#B87777]" style={{ fontFamily: "Cormorant Garamond, serif" }}>{stats.scheduled}</p>
          </div>
          <div className="bg-white border border-[#2C2C2C]/5 p-3">
            <p className="text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">Completadas</p>
            <p className="text-xl text-[#2C2C2C]" style={{ fontFamily: "Cormorant Garamond, serif" }}>{stats.completed}</p>
          </div>
          <div className="bg-white border border-[#2C2C2C]/5 p-3">
            <p className="text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">Ingresos</p>
            <p className="text-sm text-[#2C2C2C]" style={{ fontFamily: "Cormorant Garamond, serif" }}>{formatCOP(stats.revenue)}</p>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white border border-[#C9A96E]/20 p-4 space-y-3" style={{ fontFamily: "Outfit, sans-serif" }}>
          <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase">Nueva Sesion Privada</p>

          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Nombre del cliente *" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              className="col-span-2 px-3 py-2 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
            <input type="email" placeholder="Email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })}
              className="px-3 py-2 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
            <input type="text" placeholder="Telefono" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
              className="px-3 py-2 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
          </div>

          <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })}
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777] bg-white">
            {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="grid grid-cols-3 gap-2">
            <input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })}
              className="px-3 py-2 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
            <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="px-3 py-2 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
            <div className="flex items-center gap-2">
              <input type="number" value={form.group_size} onChange={(e) => setForm({ ...form, group_size: Number(e.target.value) || 1 })} min={1} max={30}
                className="w-16 px-2 py-2 border border-[#2C2C2C]/10 text-sm text-center focus:outline-none focus:border-[#B87777]" />
              <span className="text-[9px] text-[#2C2C2C]/30">personas</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#2C2C2C]/40">$</span>
              <input type="number" value={form.price_cop} onChange={(e) => setForm({ ...form, price_cop: Number(e.target.value) || 0 })}
                className="flex-1 px-2 py-2 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
              <span className="text-[9px] text-[#2C2C2C]/30">COP</span>
            </div>
            <input type="text" placeholder="Teacher" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })}
              className="px-3 py-2 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
          </div>

          <textarea placeholder="Notas (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />

          <button onClick={handleCreate} disabled={creating || !form.client_name.trim() || !form.session_date}
            className="w-full py-2.5 bg-[#C9A96E] text-white text-[11px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30 flex items-center justify-center gap-2">
            {creating ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creando...</> : "Crear Sesion Privada"}
          </button>
        </div>
      )}

      {/* Sessions List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">No hay sesiones privadas registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
            {sessions.length} sesiones
          </p>
          {sessions.map((s) => {
            const sBadge = STATUS_BADGES[s.status] || { label: s.status, color: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5" };
            const pBadge = PAYMENT_BADGES[s.payment_status] || { label: s.payment_status, color: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5" };

            return (
              <div key={s.id} className={`bg-white border p-4 ${s.status === "scheduled" ? "border-[#B87777]/15" : "border-[#2C2C2C]/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2C2C2C] truncate">{s.client_name}</p>
                    <p className="text-[10px] text-[#2C2C2C]/40 truncate">
                      {s.client_phone || s.client_email || "Sin contacto"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-[#2C2C2C]/60">{s.service_type}</span>
                      {s.group_size > 1 && <span className="text-[9px] text-[#C9A96E]">{s.group_size} personas</span>}
                    </div>
                    <p className="text-[10px] text-[#2C2C2C]/30 mt-0.5">
                      {formatDate(s.session_date)} {formatTime12(s.start_time)} · {s.teacher}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[8px] tracking-wider uppercase px-2 py-0.5 ${sBadge.color}`}>{sBadge.label}</span>
                      <span className={`text-[8px] tracking-wider uppercase px-2 py-0.5 ${pBadge.color}`}>{pBadge.label}</span>
                    </div>
                    {s.notes && <p className="text-[9px] text-[#2C2C2C]/30 italic mt-1">{s.notes}</p>}
                  </div>
                  <div className="text-right shrink-0 space-y-2">
                    <p className="text-lg text-[#2C2C2C]" style={{ fontFamily: "Cormorant Garamond, serif" }}>
                      {formatCOP(s.price_cop)}
                    </p>
                    {s.status === "scheduled" && (
                      <div className="flex flex-col gap-1">
                        <button onClick={() => updateSession(s.id, { status: "completed", payment_status: "paid" })}
                          disabled={actionLoading === s.id}
                          className="text-[9px] tracking-[0.1em] uppercase px-3 py-1 bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-30">
                          Completar
                        </button>
                        <button onClick={() => updateSession(s.id, { payment_status: "paid" })}
                          disabled={actionLoading === s.id || s.payment_status === "paid"}
                          className="text-[9px] text-[#C9A96E] hover:text-[#B87777] transition-colors disabled:opacity-20">
                          Marcar pagado
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
    </div>
  );
}
