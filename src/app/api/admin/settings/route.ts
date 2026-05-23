import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";

/**
 * GET /api/admin/settings
 * Returns all studio settings grouped by category.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await admin.supabase
      .from("tu_settings")
      .select("key, value, label, category, editable, updated_at, updated_by")
      .order("category")
      .order("key");

    if (error) {
      console.error("[admin/settings GET]", error.message);
      return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
    }

    // Group by category
    const grouped: Record<string, typeof data> = {};
    for (const row of data || []) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(row);
    }

    return NextResponse.json({ data: grouped, current_role: admin.role });
  } catch (err) {
    console.error("[admin/settings GET] Unhandled:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const UpdateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

/**
 * PATCH /api/admin/settings
 * Update a single setting. Only owners and admins can modify.
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (admin.role === "manager") {
      return NextResponse.json(
        { error: "Solo owners y admins pueden cambiar configuracion" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = UpdateSettingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
    }

    const { key, value } = parsed.data;

    // Check if the setting exists and is editable
    const { data: existing } = await admin.supabase
      .from("tu_settings")
      .select("key, editable")
      .eq("key", key)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    }

    if (!existing.editable) {
      return NextResponse.json(
        { error: "Esta configuracion no se puede cambiar desde aqui" },
        { status: 403 },
      );
    }

    const { error: updateError } = await admin.supabase
      .from("tu_settings")
      .update({
        value,
        updated_at: new Date().toISOString(),
        updated_by: admin.email,
      })
      .eq("key", key);

    if (updateError) {
      console.error("[admin/settings PATCH]", updateError.message);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ message: "Configuracion actualizada", key, value });
  } catch (err) {
    console.error("[admin/settings PATCH] Unhandled:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
