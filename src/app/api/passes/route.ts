/**
 * Class Pass API — TU. by Tata Umana
 *
 * GET /api/passes?phone=573185083035  → Check pass balance for a phone number
 * POST /api/passes                    → Create a new pass (admin or after payment)
 * PATCH /api/passes                   → Use a class from a pass (called by bookings API)
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Pass type definitions with class counts
const PASS_TYPES: Record<string, { total: number; label: string }> = {
  "MAYO MES MAMÁ": { total: 4, label: "Mayo Mes Mamá — 4 classes" },
  "JUST FLOW PACK": { total: 6, label: "Just Flow Pack — 6 classes" },
  "TU HEALING PACK": { total: 8, label: "TU Healing Pack — 8 classes" },
  "TU EQUILIBRIUM": { total: 12, label: "TU Equilibrium — 12 classes" },
  "TU LIFE PACK": { total: -1, label: "TU Life Pack — Unlimited" },
};

/**
 * GET — Check pass balance by phone number
 */
export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone");

  if (!phone) {
    return NextResponse.json(
      { error: "Phone number required" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ passes: [], message: "DB not configured" });
  }

  // Normalize phone: strip spaces, dashes, and leading +
  const normalizedPhone = phone.replace(/[\s\-\+]/g, "");

  const { data, error } = await supabase
    .from("tu_passes")
    .select("*")
    .or(`phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[passes] Fetch error:", error);
    return NextResponse.json(
      { error: "Failed to check passes" },
      { status: 500 }
    );
  }

  // Calculate remaining for each pass
  const passes = (data || []).map((pass) => ({
    id: pass.id,
    pass_type: pass.pass_type,
    total_classes: pass.total_classes,
    classes_used: pass.classes_used,
    classes_remaining:
      pass.total_classes === -1
        ? "Unlimited"
        : pass.total_classes - pass.classes_used,
    is_unlimited: pass.total_classes === -1,
    status: pass.status,
    expires_at: pass.expires_at,
    payment_confirmed: pass.payment_confirmed,
  }));

  return NextResponse.json({ passes });
}

/**
 * POST — Create a new pass
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name, email, pass_type, payment_method } = body;

    if (!phone || !pass_type) {
      return NextResponse.json(
        { error: "Phone and pass_type required" },
        { status: 400 }
      );
    }

    const passInfo = PASS_TYPES[pass_type];
    if (!passInfo) {
      return NextResponse.json(
        { error: `Unknown pass type: ${pass_type}` },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    // Calculate expiration (30 days for packs, end of month for unlimited)
    const expiresAt = new Date();
    if (passInfo.total === -1) {
      // Unlimited: expires end of current month
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      expiresAt.setDate(0); // Last day of current month
      expiresAt.setHours(23, 59, 59, 999);
    } else {
      // Packs: 90 days to use all classes
      expiresAt.setDate(expiresAt.getDate() + 90);
    }

    const normalizedPhone = phone.replace(/[\s\-\+]/g, "");

    const { data, error } = await supabase
      .from("tu_passes")
      .insert({
        phone: normalizedPhone,
        name: name || null,
        email: email || null,
        pass_type,
        total_classes: passInfo.total,
        classes_used: 0,
        status: "active",
        expires_at: expiresAt.toISOString(),
        payment_method: payment_method || null,
        payment_confirmed: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[passes] Insert error:", error);
      return NextResponse.json(
        { error: "Failed to create pass" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      pass: data,
      message: `${passInfo.label} created for ${normalizedPhone}`,
    });
  } catch (err) {
    console.error("[passes]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH — Use a class from a pass (decrement)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { pass_id, phone } = body;

    if (!pass_id && !phone) {
      return NextResponse.json(
        { error: "pass_id or phone required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    // Find the active pass
    let query = supabase
      .from("tu_passes")
      .select("*")
      .eq("status", "active");

    if (pass_id) {
      query = query.eq("id", pass_id);
    } else {
      const normalizedPhone = phone.replace(/[\s\-\+]/g, "");
      query = query.or(
        `phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`
      );
    }

    const { data: passes, error: fetchErr } = await query
      .order("created_at", { ascending: true })
      .limit(1);

    if (fetchErr || !passes || passes.length === 0) {
      return NextResponse.json(
        { error: "No active pass found" },
        { status: 404 }
      );
    }

    const pass = passes[0];

    // Check if pass has remaining classes (skip for unlimited)
    if (pass.total_classes !== -1) {
      if (pass.classes_used >= pass.total_classes) {
        return NextResponse.json(
          {
            error: "No classes remaining on this pass",
            classes_remaining: 0,
          },
          { status: 409 }
        );
      }
    }

    // Check expiration
    if (pass.expires_at && new Date(pass.expires_at) < new Date()) {
      await supabase
        .from("tu_passes")
        .update({ status: "expired" })
        .eq("id", pass.id);

      return NextResponse.json(
        { error: "Pass has expired", status: "expired" },
        { status: 409 }
      );
    }

    // Decrement: increment classes_used
    const newUsed = pass.classes_used + 1;
    const { error: updateErr } = await supabase
      .from("tu_passes")
      .update({
        classes_used: newUsed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pass.id);

    if (updateErr) {
      console.error("[passes] Update error:", updateErr);
      return NextResponse.json(
        { error: "Failed to use class" },
        { status: 500 }
      );
    }

    const remaining =
      pass.total_classes === -1
        ? "Unlimited"
        : pass.total_classes - newUsed;

    return NextResponse.json({
      success: true,
      pass_type: pass.pass_type,
      classes_used: newUsed,
      classes_remaining: remaining,
      is_unlimited: pass.total_classes === -1,
    });
  } catch (err) {
    console.error("[passes]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
