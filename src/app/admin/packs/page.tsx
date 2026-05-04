"use client";

import { useEffect, useState, useCallback } from "react";
import { PACK_DEFINITIONS } from "@/lib/constants/packs";

interface PackStudent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

interface PackData {
  id: string;
  student_id: string;
  pack_type: string;
  total_classes: number;
  classes_used: number;
  classes_remaining: number;
  status: string;
  price_paid: number;
  currency: string;
  expires_at: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  student: PackStudent;
}

interface StudentSearchResult {
  id: string;
  full_name: string;
  email: string;
}

export default function AdminPacksPage() {
  const [packs, setPacks] = useState<PackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [message, setMessage] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [packType, setPackType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [creating, setCreating] = useState(false);

  const loadPacks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/pack?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPacks(data.data || []);
      }
    } catch {
      // fail silently
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  // Student search for pack creation
  useEffect(() => {
    if (studentSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/students?search=${encodeURIComponent(studentSearch.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(
            (data.data || []).map((s: StudentSearchResult) => ({
              id: s.id,
              full_name: s.full_name,
              email: s.email,
            })),
          );
        }
      } catch {
        // fail silently
      }
    }, 300);
    return () => clearTimeout(t);
  }, [studentSearch]);

  async function handleCreate() {
    if (!selectedStudent || !packType) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          pack_type: packType,
          payment_method: paymentMethod || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error creando pack");
      } else {
        showMessage("Pack creado");
        setSelectedStudent(null);
        setStudentSearch("");
        setPackType("");
        setPaymentMethod("");
        setShowCreate(false);
        await loadPacks();
      }
    } catch {
      showMessage("Error de conexión");
    }
    setCreating(false);
  }

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  function formatCOP(amount: number): string {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Toast */}
      {message && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#2C2C2C] text-white text-sm px-4 py-3 text-center md:left-auto md:right-4 md:max-w-sm">
          {message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1
          className="text-2xl text-[#2C2C2C]"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          Packs
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
            Crear Pack
          </p>

          {/* Student selector */}
          {selectedStudent ? (
            <div className="flex items-center justify-between bg-[#B87777]/5 border border-[#B87777]/20 px-3 py-2">
              <div>
                <p className="text-sm text-[#2C2C2C]">
                  {selectedStudent.full_name}
                </p>
                <p className="text-[10px] text-[#2C2C2C]/40">
                  {selectedStudent.email}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setStudentSearch("");
                }}
                className="text-xs text-red-400 hover:text-red-600"
              >
                cambiar
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar alumno por nombre o email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-[#2C2C2C]/10 border-t-0 z-10 max-h-40 overflow-y-auto">
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStudent(s);
                        setSearchResults([]);
                        setStudentSearch("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#FAF8F5] transition-colors"
                    >
                      <p className="text-sm text-[#2C2C2C]">{s.full_name}</p>
                      <p className="text-[10px] text-[#2C2C2C]/30">
                        {s.email}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pack type */}
          <select
            value={packType}
            onChange={(e) => setPackType(e.target.value)}
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
          >
            <option value="">Tipo de pack</option>
            {PACK_DEFINITIONS.filter((p) => p.isActive).map((p) => (
              <option key={p.type} value={p.type}>
                {p.name.es} —{" "}
                {p.totalClasses === -1
                  ? "Ilimitado"
                  : `${p.totalClasses} clases`}{" "}
                — {formatCOP(p.priceCop)}
              </option>
            ))}
          </select>

          {/* Payment method */}
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
          >
            <option value="">Método de pago</option>
            <option value="wompi">Wompi (Tarjeta)</option>
            <option value="nequi">Nequi</option>
            <option value="bancolombia">Bancolombia</option>
            <option value="zelle">Zelle / PayPal</option>
            <option value="cash">Efectivo</option>
          </select>

          <button
            onClick={handleCreate}
            disabled={!selectedStudent || !packType || creating}
            className="w-full py-2 bg-[#C9A96E] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30"
          >
            {creating ? "Creando..." : "Crear Pack"}
          </button>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2">
        {(["active", "all", "expired", "exhausted"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-[10px] tracking-[0.15em] uppercase px-4 py-1.5 border transition-colors ${
              statusFilter === s
                ? "bg-[#2C2C2C] text-white border-[#2C2C2C]"
                : "text-[#2C2C2C]/40 border-[#2C2C2C]/10 hover:border-[#2C2C2C]/30"
            }`}
          >
            {s === "active"
              ? "Activos"
              : s === "all"
                ? "Todos"
                : s === "expired"
                  ? "Expirados"
                  : "Agotados"}
          </button>
        ))}
      </div>

      {/* Packs list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : packs.length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">No hay packs</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
            {packs.length} {packs.length === 1 ? "pack" : "packs"}
          </p>
          {packs.map((p) => {
            const isUnlimited = p.total_classes === -1;
            const expiresDate = new Date(p.expires_at);
            const daysLeft = Math.ceil(
              (expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );

            const statusColors: Record<string, string> = {
              active: "text-green-600 bg-green-50",
              expired: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5",
              exhausted: "text-amber-500 bg-amber-50",
              cancelled: "text-red-400 bg-red-50",
            };

            return (
              <div
                key={p.id}
                className={`bg-white border p-4 ${
                  p.status === "active"
                    ? "border-[#B87777]/20"
                    : "border-[#2C2C2C]/5 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2C2C2C] truncate">
                      {p.student?.full_name || "—"}
                    </p>
                    <p className="text-[10px] text-[#2C2C2C]/40 truncate">
                      {p.student?.email || ""}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#2C2C2C]/60">
                        {p.pack_type.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-[8px] tracking-wider uppercase px-2 py-0.5 ${statusColors[p.status] || "text-[#2C2C2C]/30"}`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#2C2C2C]/20 mt-1">
                      {formatCOP(p.price_paid)} ·{" "}
                      {p.payment_method || "—"} ·{" "}
                      {daysLeft > 0
                        ? `${daysLeft}d restantes`
                        : "expirado"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className="text-2xl text-[#B87777]"
                      style={{ fontFamily: "Cormorant Garamond, serif" }}
                    >
                      {isUnlimited ? "∞" : p.classes_remaining}
                    </p>
                    <p className="text-[9px] text-[#2C2C2C]/30">
                      {isUnlimited
                        ? "ilimitado"
                        : `${p.classes_used}/${p.total_classes}`}
                    </p>
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
