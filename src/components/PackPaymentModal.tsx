"use client";

import { useState } from "react";

interface PackProp {
  type: string;
  name: { en: string; es: string };
  priceCop: number;
  priceUsd: number;
  totalClasses: number;
  expirationDays: number;
  isPromo: boolean;
}

interface PackPaymentModalProps {
  pack: PackProp;
  onClose: () => void;
  lang?: "es" | "en";
}

type PaymentMethod = "square" | "nequi" | "bancolombia" | "zelle";

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function CreditCardIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function NequiIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
    </svg>
  );
}

function BancolombiaIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 10h3v7H4zm6.5 0h3v7h-3zM2 19h20v3H2zm15-9h3v7h-3zM2 6l10-4 10 4v2H2z" />
    </svg>
  );
}

function ZelleIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path d="M8 8h8l-8 8h8" />
    </svg>
  );
}

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: { es: string; en: string };
  icon: () => React.ReactElement;
}[] = [
  {
    value: "square",
    label: {
      es: "Tarjeta de Credito/Debito",
      en: "Credit/Debit Card",
    },
    icon: CreditCardIcon,
  },
  {
    value: "nequi",
    label: { es: "Nequi", en: "Nequi" },
    icon: NequiIcon,
  },
  {
    value: "bancolombia",
    label: { es: "Bancolombia", en: "Bancolombia" },
    icon: BancolombiaIcon,
  },
  {
    value: "zelle",
    label: { es: "Zelle / PayPal", en: "Zelle / PayPal" },
    icon: ZelleIcon,
  },
];

export default function PackPaymentModal({
  pack,
  onClose,
  lang = "es",
}: PackPaymentModalProps) {
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discount state
  const [discountCode, setDiscountCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountResult, setDiscountResult] = useState<{
    valid: boolean;
    code_id: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    original_price: number;
    discounted_price: number;
    savings: number;
  } | null>(null);

  // Computed effective prices
  const effectivePrice = discountResult
    ? discountResult.discounted_price
    : pack.priceCop;
  const effectivePriceUsd = discountResult
    ? Math.round(pack.priceUsd * (discountResult.discounted_price / pack.priceCop))
    : pack.priceUsd;

  const packName = lang === "es" ? pack.name.es : pack.name.en;
  const classesLabel =
    pack.totalClasses === -1
      ? lang === "es"
        ? "Ilimitadas"
        : "Unlimited"
      : `${pack.totalClasses} ${lang === "es" ? "clases" : "classes"}`;
  const validityLabel = `${pack.expirationDays} ${lang === "es" ? "dias" : "days"}`;

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function validateDiscount() {
    if (!discountCode.trim()) return;
    setValidatingCode(true);
    setDiscountError(null);
    setDiscountResult(null);

    try {
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode.trim(), pack_type: pack.type }),
      });
      const data = await res.json();

      if (data.valid) {
        setDiscountResult(data);
        setDiscountError(null);
      } else {
        setDiscountError(data.error || "Codigo no valido");
        setDiscountResult(null);
      }
    } catch {
      setDiscountError("Error validando codigo");
    }
    setValidatingCode(false);
  }

  function clearDiscount() {
    setDiscountCode("");
    setDiscountResult(null);
    setDiscountError(null);
  }

  async function handleSquarePayment() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pack_type: pack.type,
          payment_method: "square",
          discount_code: discountResult ? discountCode.trim() : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.message || "Error al crear el pago");
      }

      // Square returns a checkout URL — redirect directly
      window.location.href = json.data.checkout_url;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado";
      setError(message);
      setLoading(false);
    }
  }

  async function handleManualPayment(method: PaymentMethod) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pack_type: pack.type,
          payment_method: method,
          discount_code: discountResult ? discountCode.trim() : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.message || "Error al registrar el pago");
      }

      // Open WhatsApp with proof request
      const whatsappUrl = json.data.whatsapp_url;
      if (whatsappUrl) {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function renderMethodDetails() {
    if (!selected) return null;

    if (selected === "square") {
      return (
        <div className="mt-4 space-y-3">
          <button
            onClick={handleSquarePayment}
            disabled={loading}
            className="w-full py-3 bg-[#2C2C2C] text-white text-[11px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {lang === "es" ? "Procesando..." : "Processing..."}
              </>
            ) : lang === "es" ? (
              "Pagar con Tarjeta"
            ) : (
              "Pay with Card"
            )}
          </button>
        </div>
      );
    }

    if (selected === "nequi") {
      return (
        <div className="mt-4 space-y-3">
          <div className="bg-[#FAF8F5] border border-[#2C2C2C]/5 p-3">
            <p
              className="text-[10px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Nequi
            </p>
            <div className="flex items-center justify-between">
              <p
                className="text-base text-[#2C2C2C]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                3166333663
              </p>
              <button
                onClick={() => copyToClipboard("3166333663")}
                className="text-[9px] tracking-[0.1em] uppercase px-2 py-1 border border-[#2C2C2C]/10 text-[#2C2C2C]/60 hover:border-[#B87777] hover:text-[#B87777] transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {copied
                  ? lang === "es"
                    ? "Copiado"
                    : "Copied"
                  : lang === "es"
                    ? "Copiar"
                    : "Copy"}
              </button>
            </div>
            <p
              className="text-sm text-[#B87777] mt-2"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {lang === "es" ? "Monto" : "Amount"}: {formatCOP(effectivePrice)}
            </p>
          </div>
          <button
            onClick={() => handleManualPayment("nequi")}
            disabled={loading}
            className="w-full py-3 bg-[#2C2C2C] text-white text-[11px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {lang === "es" ? "Procesando..." : "Processing..."}
              </>
            ) : lang === "es" ? (
              "Abrir WhatsApp"
            ) : (
              "Open WhatsApp"
            )}
          </button>
        </div>
      );
    }

    if (selected === "bancolombia") {
      return (
        <div className="mt-4 space-y-3">
          <div className="bg-[#FAF8F5] border border-[#2C2C2C]/5 p-3">
            <p
              className="text-[10px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {lang === "es" ? "Cuenta Ahorros" : "Savings Account"}
            </p>
            <div className="flex items-center justify-between">
              <p
                className="text-base text-[#2C2C2C]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                207-859047-00
              </p>
              <button
                onClick={() => copyToClipboard("207-859047-00")}
                className="text-[9px] tracking-[0.1em] uppercase px-2 py-1 border border-[#2C2C2C]/10 text-[#2C2C2C]/60 hover:border-[#B87777] hover:text-[#B87777] transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {copied
                  ? lang === "es"
                    ? "Copiado"
                    : "Copied"
                  : lang === "es"
                    ? "Copiar"
                    : "Copy"}
              </button>
            </div>
            <p
              className="text-sm text-[#B87777] mt-2"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {lang === "es" ? "Monto" : "Amount"}: {formatCOP(effectivePrice)}
            </p>
          </div>
          <button
            onClick={() => handleManualPayment("bancolombia")}
            disabled={loading}
            className="w-full py-3 bg-[#2C2C2C] text-white text-[11px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {lang === "es" ? "Procesando..." : "Processing..."}
              </>
            ) : lang === "es" ? (
              "Abrir WhatsApp"
            ) : (
              "Open WhatsApp"
            )}
          </button>
        </div>
      );
    }

    if (selected === "zelle") {
      return (
        <div className="mt-4 space-y-3">
          <div className="bg-[#FAF8F5] border border-[#2C2C2C]/5 p-3">
            <p
              className="text-[10px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Zelle / PayPal
            </p>
            <div className="flex items-center justify-between">
              <p
                className="text-base text-[#2C2C2C]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                +1 917 453 8307
              </p>
              <button
                onClick={() => copyToClipboard("+1 917 453 8307")}
                className="text-[9px] tracking-[0.1em] uppercase px-2 py-1 border border-[#2C2C2C]/10 text-[#2C2C2C]/60 hover:border-[#B87777] hover:text-[#B87777] transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {copied
                  ? lang === "es"
                    ? "Copiado"
                    : "Copied"
                  : lang === "es"
                    ? "Copiar"
                    : "Copy"}
              </button>
            </div>
            <p
              className="text-sm text-[#B87777] mt-2"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {lang === "es" ? "Monto" : "Amount"}: ${effectivePriceUsd} USD
            </p>
          </div>
          <button
            onClick={() => handleManualPayment("zelle")}
            disabled={loading}
            className="w-full py-3 bg-[#2C2C2C] text-white text-[11px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {lang === "es" ? "Procesando..." : "Processing..."}
              </>
            ) : lang === "es" ? (
              "Abrir WhatsApp"
            ) : (
              "Open WhatsApp"
            )}
          </button>
        </div>
      );
    }

    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-white mx-auto mt-20 mb-10 p-6 relative"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#2C2C2C]/40 hover:text-[#2C2C2C] transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Pack info header */}
        <div className="mb-6">
          <h2
            className="text-xl text-[#2C2C2C] mb-1"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            {packName}
          </h2>
          <p className="text-lg text-[#B87777]" style={{ fontFamily: "Cormorant Garamond, serif" }}>
            {discountResult ? (
              <>
                <span className="line-through text-[#2C2C2C]/30 mr-2">
                  {formatCOP(pack.priceCop)}
                </span>
                <span className="text-[#B87777]">
                  {formatCOP(discountResult.discounted_price)}
                </span>
              </>
            ) : (
              formatCOP(pack.priceCop)
            )}{" "}
            <span className="text-sm text-[#2C2C2C]/30">${effectivePriceUsd} USD</span>
          </p>
          <p className="text-xs text-[#2C2C2C]/40 mt-1">
            {classesLabel} &middot;{" "}
            {lang === "es" ? "Valido" : "Valid"} {validityLabel}
          </p>
        </div>

        {/* Discount Code */}
        <div className="mb-4 p-3 bg-[#FAF8F5] border border-[#2C2C2C]/5">
          <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase mb-2">
            {lang === "es" ? "Codigo de Descuento" : "Discount Code"}
          </p>

          {discountResult ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
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
                  </span>
                  <span className="text-sm text-green-700 font-medium">
                    {discountCode.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={clearDiscount}
                  className="text-[9px] text-[#2C2C2C]/30 hover:text-red-500 transition-colors uppercase"
                >
                  {lang === "es" ? "Quitar" : "Remove"}
                </button>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#2C2C2C]/5">
                <span className="text-xs text-[#2C2C2C]/50 line-through">
                  {formatCOP(discountResult.original_price)}
                </span>
                <span className="text-sm text-[#B87777] font-medium">
                  {formatCOP(discountResult.discounted_price)}
                </span>
              </div>
              <p className="text-[9px] text-green-600">
                {discountResult.discount_type === "percentage"
                  ? `${discountResult.discount_value}% de descuento`
                  : `${formatCOP(discountResult.savings)} de descuento`}
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => {
                  setDiscountCode(e.target.value.toUpperCase());
                  setDiscountError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") validateDiscount();
                }}
                placeholder={lang === "es" ? "Ingresa tu codigo" : "Enter code"}
                className="flex-1 min-w-0 px-3 py-2.5 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
              />
              <button
                onClick={validateDiscount}
                disabled={!discountCode.trim() || validatingCode}
                className="shrink-0 px-5 py-2.5 bg-[#C9A96E] text-white text-[11px] tracking-[0.15em] uppercase font-medium hover:bg-[#B87777] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {validatingCode ? "..." : "OK"}
              </button>
            </div>
          )}

          {discountError && (
            <p className="text-[10px] text-red-500 mt-2">{discountError}</p>
          )}
        </div>

        {/* Payment methods */}
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase mb-2">
            {lang === "es" ? "Metodo de Pago" : "Payment Method"}
          </p>
          {PAYMENT_METHODS.filter((m) => m.value !== "square" || process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY).map((method) => {
            const isSelected = selected === method.value;
            const Icon = method.icon;
            return (
              <button
                key={method.value}
                onClick={() => {
                  setSelected(method.value);
                  setError(null);
                  setCopied(false);
                }}
                className={`w-full flex items-center gap-3 p-3 border transition-colors text-left ${
                  isSelected
                    ? "border-[#B87777] bg-[#B87777]/5"
                    : "border-[#2C2C2C]/5 bg-white hover:border-[#2C2C2C]/15"
                }`}
              >
                <span
                  className={`${isSelected ? "text-[#B87777]" : "text-[#2C2C2C]/40"}`}
                >
                  <Icon />
                </span>
                <span
                  className={`text-sm ${isSelected ? "text-[#2C2C2C]" : "text-[#2C2C2C]/60"}`}
                >
                  {lang === "es" ? method.label.es : method.label.en}
                </span>
                {isSelected && (
                  <span className="ml-auto w-4 h-4 border-2 border-[#B87777] rounded-full flex items-center justify-center">
                    <span className="w-2 h-2 bg-[#B87777] rounded-full" />
                  </span>
                )}
                {!isSelected && (
                  <span className="ml-auto w-4 h-4 border border-[#2C2C2C]/10 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Method-specific details */}
        {renderMethodDetails()}

        {/* Error display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Footer text */}
        <p className="mt-6 text-[9px] text-[#2C2C2C]/30 leading-relaxed text-center">
          {lang === "es"
            ? "Tus clases se activan al confirmar el pago. Para Nequi, Bancolombia, o Zelle: envia tu comprobante por WhatsApp."
            : "Your classes activate upon payment confirmation. For Nequi, Bancolombia, or Zelle: send your receipt via WhatsApp."}
        </p>
      </div>
    </div>
  );
}
