import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";

const CreateDiscountSchema = z.object({
  code: z.string().min(1).max(50),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().positive(),
  max_uses: z.number().int().positive().nullable().optional(),
  valid_days: z.number().int().positive().nullable().optional(),
  one_time_per_student: z.boolean().optional().default(false),
  specific_student_id: z.string().uuid().nullable().optional(),
  applicable_packs: z.array(z.string()).nullable().optional(),
  created_by: z.string().optional().default("admin"),
});

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const filter = searchParams.get("filter") || "active";

  let query = admin.supabase
    .from("tu_discount_codes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter === "active") {
    query = query.eq("active", true);
  } else if (filter === "expired") {
    query = query.eq("active", false);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/discounts GET]", error.message);
    return NextResponse.json(
      { error: "Failed to fetch discounts" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = CreateDiscountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const {
    code,
    discount_type,
    discount_value,
    max_uses,
    valid_days,
    one_time_per_student,
    specific_student_id,
    applicable_packs,
    created_by,
  } = parsed.data;

  // Validate percentage <= 100
  if (discount_type === "percentage" && discount_value > 100) {
    return NextResponse.json(
      { error: "Porcentaje no puede ser mayor a 100" },
      { status: 400 },
    );
  }

  const validUntil = valid_days
    ? new Date(Date.now() + valid_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Sanitize code: strip non-alphanumeric characters to prevent URL encoding issues
  const sanitizedCode = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase().trim();
  if (!sanitizedCode) {
    return NextResponse.json(
      { error: "Codigo invalido (solo letras y numeros)" },
      { status: 400 },
    );
  }

  const { data, error } = await admin.supabase
    .from("tu_discount_codes")
    .insert({
      code: sanitizedCode,
      discount_type,
      discount_value,
      max_uses: max_uses ?? null,
      valid_until: validUntil,
      one_time_per_student,
      specific_student_id: specific_student_id ?? null,
      applicable_packs: applicable_packs ?? null,
      created_by,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un codigo con ese nombre" },
        { status: 409 },
      );
    }
    console.error("[admin/discounts POST]", error.message);
    return NextResponse.json(
      { error: "Error creando codigo" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { id, ...updates } = body as Record<string, unknown>;
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  // Only allow safe fields
  const safeUpdates: Record<string, unknown> = {};
  if (typeof updates.active === "boolean") {
    safeUpdates.active = updates.active;
  }
  if (
    typeof updates.max_uses === "number" ||
    updates.max_uses === null
  ) {
    safeUpdates.max_uses = updates.max_uses;
  }
  if (
    typeof updates.valid_until === "string" ||
    updates.valid_until === null
  ) {
    safeUpdates.valid_until = updates.valid_until;
  }

  const { data, error } = await admin.supabase
    .from("tu_discount_codes")
    .update(safeUpdates)
    .eq("id", id as string)
    .select()
    .single();

  if (error) {
    console.error("[admin/discounts PATCH]", error.message);
    return NextResponse.json(
      { error: "Error updating discount" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}
