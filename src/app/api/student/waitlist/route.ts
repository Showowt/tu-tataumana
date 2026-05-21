/**
 * POST /api/student/waitlist — Join waitlist for a full class
 * GET  /api/student/waitlist — Get student's waitlist entries
 * DELETE /api/student/waitlist — Leave a waitlist
 *
 * When a student cancels a booking, the cancel API should call
 * notifyNextOnWaitlist() to alert the next person in line.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { sendTelegramMessage } from "@/lib/telegram";

async function getAuthenticatedStudent() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = serviceKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    : supabase;

  const { data: student } = await db
    .from("tu_students")
    .select("id, email, full_name")
    .eq("auth_id", user.id)
    .single();

  return student ? { ...student, db } : null;
}

// GET — student's waitlist entries
export async function GET() {
  const auth = await getAuthenticatedStudent();
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await auth.db
    .from("tu_waitlist")
    .select("id, session_id, status, created_at, notified_at")
    .eq("student_id", auth.id)
    .eq("status", "waiting")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST — join waitlist
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedStudent();
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { session_id } = body;

  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  // Check if already on waitlist
  const { data: existing } = await auth.db
    .from("tu_waitlist")
    .select("id")
    .eq("student_id", auth.id)
    .eq("session_id", session_id)
    .eq("status", "waiting")
    .single();

  if (existing) {
    return NextResponse.json({ error: "Ya estás en la lista de espera / Already on waitlist" }, { status: 409 });
  }

  // Check if already booked
  const { data: booked } = await auth.db
    .from("tu_class_bookings")
    .select("id")
    .eq("student_id", auth.id)
    .eq("session_id", session_id)
    .neq("status", "cancelled")
    .single();

  if (booked) {
    return NextResponse.json({ error: "Ya tienes reserva para esta clase / Already booked" }, { status: 409 });
  }

  const { data, error } = await auth.db
    .from("tu_waitlist")
    .insert({ student_id: auth.id, session_id })
    .select("id, status, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already on waitlist" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get class info for notification
  const { data: slot } = await auth.db
    .from("tu_class_sessions")
    .select("session_date, start_time, definition:tu_class_definitions(name)")
    .eq("id", session_id)
    .single();

  // Count waitlist position
  const { count } = await auth.db
    .from("tu_waitlist")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session_id)
    .eq("status", "waiting");

  // Notify admin
  try {
    const slotDef = slot?.definition as { name: string } | { name: string }[] | null;
    const className = Array.isArray(slotDef) ? slotDef[0]?.name : slotDef?.name;
    await sendTelegramMessage(
      `📋 <b>LISTA DE ESPERA</b>\n\n<b>${auth.full_name}</b> se unió a la lista de espera\n<b>Clase:</b> ${className || "Clase"}\n<b>Fecha:</b> ${slot?.session_date || "?"} · ${slot?.start_time || "?"}\n<b>Posición:</b> #${count || 1}`
    );
  } catch {}

  return NextResponse.json({
    data,
    position: count || 1,
    message: "Added to waitlist",
  });
}

// DELETE — leave waitlist
export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedStudent();
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const waitlistId = searchParams.get("id");
  const sessionId = searchParams.get("session_id");

  if (!waitlistId && !sessionId) {
    return NextResponse.json({ error: "id or session_id required" }, { status: 400 });
  }

  let query = auth.db
    .from("tu_waitlist")
    .delete()
    .eq("student_id", auth.id)
    .eq("status", "waiting");

  if (waitlistId) {
    query = query.eq("id", waitlistId);
  } else {
    query = query.eq("session_id", sessionId!);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * Notify the next student on the waitlist when a spot opens.
 * Call this from the cancel booking API when a cancellation happens.
 */
export async function notifyNextOnWaitlist(sessionId: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Get the next waiting student (FIFO)
  const { data: next } = await supabase
    .from("tu_waitlist")
    .select("id, student_id, tu_students(full_name, email, phone)")
    .eq("session_id", sessionId)
    .eq("status", "waiting")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!next) return;

  // Mark as notified
  await supabase
    .from("tu_waitlist")
    .update({ status: "notified", notified_at: new Date().toISOString() })
    .eq("id", next.id);

  // Get class details
  const { data: slot } = await supabase
    .from("tu_class_sessions")
    .select("session_date, start_time, definition:tu_class_definitions(name)")
    .eq("id", sessionId)
    .single();

  const slotDef = slot?.definition as { name: string } | { name: string }[] | null;
  const className = Array.isArray(slotDef) ? slotDef[0]?.name : slotDef?.name;
  const studentInfo = next.tu_students as unknown as { full_name: string; email: string; phone: string } | null;

  // Notify via Telegram
  try {
    await sendTelegramMessage(
      `🔔 <b>CUPO DISPONIBLE — LISTA DE ESPERA</b>\n\n<b>${studentInfo?.full_name || "Student"}</b> fue notificado de un cupo disponible:\n<b>Clase:</b> ${className || "Clase"}\n<b>Fecha:</b> ${slot?.session_date || "?"} · ${slot?.start_time || "?"}\n\n${studentInfo?.phone ? `<a href="https://wa.me/${studentInfo.phone.replace(/[^0-9]/g, "")}">Enviar WhatsApp</a>` : `Email: ${studentInfo?.email || "?"}`}`
    );
  } catch {}
}
