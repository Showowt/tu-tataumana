"use client";

import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransactionStudent {
  id: string;
  full_name: string;
  email: string;
}

interface TransactionData {
  id: string;
  student_id: string | null;
  pack_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  wompi_id: string | null;
  wompi_reference: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  related_pack_type: string | null;
  description: string | null;
  student: TransactionStudent | null;
}

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "text-amber-600 bg-amber-50" },
  approved: { label: "Aprobado", color: "text-green-600 bg-green-50" },
  declined: { label: "Rechazado", color: "text-red-500 bg-red-50" },
  voided: { label: "Anulado", color: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5" },
  error: { label: "Error", color: "text-red-500 bg-red-50" },
};

const METHOD_LABELS: Record<string, string> = {
  square: "Square",
  nequi: "Nequi",
  bancolombia: "Bancolombia",
  zelle: "Zelle",
  cash: "Efectivo",
  card: "Tarjeta",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "all">("pending");
  const [message, setMessage] = useState("");
  const [verifying, setVerifying] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== "all") params.set("status", tab);
      const res = await fetch(`/api/admin/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data || []);
      }
    } catch {
      showMessage("Error cargando pagos");
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  }

  async function handleVerify(transactionId: string) {
    const refInput = prompt(
      "Referencia del comprobante (opcional — dejar vacio si no hay):",
      "",
    );

    // User cancelled the prompt
    if (refInput === null) return;

    setVerifying(transactionId);

    try {
      const res = await fetch("/api/admin/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: transactionId,
          payment_reference: refInput?.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.error || "Error verificando pago");
      } else {
        showMessage("Pago verificado y pack activado");
        await loadTransactions();
      }
    } catch {
      showMessage("Error de conexion");
    }

    setVerifying(null);
  }

  /**
   * Compute display amount.
   * Wompi stores amounts in cents (amount * 100).
   * Manual methods store the raw COP price.
   */
  function displayAmount(tx: TransactionData): string {
    const raw = tx.amount;
    // Square amounts are in centavos (x100)
    const isCents = tx.payment_method === "square" || tx.payment_method === "card";
    const cop = isCents ? raw / 100 : raw;
    return formatCOP(cop);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
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
        Pagos
      </h1>

      {/* Tabs */}
      <div className="flex gap-2">
        {(
          [
            { key: "pending", label: "Pendientes" },
            { key: "approved", label: "Aprobados" },
            { key: "all", label: "Todos" },
          ] as const
        ).map((t) => (
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

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">
            {tab === "pending"
              ? "No hay pagos pendientes"
              : tab === "approved"
                ? "No hay pagos aprobados"
                : "No hay transacciones"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
            {transactions.length}{" "}
            {transactions.length === 1 ? "transaccion" : "transacciones"}
          </p>

          {transactions.map((tx) => {
            const badge = STATUS_BADGES[tx.status] || {
              label: tx.status,
              color: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5",
            };

            const customerName =
              tx.student?.full_name ||
              (tx.metadata?.customer_name as string) ||
              "Desconocido";

            const customerEmail =
              tx.student?.email ||
              (tx.metadata?.customer_email as string) ||
              "";

            const isPendingManual =
              tx.status === "pending" && tx.payment_method !== "square";

            return (
              <div
                key={tx.id}
                className={`bg-white border p-4 ${
                  tx.status === "pending"
                    ? "border-[#C9A96E]/20"
                    : tx.status === "approved"
                      ? "border-green-200"
                      : "border-[#2C2C2C]/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Customer info */}
                    <p className="text-sm font-medium text-[#2C2C2C] truncate">
                      {customerName}
                    </p>
                    {customerEmail && (
                      <p className="text-[10px] text-[#2C2C2C]/40 truncate">
                        {customerEmail}
                      </p>
                    )}

                    {/* Pack + method */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {tx.related_pack_type && (
                        <span className="text-xs text-[#2C2C2C]/60">
                          {tx.related_pack_type.replace(/_/g, " ")}
                        </span>
                      )}
                      <span className="text-[9px] text-[#2C2C2C]/25">
                        {METHOD_LABELS[tx.payment_method || ""] ||
                          tx.payment_method ||
                          "--"}
                      </span>
                      <span
                        className={`text-[8px] tracking-wider uppercase px-2 py-0.5 ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Reference + date */}
                    <p className="text-[9px] text-[#2C2C2C]/20 mt-1">
                      {tx.wompi_reference || tx.id.slice(0, 8)} ·{" "}
                      {formatDate(tx.created_at)}
                    </p>
                  </div>

                  {/* Right side: amount + actions */}
                  <div className="text-right shrink-0 space-y-2">
                    <p
                      className="text-lg text-[#2C2C2C]"
                      style={{ fontFamily: "Cormorant Garamond, serif" }}
                    >
                      {displayAmount(tx)}
                    </p>

                    {isPendingManual && (
                      <button
                        onClick={() => handleVerify(tx.id)}
                        disabled={verifying === tx.id}
                        className="text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 bg-[#C9A96E] text-white hover:bg-[#B87777] transition-colors disabled:opacity-40"
                      >
                        {verifying === tx.id ? "..." : "Verificar"}
                      </button>
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
