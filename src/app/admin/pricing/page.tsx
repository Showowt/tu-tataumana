"use client";

import { useEffect, useState, useCallback } from "react";

interface PricingCard {
  id: string;
  label: string;
  label_es: string | null;
  subtitle_en: string | null;
  subtitle_es: string | null;
  price_cop: number;
  price_usd: number;
  pack_type: string | null;
  highlight: boolean;
  category: string;
  sort_order: number;
  is_active: boolean;
}

type EditField = "label" | "label_es" | "subtitle_en" | "subtitle_es" | "price_cop" | "price_usd" | "pack_type" | "sort_order" | "category";

const CATEGORIES = [
  { value: "group", label: "Clase grupal" },
  { value: "pack", label: "Pack" },
  { value: "promo", label: "Promo" },
  { value: "private", label: "Privada" },
];

function formatCOP(n: number): string {
  return "$" + n.toLocaleString("es-CO");
}

export default function AdminPricingPage() {
  const [cards, setCards] = useState<PricingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PricingCard>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newCard, setNewCard] = useState({
    label: "",
    label_es: "",
    subtitle_en: "",
    subtitle_es: "",
    price_cop: 0,
    price_usd: 0,
    pack_type: "",
    category: "group",
    sort_order: 50,
  });

  function showMsg(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pricing");
      const json = await res.json();
      setCards(json.data || []);
    } catch {
      showMsg("Error cargando precios");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  function startEdit(card: PricingCard) {
    setEditingId(card.id);
    setEditData({ ...card });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({});
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editData }),
      });
      if (!res.ok) {
        const d = await res.json();
        showMsg(d.error || "Error");
      } else {
        showMsg("Actualizado");
        cancelEdit();
        await loadCards();
      }
    } catch {
      showMsg("Error de conexion");
    }
  }

  async function toggleActive(card: PricingCard) {
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, is_active: !card.is_active }),
      });
      if (res.ok) {
        showMsg(card.is_active ? "Desactivado" : "Activado");
        await loadCards();
      }
    } catch {
      showMsg("Error");
    }
  }

  async function toggleHighlight(card: PricingCard) {
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, highlight: !card.highlight }),
      });
      if (res.ok) {
        await loadCards();
      }
    } catch {
      showMsg("Error");
    }
  }

  async function createCard() {
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCard),
      });
      if (!res.ok) {
        const d = await res.json();
        showMsg(d.error || "Error");
      } else {
        showMsg("Creado");
        setShowCreate(false);
        setNewCard({ label: "", label_es: "", subtitle_en: "", subtitle_es: "", price_cop: 0, price_usd: 0, pack_type: "", category: "group", sort_order: 50 });
        await loadCards();
      }
    } catch {
      showMsg("Error de conexion");
    }
  }

  function editField(field: EditField, value: string | number) {
    setEditData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {message && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#2C2C2C] text-white text-sm px-4 py-3 text-center md:left-auto md:right-4 md:max-w-sm">
          {message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl text-[#2C2C2C]" style={{ fontFamily: "Cormorant Garamond, serif" }}>
          Precios
        </h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-[#2C2C2C] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors"
        >
          {showCreate ? "Cancelar" : "+ Nuevo"}
        </button>
      </div>

      <p className="text-[10px] text-[#2C2C2C]/40 tracking-wider">
        Estos precios aparecen en la pagina publica. Cambios se reflejan en 5 minutos.
      </p>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-[#B87777]/20 p-4 space-y-3">
          <p className="text-[10px] tracking-[0.2em] text-[#B87777] uppercase">Nuevo precio</p>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Label (EN)" value={newCard.label} onChange={(e) => setNewCard({ ...newCard, label: e.target.value })} className="px-3 py-2 border border-[#2C2C2C]/10 text-sm" />
            <input placeholder="Label (ES)" value={newCard.label_es} onChange={(e) => setNewCard({ ...newCard, label_es: e.target.value })} className="px-3 py-2 border border-[#2C2C2C]/10 text-sm" />
            <input placeholder="Subtitulo (EN)" value={newCard.subtitle_en} onChange={(e) => setNewCard({ ...newCard, subtitle_en: e.target.value })} className="px-3 py-2 border border-[#2C2C2C]/10 text-sm" />
            <input placeholder="Subtitulo (ES)" value={newCard.subtitle_es} onChange={(e) => setNewCard({ ...newCard, subtitle_es: e.target.value })} className="px-3 py-2 border border-[#2C2C2C]/10 text-sm" />
            <input placeholder="Precio COP" type="number" value={newCard.price_cop || ""} onChange={(e) => setNewCard({ ...newCard, price_cop: parseInt(e.target.value) || 0 })} className="px-3 py-2 border border-[#2C2C2C]/10 text-sm" />
            <input placeholder="Precio USD" type="number" value={newCard.price_usd || ""} onChange={(e) => setNewCard({ ...newCard, price_usd: parseInt(e.target.value) || 0 })} className="px-3 py-2 border border-[#2C2C2C]/10 text-sm" />
            <select value={newCard.category} onChange={(e) => setNewCard({ ...newCard, category: e.target.value })} className="px-3 py-2 border border-[#2C2C2C]/10 text-sm">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input placeholder="Orden" type="number" value={newCard.sort_order} onChange={(e) => setNewCard({ ...newCard, sort_order: parseInt(e.target.value) || 0 })} className="px-3 py-2 border border-[#2C2C2C]/10 text-sm" />
          </div>
          <button onClick={createCard} className="w-full py-2 bg-[#B87777] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#2C2C2C] transition-colors">
            Crear
          </button>
        </div>
      )}

      {/* Cards list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`bg-white border p-4 transition-all ${
                !card.is_active ? "opacity-40 border-[#2C2C2C]/5" :
                card.highlight ? "border-[#B87777]/30" : "border-[#2C2C2C]/10"
              }`}
            >
              {editingId === card.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editData.label || ""} onChange={(e) => editField("label", e.target.value)} placeholder="Label" className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm" />
                    <input value={editData.label_es || ""} onChange={(e) => editField("label_es", e.target.value)} placeholder="Label ES" className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm" />
                    <input value={editData.subtitle_en || ""} onChange={(e) => editField("subtitle_en", e.target.value)} placeholder="Subtitulo EN" className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm" />
                    <input value={editData.subtitle_es || ""} onChange={(e) => editField("subtitle_es", e.target.value)} placeholder="Subtitulo ES" className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm" />
                    <input type="number" value={editData.price_cop || ""} onChange={(e) => editField("price_cop", parseInt(e.target.value) || 0)} placeholder="COP" className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm" />
                    <input type="number" value={editData.price_usd || ""} onChange={(e) => editField("price_usd", parseInt(e.target.value) || 0)} placeholder="USD" className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm" />
                    <select value={editData.category || "group"} onChange={(e) => editField("category", e.target.value)} className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm">
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <input type="number" value={editData.sort_order ?? ""} onChange={(e) => editField("sort_order", parseInt(e.target.value) || 0)} placeholder="Orden" className="px-2 py-1.5 border border-[#2C2C2C]/10 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex-1 py-1.5 bg-[#2C2C2C] text-white text-[10px] tracking-[0.1em] uppercase">Guardar</button>
                    <button onClick={cancelEdit} className="flex-1 py-1.5 border border-[#2C2C2C]/10 text-[#2C2C2C]/40 text-[10px] tracking-[0.1em] uppercase">Cancelar</button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#2C2C2C] truncate">{card.label}</p>
                      {card.highlight && <span className="text-[8px] px-1.5 py-0.5 bg-[#B87777]/10 text-[#B87777] uppercase">destacado</span>}
                      <span className="text-[8px] px-1.5 py-0.5 bg-[#2C2C2C]/5 text-[#2C2C2C]/40 uppercase">{card.category}</span>
                    </div>
                    <p className="text-xs text-[#2C2C2C]/50 mt-0.5">
                      {formatCOP(card.price_cop)} COP / ${card.price_usd} USD
                      {card.subtitle_es && <span className="text-[#2C2C2C]/30"> · {card.subtitle_es}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleHighlight(card)} className={`text-[9px] px-2 py-1 border transition-colors ${card.highlight ? "border-[#B87777] text-[#B87777]" : "border-[#2C2C2C]/10 text-[#2C2C2C]/20 hover:text-[#B87777]"}`} title="Destacar">
                      {card.highlight ? "★" : "☆"}
                    </button>
                    <button onClick={() => startEdit(card)} className="text-[9px] text-[#C9A96E] hover:text-[#B87777] transition-colors">
                      editar
                    </button>
                    <button onClick={() => toggleActive(card)} className={`text-[9px] transition-colors ${card.is_active ? "text-green-500 hover:text-red-400" : "text-red-400 hover:text-green-500"}`}>
                      {card.is_active ? "activo" : "inactivo"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
