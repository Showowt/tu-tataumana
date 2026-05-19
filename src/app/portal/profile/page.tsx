"use client";

import { useEffect, useState } from "react";

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  preferred_lang: "en" | "es";
  emergency_contact: string | null;
  role: string;
  created_at: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [preferredLang, setPreferredLang] = useState<"en" | "es">("es");

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const lang = preferredLang;

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/student/profile");

      // Session expired — force re-login
      if (res.status === 401) {
        window.location.href = "/login?redirect=/portal/profile";
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const p = data.data as ProfileData;
        setProfile(p);
        setFullName(p.full_name);
        setPhone(p.phone || "");
        setEmergencyContact(p.emergency_contact || "");
        setPreferredLang(p.preferred_lang);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword.length < 6) {
      setPasswordError("La contrasena debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contrasenas no coinciden / Passwords don't match");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/student/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "Error cambiando contrasena");
      } else {
        setPasswordMessage(data.message || "Contrasena cambiada!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordForm(false);
      }
    } catch {
      setPasswordError("Error de conexion");
    }
    setPasswordLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/student/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
        preferred_lang: preferredLang,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-sm text-[#2C2C2C]/40">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <h1
        className="text-xl text-[#2C2C2C]"
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        {lang === "es" ? "Mi Perfil" : "My Profile"}
      </h1>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Email (read-only) */}
        <div>
          <label className="block text-[10px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
            Email
          </label>
          <p className="text-sm text-[#2C2C2C] bg-[#2C2C2C]/3 px-3 py-2">
            {profile.email}
          </p>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-[10px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
            {lang === "es" ? "Nombre Completo" : "Full Name"}
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#B87777] transition-colors"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-[10px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
            {lang === "es" ? "Teléfono / WhatsApp" : "Phone / WhatsApp"}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+57 300 123 4567"
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#B87777] transition-colors"
          />
        </div>

        {/* Emergency Contact */}
        <div>
          <label className="block text-[10px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
            {lang === "es" ? "Contacto de Emergencia" : "Emergency Contact"}
          </label>
          <input
            type="text"
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            placeholder={
              lang === "es"
                ? "Nombre y teléfono"
                : "Name and phone number"
            }
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#B87777] transition-colors"
          />
        </div>

        {/* Language */}
        <div>
          <label className="block text-[10px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
            {lang === "es" ? "Idioma Preferido" : "Preferred Language"}
          </label>
          <div className="flex gap-2">
            {(["es", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setPreferredLang(l)}
                className={`flex-1 py-2 text-xs tracking-[0.1em] uppercase border transition-colors ${
                  preferredLang === l
                    ? "bg-[#2C2C2C] text-white border-[#2C2C2C]"
                    : "text-[#2C2C2C]/40 border-[#2C2C2C]/10"
                }`}
              >
                {l === "es" ? "Español" : "English"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-3 py-2">{error}</p>
        )}

        {saved && (
          <p className="text-sm text-green-600 bg-green-50 px-3 py-2">
            {lang === "es" ? "Perfil actualizado" : "Profile updated"}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-[#2C2C2C] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-40"
        >
          {saving
            ? lang === "es"
              ? "Guardando..."
              : "Saving..."
            : lang === "es"
              ? "Guardar Cambios"
              : "Save Changes"}
        </button>
      </form>

      {/* Password Change Section */}
      <div className="bg-white border border-[#2C2C2C]/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase">
            Contrasena / Password
          </p>
          <button
            onClick={() => { setShowPasswordForm(!showPasswordForm); setPasswordError(""); setPasswordMessage(""); }}
            className="text-[10px] tracking-[0.15em] uppercase text-[#2C2C2C]/40 hover:text-[#B87777] transition-colors"
          >
            {showPasswordForm ? "Cancelar" : "Cambiar"}
          </button>
        </div>

        {passwordMessage && (
          <div className="bg-green-50 border border-green-200 p-3">
            <p className="text-xs text-green-700">{passwordMessage}</p>
          </div>
        )}

        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input
              type="password"
              placeholder="Contrasena actual / Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
            />
            <input
              type="password"
              placeholder="Nueva contrasena / New password (min 6 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
            />
            <input
              type="password"
              placeholder="Confirmar contrasena / Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
            />
            {passwordError && (
              <p className="text-xs text-red-500">{passwordError}</p>
            )}
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-2 bg-[#2C2C2C] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30"
            >
              {passwordLoading ? "Cambiando..." : "Cambiar Contrasena"}
            </button>
          </form>
        )}
      </div>

      {/* Account info */}
      <div className="pt-4 border-t border-[#2C2C2C]/5">
        <p className="text-[10px] text-[#2C2C2C]/20">
          {lang === "es" ? "Miembro desde" : "Member since"}{" "}
          {new Date(profile.created_at).toLocaleDateString(
            lang === "es" ? "es-CO" : "en-US",
            { year: "numeric", month: "long" },
          )}
        </p>
      </div>
    </div>
  );
}
