"use client";

import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "admin" | "manager";
  is_active: boolean;
  telegram_chat_id: string | null;
  created_at: string;
}

type NewMemberRole = "admin" | "manager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  owner: { label: "Owner", color: "text-[#C9A96E] bg-[#C9A96E]/10" },
  admin: { label: "Admin", color: "text-[#B87777] bg-[#B87777]/10" },
  manager: { label: "Manager", color: "text-blue-600 bg-blue-50" },
};

const ROLE_LEVEL: Record<string, number> = {
  owner: 3,
  admin: 2,
  manager: 1,
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentRole, setCurrentRole] = useState<string>("manager");
  const [currentEmail, setCurrentEmail] = useState<string>("");

  // Add member form
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<NewMemberRole>("manager");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  }

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.data || []);
        setCurrentRole(data.current_role || "manager");
        setCurrentEmail(data.current_email || "");
      } else if (res.status === 401) {
        showMessage("No autorizado");
      }
    } catch {
      showMessage("Error cargando equipo");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const canManage = ROLE_LEVEL[currentRole] >= ROLE_LEVEL["admin"];

  async function handleAddMember() {
    if (!newEmail.trim() || !newName.trim()) {
      showMessage("Email y nombre son requeridos");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          full_name: newName.trim(),
          role: newRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.error || "Error al agregar");
      } else {
        showMessage(data.message || "Miembro agregado");
        setNewEmail("");
        setNewName("");
        setNewRole("manager");
        setShowForm(false);
        await loadTeam();
      }
    } catch {
      showMessage("Error de conexion");
    }
    setAdding(false);
  }

  async function handleRemove(memberId: string, memberName: string) {
    if (!confirm(`Remover a ${memberName} del equipo?`)) return;

    setRemoving(memberId);
    try {
      const res = await fetch("/api/admin/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.error || "Error al remover");
      } else {
        showMessage(data.message || "Miembro removido");
        await loadTeam();
      }
    } catch {
      showMessage("Error de conexion");
    }
    setRemoving(null);
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl text-[#2C2C2C]"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          Equipo
        </h1>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-[#2C2C2C] text-white hover:bg-[#B87777] transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {showForm ? "Cancelar" : "+ Agregar"}
          </button>
        )}
      </div>

      {/* Add member form */}
      {showForm && canManage && (
        <div className="bg-white border border-[#C9A96E]/20 p-4 space-y-3">
          <p
            className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Nuevo Miembro
          </p>

          <input
            type="text"
            placeholder="Nombre completo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#B87777]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />

          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#B87777]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />

          <div className="flex gap-2">
            {(["manager", "admin"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setNewRole(r)}
                className={`flex-1 py-2 text-[10px] tracking-[0.15em] uppercase border transition-colors ${
                  newRole === r
                    ? "bg-[#2C2C2C] text-white border-[#2C2C2C]"
                    : "text-[#2C2C2C]/40 border-[#2C2C2C]/10 hover:border-[#2C2C2C]/30"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="bg-[#FAF8F5] border border-[#2C2C2C]/5 p-3">
            <p
              className="text-[9px] text-[#2C2C2C]/40 leading-relaxed"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {newRole === "manager"
                ? "Manager: puede ver el dashboard, reservas, clases, alumnos y packs. No puede verificar pagos, manejar descuentos ni gestionar el equipo."
                : "Admin: acceso completo. Puede verificar pagos, crear descuentos y agregar managers."}
            </p>
          </div>

          <button
            onClick={handleAddMember}
            disabled={adding || !newEmail.trim() || !newName.trim()}
            className="w-full py-3 bg-[#C9A96E] text-white text-[11px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {adding ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Agregando...
              </>
            ) : (
              "Agregar al Equipo"
            )}
          </button>

          <p
            className="text-[9px] text-[#2C2C2C]/30 text-center leading-relaxed"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Se creara una cuenta automaticamente. El nuevo miembro puede entrar
            con Magic Link desde tataumana.com/login
          </p>
        </div>
      )}

      {/* Team list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">No hay miembros del equipo</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
            {members.filter((m) => m.is_active).length} miembros activos
          </p>

          {members
            .filter((m) => m.is_active)
            .map((member) => {
              const badge = ROLE_BADGES[member.role] || {
                label: member.role,
                color: "text-[#2C2C2C]/30 bg-[#2C2C2C]/5",
              };
              const isCurrentUser = member.email === currentEmail;
              const canRemoveThis =
                canManage &&
                !isCurrentUser &&
                member.role !== "owner" &&
                ROLE_LEVEL[currentRole] > ROLE_LEVEL[member.role];

              return (
                <div
                  key={member.id}
                  className={`bg-white border p-4 ${
                    isCurrentUser
                      ? "border-[#B87777]/20"
                      : "border-[#2C2C2C]/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#2C2C2C] truncate">
                          {member.full_name}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[8px] tracking-wider text-[#B87777] uppercase">
                            (tu)
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#2C2C2C]/40 truncate">
                        {member.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`text-[8px] tracking-wider uppercase px-2 py-0.5 ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        {member.telegram_chat_id && (
                          <span className="text-[8px] tracking-wider text-green-600 bg-green-50 px-2 py-0.5 uppercase">
                            Telegram
                          </span>
                        )}
                        <span className="text-[9px] text-[#2C2C2C]/20">
                          {formatDate(member.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0">
                      {canRemoveThis && (
                        <button
                          onClick={() =>
                            handleRemove(member.id, member.full_name)
                          }
                          disabled={removing === member.id}
                          className="text-[9px] text-red-300 hover:text-red-500 transition-colors disabled:opacity-30 uppercase"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {removing === member.id ? "..." : "Remover"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Inactive members section */}
          {members.some((m) => !m.is_active) && (
            <details className="mt-4">
              <summary className="text-[9px] text-[#2C2C2C]/20 tracking-wider uppercase cursor-pointer hover:text-[#2C2C2C]/40 transition-colors">
                {members.filter((m) => !m.is_active).length} inactivos
              </summary>
              <div className="space-y-2 mt-2">
                {members
                  .filter((m) => !m.is_active)
                  .map((member) => (
                    <div
                      key={member.id}
                      className="bg-white border border-[#2C2C2C]/5 p-4 opacity-40"
                    >
                      <p className="text-sm text-[#2C2C2C] truncate">
                        {member.full_name}
                      </p>
                      <p className="text-[10px] text-[#2C2C2C]/30 truncate">
                        {member.email}
                      </p>
                    </div>
                  ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Help text */}
      <div className="bg-[#FAF8F5] border border-[#2C2C2C]/5 p-4">
        <p
          className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase mb-2"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Roles
        </p>
        <div className="space-y-1.5">
          <p
            className="text-[10px] text-[#2C2C2C]/50 leading-relaxed"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <span className="text-[#C9A96E] font-medium">Owner</span> —
            Control total del sistema. No se puede remover.
          </p>
          <p
            className="text-[10px] text-[#2C2C2C]/50 leading-relaxed"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <span className="text-[#B87777] font-medium">Admin</span> — Acceso
            completo. Puede verificar pagos, crear descuentos y agregar
            managers.
          </p>
          <p
            className="text-[10px] text-[#2C2C2C]/50 leading-relaxed"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <span className="text-blue-600 font-medium">Manager</span> — Puede
            ver dashboard, reservas, clases, alumnos y packs.
          </p>
        </div>
      </div>
    </div>
  );
}
