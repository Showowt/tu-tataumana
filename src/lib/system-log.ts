import { createClient } from "@supabase/supabase-js";

export type LogCategory = "error" | "payment" | "booking" | "discount" | "auth" | "system";
export type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  category: LogCategory;
  level?: LogLevel;
  message: string;
  details?: Record<string, unknown>;
  route?: string;
  student_id?: string;
}

/**
 * Write a structured log to tu_system_logs.
 * Fire-and-forget — never throws, never blocks the caller.
 */
export async function systemLog(entry: LogEntry): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await supabase.from("tu_system_logs").insert({
      category: entry.category,
      level: entry.level || "info",
      message: entry.message,
      details: entry.details || null,
      route: entry.route || null,
      student_id: entry.student_id || null,
    });
  } catch {
    console.error("[systemLog] Failed to write:", entry.message);
  }
}
