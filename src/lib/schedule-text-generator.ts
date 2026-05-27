/**
 * Generates schedule text dynamically from tu_class_definitions DB.
 * Used by the chatbot system prompt so it always has current schedule.
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
  const { data, error } = await supabase
    .from("tu_class_definitions")
    .select("name, name_es, description, description_es, day_of_week, start_time, teacher, style, note")
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  if (error || !data) {
    return { scheduleBlock: "(Schedule not available)", teachersBlock: "" };
  }

  // Group by day
  const byDay = new Map<number, typeof data>();
  for (const cls of data) {
    if (!byDay.has(cls.day_of_week)) byDay.set(cls.day_of_week, []);
    byDay.get(cls.day_of_week)!.push(cls);
  }

  // Build schedule text
  const lines: string[] = [
    "WEEKLY CLASS SCHEDULE (ACTUAL — use this to tell people what's happening on specific days):",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

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

  // Build teachers text from unique teachers
  const teacherSet = new Map<string, string[]>();
  for (const cls of data) {
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
