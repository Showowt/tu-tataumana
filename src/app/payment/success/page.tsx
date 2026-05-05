"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaymentState = "waiting" | "success" | "failed";

interface PaymentStatusData {
  status: string;
  pack_type: string | null;
}

// ---------------------------------------------------------------------------
// Pack display names (client-safe subset)
// ---------------------------------------------------------------------------

const PACK_LABELS: Record<string, { es: string; classes: string }> = {
  DROP_IN: { es: "Clase Individual", classes: "1 clase" },
  JUST_FLOW_PACK: { es: "Just Flow Pack", classes: "4 clases" },
  TU_HEALING_PACK: { es: "TU Healing Pack", classes: "8 clases" },
  TU_EQUILIBRIUM: { es: "TU Equilibrium", classes: "12 clases" },
  TU_LIFE_PACK: { es: "TU Life Pack", classes: "Ilimitado" },
  MAYO_MES_MAMA: { es: "Mayo Mes Mama", classes: "4 clases" },
};

// ---------------------------------------------------------------------------
// Inner component that uses useSearchParams
// ---------------------------------------------------------------------------

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || "";

  const [state, setState] = useState<PaymentState>("waiting");
  const [statusData, setStatusData] = useState<PaymentStatusData | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const pollStatus = useCallback(async () => {
    if (!ref) {
      setState("failed");
      return;
    }

    try {
      const res = await fetch(
        `/api/payments/status?ref=${encodeURIComponent(ref)}`,
      );
      if (!res.ok) {
        // 404 means transaction not recorded yet -- keep waiting
        if (res.status === 404) return;
        return;
      }

      const json = await res.json();
      const data = json.data as PaymentStatusData | null;

      if (!data) return;

      if (data.status === "approved") {
        setStatusData(data);
        setState("success");
      } else if (
        data.status === "declined" ||
        data.status === "error" ||
        data.status === "voided"
      ) {
        setStatusData(data);
        setState("failed");
      }
      // "pending" — keep polling
    } catch {
      // Network error — keep polling
    }
  }, [ref]);

  // Poll every 3 seconds
  useEffect(() => {
    if (state !== "waiting") return;

    // Initial poll
    pollStatus();

    const pollInterval = setInterval(() => {
      pollStatus();
    }, 3000);

    // Elapsed timer (1s tick)
    const elapsedInterval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(elapsedInterval);
    };
  }, [state, pollStatus]);

  // Timeout after 60 seconds
  useEffect(() => {
    if (state === "waiting" && elapsed >= 60) {
      setState("failed");
    }
  }, [state, elapsed]);

  const packLabel = statusData?.pack_type
    ? PACK_LABELS[statusData.pack_type]
    : null;

  const whatsappUrl = `https://wa.me/573185083035?text=${encodeURIComponent(
    `Hola, tengo un problema con mi pago. Referencia: ${ref}`,
  )}`;

  // -----------------------------------------------------------------------
  // WAITING STATE
  // -----------------------------------------------------------------------
  if (state === "waiting") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Pulse animation */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#C9A96E]/10 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-[#C9A96E]/20 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-[#C9A96E]/20 animate-ping" />
            </div>
          </div>

          <div>
            <h1
              className="text-2xl text-[#2C2C2C] mb-2"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              Procesando tu pago...
            </h1>
            <p className="text-sm text-[#2C2C2C]/40" style={{ fontFamily: "Outfit, sans-serif" }}>
              Esto suele tardar menos de 30 segundos
            </p>
          </div>

          {/* Subtle progress */}
          <div className="mx-auto w-48 h-0.5 bg-[#2C2C2C]/5 overflow-hidden">
            <div
              className="h-full bg-[#C9A96E]/40 transition-all duration-1000 ease-linear"
              style={{ width: `${Math.min((elapsed / 60) * 100, 100)}%` }}
            />
          </div>

          {ref && (
            <p className="text-[10px] text-[#2C2C2C]/20 tracking-wider uppercase">
              Ref: {ref}
            </p>
          )}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // SUCCESS STATE
  // -----------------------------------------------------------------------
  if (state === "success") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Green check */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <div>
            <h1
              className="text-3xl text-[#2C2C2C] mb-2"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              Tu pack esta activo!
            </h1>
            {packLabel && (
              <div className="mt-3 inline-block bg-[#B87777]/5 border border-[#B87777]/15 px-4 py-2">
                <p className="text-sm font-medium text-[#2C2C2C]">
                  {packLabel.es}
                </p>
                <p className="text-[10px] text-[#2C2C2C]/40 mt-0.5">
                  {packLabel.classes}
                </p>
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="space-y-3 pt-2">
            <Link
              href="/portal"
              className="block w-full py-3 bg-[#2C2C2C] text-white text-[11px] tracking-[0.15em] uppercase text-center hover:bg-[#B87777] transition-colors"
            >
              Ver mis clases
            </Link>
            <Link
              href="/portal/schedule"
              className="block w-full py-3 border border-[#B87777]/30 text-[#B87777] text-[11px] tracking-[0.15em] uppercase text-center hover:bg-[#B87777]/5 transition-colors"
            >
              Reservar clase
            </Link>
          </div>

          <p className="text-xs text-[#2C2C2C]/30">
            Recibiras un correo de confirmacion en breve
          </p>

          {ref && (
            <p className="text-[9px] text-[#2C2C2C]/15 tracking-wider uppercase">
              Ref: {ref}
            </p>
          )}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // FAILED STATE
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Warning icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        <div>
          <h1
            className="text-2xl text-[#2C2C2C] mb-2"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            Hubo un problema con tu pago
          </h1>
          <p className="text-sm text-[#2C2C2C]/50">
            Si el dinero salio de tu cuenta, escribenos a WhatsApp
          </p>
        </div>

        {ref && (
          <div className="bg-[#2C2C2C]/3 border border-[#2C2C2C]/8 px-4 py-3">
            <p className="text-[10px] text-[#2C2C2C]/40 tracking-wider uppercase mb-1">
              Referencia de soporte
            </p>
            <p className="text-sm font-mono text-[#2C2C2C]/70 select-all">
              {ref}
            </p>
          </div>
        )}

        {/* CTAs */}
        <div className="space-y-3 pt-2">
          <Link
            href="/portal/packs"
            className="block w-full py-3 bg-[#2C2C2C] text-white text-[11px] tracking-[0.15em] uppercase text-center hover:bg-[#B87777] transition-colors"
          >
            Reintentar
          </Link>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 border border-green-500/30 text-green-700 text-[11px] tracking-[0.15em] uppercase text-center hover:bg-green-50 transition-colors"
          >
            WhatsApp soporte
          </a>
        </div>

        <Link
          href="/portal"
          className="inline-block text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase hover:text-[#B87777] transition-colors"
        >
          Volver al portal
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper with Suspense boundary for useSearchParams
// ---------------------------------------------------------------------------

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
