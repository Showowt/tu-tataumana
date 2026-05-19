"use client";

import { useEffect, useState, useCallback } from "react";

interface LogEntry {
  id: string;
  category: string;
  level: string;
  message: string;
  details: Record<string, unknown> | null;
  route: string | null;
  student_id: string | null;
  created_at: string;
}

const CATEGORIES = ["all", "error", "payment", "booking", "discount", "auth", "system"] as const;
const LEVELS = ["all", "info", "warn", "error"] as const;

const LEVEL_COLORS: Record<string, string> = {
  info: "text-blue-600 bg-blue-50",
  warn: "text-amber-600 bg-amber-50",
  error: "text-red-600 bg-red-50",
};

const CAT_COLORS: Record<string, string> = {
  error: "text-red-500",
  payment: "text-green-600",
  booking: "text-[#B87777]",
  discount: "text-purple-500",
  auth: "text-amber-600",
  system: "text-[#2C2C2C]/40",
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const LIMIT = 50;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (level !== "all") params.set("level", level);
      params.set("limit", String(LIMIT));
      params.set("offset", String(page * LIMIT));

      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setTotal(data.total || 0);
      }
    } catch {
      // Silent
    }
    setLoading(false);
  }, [category, level, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadLogs, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString("es-CO", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl text-[#2C2C2C]"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          Logs del Sistema
        </h1>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="accent-[#B87777]"
          />
          <span className="text-[9px] tracking-[0.15em] text-[#2C2C2C]/40 uppercase">
            Auto-refresh
          </span>
        </label>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => { setCategory(c); setPage(0); }}
              className={`text-[9px] tracking-[0.1em] uppercase px-3 py-1 border transition-colors ${
                category === c
                  ? "bg-[#2C2C2C] text-white border-[#2C2C2C]"
                  : "text-[#2C2C2C]/30 border-[#2C2C2C]/10 hover:border-[#2C2C2C]/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => { setLevel(l); setPage(0); }}
              className={`text-[9px] tracking-[0.1em] uppercase px-3 py-1 border transition-colors ${
                level === l
                  ? "bg-[#2C2C2C] text-white border-[#2C2C2C]"
                  : "text-[#2C2C2C]/30 border-[#2C2C2C]/10 hover:border-[#2C2C2C]/30"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Log entries */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-[#2C2C2C]/5 p-8 text-center">
          <p className="text-sm text-[#2C2C2C]/40">
            No hay logs{category !== "all" ? ` en "${category}"` : ""}
            {level !== "all" ? ` (${level})` : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-[9px] text-[#2C2C2C]/20 tracking-wider uppercase">
            {total} entradas · pagina {page + 1}/{totalPages || 1}
          </p>

          {logs.map((log) => (
            <div key={log.id} className="bg-white border border-[#2C2C2C]/5">
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full p-3 text-left flex items-start gap-3"
              >
                {/* Level badge */}
                <span
                  className={`text-[7px] tracking-wider uppercase px-1.5 py-0.5 shrink-0 mt-0.5 ${
                    LEVEL_COLORS[log.level] || "text-[#2C2C2C]/30 bg-[#2C2C2C]/5"
                  }`}
                >
                  {log.level}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#2C2C2C] truncate">
                    {log.message}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[9px] ${CAT_COLORS[log.category] || "text-[#2C2C2C]/30"}`}
                    >
                      {log.category}
                    </span>
                    {log.route && (
                      <span className="text-[9px] text-[#2C2C2C]/15 font-mono">
                        {log.route}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-[#2C2C2C]/30">
                    {timeAgo(log.created_at)}
                  </span>
                </div>
              </button>

              {/* Expanded details */}
              {expanded === log.id && (
                <div className="px-3 pb-3 border-t border-[#2C2C2C]/5">
                  <div className="mt-2 space-y-1">
                    <p className="text-[9px] text-[#2C2C2C]/30">
                      {formatTime(log.created_at)}
                    </p>
                    {log.student_id && (
                      <p className="text-[9px] text-[#2C2C2C]/30">
                        Student: {log.student_id.slice(0, 8)}...
                      </p>
                    )}
                    {log.details && (
                      <pre className="text-[10px] text-[#2C2C2C]/50 bg-[#FAF8F5] p-2 overflow-x-auto whitespace-pre-wrap break-all mt-2">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="text-[10px] px-3 py-1.5 border border-[#2C2C2C]/10 text-[#2C2C2C]/40 disabled:opacity-20"
              >
                Anterior
              </button>
              <span className="text-[10px] text-[#2C2C2C]/30">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="text-[10px] px-3 py-1.5 border border-[#2C2C2C]/10 text-[#2C2C2C]/40 disabled:opacity-20"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
