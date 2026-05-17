import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import { getPackDefinition, calculateExpiration } from "@/lib/constants/packs";
import { notifyNewMembership } from "@/lib/telegram";

/**
 * GET /api/admin/pack
 * List packs with optional filters.
 *
 * Query params:
 *   student_id — filter by student
 *   status     — filter by status (active, expired, exhausted, cancelled)
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;
  const { searchParams } = request.nextUrl;
  const studentId = searchParams.get("student_id");
  const status = searchParams.get("status");

  let query = supabase
    .from("tu_packs")
    .select(
      `
      *,
      student:tu_students (id, full_name, email, phone)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (studentId) {
    query = query.eq("student_id", studentId);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin/pack GET]", error.message);
    return NextResponse.json({ error: "Failed to fetch packs" }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

const CreatePackSchema = z.object({
  student_id: z.string().uuid(),
  pack_type: z.string().min(1),
  payment_method: z
    .enum(["wompi", "nequi", "bancolombia", "zelle", "cash"])
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
  price_override: z.number().optional(),
  expiration_override_days: z.number().optional(),
});

/**
 * POST /api/admin/pack
 * Create a pack for a student. Looks up pack definition for pricing/expiration.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;

  const body = await request.json();
  const parsed = CreatePackSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const packDef = getPackDefinition(parsed.data.pack_type);
  if (!packDef) {
    return NextResponse.json(
      { error: `Unknown pack type: ${parsed.data.pack_type}` },
      { status: 400 },
    );
  }

  const pricePaid = parsed.data.price_override ?? packDef.priceCop;
  const expirationDays =
    parsed.data.expiration_override_days ?? packDef.expirationDays;

  const { data, error } = await supabase
    .from("tu_packs")
    .insert({
      student_id: parsed.data.student_id,
      pack_type: parsed.data.pack_type,
      total_classes: packDef.totalClasses,
      classes_used: 0,
      price_paid: pricePaid,
      currency: "COP",
      status: "active",
      expires_at: calculateExpiration(expirationDays).toISOString(),
      payment_method: parsed.data.payment_method || "cash",
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[admin/pack POST]", error.message);
    return NextResponse.json({ error: "Failed to create pack" }, { status: 500 });
  }

  // Get student info for Telegram notification
  const { data: student } = await supabase
    .from("tu_students")
    .select("full_name, email")
    .eq("id", parsed.data.student_id)
    .single();

  if (student) {
    notifyNewMembership({
      studentName: student.full_name,
      email: student.email,
      packType: parsed.data.pack_type,
      totalClasses: packDef.totalClasses,
      paymentMethod: parsed.data.payment_method || "cash",
    }).catch(() => {});
  }

  return NextResponse.json({ data }, { status: 201 });
}

/**
 * PATCH /api/admin/pack
 * Update a pack (change status, add credits, extend expiration).
 */
export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;
  const PatchPackSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(["active", "expired", "exhausted", "cancelled"]).optional(),
    add_credits: z.number().int().positive().optional(),
    remove_credits: z.number().int().positive().optional(),
    set_classes_used: z.number().int().min(0).optional(),
    extend_days: z.number().int().positive().optional(),
    notes: z.string().nullable().optional(),
  });

  const body = await request.json();
  const parsed = PatchPackSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id, add_credits, remove_credits, set_classes_used, extend_days, status, notes } = parsed.data;
  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  // Handle direct credit setting (set classes_used to exact value)
  if (typeof set_classes_used === "number" && set_classes_used >= 0) {
    updates.classes_used = set_classes_used;

    // Check if this exhausts the pack
    const { data: current } = await supabase
      .from("tu_packs")
      .select("total_classes")
      .eq("id", id)
      .single();

    if (current && current.total_classes !== -1) {
      if (set_classes_used >= current.total_classes) {
        if (!updates.status) updates.status = "exhausted";
      } else if (!updates.status) {
        updates.status = "active";
      }
    }
  }

  // Handle adding credits
  if (add_credits && typeof add_credits === "number") {
    const { data: current } = await supabase
      .from("tu_packs")
      .select("total_classes")
      .eq("id", id)
      .single();

    if (current && current.total_classes !== -1) {
      updates.total_classes = current.total_classes + add_credits;
      if (!updates.status) {
        updates.status = "active";
      }
    }
  }

  // Handle removing credits (increase classes_used)
  if (remove_credits && typeof remove_credits === "number") {
    const { data: current } = await supabase
      .from("tu_packs")
      .select("classes_used, total_classes")
      .eq("id", id)
      .single();

    if (current) {
      const newUsed = (current.classes_used || 0) + remove_credits;
      updates.classes_used = newUsed;

      if (current.total_classes !== -1 && newUsed >= current.total_classes) {
        if (!updates.status) updates.status = "exhausted";
      }
    }
  }

  // Handle extending expiration
  if (extend_days && typeof extend_days === "number") {
    const { data: current } = await supabase
      .from("tu_packs")
      .select("expires_at")
      .eq("id", id)
      .single();

    if (current) {
      const currentExpiry = new Date(current.expires_at);
      currentExpiry.setDate(currentExpiry.getDate() + extend_days);
      updates.expires_at = currentExpiry.toISOString();
      if (!updates.status) {
        updates.status = "active";
      }
    }
  }

  const { data, error } = await supabase
    .from("tu_packs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[admin/pack PATCH]", error.message);
    return NextResponse.json({ error: "Failed to update pack" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
