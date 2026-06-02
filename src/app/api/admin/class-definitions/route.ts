import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";
import { systemLog } from "@/lib/system-log";
import { SESSION_GENERATION_WEEKS } from "@/lib/constants/business-rules";
import { SupabaseClient } from "@supabase/supabase-js";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  name_es: z.string().min(1).max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  description_es: z.string().max(500).optional().or(z.literal("")),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  teacher: z.string().min(1).max(100),
  style: z.string().min(1).max(50).default("Yoga"),
  capacity: z.number().int().min(1).max(50).default(12),
  duration_minutes: z.number().int().min(15).max(180).default(60),
  note: z.string().max(100).optional().or(z.literal("")),
  location: z.string().max(200).default("Casa Carolina"),
  price_cop: z.number().int().min(0).default(80000),
  price_usd: z.number().int().min(0).default(21),
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  name_es: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  description_es: z.string().max(500).optional().nullable(),
  day_of_week: z.number().int().min(0).max(6).optional(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  teacher: z.string().min(1).max(100).optional(),
  style: z.string().min(1).max(50).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  duration_minutes: z.number().int().min(15).max(180).optional(),
  note: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional(),
  price_cop: z.number().int().min(0).optional(),
  price_usd: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

/**
 * Generate sessions for a single class definition for the next N weeks.
 * Skips closed dates and already-existing sessions.
 */
async function generateSessionsForDefinition(
  supabase: SupabaseClient,
  definition: { id: string; day_of_week: number; start_time: string; teacher: string; capacity: number },
): Promise<number> {
  const weeks = SESSION_GENERATION_WEEKS;
  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + weeks * 7);

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const nowDateStr = formatDate(now);
  const endDateStr = formatDate(end);

  // Get closed dates in range
  const { data: closedDates } = await supabase
    .from("tu_closed_dates")
    .select("date")
    .gte("date", nowDateStr)
    .lte("date", endDateStr);

  const closedSet = new Set(
    (closedDates || []).map((d: { date: string }) => d.date),
  );

  // Get existing sessions for this definition in range
  const { data: existing } = await supabase
    .from("tu_class_sessions")
    .select("session_date")
    .eq("definition_id", definition.id)
    .gte("session_date", nowDateStr)
    .lte("session_date", endDateStr);

  const existingSet = new Set(
    (existing || []).map((s: { session_date: string }) => s.session_date),
  );

  // Find matching dates
  const toInsert: Array<{
    definition_id: string;
    session_date: string;
    start_time: string;
    teacher: string;
    capacity: number;
    status: string;
  }> = [];

  const current = new Date(now);
  current.setHours(0, 0, 0, 0);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = formatDate(current);

    if (dayOfWeek === definition.day_of_week && !closedSet.has(dateStr) && !existingSet.has(dateStr)) {
      toInsert.push({
        definition_id: definition.id,
        session_date: dateStr,
        start_time: definition.start_time,
        teacher: definition.teacher,
        capacity: definition.capacity,
        status: "scheduled",
      });
    }
    current.setDate(current.getDate() + 1);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("tu_class_sessions").insert(toInsert);
    if (error) {
      console.error("[generateSessionsForDefinition]", error.message);
      return 0;
    }
  }

  return toInsert.length;
}

/**
 * GET /api/admin/class-definitions
 * Returns all class definitions (including inactive) for admin editing.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await admin.supabase
      .from("tu_class_definitions")
      .select("*")
      .order("day_of_week")
      .order("start_time");

    if (error) {
      console.error("[admin/class-definitions GET]", error.message);
      return NextResponse.json({ error: "Failed to load" }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error("[admin/class-definitions GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/class-definitions
 * Create a new class definition. Admin/owner only.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (admin.role === "manager") {
      return NextResponse.json({ error: "Solo admins pueden crear clases" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data: created, error: insertErr } = await admin.supabase
      .from("tu_class_definitions")
      .insert({
        ...parsed.data,
        description: parsed.data.description || null,
        description_es: parsed.data.description_es || null,
        note: parsed.data.note || null,
        is_active: true,
      })
      .select("id, day_of_week, start_time, teacher, capacity")
      .single();

    if (insertErr || !created) {
      console.error("[admin/class-definitions POST]", insertErr?.message);
      return NextResponse.json({ error: "Error al crear clase" }, { status: 500 });
    }

    // Auto-generate sessions for the next 4 weeks
    const sessionsGenerated = await generateSessionsForDefinition(admin.supabase, created);

    const dayName = DAY_NAMES[parsed.data.day_of_week];
    try {
      await sendTelegramMessage(
        `📋 <b>Nueva clase creada</b>\n\n` +
          `<b>${escapeHtml(parsed.data.name)}</b>\n` +
          `${dayName} ${parsed.data.start_time} · ${escapeHtml(parsed.data.teacher)}\n` +
          `Capacidad: ${parsed.data.capacity}\n` +
          `Sesiones generadas: ${sessionsGenerated}\n` +
          `Por: ${escapeHtml(admin.email)}`,
      );
    } catch (err) {
      console.error("[admin/class-definitions] Telegram failed:", err);
    }

    systemLog({ category: "system", level: "info", message: `Class created: ${parsed.data.name} ${dayName} ${parsed.data.start_time} (${sessionsGenerated} sessions generated)`, route: "admin/class-definitions" });

    return NextResponse.json({ message: "Clase creada", sessions_generated: sessionsGenerated }, { status: 201 });
  } catch (err) {
    console.error("[admin/class-definitions POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/class-definitions
 * Update an existing class definition. Admin/owner only.
 * Propagates teacher changes to future sessions.
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (admin.role === "manager") {
      return NextResponse.json({ error: "Solo admins pueden editar clases" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;

    // Verify exists
    const { data: existing } = await admin.supabase
      .from("tu_class_definitions")
      .select("id, name, teacher, is_active, day_of_week, start_time, capacity")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
    }

    // Build safe update object
    const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) safeUpdates[key] = value;
    }

    const { error: updateErr } = await admin.supabase
      .from("tu_class_definitions")
      .update(safeUpdates)
      .eq("id", id);

    if (updateErr) {
      console.error("[admin/class-definitions PATCH]", updateErr.message);
      return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
    }

    // Propagate teacher change to future sessions
    if (updates.teacher && updates.teacher !== existing.teacher) {
      const today = new Date().toISOString().split("T")[0];
      await admin.supabase
        .from("tu_class_sessions")
        .update({ teacher: updates.teacher, updated_at: new Date().toISOString() })
        .eq("definition_id", id)
        .gte("session_date", today)
        .eq("status", "scheduled");
    }

    // If deactivating, cancel future sessions
    if (updates.is_active === false) {
      const today = new Date().toISOString().split("T")[0];
      await admin.supabase
        .from("tu_class_sessions")
        .update({ status: "cancelled", cancel_reason: "Class deactivated", updated_at: new Date().toISOString() })
        .eq("definition_id", id)
        .gte("session_date", today)
        .eq("status", "scheduled");
    }

    // If reactivating (was inactive, now active), auto-generate sessions
    let sessionsGenerated = 0;
    if (updates.is_active === true && existing.is_active === false) {
      const reactivatedDef = {
        id: existing.id,
        day_of_week: updates.day_of_week ?? existing.day_of_week,
        start_time: updates.start_time ?? existing.start_time,
        teacher: updates.teacher ?? existing.teacher,
        capacity: updates.capacity ?? existing.capacity,
      };
      sessionsGenerated = await generateSessionsForDefinition(admin.supabase, reactivatedDef);
    }

    try {
      const changes = Object.keys(updates).filter((k) => k !== "id").join(", ");
      const reactivationNote = sessionsGenerated > 0 ? `\nSesiones generadas: ${sessionsGenerated}` : "";
      await sendTelegramMessage(
        `✏️ <b>Clase actualizada</b>\n\n` +
          `<b>${escapeHtml(existing.name)}</b>\n` +
          `Cambios: ${escapeHtml(changes)}${reactivationNote}\n` +
          `Por: ${escapeHtml(admin.email)}`,
      );
    } catch (err) {
      console.error("[admin/class-definitions] Telegram failed:", err);
    }

    return NextResponse.json({ message: "Clase actualizada", sessions_generated: sessionsGenerated });
  } catch (err) {
    console.error("[admin/class-definitions PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
