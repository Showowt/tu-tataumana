import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function verifyAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  const expected = process.env.TU_ADMIN_KEY || "";
  return adminKey === expected;
}

// GET /api/admin/roster?date=2026-05-05
// Returns all bookings for a given date, grouped by class
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "date query parameter is required" }, { status: 400 });
  }

  // Get all bookings for this date
  const { data: bookings, error: bookingsErr } = await supabase
    .from("tu_bookings")
    .select("id, name, phone, email, class_time, class_name, payment_type, pass_id, source, status, created_at")
    .eq("class_date", date)
    .order("class_time", { ascending: true });

  if (bookingsErr) {
    console.error("[Admin/roster] Error:", bookingsErr);
    return NextResponse.json({ error: "Failed to fetch roster" }, { status: 500 });
  }

  // Get class slots for capacity info
  const { data: slots } = await supabase
    .from("tu_class_slots")
    .select("class_time, class_name, enrolled, capacity")
    .eq("class_date", date);

  // Group bookings by class
  const classes: Record<string, {
    class_name: string;
    class_time: string;
    enrolled: number;
    capacity: number;
    students: typeof bookings;
  }> = {};

  for (const booking of bookings || []) {
    const key = `${booking.class_time}-${booking.class_name}`;
    if (!classes[key]) {
      const slot = slots?.find(
        (s) => s.class_time === booking.class_time && s.class_name === booking.class_name
      );
      classes[key] = {
        class_name: booking.class_name || "Unknown",
        class_time: booking.class_time || "Unknown",
        enrolled: slot?.enrolled || 0,
        capacity: slot?.capacity || 10,
        students: [],
      };
    }
    classes[key].students.push(booking);
  }

  // Also include slots that have enrollments but maybe bookings were made differently
  for (const slot of slots || []) {
    const key = `${slot.class_time}-${slot.class_name}`;
    if (!classes[key]) {
      classes[key] = {
        class_name: slot.class_name,
        class_time: slot.class_time,
        enrolled: slot.enrolled,
        capacity: slot.capacity,
        students: [],
      };
    }
  }

  // Sort by time
  const sortedClasses = Object.values(classes).sort((a, b) =>
    a.class_time.localeCompare(b.class_time)
  );

  return NextResponse.json({
    date,
    total_students: bookings?.length || 0,
    classes: sortedClasses,
  });
}
