import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { notifyHotLead } from "@/lib/telegram";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * POST /api/leads — Capture a lead from any source
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      source,
      name,
      email,
      phone,
      service_interest,
      preferred_date,
      chat_session_id,
      booking_step,
      payment_method,
      warmth,
    } = body;

    if (!source) {
      return NextResponse.json(
        { error: "Source is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    if (!supabase) {
      console.warn("[API/leads] Supabase not configured");
      // Still send Telegram for hot leads
      if (warmth === "hot" || booking_step === "abandoned") {
        await notifyHotLead({
          source,
          name,
          phone,
          email,
          service_interest,
          booking_step,
        });
      }
      return NextResponse.json({ message: "Lead captured (DB not configured)" });
    }

    const { data, error } = await supabase
      .from("tu_leads")
      .insert({
        source,
        name: name || null,
        email: email || null,
        phone: phone || null,
        service_interest: service_interest || null,
        preferred_date: preferred_date || null,
        chat_session_id: chat_session_id || null,
        booking_step: booking_step || null,
        payment_method: payment_method || null,
        warmth: warmth || "warm",
        status: "new",
      })
      .select()
      .single();

    if (error) {
      console.error("[API/leads]", error);
      return NextResponse.json(
        { error: "Failed to capture lead" },
        { status: 500 }
      );
    }

    // Telegram alert for hot leads and abandoned bookings
    if (warmth === "hot" || booking_step === "abandoned") {
      try {
        await notifyHotLead({
          source,
          name,
          phone,
          email,
          service_interest,
          booking_step,
        });
      } catch (e) {
        console.error("[Leads] Telegram notification failed:", e);
      }
    }

    return NextResponse.json({ data, message: "Lead captured" });
  } catch (err) {
    console.error("[API/leads]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leads — Fetch all leads for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ data: [], message: "DB not configured" });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const warmth = searchParams.get("warmth");
    const limit = parseInt(searchParams.get("limit") || "100");

    let query = supabase
      .from("tu_leads")
      .select("*, tu_chat_sessions(*)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (warmth) query = query.eq("warmth", warmth);

    const { data, error } = await query;

    if (error) {
      console.error("[API/leads]", error);
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[API/leads]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/leads — Update lead status (for Tata's follow-up)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, tata_notes, warmth } = body;

    if (!id) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 503 });
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (tata_notes !== undefined) updates.tata_notes = tata_notes;
    if (warmth) updates.warmth = warmth;

    const { data, error } = await supabase
      .from("tu_leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[API/leads]", error);
      return NextResponse.json(
        { error: "Failed to update lead" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[API/leads]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
