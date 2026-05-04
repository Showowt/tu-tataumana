/**
 * WellnessOS — Session Generation Script
 * Generates class sessions for the next N weeks from active class definitions.
 *
 * Usage:
 *   npx tsx scripts/generate-sessions.ts
 *   npx tsx scripts/generate-sessions.ts --weeks=6
 *
 * This script:
 * 1. Fetches all active class definitions
 * 2. Generates sessions for each day_of_week match in the date range
 * 3. Skips dates that already have sessions (idempotent)
 * 4. Skips closed dates from tu_closed_dates
 * 5. Inserts new sessions into tu_class_sessions
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local from project root
config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DEFAULT_WEEKS = 4;

interface ClassDefinition {
  id: string;
  name: string;
  day_of_week: number;
  start_time: string;
  teacher: string;
  capacity: number;
  is_active: boolean;
}

function getWeeksArg(): number {
  const arg = process.argv.find((a) => a.startsWith("--weeks="));
  if (arg) {
    const val = parseInt(arg.split("=")[1], 10);
    return isNaN(val) ? DEFAULT_WEEKS : val;
  }
  return DEFAULT_WEEKS;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

async function main() {
  const weeks = getWeeksArg();
  console.log(`Generating sessions for the next ${weeks} weeks...\n`);

  // 1. Fetch active class definitions
  const { data: definitions, error: defError } = await supabase
    .from("tu_class_definitions")
    .select("*")
    .eq("is_active", true);

  if (defError) {
    console.error("Error fetching class definitions:", defError.message);
    process.exit(1);
  }

  if (!definitions || definitions.length === 0) {
    console.log("No active class definitions found.");
    return;
  }

  console.log(`Found ${definitions.length} active class definitions.`);

  // 2. Fetch closed dates
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + weeks * 7);

  const { data: closedDates } = await supabase
    .from("tu_closed_dates")
    .select("date")
    .gte("date", formatDate(today))
    .lte("date", formatDate(endDate));

  const closedSet = new Set((closedDates || []).map((d) => d.date));
  if (closedSet.size > 0) {
    console.log(`Found ${closedSet.size} closed dates to skip.`);
  }

  // 3. Fetch existing sessions to avoid duplicates
  const { data: existingSessions } = await supabase
    .from("tu_class_sessions")
    .select("definition_id, session_date")
    .gte("session_date", formatDate(today))
    .lte("session_date", formatDate(endDate));

  const existingSet = new Set(
    (existingSessions || []).map(
      (s) => `${s.definition_id}_${s.session_date}`,
    ),
  );

  // 4. Generate sessions
  const sessionsToInsert: Array<{
    definition_id: string;
    session_date: string;
    start_time: string;
    teacher: string;
    capacity: number;
    status: string;
  }> = [];

  const current = new Date(today);
  current.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const dayOfWeek = current.getDay(); // 0 = Sunday
    const dateStr = formatDate(current);

    // Skip closed dates
    if (!closedSet.has(dateStr)) {
      for (const def of definitions as ClassDefinition[]) {
        if (def.day_of_week === dayOfWeek) {
          const key = `${def.id}_${dateStr}`;
          if (!existingSet.has(key)) {
            sessionsToInsert.push({
              definition_id: def.id,
              session_date: dateStr,
              start_time: def.start_time,
              teacher: def.teacher,
              capacity: def.capacity,
              status: "scheduled",
            });
          }
        }
      }
    }

    current.setDate(current.getDate() + 1);
  }

  if (sessionsToInsert.length === 0) {
    console.log("\nNo new sessions to generate — all dates already covered.");
    return;
  }

  console.log(`\nInserting ${sessionsToInsert.length} new sessions...`);

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < sessionsToInsert.length; i += BATCH_SIZE) {
    const batch = sessionsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("tu_class_sessions").insert(batch);

    if (error) {
      console.error(`Error inserting batch at index ${i}:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\nDone! Inserted ${inserted} sessions.`);

  // Summary by day
  const byDay: Record<string, number> = {};
  for (const s of sessionsToInsert) {
    const day = new Date(s.session_date + "T12:00:00").toLocaleDateString(
      "en-US",
      { weekday: "long" },
    );
    byDay[day] = (byDay[day] || 0) + 1;
  }
  console.log("\nSessions by day:");
  for (const [day, count] of Object.entries(byDay)) {
    console.log(`  ${day}: ${count}`);
  }
}

main().catch(console.error);
