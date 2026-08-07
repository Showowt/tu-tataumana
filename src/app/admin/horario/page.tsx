"use client";

import { useEffect, useState, useCallback } from "react";

interface ClassDef {
  id: string;
  name: string;
  name_es: string;
  description: string | null;
  description_es: string | null;
  day_of_week: number;
  start_time: string;
  teacher: string;
  style: string;
  capacity: number;
  duration_minutes: number;
  note: string | null;
  is_active: boolean;
}

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun display order
const STYLES = ["Hatha", "Vinyasa", "Yogalates", "Pilates", "Meditation", "Healing", "Stress Release", "Sculpt", "Intro", "Power"];

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default function AdminHorarioPage() {
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ClassDef>>({});
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState<number | null>(null); // day_of_week to add to
  const [newClass, setNewClass] = useState({ name: "", name_es: "", start_time: "09:00", teacher: "", style: "Hatha", capacity: 12 });
  const [creating, setCreating] = useState(false);

  function showMsg(msg: string) { setMessage(msg); setTimeout(() => setMessage(""), 4000); }

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/class-definitions");
      if (res.ok) { const d = await res.json(); setClasses(d.data || []); }
    } catch { showMsg("Error cargando horario"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  // Group by day
  const byDay = new Map<number, ClassDef[]>();
  for (const cls of classes) {
    if (!byDay.has(cls.day_of_week)) byDay.set(cls.day_of_week, []);
    byDay.get(cls.day_of_week)!.push(cls);
  }

  function startEdit(cls: ClassDef) {
    setEditing(cls.id);
    setEditData({ name: cls.name, name_es: cls.name_es, teacher: cls.teacher, start_time: cls.start_time, capacity: cls.capacity, style: cls.style, note: cls.note });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/class-definitions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing, ...editData }),
      });
      const data = await res.json();
      if (!res.ok) { showMsg(data.error || "Error"); }
      else { showMsg("Guardado"); setEditing(null); await loadClasses(); }
    } catch { showMsg("Error de conexion"); }
    setSaving(false);
  }

  async function toggleActive(cls: ClassDef) {
    const action = cls.is_active ? "desactivar" : "reactivar";
    if (cls.is_active && !confirm(`Desactivar "${cls.name}" ${DAY_NAMES[cls.day_of_week]} ${formatTime12(cls.start_time)}? Se cancelaran las sesiones futuras.`)) return;

    try {
      const res = await fetch("/api/admin/class-definitions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cls.id, is_active: !cls.is_active }),
      });
      if (res.ok) { showMsg(`Clase ${action === "desactivar" ? "desactivada" : "reactivada"}`); await loadClasses(); }
      else { showMsg("Error"); }
    } catch { showMsg("Error"); }
  }

  async function handleCreate(dayOfWeek: number) {
    if (!newClass.name.trim() || !newClass.teacher.trim()) { showMsg("Nombre y teacher requeridos"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/class-definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newClass,
          name_es: newClass.name_es || newClass.name,
          day_of_week: dayOfWeek,
          duration_minutes: 60,
          location: "Casa Carolina",
          price_cop: 80000,
          price_usd: 21,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showMsg(data.error || "Error"); }
      else {
        showMsg("Clase creada");
        setShowAdd(null);
        setNewClass({ name: "", name_es: "", start_time: "09:00", teacher: "", style: "Yoga", capacity: 12 });
        await loadClasses();
      }
    } catch { showMsg("Error de conexion"); }
    setCreating(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {message && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#2C2C2C] text-white text-sm px-4 py-3 text-center md:left-auto md:right-4 md:max-w-sm">
          {message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-[#2C2C2C]" style={{ fontFamily: "Cormorant Garamond, serif" }}>
            Horario Semanal
          </h1>
          <p className="text-[9px] text-[#2C2C2C]/30 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            Los cambios se reflejan en la web y el chatbot automaticamente
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {DAY_ORDER.map((dayIdx) => {
            const dayClasses = (byDay.get(dayIdx) || []).sort((a, b) => a.start_time.localeCompare(b.start_time));
            const active = dayClasses.filter((c) => c.is_active);
            const inactive = dayClasses.filter((c) => !c.is_active);

            return (
              <section key={dayIdx}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {DAY_NAMES[dayIdx]} ({active.length} clases)
                  </h2>
                  <button
                    onClick={() => setShowAdd(showAdd === dayIdx ? null : dayIdx)}
                    className="text-[9px] tracking-[0.1em] uppercase px-3 py-1 border border-[#C9A96E]/30 text-[#C9A96E] hover:bg-[#C9A96E] hover:text-white transition-colors"
                  >
                    {showAdd === dayIdx ? "Cancelar" : "+ Clase"}
                  </button>
                </div>

                {/* Add new class form */}
                {showAdd === dayIdx && (
                  <div className="bg-white border border-[#C9A96E]/20 p-3 mb-2 space-y-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="Nombre (EN)" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                        className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
                      <input type="text" placeholder="Nombre (ES)" value={newClass.name_es} onChange={(e) => setNewClass({ ...newClass, name_es: e.target.value })}
                        className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="time" value={newClass.start_time} onChange={(e) => setNewClass({ ...newClass, start_time: e.target.value })}
                        className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
                      <input type="text" placeholder="Teacher" value={newClass.teacher} onChange={(e) => setNewClass({ ...newClass, teacher: e.target.value })}
                        className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
                      <select value={newClass.style} onChange={(e) => setNewClass({ ...newClass, style: e.target.value })}
                        className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm bg-white focus:outline-none focus:border-[#B87777]">
                        {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <button onClick={() => handleCreate(dayIdx)} disabled={creating}
                      className="w-full py-2 bg-[#C9A96E] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30">
                      {creating ? "Creando..." : "Crear Clase"}
                    </button>
                  </div>
                )}

                {/* Active classes */}
                <div className="space-y-1">
                  {active.map((cls) => {
                    const isEditing = editing === cls.id;
                    return (
                      <div key={cls.id} className={`bg-white border p-3 ${isEditing ? "border-[#B87777]/30" : "border-[#2C2C2C]/5"}`}>
                        {isEditing ? (
                          <div className="space-y-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Name"
                                className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
                              <input type="text" value={editData.name_es || ""} onChange={(e) => setEditData({ ...editData, name_es: e.target.value })} placeholder="Nombre"
                                className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <input type="time" value={editData.start_time || ""} onChange={(e) => setEditData({ ...editData, start_time: e.target.value })}
                                className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
                              <input type="text" value={editData.teacher || ""} onChange={(e) => setEditData({ ...editData, teacher: e.target.value })} placeholder="Teacher"
                                className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
                              <select value={editData.style || ""} onChange={(e) => setEditData({ ...editData, style: e.target.value })}
                                className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm bg-white focus:outline-none focus:border-[#B87777]">
                                {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="number" value={editData.capacity || 12} onChange={(e) => setEditData({ ...editData, capacity: Number(e.target.value) })} min={1} max={50}
                                className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
                              <input type="text" value={editData.note || ""} onChange={(e) => setEditData({ ...editData, note: e.target.value })} placeholder="Nota (opcional)"
                                className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm focus:outline-none focus:border-[#B87777]" />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={saveEdit} disabled={saving}
                                className="flex-1 py-1.5 bg-[#2C2C2C] text-white text-[9px] tracking-[0.1em] uppercase disabled:opacity-30">
                                {saving ? "..." : "Guardar"}
                              </button>
                              <button onClick={() => setEditing(null)}
                                className="px-4 py-1.5 border border-[#2C2C2C]/10 text-[9px] text-[#2C2C2C]/40 uppercase">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[#C9A96E] font-mono w-16 shrink-0">{formatTime12(cls.start_time)}</span>
                                <span className="text-sm font-medium text-[#2C2C2C] truncate">{cls.name}</span>
                                {cls.note && <span className="text-[9px] text-[#2C2C2C]/30">{cls.note}</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-[#2C2C2C]/40">{cls.teacher}</span>
                                <span className="text-[9px] text-[#B87777]">{cls.style}</span>
                                <span className="text-[9px] text-[#2C2C2C]/20">{cls.capacity} cupos</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => startEdit(cls)}
                                className="text-[9px] text-[#2C2C2C]/20 hover:text-[#B87777] transition-colors uppercase">
                                Editar
                              </button>
                              <button onClick={() => toggleActive(cls)}
                                className="text-[9px] text-[#2C2C2C]/15 hover:text-red-400 transition-colors uppercase">
                                Desactivar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Inactive classes */}
                {inactive.length > 0 && (
                  <details className="mt-1">
                    <summary className="text-[8px] text-[#2C2C2C]/15 tracking-wider uppercase cursor-pointer hover:text-[#2C2C2C]/30">
                      {inactive.length} inactivas
                    </summary>
                    <div className="space-y-1 mt-1">
                      {inactive.map((cls) => (
                        <div key={cls.id} className="bg-white border border-[#2C2C2C]/5 p-3 opacity-40 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-mono text-[#2C2C2C]/30 mr-2">{formatTime12(cls.start_time)}</span>
                            <span className="text-sm text-[#2C2C2C]/50">{cls.name}</span>
                            <span className="text-[10px] text-[#2C2C2C]/20 ml-2">{cls.teacher}</span>
                          </div>
                          <button onClick={() => toggleActive(cls)}
                            className="text-[9px] text-green-500 hover:text-green-700 transition-colors uppercase">
                            Reactivar
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}

      <div className="bg-[#FAF8F5] border border-[#2C2C2C]/5 p-4">
        <p className="text-[10px] text-[#2C2C2C]/40 leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
          Al cambiar el teacher o desactivar una clase, los cambios se aplican automaticamente a todas las sesiones futuras. Los cambios aparecen en la pagina web y el chatbot en menos de 1 minuto.
        </p>
      </div>
    </div>
  );
}
