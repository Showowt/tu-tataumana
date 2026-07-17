import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";

const TABLES = {
  teachers: "tu_teachers",
  services: "tu_services",
  faq: "tu_faq",
  retreats: "tu_retreats",
} as const;

type ContentType = keyof typeof TABLES;

/**
 * GET /api/admin/cms?type=teachers|services|faq|retreats
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = request.nextUrl.searchParams.get("type") as ContentType;
  if (!type || !TABLES[type]) {
    return NextResponse.json({ error: "type must be: teachers, services, faq, or retreats" }, { status: 400 });
  }

  const { data, error } = await admin.supabase
    .from(TABLES[type])
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(`[admin/cms GET ${type}]`, error.message);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

/**
 * POST /api/admin/cms
 * Body: { action: "create" | "update" | "delete" | "reorder", type, ...fields }
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { action, type } = body;

  if (!type || !TABLES[type as ContentType]) {
    return NextResponse.json({ error: "type must be: teachers, services, faq, or retreats" }, { status: 400 });
  }

  const table = TABLES[type as ContentType];
  const supabase = admin.supabase;

  switch (action) {
    case "create": {
      const fields = { ...body };
      delete fields.action;
      delete fields.type;
      fields.created_at = new Date().toISOString();
      fields.updated_at = new Date().toISOString();

      const { data, error } = await supabase.from(table).insert(fields).select().single();
      if (error) {
        console.error(`[admin/cms create ${type}]`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data, message: "Creado" });
    }

    case "update": {
      const { id, ...fields } = body;
      delete fields.action;
      delete fields.type;
      if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

      fields.updated_at = new Date().toISOString();

      const { data, error } = await supabase.from(table).update(fields).eq("id", id).select().single();
      if (error) {
        console.error(`[admin/cms update ${type}]`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data, message: "Actualizado" });
    }

    case "delete": {
      const deleteId = body.id;
      if (!deleteId) return NextResponse.json({ error: "id requerido" }, { status: 400 });

      const { error } = await supabase.from(table).delete().eq("id", deleteId);
      if (error) {
        console.error(`[admin/cms delete ${type}]`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ message: "Eliminado" });
    }

    case "toggle": {
      const toggleId = body.id;
      const toggleField = body.field || "is_active";
      if (!toggleId) return NextResponse.json({ error: "id requerido" }, { status: 400 });

      const { data: current } = await supabase.from(table).select(toggleField).eq("id", toggleId).single();
      if (!current) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

      const { error } = await supabase
        .from(table)
        .update({ [toggleField]: !current[toggleField], updated_at: new Date().toISOString() })
        .eq("id", toggleId);

      if (error) {
        console.error(`[admin/cms toggle ${type}]`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ message: "Actualizado" });
    }

    case "reorder": {
      const OrderSchema = z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int() }));
      const parsed = OrderSchema.safeParse(body.items);
      if (!parsed.success) return NextResponse.json({ error: "items array requerido" }, { status: 400 });

      for (const item of parsed.data) {
        await supabase.from(table).update({ sort_order: item.sort_order }).eq("id", item.id);
      }
      return NextResponse.json({ message: "Reordenado" });
    }

    default:
      return NextResponse.json({ error: "action debe ser: create, update, delete, toggle, reorder" }, { status: 400 });
  }
}
