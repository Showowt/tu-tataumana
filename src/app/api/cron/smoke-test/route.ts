/**
 * Cron: Smoke test critical endpoints
 * Runs every 15 minutes — checks health, schedule, payments, discounts.
 * On failure: sends Telegram alert + writes to system logs.
 *
 * Vercel cron: every 15 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { systemLog } from "@/lib/system-log";

interface TestResult {
  name: string;
  passed: boolean;
  status: number;
  ms: number;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.tataumana.com";

async function runTest(name: string, url: string, options?: RequestInit): Promise<TestResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
    return { name, passed: res.status < 500, status: res.status, ms: Date.now() - t0 };
  } catch {
    return { name, passed: false, status: 0, ms: Date.now() - t0 };
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: TestResult[] = [];

  // 1. Health endpoint
  results.push(await runTest("Health", `${BASE_URL}/api/health`));

  // 2. Schedule API
  results.push(await runTest("Schedule", `${BASE_URL}/api/schedule`));

  // 3. Events API
  results.push(await runTest("Events", `${BASE_URL}/api/events`));

  // 4. Payment create (validation check — should return 400, not 500)
  results.push(await runTest("Payment Validation", `${BASE_URL}/api/payments/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pack_type: "", payment_method: "invalid" }),
  }));

  // 5. Discount validate (should return 401 or 200, not 500)
  results.push(await runTest("Discount Validate", `${BASE_URL}/api/discounts/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "SMOKETEST", pack_type: "WALK_IN" }),
  }));

  // 6. Homepage
  results.push(await runTest("Homepage", BASE_URL));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalMs = results.reduce((s, r) => s + r.ms, 0);

  // On failure: alert
  if (failed > 0) {
    const failedTests = results.filter((r) => !r.passed);
    const failedNames = failedTests.map((r) => `${r.name} (HTTP ${r.status})`).join("\n  ");

    try {
      await sendTelegramMessage(
        `🚨 <b>SMOKE TEST FAILED</b>\n\n<b>${failed}/${results.length}</b> tests failed:\n  ${failedNames}\n\n<b>URL:</b> ${BASE_URL}\n<b>Total time:</b> ${totalMs}ms`,
      );
    } catch {}

    await systemLog({
      category: "system",
      level: "error",
      message: `Smoke test failed: ${failed}/${results.length} tests`,
      route: "/api/cron/smoke-test",
      details: { results, totalMs },
    });
  }

  return NextResponse.json({
    status: failed > 0 ? "fail" : "pass",
    passed,
    failed,
    total: results.length,
    ms: totalMs,
    results,
  });
}
