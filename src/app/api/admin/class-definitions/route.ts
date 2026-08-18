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
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).optional(),
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

    // Check for existing active definition at same day/time slot
    const { data: existing } = await admin.supabase
      .from("tu_class_definitions")
      .select("id, name, teacher")
      .eq("day_of_week", parsed.data.day_of_week)
      .eq("start_time", parsed.data.start_time)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      const dayName = DAY_NAMES[parsed.data.day_of_week];
      return NextResponse.json({
        error: `Ya existe una clase activa en ${dayName} a las ${parsed.data.start_time}: "${existing.name}" con ${existing.teacher}. Edita esa clase o desactívala primero.`,
      }, { status: 409 });
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
      const isDuplicate = insertErr?.message?.includes("uq_active_definition_per_slot");
      return NextResponse.json({
        error: isDuplicate
          ? "Ya existe una clase activa en ese horario. Desactiva la existente primero."
          : "Error al crear clase",
      }, { status: isDuplicate ? 409 : 500 });
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

    // If reactivating or changing time slot, check for conflicts
    const willBeActive = updates.is_active === true || (updates.is_active === undefined && existing.is_active);
    const newDay = updates.day_of_week ?? existing.day_of_week;
    const newTime = updates.start_time ?? existing.start_time;

    if (willBeActive && (updates.is_active === true || updates.day_of_week !== undefined || updates.start_time !== undefined)) {
      const { data: conflict } = await admin.supabase
        .from("tu_class_definitions")
        .select("id, name, teacher")
        .eq("day_of_week", newDay)
        .eq("start_time", newTime)
        .eq("is_active", true)
        .neq("id", id)
        .maybeSingle();

      if (conflict) {
        const dayName = DAY_NAMES[newDay];
        return NextResponse.json({
          error: `Ya existe una clase activa en ${dayName} a las ${newTime}: "${conflict.name}" con ${conflict.teacher}. Desactiva esa clase primero.`,
        }, { status: 409 });
      }
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
      const isDuplicate = updateErr.message?.includes("uq_active_definition_per_slot");
      return NextResponse.json({
        error: isDuplicate
          ? "Ya existe una clase activa en ese horario."
          : "Error al actualizar",
      }, { status: isDuplicate ? 409 : 500 });
    }

    const today = new Date().toISOString().split("T")[0];
    let bookingsAffected = 0;

    // Propagate template changes to already-generated future sessions.
    // Only sessions still matching the OLD template value are updated, so
    // deliberate one-week overrides made in Gestión de Clases are preserved.

    // Teacher change
    if (updates.teacher && updates.teacher !== existing.teacher) {
      await admin.supabase
        .from("tu_class_sessions")
        .update({ teacher: updates.teacher, updated_at: new Date().toISOString() })
        .eq("definition_id", id)
        .eq("teacher", existing.teacher)
        .gte("session_date", today)
        .eq("status", "scheduled");
    }

    // Start time change — previously this NEVER reached generated sessions,
    // so the site showed the new time while bookings kept the old one.
    if (updates.start_time && updates.start_time !== existing.start_time && updates.day_of_week === undefined) {
      const { data: timeSessions } = await admin.supabase
        .from("tu_class_sessions")
        .update({ start_time: updates.start_time, updated_at: new Date().toISOString() })
        .eq("definition_id", id)
        .eq("start_time", existing.start_time)
        .gte("session_date", today)
        .eq("status", "scheduled")
        .select("id");

      const movedIds = (timeSessions || []).map((s: { id: string }) => s.id);
      if (movedIds.length > 0) {
        const { count } = await admin.supabase
          .from("tu_class_bookings")
          .select("id", { count: "exact", head: true })
          .in("session_id", movedIds)
          .eq("status", "confirmed");
        bookingsAffected += count || 0;
      }
    }

    // Capacity change
    if (updates.capacity && updates.capacity !== existing.capacity) {
      await admin.supabase
        .from("tu_class_sessions")
        .update({ capacity: updates.capacity, updated_at: new Date().toISOString() })
        .eq("definition_id", id)
        .eq("capacity", existing.capacity)
        .gte("session_date", today)
        .eq("status", "scheduled");
    }

    // Day-of-week change — cancel future sessions on the old day that have no
    // confirmed bookings, then regenerate on the new day. Booked sessions are
    // left in place and reported so Tata can handle them personally.
    let dayMoveSkipped = 0;
    if (updates.day_of_week !== undefined && updates.day_of_week !== existing.day_of_week && updates.is_active !== false) {
      const { data: oldDaySessions } = await admin.supabase
        .from("tu_class_sessions")
        .select("id")
        .eq("definition_id", id)
        .gte("session_date", today)
        .eq("status", "scheduled");

      const oldIds = (oldDaySessions || []).map((s: { id: string }) => s.id);
      if (oldIds.length > 0) {
        const { data: booked } = await admin.supabase
          .from("tu_class_bookings")
          .select("session_id")
          .in("session_id", oldIds)
          .eq("status", "confirmed");

        const bookedSet = new Set((booked || []).map((b: { session_id: string }) => b.session_id));
        const cancellable = oldIds.filter((sid) => !bookedSet.has(sid));
        dayMoveSkipped = oldIds.length - cancellable.length;

        if (cancellable.length > 0) {
          await admin.supabase
            .from("tu_class_sessions")
            .update({ status: "cancelled", cancel_reason: "Horario cambiado de dia", updated_at: new Date().toISOString() })
            .in("id", cancellable);
        }
      }

      await generateSessionsForDefinition(admin.supabase, {
        id: existing.id,
        day_of_week: updates.day_of_week,
        start_time: updates.start_time ?? existing.start_time,
        teacher: updates.teacher ?? existing.teacher,
        capacity: updates.capacity ?? existing.capacity,
      });
    }

    // If deactivating, cancel future sessions
    if (updates.is_active === false) {
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
      const bookingsNote = bookingsAffected > 0 ? `\n⚠️ ${bookingsAffected} reserva(s) confirmada(s) afectadas por el cambio de hora — avisales` : "";
      const skippedNote = dayMoveSkipped > 0 ? `\n⚠️ ${dayMoveSkipped} sesion(es) con reservas quedaron en el dia anterior — revisalas en Gestión de Clases` : "";
      await sendTelegramMessage(
        `✏️ <b>Clase actualizada</b>\n\n` +
          `<b>${escapeHtml(existing.name)}</b>\n` +
          `Cambios: ${escapeHtml(changes)}${reactivationNote}${bookingsNote}${skippedNote}\n` +
          `Por: ${escapeHtml(admin.email)}`,
      );
    } catch (err) {
      console.error("[admin/class-definitions] Telegram failed:", err);
    }

    let responseMsg = "Clase actualizada";
    if (bookingsAffected > 0) responseMsg += ` — ${bookingsAffected} reserva(s) confirmada(s) tenian la hora anterior, avisales del cambio`;
    if (dayMoveSkipped > 0) responseMsg += ` — ${dayMoveSkipped} sesion(es) con reservas siguen en el dia anterior`;

    return NextResponse.json({
      message: responseMsg,
      sessions_generated: sessionsGenerated,
      bookings_affected: bookingsAffected,
      sessions_kept_old_day: dayMoveSkipped,
    });
  } catch (err) {
    console.error("[admin/class-definitions PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
