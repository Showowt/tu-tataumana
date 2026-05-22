/**
 * Cron: Auto-expire packs
 * Runs daily — marks active packs as "expired" when expires_at < NOW().
 * Also marks packs as "exhausted" when classes_used >= total_classes.
 *
 * Vercel cron schedule: every day at 6 AM Colombia (11 AM UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY required for cron jobs");
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/expire-packs] CRON_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  // 1. Expire packs past their expiration date
  const { data: expired, error: expireErr } = await supabase
    .from("tu_packs")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", now)
    .select("id, student_id, pack_type");

  if (expireErr) {
    console.error("[cron/expire-packs] Expire error:", expireErr.message);
  }

  // 2. Mark exhausted packs (classes_used >= total_classes, excluding unlimited)
  // Fetch IDs then bulk update to avoid N+1 and timeout mid-loop
  let exhaustedCount = 0;
  {
    const { data: activePacks } = await supabase
      .from("tu_packs")
      .select("id, classes_used, total_classes")
      .eq("status", "active")
      .neq("total_classes", -1);

    if (activePacks) {
      const toExhaustIds = activePacks
        .filter((p) => p.classes_used >= p.total_classes)
        .map((p) => p.id);

      if (toExhaustIds.length > 0) {
        const { data: exhausted } = await supabase
          .from("tu_packs")
          .update({ status: "exhausted" })
          .in("id", toExhaustIds)
          .select("id");

        exhaustedCount = exhausted?.length || 0;
      }
    }
  };

  const expiredCount = expired?.length || 0;
  const totalFixed = expiredCount + exhaustedCount;

  if (totalFixed > 0) {
    try {
      await sendTelegramMessage(
        `🔄 <b>CRON: Packs actualizados</b>\n\n<b>Expirados:</b> ${expiredCount}\n<b>Agotados:</b> ${exhaustedCount}`,
      );
    } catch {}
  }

  console.log(
    `[cron/expire-packs] Expired: ${expiredCount}, Exhausted: ${exhaustedCount}`,
  );

  return NextResponse.json({
    expired: expiredCount,
    exhausted: exhaustedCount,
    timestamp: now,
  });
}
