"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

type Status = "checking" | "ready" | "entering" | "invalid" | "expired" | "error";

function BienvenidaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("t") || "";

  const [status, setStatus] = useState<Status>("checking");
  const [firstName, setFirstName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/auth/redeem-invite?t=${encodeURIComponent(token)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.valid) {
          setFirstName(data.firstName || "");
          setStatus("ready");
        } else {
          setStatus(data.reason === "expired" ? "expired" : "invalid");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleEnter() {
    setStatus("entering");
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/redeem-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 410) {
          setStatus("expired");
        } else {
          setStatus("ready");
          setErrorMsg(data.error || "No se pudo iniciar sesion. Intenta de nuevo.");
        }
        return;
      }
      router.replace(data.redirect || "/portal");
      router.refresh();
    } catch {
      setStatus("ready");
      setErrorMsg("Error de conexion. Verifica tu internet e intenta de nuevo.");
    }
  }

  const whatsappHref =
    "https://wa.me/573166333663?text=" +
    encodeURIComponent("Hola! Mi enlace de acceso al portal no funciona.");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4">
      <div
        className="w-full max-w-md text-center transition-all duration-700"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(24px)",
        }}
      >
        <div className="flex justify-center mb-8">
          <Image
            src="/tu-logo.png"
            alt="TU."
            width={72}
            height={72}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        {status === "checking" && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {(status === "ready" || status === "entering") && (
          <>
            <p className="text-[10px] tracking-[0.3em] text-[#C9A96E] uppercase mb-4">
              JustB Yoga by TUISYOU
            </p>
            <h1
              className="text-3xl md:text-4xl text-[#2C2C2C] mb-3"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            >
              {firstName ? `Hola, ${firstName}` : "Bienvenida"}
            </h1>
            <p className="text-sm text-[#2C2C2C]/50 leading-relaxed mb-2">
              Tu espacio personal esta listo: tus clases, tus packs y tus
              reservas, todo en un solo lugar.
            </p>
            <p className="text-xs text-[#2C2C2C]/30 mb-10">
              Your personal space is ready — classes, packs and bookings in
              one place.
            </p>

            {errorMsg && (
              <p className="text-xs text-[#B87777] mb-4">{errorMsg}</p>
            )}

            <button
              onClick={handleEnter}
              disabled={status === "entering"}
              className="w-full py-4 bg-[#2C2C2C] text-white text-xs tracking-[0.25em] uppercase hover:bg-[#B87777] transition-colors duration-300 rounded-full disabled:opacity-40 flex items-center justify-center gap-3"
            >
              {status === "entering" ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar a mi portal"
              )}
            </button>
            <p className="text-[10px] text-[#2C2C2C]/25 mt-4">
              Enter my portal
            </p>
          </>
        )}

        {(status === "invalid" || status === "expired" || status === "error") && (
          <>
            <h1
              className="text-2xl md:text-3xl text-[#2C2C2C] mb-3"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            >
              {status === "expired"
                ? "Este enlace ya expiro"
                : status === "error"
                  ? "Algo salio mal"
                  : "Enlace no valido"}
            </h1>
            <p className="text-sm text-[#2C2C2C]/50 leading-relaxed mb-2">
              {status === "expired"
                ? "Por seguridad, los enlaces de acceso duran 7 dias. Escribenos y te enviamos uno nuevo."
                : status === "error"
                  ? "No pudimos verificar tu enlace. Revisa tu conexion e intenta de nuevo."
                  : "Este enlace no existe o fue reemplazado por uno nuevo. Escribenos y te lo reenviamos."}
            </p>
            <p className="text-xs text-[#2C2C2C]/30 mb-10">
              {status === "expired"
                ? "This link has expired — message us for a new one."
                : status === "error"
                  ? "We couldn't verify your link. Check your connection and try again."
                  : "This link is not valid — message us for a new one."}
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-4 bg-[#25D366] text-white text-xs tracking-[0.25em] uppercase hover:opacity-90 transition-opacity duration-300 rounded-full"
            >
              Escribir por WhatsApp
            </a>
            {status === "error" && (
              <button
                onClick={() => window.location.reload()}
                className="mt-4 text-xs text-[#2C2C2C]/40 hover:text-[#2C2C2C]/70 transition-colors underline underline-offset-4"
              >
                Reintentar / Retry
              </button>
            )}
          </>
        )}

        <div className="mt-12 pt-6 border-t border-[#2C2C2C]/5">
          <a
            href="/"
            className="text-[10px] tracking-[0.2em] text-[#2C2C2C]/25 uppercase hover:text-[#C9A96E] transition-colors"
          >
            tataumana.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default function BienvenidaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
          <div className="w-6 h-6 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BienvenidaContent />
    </Suspense>
  );
}
