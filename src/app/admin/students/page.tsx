"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface StudentData {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  preferred_lang: "en" | "es";
  role: string;
  notes: string | null;
  created_at: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBirthday, setNewBirthday] = useState("");
  const [creating, setCreating] = useState(false);
  const [loginLink, setLoginLink] = useState("");
  const [createdName, setCreatedName] = useState("");

  // CSV export
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/students/export");
      if (!res.ok) {
        showMessage("Error al exportar");
        setExporting(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "alumnos.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage("CSV descargado");
    } catch {
      showMessage("Error de conexion");
    }
    setExporting(false);
  }

  // CSV import
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  async function handleCsvImport() {
    if (!csvText.trim()) return;
    setImporting(true);
    setImportResult(null);

    // Parse CSV: each line is "name, email, phone" or "name, email" or just "name"
    const lines = csvText.split("\n").filter((l) => l.trim());
    const students = lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return {
        name: parts[0] || "",
        email: parts[1] || undefined,
        phone: parts[2] || undefined,
      };
    }).filter((s) => s.name.length >= 2);

    if (students.length === 0) {
      showMessage("No se encontraron alumnos validos en el CSV");
      setImporting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error al importar");
      } else {
        setImportResult(data);
        showMessage(`${data.created} alumnos creados`);
        setCsvText("");
        await loadStudents();
      }
    } catch {
      showMessage("Error de conexion");
    }
    setImporting(false);
  }

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/students?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.data || []);
      }
    } catch {
      showMessage("Error cargando alumnos");
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(loadStudents, 300);
    return () => clearTimeout(t);
  }, [loadStudents]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setLoginLink("");
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          full_name: newName.trim(),
          phone: newPhone.trim() || null,
          birthday: newBirthday || null,
          create_account: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Error creando alumno");
      } else {
        if (data.loginLink) {
          setCreatedName(newName.trim());
          setLoginLink(data.loginLink);
          showMessage("Alumno creado con cuenta de acceso");
        } else {
          showMessage(data.accountCreated ? "Alumno creado con cuenta" : "Alumno creado");
          setShowCreate(false);
        }
        setNewEmail("");
        setNewName("");
        setNewPhone("");
        setNewBirthday("");
        await loadStudents();
      }
    } catch {
      showMessage("Error de conexion");
    }
    setCreating(false);
  }

  async function copyLink(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showMessage("Enlace copiado");
    } catch {
      showMessage("No se pudo copiar");
    }
  }

  function sendViaWhatsApp(link: string, studentName: string) {
    const msg = encodeURIComponent(
      `Hola ${studentName}! Tu cuenta en TU. by Tata Umana esta lista. Haz clic en este enlace para acceder a tu portal:\n\n${link}\n\nEl enlace es valido por 7 dias. Una vez dentro, podras ver tus clases, packs y reservas.`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
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
          Alumnos
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="text-[10px] tracking-[0.15em] uppercase px-4 py-2 border border-[#2C2C2C]/20 text-[#2C2C2C]/50 hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors disabled:opacity-30"
          >
            {exporting ? "..." : "Descargar"}
          </button>
          <button
            onClick={() => { setShowImport(!showImport); setShowCreate(false); }}
            className="text-[10px] tracking-[0.15em] uppercase px-4 py-2 border border-[#C9A96E] text-[#C9A96E] hover:bg-[#C9A96E] hover:text-white transition-colors"
          >
            CSV
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setShowImport(false); }}
            className="text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-[#2C2C2C] text-white hover:bg-[#B87777] transition-colors"
          >
            {showCreate ? "Cerrar" : "+ Nuevo"}
          </button>
        </div>
      </div>

      {/* CSV Import */}
      {showImport && (
        <div className="bg-white border border-[#C9A96E]/20 p-4 space-y-3">
          <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase" style={{ fontFamily: "Outfit, sans-serif" }}>
            Importar Alumnos (CSV)
          </p>
          <p className="text-[9px] text-[#2C2C2C]/40 leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
            Pega los datos en formato: <b>nombre, email, telefono</b> (uno por linea). Email y telefono son opcionales.
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={"Maria Garcia, maria@email.com, 3001234567\nJuan Perez, juan@email.com\nAna Lopez"}
            rows={8}
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/15 focus:outline-none focus:border-[#C9A96E] font-mono"
          />
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-[#2C2C2C]/30">
              {csvText.split("\n").filter((l) => l.trim()).length} lineas
            </p>
            <button
              onClick={handleCsvImport}
              disabled={importing || !csvText.trim()}
              className="text-[10px] tracking-[0.15em] uppercase px-6 py-2 bg-[#C9A96E] text-white hover:bg-[#B87777] transition-colors disabled:opacity-30 flex items-center gap-2"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {importing ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importando...
                </>
              ) : (
                "Importar"
              )}
            </button>
          </div>
          {importResult && (
            <div className="bg-[#FAF8F5] border border-[#2C2C2C]/5 p-3 space-y-1">
              <p className="text-xs text-green-600">{importResult.created} creados</p>
              {importResult.skipped > 0 && (
                <p className="text-xs text-amber-600">{importResult.skipped} omitidos</p>
              )}
              {importResult.errors.length > 0 && (
                <details>
                  <summary className="text-[9px] text-[#2C2C2C]/30 cursor-pointer">Detalles</summary>
                  <div className="mt-1 space-y-0.5">
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-[9px] text-[#2C2C2C]/40">{e}</p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-[#C9A96E]/20 p-4 space-y-3"
        >
          <p className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase">
            Crear Alumno
          </p>
          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
          />
          <input
            type="text"
            placeholder="Nombre completo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            minLength={2}
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
          />
          <input
            type="tel"
            placeholder="WhatsApp (opcional)"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#C9A96E]"
          />
          <div>
            <label className="block text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase mb-1">
              Cumpleaños (opcional)
            </label>
            <input
              type="date"
              value={newBirthday}
              onChange={(e) => setNewBirthday(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A96E]"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-full py-2 bg-[#C9A96E] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors disabled:opacity-30"
          >
            {creating ? "Creando cuenta..." : "Crear Alumno + Cuenta"}
          </button>
          <p className="text-[9px] text-[#2C2C2C]/30 text-center">
            Se crea cuenta de acceso automaticamente. Recibes un enlace para enviar por WhatsApp.
          </p>
        </form>
      )}

      {/* Login link after creating student */}
      {loginLink && (
        <div className="bg-green-50 border border-green-200 p-4 space-y-3">
          <p className="text-[10px] tracking-[0.2em] text-green-700 uppercase font-medium">
            Cuenta creada - Enlace de acceso
          </p>
          <p className="text-xs text-green-600">
            Envia este enlace al alumno por WhatsApp para que pueda acceder a su portal:
          </p>
          <div className="bg-white border border-green-200 p-2 rounded text-[10px] text-[#2C2C2C]/60 break-all select-all">
            {loginLink}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyLink(loginLink)}
              className="flex-1 py-2 bg-[#2C2C2C] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#B87777] transition-colors"
            >
              Copiar Enlace
            </button>
            <button
              onClick={() => {
                sendViaWhatsApp(loginLink, createdName);
                setLoginLink("");
                setCreatedName("");
                setShowCreate(false);
              }}
              className="flex-1 py-2 bg-[#25D366] text-white text-[10px] tracking-[0.15em] uppercase hover:bg-[#20bd5a] transition-colors"
            >
              Enviar por WhatsApp
            </button>
          </div>
          <button
            onClick={() => { setLoginLink(""); setShowCreate(false); }}
            className="w-full text-center text-[9px] text-[#2C2C2C]/30 hover:text-[#2C2C2C]/50 transition-colors py-1"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar por nombre, email o teléfono..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 border border-[#2C2C2C]/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/20 focus:outline-none focus:border-[#B87777]"
      />

      {/* Students list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">
            {search ? "Sin resultados" : "No hay alumnos registrados"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-[#2C2C2C]/30 tracking-wider uppercase">
            {students.length} {students.length === 1 ? "alumno" : "alumnos"}
          </p>
          {students.map((s) => (
            <Link
              key={s.id}
              href={`/admin/students/${s.id}`}
              className="block bg-white border border-[#2C2C2C]/5 p-4 hover:border-[#B87777]/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#2C2C2C] truncate">
                      {s.full_name}
                    </p>
                    {s.role === "admin" && (
                      <span className="text-[8px] tracking-wider text-[#C9A96E] bg-[#C9A96E]/10 px-2 py-0.5 uppercase shrink-0">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#2C2C2C]/40 truncate">
                    {s.email}
                  </p>
                  {s.phone && (
                    <p className="text-xs text-[#2C2C2C]/30">{s.phone}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-[#2C2C2C]/20">
                    {new Date(s.created_at).toLocaleDateString("es-CO", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-[9px] text-[#2C2C2C]/15 uppercase mt-0.5">
                    {s.preferred_lang}
                  </p>
                </div>
              </div>
              {s.notes && (
                <p className="text-[10px] text-[#2C2C2C]/30 mt-2 border-t border-[#2C2C2C]/5 pt-2">
                  {s.notes}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
