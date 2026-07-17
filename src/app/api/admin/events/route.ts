import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/events
 * List events with optional filters.
 *
 * Query params:
 *   status  — upcoming | sold_out | cancelled | completed
 *   active  — true | false
 *
 * Default: upcoming + active events only.
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;
  const { searchParams } = request.nextUrl;

  const status = searchParams.get("status");
  const active = searchParams.get("active");

  let query = supabase
    .from("tu_events")
    .select("*")
    .order("event_date", { ascending: true });

  // Apply filters — default to upcoming + active if no params provided
  if (status) {
    query = query.eq("status", status);
  } else if (!active) {
    // Default: only upcoming
    query = query.eq("status", "upcoming");
  }

  if (active === "true") {
    query = query.eq("is_active", true);
  } else if (active === "false") {
    query = query.eq("is_active", false);
  } else if (!status) {
    // Default: only active
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin/events GET]", error.message);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data || [] });
}

/**
 * POST /api/admin/events
 * Administrative event actions: create, update, cancel, activate.
 *
 * Body:
 *   action: "create" | "update" | "cancel" | "activate"
 *
 *   create  — { title, title_es, event_date, ... }
 *   update  — { event_id, ...fields }
 *   cancel  — { event_id }
 *   activate — { event_id }
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;
  const body = await request.json();
  const { action } = body;

  switch (action) {
    // -----------------------------------------------------------------
    // CREATE
    // -----------------------------------------------------------------
    case "create": {
      const { title, title_es, event_date } = body;

      if (!title || !title_es || !event_date) {
        return NextResponse.json(
          { error: "title, title_es, and event_date are required" },
          { status: 400 },
        );
      }

      const insert: Record<string, unknown> = {
        title,
        title_es,
        event_date,
      };

      // Optional fields
      if (body.description !== undefined) insert.description = body.description;
      if (body.description_es !== undefined)
        insert.description_es = body.description_es;
      if (body.start_time !== undefined) insert.start_time = body.start_time;
      if (body.end_time !== undefined) insert.end_time = body.end_time;
      if (body.location !== undefined) insert.location = body.location;
      if (body.capacity !== undefined) insert.capacity = body.capacity;
      if (body.price_cop !== undefined) insert.price_cop = body.price_cop;
      if (body.price_usd !== undefined) insert.price_usd = body.price_usd;
      if (body.image_url !== undefined) insert.image_url = body.image_url;
      if (body.is_active !== undefined) insert.is_active = body.is_active;
      if (body.status !== undefined) insert.status = body.status;

      const { data, error } = await supabase
        .from("tu_events")
        .insert(insert)
        .select()
        .single();

      if (error) {
        console.error("[admin/events create]", error.message);
        return NextResponse.json(
          { error: "Failed to create event" },
          { status: 500 },
        );
      }

      return NextResponse.json({ data, message: "Event created" });
    }

    // -----------------------------------------------------------------
    // UPDATE
    // -----------------------------------------------------------------
    case "update": {
      const { event_id, ...fields } = body;

      if (!event_id) {
        return NextResponse.json(
          { error: "event_id is required" },
          { status: 400 },
        );
      }

      // Remove action from the update payload
      delete fields.action;

      if (Object.keys(fields).length === 0) {
        return NextResponse.json(
          { error: "No fields to update" },
          { status: 400 },
        );
      }

      // Always bump updated_at
      fields.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("tu_events")
        .update(fields)
        .eq("id", event_id)
        .select()
        .single();

      if (error) {
        console.error("[admin/events update]", error.message);
        return NextResponse.json(
          { error: "Failed to update event" },
          { status: 500 },
        );
      }

      return NextResponse.json({ data, message: "Event updated" });
    }

    // -----------------------------------------------------------------
    // CANCEL
    // -----------------------------------------------------------------
    case "cancel": {
      const { event_id: cancelId } = body;

      if (!cancelId) {
        return NextResponse.json(
          { error: "event_id is required" },
          { status: 400 },
        );
      }

      const { error } = await supabase
        .from("tu_events")
        .update({
          status: "cancelled",
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cancelId);

      if (error) {
        console.error("[admin/events cancel]", error.message);
        return NextResponse.json(
          { error: "Failed to cancel event" },
          { status: 500 },
        );
      }

      return NextResponse.json({ message: "Event cancelled" });
    }

    // -----------------------------------------------------------------
    // ACTIVATE
    // -----------------------------------------------------------------
    case "activate": {
      const { event_id: activateId } = body;

      if (!activateId) {
        return NextResponse.json(
          { error: "event_id is required" },
          { status: 400 },
        );
      }

      const { error } = await supabase
        .from("tu_events")
        .update({
          status: "upcoming",
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activateId);

      if (error) {
        console.error("[admin/events activate]", error.message);
        return NextResponse.json(
          { error: "Failed to activate event" },
          { status: 500 },
        );
      }

      return NextResponse.json({ message: "Event activated" });
    }

    // -----------------------------------------------------------------
    // DELETE
    // -----------------------------------------------------------------
    case "delete": {
      const { event_id: deleteId } = body;

      if (!deleteId) {
        return NextResponse.json(
          { error: "event_id is required" },
          { status: 400 },
        );
      }

      // Verify event exists and has no enrolled students
      const { data: eventToDelete } = await supabase
        .from("tu_events")
        .select("id, enrolled, status")
        .eq("id", deleteId)
        .single();

      if (!eventToDelete) {
        return NextResponse.json(
          { error: "Event not found" },
          { status: 404 },
        );
      }

      if ((eventToDelete.enrolled || 0) > 0 && eventToDelete.status !== "cancelled") {
        return NextResponse.json(
          { error: "No se puede eliminar un evento con inscritos. Cancela primero." },
          { status: 400 },
        );
      }

      const { error } = await supabase
        .from("tu_events")
        .delete()
        .eq("id", deleteId);

      if (error) {
        console.error("[admin/events delete]", error.message);
        return NextResponse.json(
          { error: "Failed to delete event" },
          { status: 500 },
        );
      }

      return NextResponse.json({ message: "Event deleted" });
    }

    // -----------------------------------------------------------------
    // DEFAULT
    // -----------------------------------------------------------------
    default:
      return NextResponse.json(
        { error: "Invalid action. Use: create, update, cancel, activate, delete" },
        { status: 400 },
      );
  }
}
