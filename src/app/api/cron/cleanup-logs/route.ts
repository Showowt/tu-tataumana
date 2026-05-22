/**
 * Cron: Clean up old system logs
 * Runs weekly — deletes logs older than 30 days.
 * Vercel cron: Sundays at 10 PM Colombia (3 AM UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/cleanup-logs] CRON_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 503 });
  }
  const supabase = createClient(url, key);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { error, count } = await supabase
    .from("tu_system_logs")
    .delete({ count: "exact" })
    .lt("created_at", thirtyDaysAgo.toISOString());

  if (error) {
    console.error("[cron/cleanup-logs]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[cron/cleanup-logs] Deleted ${count || 0} old log entries`);
  return NextResponse.json({ deleted: count || 0 });
}
