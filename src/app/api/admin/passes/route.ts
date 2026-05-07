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

function verifyAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  const expected = process.env.TU_ADMIN_KEY || "";
  return adminKey === expected;
}

// GET /api/admin/passes — List all passes (optionally filter by phone or status)
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const status = searchParams.get("status");

  let query = supabase
    .from("tu_passes")
    .select("*")
    .order("created_at", { ascending: false });

  if (phone) {
    query = query.eq("phone", phone);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Admin/passes] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch passes" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/admin/passes — Create a new pass
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { name, phone, email, pass_type, total_classes, payment_method, notes, expires_at } = body;

    if (!phone || !pass_type || !total_classes) {
      return NextResponse.json(
        { error: "phone, pass_type, and total_classes are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tu_passes")
      .insert({
        name: name || null,
        phone,
        email: email || null,
        pass_type,
        total_classes,
        classes_used: 0,
        status: "active",
        payment_method: payment_method || "cash",
        payment_confirmed: true,
        notes: notes || null,
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Admin/passes] POST error:", error);
      return NextResponse.json({ error: "Failed to create pass" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[Admin/passes] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/passes — Update a pass (adjust credits, change status)
export async function PATCH(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Pass id is required" }, { status: 400 });
    }

    // classes_remaining is a generated column — never set it directly
    delete updates.classes_remaining;

    // If adding credits, increase total_classes (classes_remaining auto-recalculates)
    if (updates.add_credits) {
      const { data: current } = await supabase
        .from("tu_passes")
        .select("total_classes")
        .eq("id", id)
        .single();

      if (current) {
        updates.total_classes = current.total_classes + updates.add_credits;
      }
      delete updates.add_credits;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("tu_passes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Admin/passes] PATCH error:", error);
      return NextResponse.json({ error: "Failed to update pass" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[Admin/passes] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
