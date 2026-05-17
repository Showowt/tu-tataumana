"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  PACK_DEFINITIONS,
  type PackDefinition,
} from "@/lib/constants/packs";

/* ---------- Types ---------- */

interface StudentDetail {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  preferred_lang: "en" | "es";
  role: string;
  notes: string | null;
  emergency_contact: string | null;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

interface PackRecord {
  id: string;
  pack_type: string;
  total_classes: number;
  classes_used: number;
  classes_remaining: number;
  price_paid: number;
  currency: string;
  status: string;
  expires_at: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

interface TransactionRecord {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  description: string | null;
  created_at: string;
}

interface SessionData {
  id: string;
  session_date: string;
  start_time: string;
  teacher: string;
  capacity: number;
  enrolled: number;
  status: string;
  definition: {
    name: string;
    name_es: string;
  } | null;
}

type TabKey = "info" | "packs" | "add-pack" | "book";

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "nequi", label: "Nequi" },
  { value: "bancolombia", label: "Bancolombia" },
  { value: "zelle", label: "Zelle" },
  { value: "wompi", label: "Wompi" },
  { value: "comp", label: "Cortesia" },
] as const;

type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];
type DiscountType = "percentage" | "fixed" | "comp";

/* ---------- Component ---------- */

export default function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [packs, setPacks] = useState<PackRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("info");
  const [message, setMessage] = useState("");

  // Add Pack form state
  const [packType, setPackType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>("cash");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [currency, setCurrency] = useState<"COP" | "USD">("COP");
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Login link + edit state
  const [generatingLink, setGeneratingLink] = useState(false);
  const [loginLink, setLoginLink] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Book on behalf
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [bookingSessionId, setBookingSessionId] = useState("");
  const [bookingInProgress, setBookingInProgress] = useState(false);

  /* ---------- Data fetching ---------- */

  const loadStudent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/admin/students");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await res.json();
      setStudent(data.student);
      setPacks(data.packs || []);
      setTransactions(data.transactions || []);
    } catch {
      showToast("Error cargando alumno");
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  /* ---------- Auto-fill price when pack type changes ---------- */

  useEffect(() => {
    if (!packType) {
      setAmountPaid(0);
      return;
    }
    const def = PACK_DEFINITIONS.find((p) => p.type === packType);
    if (def) {
      setAmountPaid(currency === "USD" ? def.priceUsd : def.priceCop);
    }
  }, [packType, currency]);

  /* ---------- Handlers ---------- */

  function showToast(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  function getSelectedPackDef(): PackDefinition | undefined {
    return PACK_DEFINITIONS.find((p) => p.type === packType);
  }

  async function handleCreatePack(e: React.FormEvent) {
    e.preventDefault();
    if (!packType || !id) return;

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        student_id: id,
        pack_type: packType,
        payment_method: paymentMethod,
        amount_paid: amountPaid,
        currency,
      };

      if (showDiscount) {
        body.discount_type = discountType;
        body.discount_value = discountValue;
        if (discountReason.trim()) {
          body.discount_reason = discountReason.trim();
        }
      }

      if (reference.trim()) {
        body.reference = reference.trim();
      }
      if (notes.trim()) {
        body.notes = notes.trim();
      }

      const res = await fetch("/api/admin/pack/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Error creando pack");
      } else {
        showToast("Pack creado y activado");
        // Reset form
        setPackType("");
        setPaymentMethod("cash");
        setAmountPaid(0);
        setCurrency("COP");
        setShowDiscount(false);
        setDiscountType("percentage");
        setDiscountValue(0);
        setDiscountReason("");
        setReference("");
        setNotes("");
        // Refresh data and switch to packs tab
        await loadStudent();
        setTab("packs");
      }
    } catch {
      showToast("Error de conexion");
    }
    setSubmitting(false);
  }

  /* ---------- Login link + edit handlers ---------- */

  async function handleGenerateLink() {
    if (!id) return;
    setGeneratingLink(true);
    setLoginLink("");
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Error generando enlace");
      } else if (data.loginLink) {
        setLoginLink(data.loginLink);
        showToast("Enlace generado");
      }
    } catch {
      showToast("Error de conexion");
    }
    setGeneratingLink(false);
  }

  function startEditing() {
    if (!student) return;
    setEditName(student.full_name);
    setEditEmail(student.email);
    setEditPhone(student.phone || "");
    setEditNotes(student.notes || "");
    setEditing(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          full_name: editName.trim(),
          email: editEmail.trim().toLowerCase(),
          phone: editPhone.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Error guardando");
      } else {
        showToast("Datos actualizados");
        setEditing(false);
        await loadStudent();
      }
    } catch {
      showToast("Error de conexion");
    }
    setSaving(false);
  }

  async function copyLink(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Enlace copiado");
    } catch {
      showToast("No se pudo copiar");
    }
  }

  function sendViaWhatsApp(link: string) {
    const name = student?.full_name || "";
    const msg = encodeURIComponent(
      `Hola ${name}! Tu cuenta en TU. by Tata Umana esta lista. Haz clic en este enlace para acceder a tu portal:\n\n${link}\n\nEste enlace es de un solo uso.`
    );
    const phone = student?.phone?.replace(/[\s\-\+]/g, "") || "";
    const waUrl = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
  }

  /* ---------- Block/Unblock ---------- */

  async function handleToggleBlock() {
    if (!student || !id) return;
    const newBlocked = !student.is_blocked;
    const label = newBlocked ? "bloquear" : "desbloquear";
    if (!confirm(`Segura que quieres ${label} a ${student.full_name}?`)) return;

    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_blocked: newBlocked }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || "Error");
      } else {
        showToast(newBlocked ? "Cuenta bloqueada" : "Cuenta desbloqueada");
        await loadStudent();
      }
    } catch {
      showToast("Error de conexion");
    }
  }

  /* ---------- Credit Adjustment ---------- */

  async function handleAdjustCredits(packId: string, delta: number) {
    const action = delta > 0 ? "remove_credits" : "set_classes_used";
    try {
      const body: Record<string, unknown> = { id: packId };
      if (delta > 0) {
        body.remove_credits = delta;
      } else {
        // Adding credits back: reduce classes_used
        const pack = packs.find((p) => p.id === packId);
        if (pack) {
          const newUsed = Math.max((pack.classes_used || 0) + delta, 0);
          body.set_classes_used = newUsed;
        }
      }

      const res = await fetch("/api/admin/pack", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || "Error ajustando creditos");
      } else {
        showToast(delta > 0 ? "Credito usado" : "Credito restaurado");
        await loadStudent();
      }
    } catch {
      showToast("Error de conexion");
    }
  }

  /* ---------- Book on behalf ---------- */

  async function loadSessions() {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    const to = endDate.toISOString().split("T")[0];

    const res = await fetch(`/api/schedule?from=${today}&to=${to}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions || []);
    }
  }

  useEffect(() => {
    if (tab === "book") loadSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleBookForStudent(sessionId: string) {
    if (!student || !id) return;
    setBookingSessionId(sessionId);
    setBookingInProgress(true);

    // Find best active pack
    const activePacks = packs.filter(
      (p) =>
        p.status === "active" &&
        (p.total_classes === -1 || p.classes_remaining > 0),
    );

    if (activePacks.length === 0) {
      showToast("Sin creditos disponibles. Crea un pack primero.");
      setBookingInProgress(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/book-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: id,
          session_id: sessionId,
          pack_id: activePacks[0].id,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.error || "Error al reservar");
      } else {
        showToast(`Reservado para ${student.full_name}`);
        await Promise.all([loadStudent(), loadSessions()]);
      }
    } catch {
      showToast("Error de conexion");
    }
    setBookingInProgress(false);
    setBookingSessionId("");
  }

  /* ---------- Formatters ---------- */

  function formatMoney(amount: number, cur: string): string {
    if (cur === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  /* ---------- Status colors ---------- */

  const statusColors: Record<string, string> = {
    active: "text-green-600 bg-green-50",
    expired: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5",
    exhausted: "text-amber-500 bg-amber-50",
    cancelled: "text-red-400 bg-red-50",
    approved: "text-green-600 bg-green-50",
    pending: "text-amber-500 bg-amber-50",
    declined: "text-red-400 bg-red-50",
    voided: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5",
    error: "text-red-400 bg-red-50",
  };

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-sm text-[#2C2C2C]/40">Alumno no encontrado</p>
        <Link
          href="/admin/students"
          className="text-xs text-[#B87777] underline underline-offset-4 mt-4 inline-block"
        >
          Volver a alumnos
        </Link>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "packs", label: "Packs" },
    { key: "add-pack", label: "+ Pack" },
    { key: "book", label: "Reservar" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Toast */}
      {message && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#2C2C2C] text-white text-sm px-4 py-3 text-center md:left-auto md:right-4 md:max-w-sm">
          {message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/students"
          className="text-[#2C2C2C]/30 hover:text-[#B87777] transition-colors text-sm"
        >
          &larr;
        </Link>
        <div className="flex-1 min-w-0">
          <h1
            className="text-2xl text-[#2C2C2C] truncate"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            {student.full_name}
          </h1>
          <p className="text-xs text-[#2C2C2C]/40 truncate">{student.email}</p>
        </div>
        {student.role === "admin" && (
          <span className="text-[8px] tracking-wider text-[#C9A96E] bg-[#C9A96E]/10 px-2 py-0.5 uppercase shrink-0">
            Admin
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#2C2C2C]/5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[10px] tracking-[0.15em] uppercase px-4 py-2 border-b-2 transition-colors ${
              tab === t.key
                ? "text-[#B87777] border-[#B87777]"
                : "text-[#2C2C2C]/30 border-transparent hover:text-[#2C2C2C]/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "info" && (
        <div className="space-y-4">
          {/* Edit mode */}
          {editing ? (
            <form onSubmit={handleSaveEdit} className="bg-white border border-[#C9A96E]/20 p-4 space-y-3">
              <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase">Editar Alumno</p>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                minLength={2}
                placeholder="Nombre completo"
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
              />
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                placeholder="Email"
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
              />
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="WhatsApp (opcional)"
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
              />
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notas (opcional)"
                rows={2}
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E] resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-[#C9A96E] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-[#2C2C2C]/10 text-[10px] tracking-[0.15em] uppercase text-[#2C2C2C]/40 hover:text-[#2C2C2C] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white border border-[#2C2C2C]/5 p-4 space-y-3">
              <InfoRow label="Nombre" value={student.full_name} />
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="Telefono" value={student.phone || "---"} />
              <InfoRow label="Rol" value={student.role} />
              <InfoRow label="Idioma" value={student.preferred_lang === "es" ? "Espanol" : "English"} />
              <InfoRow label="Registrado" value={formatDate(student.created_at)} />
              {student.emergency_contact && (
                <InfoRow label="Contacto emergencia" value={student.emergency_contact} />
              )}
              {student.notes && (
                <InfoRow label="Notas" value={student.notes} />
              )}
              {student.is_blocked && (
                <div className="bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 text-center">
                  CUENTA BLOQUEADA — el alumno no puede iniciar sesion
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={startEditing}
                  className="flex-1 py-2 border border-[#2C2C2C]/10 text-[10px] tracking-[0.15em] uppercase text-[#2C2C2C]/40 hover:text-[#2C2C2C] hover:border-[#2C2C2C]/30 transition-colors"
                >
                  Editar Datos
                </button>
                <button
                  onClick={handleToggleBlock}
                  className={`px-4 py-2 text-[10px] tracking-[0.15em] uppercase transition-colors ${
                    student.is_blocked
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
                  }`}
                >
                  {student.is_blocked ? "Desbloquear" : "Bloquear"}
                </button>
              </div>
            </div>
          )}

          {/* Login link section */}
          <div className="bg-white border border-[#2C2C2C]/5 p-4 space-y-3">
            <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase">
              Acceso al Portal
            </p>
            {loginLink ? (
              <div className="space-y-3">
                <p className="text-xs text-green-600">
                  Enlace generado. Envialo al alumno por WhatsApp:
                </p>
                <div className="bg-green-50 border border-green-200 p-2 rounded text-[10px] text-[#2C2C2C]/60 break-all select-all">
                  {loginLink}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyLink(loginLink)}
                    className="flex-1 py-2 bg-[#2C2C2C] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors"
                  >
                    Copiar
                  </button>
                  <button
                    onClick={() => sendViaWhatsApp(loginLink)}
                    className="flex-1 py-2 bg-[#25D366] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#20bd5a] transition-colors"
                  >
                    Enviar WhatsApp
                  </button>
                </div>
                <button
                  onClick={() => setLoginLink("")}
                  className="w-full text-center text-[9px] text-[#2C2C2C]/30 hover:text-[#2C2C2C]/50 py-1"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-[#2C2C2C]/40 mb-3">
                  Genera un enlace de acceso unico para que el alumno pueda entrar a su portal sin necesidad de contrasena.
                </p>
                <button
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                  className="w-full py-2 bg-[#2C2C2C] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {generatingLink ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generando...
                    </>
                  ) : (
                    "Generar Enlace de Acceso"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Transactions summary */}
          {transactions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase">
                Transacciones ({transactions.length})
              </p>
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white border border-[#2C2C2C]/5 p-3 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#2C2C2C]/60 truncate">
                      {tx.description || tx.reference}
                    </p>
                    <p className="text-[9px] text-[#2C2C2C]/20">
                      {tx.payment_method} · {formatDate(tx.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm text-[#2C2C2C]">
                      {formatMoney(tx.amount, tx.currency)}
                    </p>
                    <span
                      className={`text-[8px] tracking-wider uppercase px-2 py-0.5 ${statusColors[tx.status] || "text-[#2C2C2C]/30"}`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "packs" && (
        <div className="space-y-2">
          {packs.length === 0 ? (
            <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
              <p className="text-sm text-[#2C2C2C]/40">
                Sin packs registrados
              </p>
              <button
                onClick={() => setTab("add-pack")}
                className="mt-3 text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-[#2C2C2C] text-white hover:bg-[#B87777] transition-colors"
              >
                + Crear Pack
              </button>
            </div>
          ) : (
            <>
              <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
                {packs.length} {packs.length === 1 ? "pack" : "packs"}
              </p>
              {packs.map((p) => {
                const isUnlimited = p.total_classes === -1;
                const expiresDate = new Date(p.expires_at);
                const daysLeft = Math.ceil(
                  (expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                );

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
                        <div className="flex items-center gap-2">
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
                          {formatMoney(p.price_paid, p.currency)} ·{" "}
                          {p.payment_method || "---"} ·{" "}
                          {daysLeft > 0
                            ? `${daysLeft}d restantes`
                            : "expirado"}
                        </p>
                        <p className="text-[9px] text-[#2C2C2C]/15 mt-0.5">
                          Creado: {formatDate(p.created_at)}
                        </p>
                        {p.notes && (
                          <p className="text-[9px] text-[#2C2C2C]/25 mt-1 italic">
                            {p.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className="text-2xl text-[#B87777]"
                          style={{ fontFamily: "Cormorant Garamond, serif" }}
                        >
                          {isUnlimited ? "\u221E" : p.classes_remaining}
                        </p>
                        <p className="text-[9px] text-[#2C2C2C]/30">
                          {isUnlimited
                            ? "ilimitado"
                            : `${p.classes_used}/${p.total_classes}`}
                        </p>
                        {p.status === "active" && !isUnlimited && (
                          <div className="flex gap-1 mt-2 justify-end">
                            <button
                              onClick={() => handleAdjustCredits(p.id, -1)}
                              disabled={p.classes_used <= 0}
                              title="Restaurar 1 credito"
                              className="w-7 h-7 flex items-center justify-center border border-green-300 text-green-600 text-sm hover:bg-green-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            >
                              +
                            </button>
                            <button
                              onClick={() => handleAdjustCredits(p.id, 1)}
                              disabled={p.classes_remaining <= 0}
                              title="Descontar 1 credito"
                              className="w-7 h-7 flex items-center justify-center border border-red-300 text-red-500 text-sm hover:bg-red-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            >
                              -
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {tab === "book" && (
        <div className="space-y-3">
          <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase">
            Reservar Clase para {student.full_name}
          </p>

          {/* Credits summary */}
          {(() => {
            const activePacks = packs.filter(
              (p) => p.status === "active" && (p.total_classes === -1 || p.classes_remaining > 0),
            );
            if (activePacks.length === 0) {
              return (
                <div className="bg-red-50 border border-red-200 p-4 text-center">
                  <p className="text-xs text-red-600 mb-2">
                    Sin creditos disponibles
                  </p>
                  <button
                    onClick={() => setTab("add-pack")}
                    className="text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-[#2C2C2C] text-white hover:bg-[#B87777] transition-colors"
                  >
                    + Crear Pack
                  </button>
                </div>
              );
            }
            const totalCredits = activePacks.reduce(
              (s, p) => s + (p.total_classes === -1 ? 999 : p.classes_remaining),
              0,
            );
            return (
              <div className="bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
                {totalCredits >= 999 ? "Creditos ilimitados" : `${totalCredits} creditos disponibles`}
                {" "}({activePacks[0].pack_type.replace(/_/g, " ")})
              </div>
            );
          })()}

          {/* Sessions list */}
          {sessions.length === 0 ? (
            <div className="bg-white border border-[#2C2C2C]/5 p-6 text-center">
              <p className="text-xs text-[#2C2C2C]/40">No hay clases programadas esta semana</p>
            </div>
          ) : (
            sessions.map((s) => {
              const def = s.definition;
              const spotsLeft = s.capacity - s.enrolled;
              const isFull = spotsLeft <= 0;
              const isBookingThis = bookingSessionId === s.id;

              return (
                <div key={s.id} className="bg-white border border-[#2C2C2C]/5 p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#2C2C2C]">
                      <b>{s.start_time.slice(0, 5)}</b>{" "}
                      {def?.name_es || def?.name || "Clase"}
                    </p>
                    <p className="text-[9px] text-[#2C2C2C]/30">
                      {new Date(s.session_date + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}
                      {" · "}{s.teacher} · {spotsLeft} cupos
                    </p>
                  </div>
                  <button
                    onClick={() => handleBookForStudent(s.id)}
                    disabled={isFull || bookingInProgress}
                    className="text-[10px] tracking-[0.15em] uppercase px-4 py-1.5 bg-[#2C2C2C] text-white hover:bg-[#B87777] transition-colors disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                  >
                    {isBookingThis ? "..." : isFull ? "Llena" : "Reservar"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "add-pack" && (
        <form onSubmit={handleCreatePack} className="space-y-4">
          <div className="bg-white border border-[#C9A96E]/20 p-4 space-y-4">
            <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase">
              Crear Pack para {student.full_name}
            </p>

            {/* Pack Type */}
            <div>
              <label className="block text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
                Tipo de Pack
              </label>
              <select
                value={packType}
                onChange={(e) => setPackType(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
              >
                <option value="">Seleccionar pack</option>
                {PACK_DEFINITIONS.filter((p) => p.isActive).map((p) => (
                  <option key={p.type} value={p.type}>
                    {p.name.es} ---{" "}
                    {p.totalClasses === -1
                      ? "Ilimitado"
                      : `${p.totalClasses} clases`}{" "}
                    --- {formatMoney(p.priceCop, "COP")}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
                Metodo de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethodValue)
                }
                required
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount + Currency */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
                  Monto Pagado
                </label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  min={0}
                  required
                  className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
                />
              </div>
              <div className="shrink-0">
                <label className="block text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
                  Moneda
                </label>
                <div className="flex border border-[#2C2C2C]/10">
                  <button
                    type="button"
                    onClick={() => setCurrency("COP")}
                    className={`px-3 py-2 text-xs transition-colors ${
                      currency === "COP"
                        ? "bg-[#2C2C2C] text-white"
                        : "bg-white text-[#2C2C2C]/40 hover:text-[#2C2C2C]/60"
                    }`}
                  >
                    COP
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency("USD")}
                    className={`px-3 py-2 text-xs transition-colors ${
                      currency === "USD"
                        ? "bg-[#2C2C2C] text-white"
                        : "bg-white text-[#2C2C2C]/40 hover:text-[#2C2C2C]/60"
                    }`}
                  >
                    USD
                  </button>
                </div>
              </div>
            </div>

            {/* Pack summary */}
            {packType && getSelectedPackDef() && (
              <div className="bg-[#FAF8F5] border border-[#2C2C2C]/5 px-3 py-2">
                <p className="text-[9px] text-[#2C2C2C]/30">
                  Precio original:{" "}
                  {formatMoney(
                    currency === "USD"
                      ? getSelectedPackDef()!.priceUsd
                      : getSelectedPackDef()!.priceCop,
                    currency,
                  )}{" "}
                  | Clases:{" "}
                  {getSelectedPackDef()!.totalClasses === -1
                    ? "Ilimitado"
                    : getSelectedPackDef()!.totalClasses}{" "}
                  | Expira en: {getSelectedPackDef()!.expirationDays} dias
                </p>
              </div>
            )}

            {/* Discount toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDiscount}
                  onChange={(e) => {
                    setShowDiscount(e.target.checked);
                    if (!e.target.checked) {
                      setDiscountType("percentage");
                      setDiscountValue(0);
                      setDiscountReason("");
                    }
                  }}
                  className="accent-[#B87777]"
                />
                <span className="text-[10px] tracking-[0.1em] text-[#2C2C2C]/50 uppercase">
                  Aplicar descuento
                </span>
              </label>
            </div>

            {showDiscount && (
              <div className="border border-[#B87777]/20 bg-[#B87777]/5 p-3 space-y-3">
                <div className="flex gap-2">
                  {(
                    [
                      { value: "percentage", label: "%" },
                      { value: "fixed", label: "Fijo" },
                      { value: "comp", label: "Comp" },
                    ] as const
                  ).map((dt) => (
                    <button
                      key={dt.value}
                      type="button"
                      onClick={() => setDiscountType(dt.value)}
                      className={`text-[10px] tracking-[0.1em] uppercase px-3 py-1.5 border transition-colors ${
                        discountType === dt.value
                          ? "bg-[#B87777] text-white border-[#B87777]"
                          : "text-[#2C2C2C]/40 border-[#2C2C2C]/10 hover:border-[#B87777]/30"
                      }`}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>
                {discountType !== "comp" && (
                  <input
                    type="number"
                    placeholder={
                      discountType === "percentage"
                        ? "Porcentaje (ej: 20)"
                        : "Monto fijo"
                    }
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#B87777]"
                  />
                )}
                <input
                  type="text"
                  placeholder="Razon del descuento"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#B87777]"
                />
              </div>
            )}

            {/* Reference */}
            <div>
              <label className="block text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
                Referencia (opcional)
              </label>
              <input
                type="text"
                placeholder="Referencia de pago, recibo, etc."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
                Notas (opcional)
              </label>
              <textarea
                placeholder="Notas internas sobre este pack"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E] resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!packType || submitting}
              className="w-full py-3 bg-[#2C2C2C] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30"
            >
              {submitting ? "Guardando..." : "GUARDAR Y ACTIVAR PACK"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[9px] tracking-[0.15em] text-[#2C2C2C]/30 uppercase shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className="text-sm text-[#2C2C2C] text-right"
        style={{ fontFamily: "var(--font-body, Outfit, sans-serif)" }}
      >
        {value}
      </span>
    </div>
  );
}
