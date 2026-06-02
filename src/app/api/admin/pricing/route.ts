import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";

const CreateSchema = z.object({
  label: z.string().min(1).max(50),
  label_es: z.string().max(50).optional(),
  subtitle_en: z.string().max(100).optional(),
  subtitle_es: z.string().max(100).optional(),
  price_cop: z.number().int().min(0),
  price_usd: z.number().int().min(0),
  pack_type: z.string().max(50).optional(),
  highlight: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  category: z.enum(["group", "pack", "private", "promo"]).optional(),
  is_active: z.boolean().optional(),
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(50).optional(),
  label_es: z.string().max(50).optional().nullable(),
  subtitle_en: z.string().max(100).optional().nullable(),
  subtitle_es: z.string().max(100).optional().nullable(),
  price_cop: z.number().int().min(0).optional(),
  price_usd: z.number().int().min(0).optional(),
  pack_type: z.string().max(50).optional().nullable(),
  highlight: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  category: z.enum(["group", "pack", "private", "promo"]).optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/admin/pricing — list all pricing cards (including inactive)
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await admin.supabase
    .from("tu_pricing_cards")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[admin/pricing] GET:", error.message);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

/**
 * POST /api/admin/pricing — create a new pricing card
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const { data, error } = await admin.supabase
    .from("tu_pricing_cards")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    console.error("[admin/pricing] POST:", error.message);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

/**
 * PATCH /api/admin/pricing — update a pricing card
 */
export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;

  const { error } = await admin.supabase
    .from("tu_pricing_cards")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[admin/pricing] PATCH:", error.message);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ message: "Updated" });
}

/**
 * DELETE /api/admin/pricing — deactivate a pricing card (soft delete)
 */
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await admin.supabase
    .from("tu_pricing_cards")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[admin/pricing] DELETE:", error.message);
    return NextResponse.json({ error: "Failed to deactivate" }, { status: 500 });
  }

  return NextResponse.json({ message: "Deactivated" });
}
