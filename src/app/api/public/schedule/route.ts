import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DAY_NAMES: Record<number, { en: string; es: string; short: string }> = {
  0: { en: "Sunday", es: "Domingo", short: "SUN" },
  1: { en: "Monday", es: "Lunes", short: "MON" },
  2: { en: "Tuesday", es: "Martes", short: "TUE" },
  3: { en: "Wednesday", es: "Miercoles", short: "WED" },
  4: { en: "Thursday", es: "Jueves", short: "THU" },
  5: { en: "Friday", es: "Viernes", short: "FRI" },
  6: { en: "Saturday", es: "Sabado", short: "SAT" },
};

// Display order: Monday through Sunday
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// How many days ahead the dated (session-based) schedule covers
const DATED_RANGE_DAYS = 28;

interface ClassDefinition {
  id: string;
  name: string;
  name_es: string;
  description: string | null;
  description_es: string | null;
  day_of_week: number;
  start_time: string;
  teacher: string;
  style: string;
  capacity: number;
  duration_minutes: number;
  note: string | null;
  location: string;
  price_cop: number;
  price_usd: number;
}

interface SessionRow {
  id: string;
  session_date: string;
  start_time: string;
  teacher: string;
  capacity: number;
  enrolled: number;
  status: string;
  definition: {
    name: string;
    name_es: string;
    description: string | null;
    description_es: string | null;
    style: string;
    duration_minutes: number;
    note: string | null;
    location: string;
    price_cop: number;
    price_usd: number;
  } | null;
}

interface ScheduleDay {
  day_of_week: number;
  day_name: string;
  day_name_es: string;
  day_short: string;
  classes: ClassDefinition[];
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

/**
 * GET /api/public/schedule
 * Returns:
 *  - schedule: recurring weekly template (tu_class_definitions) grouped by day — fallback
 *  - dates:    ACTUAL dated classes from tu_class_sessions for the covered range —
 *              this is the source of truth so week-specific changes (cancellations,
 *              moved times, one-off classes) appear on the public site
 *  - coverage: date range where `dates` is authoritative; outside it, use `schedule`
 * No auth required — public data.
 */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const supabase = createClient(url, key);
    const today = bogotaToday();
    const rangeEnd = addDaysStr(today, DATED_RANGE_DAYS);

    const [defsResult, sessionsResult] = await Promise.all([
      supabase
        .from("tu_class_definitions")
        .select("id, name, name_es, description, description_es, day_of_week, start_time, teacher, style, capacity, duration_minutes, note, location, price_cop, price_usd")
        .eq("is_active", true)
        .order("day_of_week")
        .order("start_time"),
      supabase
        .from("tu_class_sessions")
        .select(
          `id, session_date, start_time, teacher, capacity, enrolled, status,
           definition:tu_class_definitions (
             name, name_es, description, description_es, style,
             duration_minutes, note, location, price_cop, price_usd
           )`,
        )
        .gte("session_date", today)
        .lte("session_date", rangeEnd)
        .order("session_date")
        .order("start_time"),
    ]);

    if (defsResult.error) {
      console.error("[public/schedule] DB error:", defsResult.error.message);
      return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 });
    }

    // ── Template (fallback beyond session coverage) ──────────────────────────
    const byDay = new Map<number, ClassDefinition[]>();
    for (const cls of (defsResult.data || []) as ClassDefinition[]) {
      if (!byDay.has(cls.day_of_week)) byDay.set(cls.day_of_week, []);
      byDay.get(cls.day_of_week)!.push(cls);
    }

    const schedule: ScheduleDay[] = DISPLAY_ORDER
      .filter((d) => byDay.has(d))
      .map((d) => ({
        day_of_week: d,
        day_name: DAY_NAMES[d].en,
        day_name_es: DAY_NAMES[d].es,
        day_short: DAY_NAMES[d].short,
        classes: byDay.get(d) || [],
      }));

    // ── Actual dated sessions (source of truth) ──────────────────────────────
    const allSessions = (sessionsResult.data || []) as unknown as SessionRow[];

    // Coverage = up to the furthest generated session date (any status).
    // Beyond that, sessions simply haven't been generated yet — fall back to template.
    let coverage: { from: string; to: string } | null = null;
    if (allSessions.length > 0) {
      const maxDate = allSessions.reduce(
        (max, s) => (s.session_date > max ? s.session_date : max),
        today,
      );
      coverage = { from: today, to: maxDate };
    }

    const dates: Record<
      string,
      Array<{
        session_id: string;
        start_time: string;
        name: string;
        name_es: string;
        description: string | null;
        description_es: string | null;
        teacher: string;
        note: string | null;
        style: string;
        capacity: number;
        enrolled: number;
        spots_left: number;
      }>
    > = {};

    for (const s of allSessions) {
      if (s.status !== "scheduled" || !s.definition) continue;
      if (!dates[s.session_date]) dates[s.session_date] = [];
      dates[s.session_date].push({
        session_id: s.id,
        start_time: s.start_time,
        name: s.definition.name,
        name_es: s.definition.name_es,
        description: s.definition.description,
        description_es: s.definition.description_es,
        teacher: s.teacher,
        note: s.definition.note,
        style: s.definition.style,
        capacity: s.capacity,
        enrolled: s.enrolled,
        spots_left: Math.max(0, s.capacity - s.enrolled),
      });
    }

    const response = NextResponse.json({ schedule, dates, coverage });

    // Short cache so admin changes reach the live site within ~2 minutes
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=300",
    );

    return response;
  } catch (err) {
    console.error("[public/schedule] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
