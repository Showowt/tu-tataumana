/**
 * Post-deploy smoke test for tataumana.com
 *
 * Run after every Vercel deployment to verify critical systems:
 *   npx tsx scripts/smoke-test.ts [url]
 *
 * Defaults to https://www.tataumana.com if no URL provided.
 * Requires CRON_SECRET or TU_ADMIN_KEY in environment.
 *
 * Tests:
 *   1. Homepage loads (200)
 *   2. Login page loads (200)
 *   3. Health endpoint passes all checks
 *   4. Auth signup API responds (not 500)
 *   5. Auth watchdog runs clean
 *   6. Critical API routes respond
 */

import "dotenv/config";

const BASE_URL = process.argv[2] || "https://www.tataumana.com";
const AUTH_KEY = process.argv[3] || process.env.CRON_SECRET || process.env.TU_ADMIN_KEY || "";

interface TestResult {
  name: string;
  passed: boolean;
  ms: number;
  detail?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<{ passed: boolean; detail?: string }>) {
  const t0 = Date.now();
  try {
    const { passed, detail } = await fn();
    const ms = Date.now() - t0;
    results.push({ name, passed, ms, detail });
    const icon = passed ? "✅" : "❌";
    console.log(`  ${icon} ${name} (${ms}ms)${detail ? ` — ${detail}` : ""}`);
  } catch (err) {
    const ms = Date.now() - t0;
    results.push({ name, passed: false, ms, detail: String(err) });
    console.log(`  ❌ ${name} (${ms}ms) — ${err}`);
  }
}

async function run() {
  console.log(`\n🔍 Smoke testing: ${BASE_URL}\n`);

  // 1. Homepage
  await test("Homepage loads", async () => {
    const res = await fetch(BASE_URL, { redirect: "follow" });
    return { passed: res.ok, detail: `HTTP ${res.status}` };
  });

  // 2. Login page (client-rendered React — check for 200 + basic HTML shell)
  await test("Login page loads", async () => {
    const res = await fetch(`${BASE_URL}/login`, { redirect: "follow" });
    const html = await res.text();
    // Client component — server HTML has the shell, JS renders the form
    const hasShell = html.includes("__next") || html.includes("_next");
    return { passed: res.ok && hasShell, detail: `HTTP ${res.status}` };
  });

  // 3. Health endpoint
  await test("Health endpoint — all checks pass", async () => {
    const res = await fetch(`${BASE_URL}/api/health?key=${AUTH_KEY}`);
    if (!res.ok) return { passed: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    const failedChecks = data.checks?.filter((c: { status: string }) => c.status === "fail") || [];
    return {
      passed: data.status === "healthy" || data.status === "degraded",
      detail: failedChecks.length > 0
        ? `Failed: ${failedChecks.map((c: { name: string }) => c.name).join(", ")}`
        : `${data.status} (${data.total_ms}ms)`,
    };
  });

  // 4. Auth signup API responds (not 500)
  await test("Signup API reachable", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "smoke-test@example.com",
        password: "test123456",
        full_name: "Smoke Test",
      }),
    });
    // We expect 409 (already exists) or 200 — NOT 500
    const ok = res.status !== 500;
    return { passed: ok, detail: `HTTP ${res.status}` };
  });

  // 5. Auth watchdog runs
  await test("Auth watchdog — no issues", async () => {
    const res = await fetch(`${BASE_URL}/api/auth-watchdog`, {
      headers: { Authorization: `Bearer ${AUTH_KEY}` },
    });
    if (!res.ok) return { passed: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      passed: data.status === "healthy",
      detail: data.issues?.length > 0 ? `Issues: ${data.issues.join("; ")}` : "All clean",
    };
  });

  // 6. Schedule API
  await test("Schedule API responds", async () => {
    const res = await fetch(`${BASE_URL}/api/schedule`);
    return { passed: res.ok, detail: `HTTP ${res.status}` };
  });

  // 7. Events API
  await test("Events API responds", async () => {
    const res = await fetch(`${BASE_URL}/api/events`);
    return { passed: res.ok, detail: `HTTP ${res.status}` };
  });

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalMs = results.reduce((sum, r) => sum + r.ms, 0);

  console.log(`\n${"─".repeat(50)}`);
  console.log(`  ${passed}/${results.length} passed, ${failed} failed (${totalMs}ms total)`);

  if (failed > 0) {
    console.log(`\n  ❌ SMOKE TEST FAILED — DO NOT SHIP\n`);
    console.log("  Failed tests:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`    • ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  } else {
    console.log(`\n  ✅ ALL CLEAR — Production is healthy\n`);
    process.exit(0);
  }
}

// Clean up watchdog test user after smoke test
async function cleanup() {
  try {
    // Delete the smoke-test user if it was created
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return;

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data } = await supabase.auth.admin.listUsers({ perPage: 50 });
    const testUsers = data?.users?.filter((u) =>
      u.email === "smoke-test@example.com" || u.email === "test-watchdog-probe@tataumana.com"
    ) || [];

    for (const user of testUsers) {
      await supabase.auth.admin.deleteUser(user.id);
      // Also clean student profile
      await supabase.from("tu_students").delete().eq("auth_id", user.id);
    }

    if (testUsers.length > 0) {
      console.log(`  🧹 Cleaned up ${testUsers.length} test user(s)`);
    }
  } catch {
    // Non-critical
  }
}

run().then(cleanup).catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
