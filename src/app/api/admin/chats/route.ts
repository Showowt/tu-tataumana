import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/chats — everything Tata needs to see who is TRYING to come:
 *  - sessions: website chat transcripts (tu_chat_sessions), newest activity first
 *  - pending:  web reservations that never confirmed payment (tu_bookings status=new)
 *  - leads:    abandoned booking attempts with contact info (tu_leads)
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = admin.supabase;

  const days = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get("days") || 45), 1),
    180
  );
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [sessionsRes, pendingRes, leadsRes] = await Promise.all([
    supabase
      .from("tu_chat_sessions")
      .select(
        "session_id, messages, message_count, first_message, last_message, last_activity, extracted_name, extracted_email, extracted_phone, intent, lead_score, created_at"
      )
      .gte("last_activity", since)
      .order("last_activity", { ascending: false })
      .limit(100),
    supabase
      .from("tu_bookings")
      .select(
        "id, created_at, name, email, phone, service, class_date, class_time, class_name, payment_method, status"
      )
      .eq("source", "website")
      .eq("status", "new")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("tu_leads")
      .select(
        "id, created_at, source, name, email, phone, service_interest, preferred_date, booking_step, warmth"
      )
      .eq("source", "booking_abandoned")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (sessionsRes.error || pendingRes.error || leadsRes.error) {
    console.error(
      "[API/admin/chats]",
      sessionsRes.error || pendingRes.error || leadsRes.error
    );
    return NextResponse.json(
      { error: "Failed to load chat data" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sessions: sessionsRes.data || [],
    pending: pendingRes.data || [],
    leads: leadsRes.data || [],
  });
}

const PatchSchema = z.object({
  booking_ids: z.array(z.number().int().positive()).min(1).max(50),
  action: z.literal("archive"),
});

/**
 * PATCH /api/admin/chats — mark a pending web reservation as handled.
 * Sets tu_bookings.status to "archived" so it leaves this list AND the
 * Telegram /reservas + nightly-digest pending overlays (both key on status=new).
 */
export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data, error } = await admin.supabase
    .from("tu_bookings")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .in("id", parsed.data.booking_ids)
    .eq("status", "new")
    .select("id");

  if (error) {
    console.error("[API/admin/chats] archive", error);
    return NextResponse.json({ error: "Failed to archive" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Reserva no encontrada o ya gestionada / Not found or already handled" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data, archived: data.length });
}
