import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";

const CreatePassSchema = z.object({
  name: z.string().optional().nullable(),
  phone: z.string().min(1),
  email: z.string().email().optional().nullable(),
  pass_type: z.string().min(1),
  total_classes: z.number().int().min(1),
  payment_method: z.string().optional().default("cash"),
  notes: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
});

const UpdatePassSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "expired", "exhausted", "cancelled"]).optional(),
  notes: z.string().optional().nullable(),
  total_classes: z.number().int().min(1).optional(),
  payment_confirmed: z.boolean().optional(),
  expires_at: z.string().optional().nullable(),
  add_credits: z.number().int().min(1).optional(),
});

// GET /api/admin/passes — List all passes (optionally filter by phone or status)
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;
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
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;

  try {
    const body = await request.json();
    const parsed = CreatePassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { name, phone, email, pass_type, total_classes, payment_method, notes, expires_at } = parsed.data;

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
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;

  try {
    const body = await request.json();
    const parsed = UpdatePassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { id, add_credits, ...allowedUpdates } = parsed.data;
    const updates: Record<string, unknown> = { ...allowedUpdates };

    // If adding credits, increase total_classes (classes_remaining auto-recalculates)
    if (add_credits) {
      const { data: current } = await supabase
        .from("tu_passes")
        .select("total_classes")
        .eq("id", id)
        .single();

      if (current) {
        updates.total_classes = current.total_classes + add_credits;
      }
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
