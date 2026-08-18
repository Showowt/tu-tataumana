/**
 * Generates schedule text dynamically from the DB.
 * Used by the chatbot system prompt so it always has the current schedule.
 *
 * Uses tu_class_sessions (the ACTUAL dated schedule, reflecting week-specific
 * cancellations, moved times, and one-off classes) for the next 7 days, and
 * falls back to the tu_class_definitions template if no sessions exist.
 *
 * Server-side only — uses service role Supabase client.
 */

import { createClient } from "@supabase/supabase-js";

const DAY_LABELS: Record<number, string> = {
  1: "MONDAY (Lunes)",
  2: "TUESDAY (Martes)",
  3: "WEDNESDAY (Miercoles)",
  4: "THURSDAY (Jueves)",
  5: "FRIDAY (Viernes)",
  6: "SATURDAY (Sabado)",
  0: "SUNDAY (Domingo)",
};

const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function bogotaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days, 12, 0, 0);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function dayOfWeekOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getDay();
}

interface SessionWithDef {
  session_date: string;
  start_time: string;
  teacher: string;
  capacity: number;
  enrolled: number;
  definition: {
    name: string;
    description: string | null;
    description_es: string | null;
    note: string | null;
  } | null;
}

interface DefRow {
  name: string;
  name_es: string;
  description: string | null;
  description_es: string | null;
  day_of_week: number;
  start_time: string;
  teacher: string;
  style: string;
  note: string | null;
}

// In-memory cache (5 minutes TTL)
let _cache: { text: string; teachers: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function generateScheduleText(): Promise<{ scheduleBlock: string; teachersBlock: string }> {
  if (_cache && Date.now() - _cache.timestamp < CACHE_TTL) {
    return { scheduleBlock: _cache.text, teachersBlock: _cache.teachers };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return { scheduleBlock: "(Schedule not available)", teachersBlock: "" };
  }

  const supabase = createClient(url, key);
  const today = bogotaToday();
  const weekEnd = addDaysStr(today, 6);

  const [sessionsResult, defsResult] = await Promise.all([
    supabase
      .from("tu_class_sessions")
      .select(
        `session_date, start_time, teacher, capacity, enrolled,
         definition:tu_class_definitions (name, description, description_es, note)`,
      )
      .gte("session_date", today)
      .lte("session_date", weekEnd)
      .eq("status", "scheduled")
      .order("session_date")
      .order("start_time"),
    supabase
      .from("tu_class_definitions")
      .select("name, name_es, description, description_es, day_of_week, start_time, teacher, style, note")
      .eq("is_active", true)
      .order("day_of_week")
      .order("start_time"),
  ]);

  const sessions = (sessionsResult.data || []) as unknown as SessionWithDef[];
  const defs = (defsResult.data || []) as DefRow[];

  if (sessions.length === 0 && defs.length === 0) {
    return { scheduleBlock: "(Schedule not available)", teachersBlock: "" };
  }

  const lines: string[] = [];

  if (sessions.length > 0) {
    // ── Actual dated schedule for the next 7 days ──────────────────────────
    lines.push(
      "THIS WEEK'S ACTUAL SCHEDULE (next 7 days, real dates — this reflects any changes, cancellations, or special classes for this specific week. USE THIS when telling people what's happening on a specific day or date):",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
    );

    const byDate = new Map<string, SessionWithDef[]>();
    for (const s of sessions) {
      if (!byDate.has(s.session_date)) byDate.set(s.session_date, []);
      byDate.get(s.session_date)!.push(s);
    }

    for (let i = 0; i < 7; i++) {
      const dateStr = addDaysStr(today, i);
      const dow = dayOfWeekOf(dateStr);
      const dayLabel = `${DAY_LABELS[dow]} ${dateStr}${i === 0 ? " (TODAY/HOY)" : i === 1 ? " (TOMORROW/MAÑANA)" : ""}`;
      const daySessions = byDate.get(dateStr);

      lines.push(`${dayLabel}:`);
      if (!daySessions || daySessions.length === 0) {
        lines.push("  (no classes this day / sin clases este dia)");
      } else {
        for (const s of daySessions) {
          const time = formatTime12(s.start_time);
          const name = s.definition?.name || "Class";
          const note = s.definition?.note ? ` ${s.definition.note}` : "";
          const desc = s.definition?.description_es || s.definition?.description || "";
          const spots = Math.max(0, s.capacity - s.enrolled);
          const spotsNote = spots === 0 ? " [FULL/LLENA]" : "";
          lines.push(`  ${time} — ${name}${note} (${s.teacher})${spotsNote}${desc ? ` — ${desc}` : ""}`);
        }
      }
      lines.push("");
    }
  }

  // ── Recurring weekly template (general reference) ────────────────────────
  if (defs.length > 0) {
    lines.push(
      sessions.length > 0
        ? "REGULAR WEEKLY SCHEDULE (general template — the week above takes priority if they differ):"
        : "WEEKLY CLASS SCHEDULE:",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
    );

    const byDay = new Map<number, DefRow[]>();
    for (const cls of defs) {
      if (!byDay.has(cls.day_of_week)) byDay.set(cls.day_of_week, []);
      byDay.get(cls.day_of_week)!.push(cls);
    }

    for (const day of DISPLAY_ORDER) {
      const classes = byDay.get(day);
      if (!classes || classes.length === 0) continue;

      lines.push(`${DAY_LABELS[day]}:`);
      for (const cls of classes) {
        const time = formatTime12(cls.start_time);
        const teacher = cls.teacher || "TBA";
        const desc = cls.description_es || cls.description || "";
        const note = cls.note ? ` ${cls.note}` : "";
        lines.push(`  ${time} — ${cls.name}${note} (${teacher}) — ${desc}`);
      }
      lines.push("");
    }
  }

  // ── Teachers block ───────────────────────────────────────────────────────
  const teacherSet = new Map<string, string[]>();
  for (const cls of defs) {
    const t = cls.teacher || "TBA";
    if (!teacherSet.has(t)) teacherSet.set(t, []);
    teacherSet.get(t)!.push(`${DAY_LABELS[cls.day_of_week]?.split(" ")[0] || ""} ${formatTime12(cls.start_time)} ${cls.name}`);
  }

  const teacherLines: string[] = ["TEACHERS:"];
  for (const [teacher, classes] of teacherSet) {
    teacherLines.push(`- ${teacher}: Teaches ${classes.join(", ")}.`);
  }

  const scheduleBlock = lines.join("\n");
  const teachersBlock = teacherLines.join("\n");

  _cache = { text: scheduleBlock, teachers: teachersBlock, timestamp: Date.now() };

  return { scheduleBlock, teachersBlock };
}
