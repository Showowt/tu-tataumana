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
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  // Auth: only allow Vercel cron or requests with correct secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
  let exhaustedCount = 0;
  {
    const { data: activePacks } = await supabase
      .from("tu_packs")
      .select("id, classes_used, total_classes")
      .eq("status", "active")
      .neq("total_classes", -1);

    if (activePacks) {
      const toExhaust = activePacks.filter(
        (p) => p.classes_used >= p.total_classes,
      );
      for (const pack of toExhaust) {
        await supabase
          .from("tu_packs")
          .update({ status: "exhausted" })
          .eq("id", pack.id);
      }
      exhaustedCount = toExhaust.length;
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
