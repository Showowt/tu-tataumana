"use client";

import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Setting {
  key: string;
  value: string;
  label: string;
  category: string;
  editable: boolean;
  updated_at: string;
  updated_by: string | null;
}

type GroupedSettings = Record<string, Setting[]>;

const CATEGORY_LABELS: Record<string, string> = {
  studio: "Estudio",
  contact: "Contacto",
  booking: "Reservas",
  pricing: "Precios",
  notifications: "Notificaciones",
  general: "General",
};

const CATEGORY_ORDER = ["studio", "contact", "booking", "pricing", "notifications", "general"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<GroupedSettings>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentRole, setCurrentRole] = useState("manager");

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  }

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.data || {});
        setCurrentRole(data.current_role || "manager");
      }
    } catch {
      showMessage("Error cargando configuracion");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const canEdit = currentRole !== "manager";

  function startEdit(setting: Setting) {
    if (!canEdit || !setting.editable) return;
    setEditing(setting.key);
    setEditValue(setting.value);
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue("");
  }

  async function saveEdit(key: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: editValue }),
      });

      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error al guardar");
      } else {
        showMessage("Guardado");
        setEditing(null);
        await loadSettings();
      }
    } catch {
      showMessage("Error de conexion");
    }
    setSaving(false);
  }

  function formatValue(setting: Setting): string {
    // Format numbers with thousands separator for COP values
    if (setting.key.includes("price") || setting.key.includes("rate")) {
      const num = Number(setting.value);
      if (!isNaN(num)) {
        return `$${num.toLocaleString("es-CO")}`;
      }
    }
    if (setting.key.includes("hours")) {
      return `${setting.value}h`;
    }
    return setting.value;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
        Configuracion
      </h1>

      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 p-3">
          <p className="text-[10px] text-amber-700 tracking-wider uppercase">
            Solo lectura — solo owners y admins pueden editar configuracion
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER
            .filter((cat) => settings[cat] && settings[cat].length > 0)
            .map((category) => (
              <section key={category}>
                <h2
                  className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase mb-3"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {CATEGORY_LABELS[category] || category}
                </h2>

                <div className="space-y-1">
                  {settings[category].map((setting) => {
                    const isEditing = editing === setting.key;

                    return (
                      <div
                        key={setting.key}
                        className={`bg-white border p-4 ${
                          isEditing
                            ? "border-[#B87777]/30"
                            : "border-[#2C2C2C]/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-xs text-[#2C2C2C]/50"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              {setting.label}
                            </p>

                            {isEditing ? (
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(setting.key);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                  autoFocus
                                  className="flex-1 px-2 py-1 border border-[#B87777] bg-white text-sm text-[#2C2C2C] focus:outline-none"
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                />
                                <button
                                  onClick={() => saveEdit(setting.key)}
                                  disabled={saving}
                                  className="text-[9px] tracking-[0.1em] uppercase px-3 py-1.5 bg-[#C9A96E] text-white hover:bg-[#B87777] transition-colors disabled:opacity-40"
                                >
                                  {saving ? "..." : "OK"}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-[9px] text-[#2C2C2C]/30 hover:text-red-400 transition-colors"
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <p
                                className="text-sm text-[#2C2C2C] mt-0.5"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                {formatValue(setting)}
                              </p>
                            )}

                            {setting.updated_by && !isEditing && (
                              <p className="text-[9px] text-[#2C2C2C]/20 mt-1">
                                Editado por {setting.updated_by}
                              </p>
                            )}
                          </div>

                          {/* Edit button */}
                          {canEdit && setting.editable && !isEditing && (
                            <button
                              onClick={() => startEdit(setting)}
                              className="text-[9px] text-[#2C2C2C]/20 hover:text-[#B87777] transition-colors uppercase shrink-0"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              Editar
                            </button>
                          )}

                          {!setting.editable && (
                            <span className="text-[8px] text-[#2C2C2C]/15 uppercase shrink-0">
                              Sistema
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
      )}

      {/* Help */}
      <div className="bg-[#FAF8F5] border border-[#2C2C2C]/5 p-4">
        <p
          className="text-[10px] text-[#2C2C2C]/40 leading-relaxed"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Los cambios se aplican inmediatamente. La configuracion del sistema
          (zona horaria, moneda) no se puede cambiar desde aqui — contacta a
          soporte tecnico.
        </p>
      </div>
    </div>
  );
}
