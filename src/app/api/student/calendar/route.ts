/**
 * GET /api/student/calendar?booking_id=xxx
 * Returns an .ics file for a specific booking.
 *
 * GET /api/student/calendar?upcoming=true
 * Returns an .ics file with all upcoming bookings.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { TIMEZONE, STUDIO_LOCATION, STUDIO_ADDRESS } from "@/lib/constants/business-rules";

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

function formatICSDate(dateStr: string, timeStr: string): string {
  // Convert date (YYYY-MM-DD) and time (HH:MM) to ICS format
  // Colombia is UTC-5 (no DST)
  const [year, month, day] = dateStr.split("-");
  const [hour, minute] = timeStr.split(":");
  return `${year}${month}${day}T${hour}${minute}00`;
}

function generateICS(events: Array<{
  uid: string;
  summary: string;
  description: string;
  location: string;
  dtstart: string;
  dtend: string;
}>): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TU by Tata Umana//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-TIMEZONE:${TIMEZONE}`,
    "BEGIN:VTIMEZONE",
    `TZID:${TIMEZONE}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0500",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}@tataumana.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART;TZID=${TIMEZONE}:${event.dtstart}`,
      `DTEND;TZID=${TIMEZONE}:${event.dtend}`,
      `SUMMARY:${event.summary}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.location}`,
      "STATUS:CONFIRMED",
      "BEGIN:VALARM",
      "TRIGGER:-PT2H",
      "ACTION:DISPLAY",
      "DESCRIPTION:Your class at TU. starts in 2 hours",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedStudent();
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("booking_id");
  const upcoming = searchParams.get("upcoming");

  let query = auth.db
    .from("tu_class_bookings")
    .select(`
      id, status,
      session:tu_class_sessions (
        session_date, start_time, capacity,
        definition:tu_class_definitions (
          name, name_es, duration_minutes, teacher, location
        )
      )
    `)
    .eq("student_id", auth.id)
    .eq("status", "confirmed");

  if (bookingId) {
    query = query.eq("id", bookingId);
  } else if (upcoming === "true") {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    // Filter by session date >= today using a nested filter
    query = query.order("id", { ascending: false }).limit(20);
  }

  const { data: bookings, error } = await query;

  if (error || !bookings || bookings.length === 0) {
    return NextResponse.json(
      { error: "No bookings found" },
      { status: 404 },
    );
  }

  const events = bookings
    .filter((b) => b.session)
    .map((b) => {
      const session = b.session as unknown as {
        session_date: string;
        start_time: string;
        definition: {
          name: string;
          name_es: string;
          duration_minutes: number;
          teacher: string;
          location: string;
        };
      };

      const def = session.definition;
      const duration = def?.duration_minutes || 60;

      // Calculate end time
      const [startH, startM] = session.start_time.split(":").map(Number);
      const endMinutes = startH * 60 + startM + duration;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

      return {
        uid: b.id,
        summary: `TU. ${def?.name || "Yoga Class"} — ${def?.teacher || ""}`,
        description: `${def?.name_es || def?.name || "Clase"} con ${def?.teacher || "TU."}\\nTU. by Tata Umana`,
        location: `${def?.location || STUDIO_LOCATION}, ${STUDIO_ADDRESS}`,
        dtstart: formatICSDate(session.session_date, session.start_time),
        dtend: formatICSDate(session.session_date, endTime),
      };
    });

  if (events.length === 0) {
    return NextResponse.json(
      { error: "No valid events" },
      { status: 404 },
    );
  }

  const icsContent = generateICS(events);
  const filename = bookingId ? `tu-class-${bookingId.slice(0, 8)}.ics` : "tu-upcoming-classes.ics";

  return new NextResponse(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
