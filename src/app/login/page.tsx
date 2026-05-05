"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get("redirect") || "/portal";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(
    errorParam === "auth_failed"
      ? "El enlace ha expirado. Solicita uno nuevo."
      : errorParam === "no_code"
        ? "Enlace inválido. Solicita uno nuevo."
        : "",
  );
  const [lang, setLang] = useState<"es" | "en">("es");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const t = {
    title: { en: "Sign In", es: "Iniciar Sesión" },
    subtitlePassword: {
      en: "Enter your email and password",
      es: "Ingresa tu email y contraseña",
    },
    subtitleMagic: {
      en: "Enter your email to receive a magic link",
      es: "Ingresa tu email para recibir un enlace mágico",
    },
    emailPlaceholder: { en: "your@email.com", es: "tu@email.com" },
    passwordPlaceholder: { en: "Password", es: "Contraseña" },
    signIn: { en: "Sign In", es: "Iniciar Sesión" },
    signingIn: { en: "Signing in...", es: "Entrando..." },
    sendLink: { en: "Send Magic Link", es: "Enviar Enlace Mágico" },
    sending: { en: "Sending...", es: "Enviando..." },
    checkEmail: {
      en: "Check your email for the magic link",
      es: "Revisa tu email para el enlace mágico",
    },
    checkSpam: {
      en: "If you don't see it, check your spam folder.",
      es: "Si no lo ves, revisa tu carpeta de spam.",
    },
    sendAnother: { en: "Send another link", es: "Enviar otro enlace" },
    backToSite: { en: "Back to site", es: "Volver al sitio" },
    useMagicLink: {
      en: "Use magic link instead",
      es: "Usar enlace mágico",
    },
    usePassword: {
      en: "Use password instead",
      es: "Usar contraseña",
    },
    invalidCredentials: {
      en: "Invalid email or password",
      es: "Email o contraseña incorrectos",
    },
    sendError: {
      en: "Failed to send link. Try again.",
      es: "Error al enviar el enlace. Intenta de nuevo.",
    },
  };

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      console.error("[login]", authError.message);
      setError(t.invalidCredentials[lang]);
      setLoading(false);
      return;
    }

    // Determine redirect: admins go to /admin
    const isAdmin = ADMIN_EMAILS.includes(email.trim().toLowerCase());
    const dest = isAdmin && redirect === "/portal" ? "/admin" : redirect;
    router.push(dest);
    router.refresh();
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const callbackUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`;

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: callbackUrl,
      },
    });

    setLoading(false);

    if (authError) {
      console.error("[login]", authError.message);
      setError(t.sendError[lang]);
      return;
    }

    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4">
      <div className="w-full max-w-md">
        {/* Language toggle */}
        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => setLang("es")}
            className={`text-xs tracking-[0.2em] uppercase transition-colors ${
              lang === "es"
                ? "text-[#B87777] border-b border-[#B87777]"
                : "text-[#2C2C2C]/40 hover:text-[#2C2C2C]/60"
            }`}
          >
            ES
          </button>
          <span className="text-[#2C2C2C]/20">|</span>
          <button
            onClick={() => setLang("en")}
            className={`text-xs tracking-[0.2em] uppercase transition-colors ${
              lang === "en"
                ? "text-[#B87777] border-b border-[#B87777]"
                : "text-[#2C2C2C]/40 hover:text-[#2C2C2C]/60"
            }`}
          >
            EN
          </button>
        </div>

        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <h1
            className="text-3xl md:text-4xl text-[#2C2C2C] mb-2"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            TU.
          </h1>
          <p className="text-[10px] tracking-[0.3em] text-[#B87777] uppercase">
            by Tata Umana
          </p>
        </div>

        {!sent ? (
          <>
            <form
              onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <h2
                  className="text-xl text-[#2C2C2C] mb-2"
                  style={{ fontFamily: "Cormorant Garamond, serif" }}
                >
                  {t.title[lang]}
                </h2>
                <p className="text-sm text-[#2C2C2C]/60">
                  {mode === "password" ? t.subtitlePassword[lang] : t.subtitleMagic[lang]}
                </p>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-4 py-3 text-center">
                  {error}
                </div>
              )}

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder[lang]}
                required
                autoFocus
                className="w-full px-4 py-3 border border-[#2C2C2C]/10 bg-white text-[#2C2C2C] placeholder:text-[#2C2C2C]/30 text-sm focus:outline-none focus:border-[#B87777] transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />

              {mode === "password" && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder[lang]}
                  required
                  className="w-full px-4 py-3 border border-[#2C2C2C]/10 bg-white text-[#2C2C2C] placeholder:text-[#2C2C2C]/30 text-sm focus:outline-none focus:border-[#B87777] transition-colors"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              )}

              <button
                type="submit"
                disabled={loading || !email || (mode === "password" && !password)}
                className="w-full py-3 bg-[#2C2C2C] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {mode === "password"
                  ? loading ? t.signingIn[lang] : t.signIn[lang]
                  : loading ? t.sending[lang] : t.sendLink[lang]}
              </button>
            </form>

            {/* Toggle between password and magic link */}
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  setMode(mode === "password" ? "magic" : "password");
                  setError("");
                }}
                className="text-xs text-[#B87777] underline underline-offset-4 hover:text-[#2C2C2C] transition-colors"
              >
                {mode === "password" ? t.useMagicLink[lang] : t.usePassword[lang]}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#B87777]/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[#B87777]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <div>
              <h2
                className="text-xl text-[#2C2C2C] mb-2"
                style={{ fontFamily: "Cormorant Garamond, serif" }}
              >
                {t.checkEmail[lang]}
              </h2>
              <p className="text-sm text-[#2C2C2C]/60 mb-1">
                <strong>{email}</strong>
              </p>
              <p className="text-xs text-[#2C2C2C]/40">{t.checkSpam[lang]}</p>
            </div>

            <button
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
              className="text-xs text-[#B87777] underline underline-offset-4 hover:text-[#2C2C2C] transition-colors"
            >
              {t.sendAnother[lang]}
            </button>
          </div>
        )}

        {/* Back link */}
        <div className="text-center mt-10">
          <a
            href="/"
            className="text-xs text-[#2C2C2C]/40 hover:text-[#2C2C2C]/60 transition-colors"
          >
            &larr; {t.backToSite[lang]}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
