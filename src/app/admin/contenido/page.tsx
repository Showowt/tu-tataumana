"use client";

import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentTab = "teachers" | "services" | "faq" | "retreats";

interface TeacherItem {
  id: string;
  name: string;
  role_en: string;
  role_es: string;
  bio_en: string;
  bio_es: string;
  image_url: string;
  specialties: string[];
  is_lead: boolean;
  is_active: boolean;
  sort_order: number;
}

interface ServiceItem {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  price_cop: number;
  price_usd: number;
  duration: string;
  is_active: boolean;
  sort_order: number;
}

interface FAQItem {
  id: string;
  question_en: string;
  question_es: string;
  answer_en: string;
  answer_es: string;
  category: string;
  is_active: boolean;
  sort_order: number;
}

interface RetreatItem {
  id: string;
  title_en: string;
  title_es: string;
  subtitle_en: string | null;
  subtitle_es: string | null;
  description_en: string | null;
  description_es: string | null;
  price_cop: number;
  price_usd: number;
  price_unit: string;
  is_active: boolean;
  sort_order: number;
}

type ContentItem = TeacherItem | ServiceItem | FAQItem | RetreatItem;

const TAB_CONFIG: { key: ContentTab; label: string }[] = [
  { key: "teachers", label: "Equipo" },
  { key: "services", label: "Servicios" },
  { key: "faq", label: "FAQ" },
  { key: "retreats", label: "Retiros" },
];

function formatCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminContenidoPage() {
  const [tab, setTab] = useState<ContentTab>("teachers");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  function showMsg(msg: string, type: "success" | "error" = "success") {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 4000);
  }

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cms?type=${tab}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || []);
      } else if (res.status === 401) {
        showMsg("No autorizado", "error");
      }
    } catch {
      showMsg("Error cargando contenido", "error");
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    loadItems();
    setEditItem(null);
    setShowCreate(false);
  }, [loadItems]);

  async function handleToggle(id: string) {
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", type: tab, id }),
      });
      if (res.ok) {
        await loadItems();
      } else {
        const d = await res.json();
        showMsg(d.error || "Error", "error");
      }
    } catch {
      showMsg("Error de conexion", "error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar permanentemente?")) return;
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", type: tab, id }),
      });
      if (res.ok) {
        showMsg("Eliminado");
        await loadItems();
      } else {
        const d = await res.json();
        showMsg(d.error || "Error", "error");
      }
    } catch {
      showMsg("Error de conexion", "error");
    }
  }

  async function handleSave(fields: Record<string, unknown>, isEdit: boolean) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isEdit ? "update" : "create",
          type: tab,
          ...fields,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        showMsg(isEdit ? "Actualizado" : "Creado");
        setEditItem(null);
        setShowCreate(false);
        await loadItems();
      } else {
        showMsg(d.error || "Error", "error");
      }
    } catch {
      showMsg("Error de conexion", "error");
    }
    setActionLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {message && (
        <div className={`fixed top-4 left-4 right-4 z-50 text-white text-sm px-4 py-3 text-center md:left-auto md:right-4 md:max-w-sm ${messageType === "error" ? "bg-red-500" : "bg-[#2C2C2C]"}`}>
          {message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl text-[#2C2C2C]" style={{ fontFamily: "Cormorant Garamond, serif" }}>
          Contenido
        </h1>
        <button
          onClick={() => { setShowCreate(!showCreate); setEditItem(null); }}
          className="text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-[#2C2C2C] text-white hover:bg-[#B87777] transition-colors"
        >
          {showCreate ? "Cerrar" : "+ Nuevo"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TAB_CONFIG.map((t) => (
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

      {/* Create/Edit form */}
      {(showCreate || editItem) && (
        <ContentForm
          tab={tab}
          item={editItem}
          onSave={handleSave}
          onCancel={() => { setEditItem(null); setShowCreate(false); }}
          saving={actionLoading}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">No hay contenido</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>

          {tab === "teachers" && (items as TeacherItem[]).map((t) => (
            <ItemCard key={t.id} active={t.is_active}
              title={t.name}
              subtitle={t.role_es}
              meta={t.specialties.join(", ")}
              badge={t.is_lead ? "Principal" : undefined}
              onEdit={() => { setEditItem(t); setShowCreate(false); }}
              onToggle={() => handleToggle(t.id)}
              onDelete={() => handleDelete(t.id)}
            />
          ))}

          {tab === "services" && (items as ServiceItem[]).map((s) => (
            <ItemCard key={s.id} active={s.is_active}
              title={s.name_es}
              subtitle={s.name_en}
              meta={`${formatCOP(s.price_cop)} / $${s.price_usd} USD · ${s.duration}`}
              onEdit={() => { setEditItem(s); setShowCreate(false); }}
              onToggle={() => handleToggle(s.id)}
              onDelete={() => handleDelete(s.id)}
            />
          ))}

          {tab === "faq" && (items as FAQItem[]).map((f) => (
            <ItemCard key={f.id} active={f.is_active}
              title={f.question_es}
              subtitle={f.question_en}
              meta={f.category}
              onEdit={() => { setEditItem(f); setShowCreate(false); }}
              onToggle={() => handleToggle(f.id)}
              onDelete={() => handleDelete(f.id)}
            />
          ))}

          {tab === "retreats" && (items as RetreatItem[]).map((r) => (
            <ItemCard key={r.id} active={r.is_active}
              title={r.title_es}
              subtitle={r.title_en}
              meta={`${formatCOP(r.price_cop)} / $${r.price_usd} USD (${r.price_unit})`}
              onEdit={() => { setEditItem(r); setShowCreate(false); }}
              onToggle={() => handleToggle(r.id)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item Card
// ---------------------------------------------------------------------------

function ItemCard({ active, title, subtitle, meta, badge, onEdit, onToggle, onDelete }: {
  active: boolean; title: string; subtitle: string; meta: string; badge?: string;
  onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  return (
    <div className={`bg-white border p-4 ${active ? "border-[#B87777]/15" : "border-[#2C2C2C]/5 opacity-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[#2C2C2C] truncate">{title}</p>
            {badge && <span className="text-[8px] tracking-wider uppercase px-2 py-0.5 text-[#C9A96E] bg-[#C9A96E]/10">{badge}</span>}
          </div>
          <p className="text-[10px] text-[#2C2C2C]/40 truncate">{subtitle}</p>
          <p className="text-[9px] text-[#2C2C2C]/20 mt-1">{meta}</p>
        </div>
        <div className="flex flex-col gap-1.5 items-end shrink-0">
          <button onClick={onEdit} className="text-[9px] text-blue-400 hover:text-blue-600 transition-colors">editar</button>
          <button onClick={onToggle} className="text-[9px] text-amber-400 hover:text-amber-600 transition-colors">
            {active ? "desactivar" : "activar"}
          </button>
          <button onClick={onDelete} className="text-[9px] text-red-300 hover:text-red-500 transition-colors">eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content Form — adapts fields based on tab
// ---------------------------------------------------------------------------

function ContentForm({ tab, item, onSave, onCancel, saving }: {
  tab: ContentTab;
  item: ContentItem | null;
  onSave: (fields: Record<string, unknown>, isEdit: boolean) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(item)) {
        flat[k] = Array.isArray(v) ? v.join(", ") : String(v ?? "");
      }
      setForm(flat);
    } else {
      setForm({});
    }
  }, [item]);

  function f(key: string) { return form[key] || ""; }
  function set(key: string, val: string) { setForm(prev => ({ ...prev, [key]: val })); }

  function handleSubmit() {
    const fields: Record<string, unknown> = {};
    if (item) fields.id = (item as { id: string }).id;

    if (tab === "teachers") {
      fields.name = f("name");
      fields.role_en = f("role_en");
      fields.role_es = f("role_es");
      fields.bio_en = f("bio_en");
      fields.bio_es = f("bio_es");
      fields.image_url = f("image_url") || "/practice-2.jpg";
      fields.specialties = f("specialties").split(",").map(s => s.trim()).filter(Boolean);
      fields.is_lead = f("is_lead") === "true";
      fields.sort_order = parseInt(f("sort_order") || "0", 10);
    } else if (tab === "services") {
      fields.name_en = f("name_en");
      fields.name_es = f("name_es");
      fields.description_en = f("description_en") || null;
      fields.description_es = f("description_es") || null;
      fields.price_cop = parseInt(f("price_cop") || "0", 10);
      fields.price_usd = parseInt(f("price_usd") || "0", 10);
      fields.duration = f("duration") || "60 min";
      fields.sort_order = parseInt(f("sort_order") || "0", 10);
    } else if (tab === "faq") {
      fields.question_en = f("question_en");
      fields.question_es = f("question_es");
      fields.answer_en = f("answer_en");
      fields.answer_es = f("answer_es");
      fields.category = f("category") || "general";
      fields.sort_order = parseInt(f("sort_order") || "0", 10);
    } else if (tab === "retreats") {
      fields.title_en = f("title_en");
      fields.title_es = f("title_es");
      fields.subtitle_en = f("subtitle_en") || null;
      fields.subtitle_es = f("subtitle_es") || null;
      fields.description_en = f("description_en") || null;
      fields.description_es = f("description_es") || null;
      fields.price_cop = parseInt(f("price_cop") || "0", 10);
      fields.price_usd = parseInt(f("price_usd") || "0", 10);
      fields.price_unit = f("price_unit") || "total";
      fields.sort_order = parseInt(f("sort_order") || "0", 10);
    }

    onSave(fields, !!item);
  }

  const inputClass = "w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]";
  const labelClass = "block text-[10px] text-[#2C2C2C]/40 mb-1";

  return (
    <div className="bg-white border border-[#C9A96E]/20 p-4 space-y-3">
      <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase">
        {item ? "Editar" : "Crear"} — {TAB_CONFIG.find(t => t.key === tab)?.label}
      </p>

      {tab === "teachers" && (
        <>
          <Field label="Nombre" value={f("name")} onChange={v => set("name", v)} cls={inputClass} lcls={labelClass} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rol (EN)" value={f("role_en")} onChange={v => set("role_en", v)} cls={inputClass} lcls={labelClass} />
            <Field label="Rol (ES)" value={f("role_es")} onChange={v => set("role_es", v)} cls={inputClass} lcls={labelClass} />
          </div>
          <TextArea label="Bio (ES)" value={f("bio_es")} onChange={v => set("bio_es", v)} cls={inputClass} lcls={labelClass} />
          <TextArea label="Bio (EN)" value={f("bio_en")} onChange={v => set("bio_en", v)} cls={inputClass} lcls={labelClass} />
          <Field label="Imagen URL" value={f("image_url")} onChange={v => set("image_url", v)} cls={inputClass} lcls={labelClass} placeholder="/teacher-name.png" />
          <Field label="Especialidades (separar con coma)" value={f("specialties")} onChange={v => set("specialties", v)} cls={inputClass} lcls={labelClass} placeholder="Yoga, Meditation, Reiki" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Principal</label>
              <select value={f("is_lead")} onChange={e => set("is_lead", e.target.value)} className={inputClass}>
                <option value="false">No</option>
                <option value="true">Si</option>
              </select>
            </div>
            <Field label="Orden" value={f("sort_order")} onChange={v => set("sort_order", v)} cls={inputClass} lcls={labelClass} type="number" />
          </div>
        </>
      )}

      {tab === "services" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre (EN)" value={f("name_en")} onChange={v => set("name_en", v)} cls={inputClass} lcls={labelClass} />
            <Field label="Nombre (ES)" value={f("name_es")} onChange={v => set("name_es", v)} cls={inputClass} lcls={labelClass} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Precio COP" value={f("price_cop")} onChange={v => set("price_cop", v)} cls={inputClass} lcls={labelClass} type="number" />
            <Field label="Precio USD" value={f("price_usd")} onChange={v => set("price_usd", v)} cls={inputClass} lcls={labelClass} type="number" />
            <Field label="Duracion" value={f("duration")} onChange={v => set("duration", v)} cls={inputClass} lcls={labelClass} placeholder="60 min" />
          </div>
          <TextArea label="Descripcion (ES)" value={f("description_es")} onChange={v => set("description_es", v)} cls={inputClass} lcls={labelClass} />
          <TextArea label="Description (EN)" value={f("description_en")} onChange={v => set("description_en", v)} cls={inputClass} lcls={labelClass} />
          <Field label="Orden" value={f("sort_order")} onChange={v => set("sort_order", v)} cls={inputClass} lcls={labelClass} type="number" />
        </>
      )}

      {tab === "faq" && (
        <>
          <Field label="Pregunta (ES)" value={f("question_es")} onChange={v => set("question_es", v)} cls={inputClass} lcls={labelClass} />
          <Field label="Question (EN)" value={f("question_en")} onChange={v => set("question_en", v)} cls={inputClass} lcls={labelClass} />
          <TextArea label="Respuesta (ES)" value={f("answer_es")} onChange={v => set("answer_es", v)} cls={inputClass} lcls={labelClass} rows={3} />
          <TextArea label="Answer (EN)" value={f("answer_en")} onChange={v => set("answer_en", v)} cls={inputClass} lcls={labelClass} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Categoria</label>
              <select value={f("category")} onChange={e => set("category", e.target.value)} className={inputClass}>
                <option value="booking">Reservas</option>
                <option value="classes">Clases</option>
                <option value="pricing">Precios</option>
                <option value="payment">Pagos</option>
                <option value="location">Ubicacion</option>
                <option value="private">Privadas</option>
                <option value="general">General</option>
              </select>
            </div>
            <Field label="Orden" value={f("sort_order")} onChange={v => set("sort_order", v)} cls={inputClass} lcls={labelClass} type="number" />
          </div>
        </>
      )}

      {tab === "retreats" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Titulo (EN)" value={f("title_en")} onChange={v => set("title_en", v)} cls={inputClass} lcls={labelClass} />
            <Field label="Titulo (ES)" value={f("title_es")} onChange={v => set("title_es", v)} cls={inputClass} lcls={labelClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Subtitulo (EN)" value={f("subtitle_en")} onChange={v => set("subtitle_en", v)} cls={inputClass} lcls={labelClass} />
            <Field label="Subtitulo (ES)" value={f("subtitle_es")} onChange={v => set("subtitle_es", v)} cls={inputClass} lcls={labelClass} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Precio COP" value={f("price_cop")} onChange={v => set("price_cop", v)} cls={inputClass} lcls={labelClass} type="number" />
            <Field label="Precio USD" value={f("price_usd")} onChange={v => set("price_usd", v)} cls={inputClass} lcls={labelClass} type="number" />
            <Field label="Unidad" value={f("price_unit")} onChange={v => set("price_unit", v)} cls={inputClass} lcls={labelClass} placeholder="total / per hour" />
          </div>
          <TextArea label="Descripcion (ES)" value={f("description_es")} onChange={v => set("description_es", v)} cls={inputClass} lcls={labelClass} />
          <TextArea label="Description (EN)" value={f("description_en")} onChange={v => set("description_en", v)} cls={inputClass} lcls={labelClass} />
          <Field label="Orden" value={f("sort_order")} onChange={v => set("sort_order", v)} cls={inputClass} lcls={labelClass} type="number" />
        </>
      )}

      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={saving}
          className="flex-1 py-2 bg-[#C9A96E] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30">
          {saving ? "Guardando..." : item ? "Guardar" : "Crear"}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 border border-[#2C2C2C]/10 text-[10px] tracking-[0.15em] uppercase text-[#2C2C2C]/40 hover:text-[#2C2C2C] transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

function Field({ label, value, onChange, cls, lcls, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; cls: string; lcls: string; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className={lcls}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
    </div>
  );
}

function TextArea({ label, value, onChange, cls, lcls, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; cls: string; lcls: string; rows?: number;
}) {
  return (
    <div>
      <label className={lcls}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} className={`${cls} resize-none`} />
    </div>
  );
}
