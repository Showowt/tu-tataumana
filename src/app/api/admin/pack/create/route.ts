import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import { getPackDefinition, calculateExpiration } from "@/lib/constants/packs";
import { notifyNewMembership } from "@/lib/telegram";

const CreatePackSchema = z.object({
  student_id: z.string().uuid(),
  pack_type: z.string().min(1),
  payment_method: z.enum([
    "cash",
    "nequi",
    "bancolombia",
    "zelle",
    "wompi",
    "comp",
  ]),
  amount_paid: z.number().min(0),
  currency: z.enum(["COP", "USD"]),
  discount_type: z.enum(["percentage", "fixed", "comp"]).optional(),
  discount_value: z.number().optional(),
  discount_reason: z.string().optional(),
  notes: z.string().optional(),
  reference: z.string().optional(),
});

/**
 * POST /api/admin/pack/create
 * Admin-only manual pack creation with full discount + transaction tracking.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = CreatePackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const {
    student_id,
    pack_type,
    payment_method,
    amount_paid,
    currency,
    discount_type,
    discount_value,
    discount_reason,
    notes,
    reference,
  } = parsed.data;

  // 1. Validate pack type
  const packDef = getPackDefinition(pack_type);
  if (!packDef) {
    return NextResponse.json(
      { error: `Unknown pack type: ${pack_type}` },
      { status: 400 },
    );
  }

  // 2. Calculate original price
  const original_price = currency === "USD" ? packDef.priceUsd : packDef.priceCop;

  // 3. Calculate expiration
  const expires_at = calculateExpiration(packDef.expirationDays).toISOString();

  // 4. Insert pack
  const { data: pack, error: packError } = await supabase
    .from("tu_packs")
    .insert({
      student_id,
      pack_type,
      total_classes: packDef.totalClasses,
      classes_used: 0,
      price_paid: amount_paid,
      currency,
      status: "active",
      expires_at,
      payment_method,
      notes: notes || null,
      original_price,
      discount_type: discount_type || null,
      discount_value: discount_value ?? null,
      discount_reason: discount_reason || null,
      verified_by: admin.id,
      verified_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (packError) {
    console.error("[admin/pack/create POST]", packError.message);
    return NextResponse.json(
      { error: "Failed to create pack" },
      { status: 500 },
    );
  }

  // 5. Insert transaction record
  const txReference =
    reference || `ADMIN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { error: txError } = await supabase.from("tu_transactions").insert({
    student_id,
    amount: amount_paid,
    currency,
    status: "approved",
    payment_method,
    related_pack_type: pack_type,
    reference: txReference,
    description: "Manual pack creation by admin",
  });

  if (txError) {
    console.error("[admin/pack/create POST] transaction insert failed:", txError.message);
    // Pack was created successfully, so we don't fail the whole request
  }

  // 6. Telegram notification
  const { data: student } = await supabase
    .from("tu_students")
    .select("full_name, email")
    .eq("id", student_id)
    .single();

  if (student) {
    notifyNewMembership({
      studentName: student.full_name,
      email: student.email,
      packType: pack_type,
      totalClasses: packDef.totalClasses,
      paymentMethod: payment_method,
    }).catch(() => {
      // Telegram failure is non-critical
    });
  }

  return NextResponse.json(
    { success: true, pack_id: pack.id },
    { status: 201 },
  );
}
