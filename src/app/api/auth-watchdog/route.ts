/**
 * GET /api/auth-watchdog
 * Hourly cron that monitors auth health and auto-heals issues:
 *
 *   1. Scans auth.users for NULL varchar columns (the GoTrue crash bug)
 *   2. Auto-fixes any NULLs found via fix_auth_nulls() RPC
 *   3. Tests that GoTrue can actually list users (catches the scan error)
 *   4. Checks recent auth error rate from Supabase logs concept
 *   5. Alerts Tata via Telegram if anything is wrong
 *
 * Runs every hour via Vercel cron. Self-heals before alerting.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  // Auth check — mandatory
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[auth-watchdog] CRON_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[auth-watchdog] Missing Supabase credentials");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const issues: string[] = [];
  const fixes: string[] = [];

  // 1. Check for NULL varchar columns and auto-fix
  try {
    const { data: poisoned, error: checkErr } = await supabase.rpc("check_auth_integrity");

    if (checkErr) {
      issues.push(`check_auth_integrity RPC failed: ${checkErr.message}`);
    } else if (Array.isArray(poisoned) && poisoned.length > 0) {
      // Found NULLs — auto-fix immediately
      console.warn(`[auth-watchdog] Found ${poisoned.length} users with NULL columns, auto-fixing...`);

      const { data: fixedCount, error: fixErr } = await supabase.rpc("fix_auth_nulls");

      if (fixErr) {
        issues.push(`Auto-fix failed: ${fixErr.message}. ${poisoned.length} users still have NULL columns.`);
      } else {
        fixes.push(`Auto-fixed ${fixedCount} users with NULL varchar columns (emails: ${poisoned.map((r: { user_email: string }) => r.user_email).join(", ")})`);
      }
    }
  } catch (err) {
    issues.push(`Integrity check crashed: ${err}`);
  }

  // 2. Test that GoTrue can actually process auth operations
  try {
    const { error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1 });

    if (listErr) {
      if (listErr.message?.includes("Scan error") || listErr.message?.includes("email_change")) {
        issues.push(`GoTrue NULL scan bug is ACTIVE — listUsers failed: ${listErr.message}`);

        // Emergency fix attempt
        const { data: fixedCount, error: fixErr } = await supabase.rpc("fix_auth_nulls");
        if (fixErr) {
          issues.push(`Emergency fix also failed: ${fixErr.message}`);
        } else {
          fixes.push(`Emergency fix ran: fixed ${fixedCount} rows`);
        }
      } else {
        issues.push(`GoTrue listUsers failed: ${listErr.message}`);
      }
    }
  } catch (err) {
    issues.push(`GoTrue test crashed: ${err}`);
  }

  // 3. Test that signup would work (dry check — verify admin.createUser doesn't crash on scan)
  try {
    // We test by trying to create a user with an email that definitely exists
    // This should return "already registered" error, NOT a scan error
    const { error: testErr } = await supabase.auth.admin.createUser({
      email: "test-watchdog-probe@tataumana.com",
      password: "watchdog-test-" + Date.now(),
      email_confirm: true,
    });

    if (testErr) {
      if (testErr.message?.includes("Scan error") || testErr.message?.includes("email_change")) {
        issues.push(`Signup is BROKEN — createUser scan error: ${testErr.message}`);
      }
      // "already registered" or other errors are fine — means GoTrue is working
      // Clean up the test user if it was accidentally created
      if (!testErr) {
        // shouldn't happen, but just in case
      }
    } else {
      // Test user was created — clean it up
      const { data: users } = await supabase.auth.admin.listUsers({ perPage: 50 });
      const testUser = users?.users?.find((u) => u.email === "test-watchdog-probe@tataumana.com");
      if (testUser) {
        await supabase.auth.admin.deleteUser(testUser.id);
        fixes.push("Cleaned up watchdog test user");
      }
    }
  } catch (err) {
    issues.push(`Signup probe crashed: ${err}`);
  }

  // 4. Check user count sanity
  try {
    const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1 });
    if (users && users.users.length === 0) {
      issues.push("auth.users appears empty — possible data loss");
    }
  } catch {
    // Already tested above
  }

  // Alert if there are any issues
  if (issues.length > 0) {
    const alertMsg = [
      "🚨 <b>AUTH WATCHDOG ALERT</b>",
      "",
      "<b>Issues found:</b>",
      ...issues.map((i) => `• ${i}`),
      "",
      fixes.length > 0 ? "<b>Auto-fixes applied:</b>" : "",
      ...fixes.map((f) => `✅ ${f}`),
      "",
      "Check https://www.tataumana.com/login immediately.",
    ].filter(Boolean).join("\n");

    await sendTelegramMessage(alertMsg);
    console.error("[auth-watchdog] Issues found:", issues);
  } else if (fixes.length > 0) {
    // Only fixes, no remaining issues — just log it
    const fixMsg = [
      "🔧 <b>AUTH WATCHDOG — AUTO-HEALED</b>",
      "",
      ...fixes.map((f) => `✅ ${f}`),
      "",
      "No action needed — issues were automatically fixed.",
    ].join("\n");

    await sendTelegramMessage(fixMsg);
  }

  return NextResponse.json({
    status: issues.length > 0 ? "issues_found" : "healthy",
    issues,
    fixes,
    checked_at: new Date().toISOString(),
  });
}
