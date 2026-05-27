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

interface ScheduleDay {
  day_of_week: number;
  day_name: string;
  day_name_es: string;
  day_short: string;
  classes: ClassDefinition[];
}

/**
 * GET /api/public/schedule
 * Returns active class definitions grouped by day.
 * No auth required — public data. Cached 5 minutes.
 */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const supabase = createClient(url, key);

    const { data, error } = await supabase
      .from("tu_class_definitions")
      .select("id, name, name_es, description, description_es, day_of_week, start_time, teacher, style, capacity, duration_minutes, note, location, price_cop, price_usd")
      .eq("is_active", true)
      .order("day_of_week")
      .order("start_time");

    if (error) {
      console.error("[public/schedule] DB error:", error.message);
      return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 });
    }

    // Group by day in display order (Mon-Sun)
    const byDay = new Map<number, ClassDefinition[]>();
    for (const cls of (data || []) as ClassDefinition[]) {
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

    const response = NextResponse.json({ schedule });

    // Cache for 5 minutes, serve stale for 10 minutes while revalidating
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );

    return response;
  } catch (err) {
    console.error("[public/schedule] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
