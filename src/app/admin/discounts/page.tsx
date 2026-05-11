"use client";

import { useEffect, useState, useCallback } from "react";

interface DiscountData {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string;
  valid_until: string | null;
  one_time_per_student: boolean;
  specific_student_id: string | null;
  active: boolean;
  created_by: string;
  created_at: string;
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<"percentage" | "fixed">("percentage");
  const [newValue, setNewValue] = useState("");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [newValidDays, setNewValidDays] = useState("");
  const [newOneTime, setNewOneTime] = useState(false);
  const [creating, setCreating] = useState(false);

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  const loadDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/discounts");
      if (res.ok) {
        const data = await res.json();
        setDiscounts(data.data || []);
      } else {
        showMessage("Error cargando descuentos");
      }
    } catch {
      showMessage("Error de conexion");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDiscounts();
  }, [loadDiscounts]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim() || !newValue) return;

    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        code: newCode.trim().toUpperCase(),
        discount_type: newType,
        discount_value: Number(newValue),
        one_time_per_student: newOneTime,
      };
      if (newMaxUses) body.max_uses = Number(newMaxUses);
      if (newValidDays) body.valid_days = Number(newValidDays);

      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        showMessage(data.error || "Error creando descuento");
      } else {
        showMessage("Descuento creado");
        setNewCode("");
        setNewType("percentage");
        setNewValue("");
        setNewMaxUses("");
        setNewValidDays("");
        setNewOneTime(false);
        setShowCreate(false);
        await loadDiscounts();
      }
    } catch {
      showMessage("Error de conexion");
    }
    setCreating(false);
  }

  async function toggleActive(discount: DiscountData) {
    setToggling(discount.id);
    try {
      const res = await fetch("/api/admin/discounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: discount.id, active: !discount.active }),
      });
      if (res.ok) {
        showMessage(discount.active ? "Descuento desactivado" : "Descuento activado");
        await loadDiscounts();
      } else {
        showMessage("Error actualizando descuento");
      }
    } catch {
      showMessage("Error de conexion");
    }
    setToggling(null);
  }

  function formatDiscountValue(d: DiscountData): string {
    if (d.discount_type === "percentage") return `${d.discount_value}%`;
    return formatCOP(d.discount_value);
  }

  function formatExpiry(d: DiscountData): string {
    if (!d.valid_until) return "\u221e";
    return new Date(d.valid_until).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Toast */}
      {message && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#2C2C2C] text-white text-sm px-4 py-3 text-center md:left-auto md:right-4 md:max-w-sm">
          {message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl text-[#2C2C2C]"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          Descuentos
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
        <form
          onSubmit={handleCreate}
          className="bg-white border border-[#C9A96E]/20 p-4 space-y-3"
        >
          <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase">
            Crear Descuento
          </p>

          {/* Code */}
          <div>
            <label className="text-[9px] tracking-[0.1em] text-[#2C2C2C]/40 uppercase block mb-1">
              Codigo
            </label>
            <input
              type="text"
              placeholder="BIENVENIDA20"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              required
              className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E] uppercase"
            />
          </div>

          {/* Type + Value row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[9px] tracking-[0.1em] text-[#2C2C2C]/40 uppercase block mb-1">
                Tipo
              </label>
              <select
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as "percentage" | "fixed")
                }
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Fijo (COP)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[9px] tracking-[0.1em] text-[#2C2C2C]/40 uppercase block mb-1">
                {newType === "percentage" ? "Porcentaje" : "Valor COP"}
              </label>
              <input
                type="number"
                placeholder={newType === "percentage" ? "20" : "50000"}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                required
                min={0}
                max={newType === "percentage" ? 100 : undefined}
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
              />
            </div>
          </div>

          {/* Max uses + Valid days row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[9px] tracking-[0.1em] text-[#2C2C2C]/40 uppercase block mb-1">
                Usos maximos (opcional)
              </label>
              <input
                type="number"
                placeholder="Sin limite"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                min={1}
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] tracking-[0.1em] text-[#2C2C2C]/40 uppercase block mb-1">
                Valido por dias (opcional)
              </label>
              <input
                type="number"
                placeholder="Sin vencimiento"
                value={newValidDays}
                onChange={(e) => setNewValidDays(e.target.value)}
                min={1}
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
              />
            </div>
          </div>

          {/* One-time per student */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-4 h-4 border flex items-center justify-center transition-colors ${
                newOneTime
                  ? "bg-[#C9A96E] border-[#C9A96E]"
                  : "border-[#2C2C2C]/20 group-hover:border-[#C9A96E]"
              }`}
              onClick={() => setNewOneTime(!newOneTime)}
            >
              {newOneTime && (
                <svg
                  className="w-2.5 h-2.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              )}
            </div>
            <span className="text-xs text-[#2C2C2C]/60">
              Un solo uso por alumna
            </span>
          </label>

          <button
            type="submit"
            disabled={creating}
            className="w-full py-2 bg-[#C9A96E] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30"
          >
            {creating ? "Creando..." : "Crear Descuento"}
          </button>
        </form>
      )}

      {/* Discounts list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : discounts.length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">
            No hay codigos de descuento creados
          </p>
          <p className="text-[10px] text-[#2C2C2C]/25 mt-1">
            Crea tu primer codigo con el boton &quot;+ Nuevo&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
            {discounts.length}{" "}
            {discounts.length === 1 ? "descuento" : "descuentos"}
          </p>

          {discounts.map((d) => (
            <div
              key={d.id}
              className={`bg-white border p-4 transition-colors ${
                d.active
                  ? "border-[#2C2C2C]/5"
                  : "border-[#2C2C2C]/5 opacity-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Code name + status badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <p
                      className="text-sm font-medium text-[#2C2C2C] tracking-wider uppercase"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {d.code}
                    </p>
                    <span
                      className={`text-[8px] tracking-wider px-2 py-0.5 uppercase shrink-0 ${
                        d.active
                          ? "text-green-700 bg-green-100"
                          : "text-[#2C2C2C]/40 bg-[#2C2C2C]/5"
                      }`}
                    >
                      {d.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  {/* Type + value */}
                  <p className="text-xs text-[#B87777]">
                    {formatDiscountValue(d)}
                    {d.discount_type === "percentage"
                      ? " de descuento"
                      : " COP de descuento"}
                  </p>

                  {/* Uses + one-time */}
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[10px] text-[#2C2C2C]/40">
                      Usos:{" "}
                      <span className="text-[#2C2C2C]/70">
                        {d.uses_count}/{d.max_uses ?? "\u221e"}
                      </span>
                    </p>
                    {d.one_time_per_student && (
                      <p className="text-[10px] text-[#C9A96E]">
                        1x por alumna
                      </p>
                    )}
                  </div>
                </div>

                {/* Right column: expiry + toggle */}
                <div className="text-right shrink-0 space-y-2">
                  <div>
                    <p className="text-[9px] text-[#2C2C2C]/20 uppercase tracking-wider">
                      Vence
                    </p>
                    <p className="text-[10px] text-[#2C2C2C]/50">
                      {formatExpiry(d)}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActive(d)}
                    disabled={toggling === d.id}
                    className={`text-[9px] tracking-[0.1em] uppercase px-3 py-1 border transition-colors disabled:opacity-30 ${
                      d.active
                        ? "border-[#2C2C2C]/10 text-[#2C2C2C]/40 hover:border-red-300 hover:text-red-500"
                        : "border-[#C9A96E]/30 text-[#C9A96E] hover:bg-[#C9A96E] hover:text-white"
                    }`}
                  >
                    {toggling === d.id
                      ? "..."
                      : d.active
                        ? "Desactivar"
                        : "Activar"}
                  </button>
                </div>
              </div>

              {/* Created date */}
              <p className="text-[9px] text-[#2C2C2C]/20 mt-3 pt-2 border-t border-[#2C2C2C]/5">
                Creado{" "}
                {new Date(d.created_at).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
