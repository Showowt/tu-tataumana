/**
 * GET /api/health
 * Production health check — tests every layer that can silently break:
 *   1. Supabase connection (can we reach the DB?)
 *   2. auth.users integrity (NULL varchar columns that crash GoTrue)
 *   3. tu_students table access (RLS + table exists)
 *   4. Auth service (can GoTrue respond to a /settings call?)
 *   5. Environment variables (are all required keys present?)
 *
 * Returns { status: "healthy" | "degraded" | "down", checks: [...] }
 * Protected by CRON_SECRET to prevent public probing.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = ReturnType<typeof createClient<any>>;

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  ms: number;
  detail?: string;
}

export async function GET(request: NextRequest) {
  // Auth: allow cron secret or admin key
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const adminKey = process.env.TU_ADMIN_KEY;
  const queryKey = new URL(request.url).searchParams.get("key");

  const authorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (adminKey && queryKey === adminKey) ||
    (cronSecret && queryKey === cronSecret);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks: CheckResult[] = [];
  const start = Date.now();

  // 1. Environment variables
  const envCheck = checkEnvVars();
  checks.push(envCheck);

  // If no Supabase URL, everything else will fail
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    checks.push({ name: "supabase_connection", status: "fail", ms: 0, detail: "Missing Supabase credentials" });
    checks.push({ name: "auth_integrity", status: "fail", ms: 0, detail: "Skipped — no connection" });
    checks.push({ name: "students_table", status: "fail", ms: 0, detail: "Skipped — no connection" });
    checks.push({ name: "gotrue_service", status: "fail", ms: 0, detail: "Skipped — no connection" });
  } else {
    const supabase = createClient(supabaseUrl, serviceKey);

    // Run independent checks in parallel
    const [connResult, integrityResult, studentsResult, gotrueResult] = await Promise.all([
      checkSupabaseConnection(supabase),
      checkAuthIntegrity(supabase),
      checkStudentsTable(supabase),
      checkGoTrueService(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""),
    ]);

    checks.push(connResult, integrityResult, studentsResult, gotrueResult);
  }

  // 5. Telegram connectivity
  const telegramResult = await checkTelegram();
  checks.push(telegramResult);

  const totalMs = Date.now() - start;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  const status = failCount > 0 ? "down" : warnCount > 0 ? "degraded" : "healthy";

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    total_ms: totalMs,
    checks,
  }, {
    status: status === "down" ? 503 : 200,
  });
}

function checkEnvVars(): CheckResult {
  const t0 = Date.now();
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
  ];
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length === 0) {
    return { name: "env_vars", status: "pass", ms: Date.now() - t0, detail: `${required.length}/${required.length} present` };
  }
  // Telegram missing is a warning, Supabase missing is a fail
  const supabaseMissing = missing.some((k) => k.includes("SUPABASE"));
  return {
    name: "env_vars",
    status: supabaseMissing ? "fail" : "warn",
    ms: Date.now() - t0,
    detail: `Missing: ${missing.join(", ")}`,
  };
}

async function checkSupabaseConnection(supabase: AnyClient): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const { error } = await supabase.from("tu_students").select("id").limit(1);
    if (error) {
      return { name: "supabase_connection", status: "fail", ms: Date.now() - t0, detail: error.message };
    }
    return { name: "supabase_connection", status: "pass", ms: Date.now() - t0 };
  } catch (err) {
    return { name: "supabase_connection", status: "fail", ms: Date.now() - t0, detail: String(err) };
  }
}

async function checkAuthIntegrity(supabase: AnyClient): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    // Check for NULL varchar columns that crash GoTrue
    const { data, error } = await supabase.rpc("check_auth_integrity");

    if (error) {
      // RPC doesn't exist yet — fall back to listing users and checking via admin API
      const { data: users, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1 });
      if (listErr) {
        // If this fails with a scan error, the bug is back
        if (listErr.message?.includes("Scan error") || listErr.message?.includes("email_change")) {
          return { name: "auth_integrity", status: "fail", ms: Date.now() - t0, detail: "NULL column bug detected — GoTrue is broken" };
        }
        return { name: "auth_integrity", status: "warn", ms: Date.now() - t0, detail: `Could not verify: ${listErr.message}` };
      }
      return { name: "auth_integrity", status: "pass", ms: Date.now() - t0, detail: `GoTrue responding, ${(users?.users?.length ?? 0) > 0 ? "users accessible" : "no users"}` };
    }

    // RPC exists — check its result
    const poisoned = Array.isArray(data) ? data.length : 0;
    if (poisoned > 0) {
      return { name: "auth_integrity", status: "fail", ms: Date.now() - t0, detail: `${poisoned} users with NULL varchar columns` };
    }
    return { name: "auth_integrity", status: "pass", ms: Date.now() - t0, detail: "No NULL varchar columns" };
  } catch (err) {
    return { name: "auth_integrity", status: "warn", ms: Date.now() - t0, detail: String(err) };
  }
}

async function checkStudentsTable(supabase: AnyClient): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const { count, error } = await supabase.from("tu_students").select("id", { count: "exact", head: true });
    if (error) {
      return { name: "students_table", status: "fail", ms: Date.now() - t0, detail: error.message };
    }
    return { name: "students_table", status: "pass", ms: Date.now() - t0, detail: `${count} students` };
  } catch (err) {
    return { name: "students_table", status: "fail", ms: Date.now() - t0, detail: String(err) };
  }
}

async function checkGoTrueService(supabaseUrl: string, anonKey: string): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: anonKey },
    });
    if (!res.ok) {
      return { name: "gotrue_service", status: "fail", ms: Date.now() - t0, detail: `HTTP ${res.status}` };
    }
    return { name: "gotrue_service", status: "pass", ms: Date.now() - t0 };
  } catch (err) {
    return { name: "gotrue_service", status: "fail", ms: Date.now() - t0, detail: String(err) };
  }
}

async function checkTelegram(): Promise<CheckResult> {
  const t0 = Date.now();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { name: "telegram", status: "warn", ms: Date.now() - t0, detail: "TELEGRAM_BOT_TOKEN not set" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (!res.ok) {
      return { name: "telegram", status: "warn", ms: Date.now() - t0, detail: `Bot token invalid — HTTP ${res.status}` };
    }
    return { name: "telegram", status: "pass", ms: Date.now() - t0 };
  } catch (err) {
    return { name: "telegram", status: "warn", ms: Date.now() - t0, detail: String(err) };
  }
}
