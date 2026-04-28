import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { notifyNewBooking } from "@/lib/telegram";
import { CAPACITY } from "@/lib/schedule";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      service,
      preferred_date,
      message,
      class_time,
      class_name,
    } = body;

    if (!name || !phone || !service) {
      return NextResponse.json(
        { error: "Name, phone, and service are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    if (!supabase) {
      console.warn("[API/bookings] Supabase not configured, skipping DB write");
      try {
        await notifyNewBooking({ name, email, phone, service, preferred_date, message });
      } catch (e) {
        console.error("[Bookings] Telegram notification failed:", e);
      }
      return NextResponse.json({
        data: { name, phone, service, preferred_date },
        message: "Booking received (DB not configured)",
      });
    }

    // --- Capacity check ---
    let spotsLeft: number | null = null;
    if (preferred_date && class_time) {
      const dateObj = new Date(preferred_date + "T12:00:00");
      const dayOfWeek = dateObj.getDay();

      // Get or create the class slot row
      const { data: existing } = await supabase
        .from("tu_class_slots")
        .select("id, enrolled, capacity")
        .eq("class_date", preferred_date)
        .eq("class_time", class_time)
        .single();

      if (existing) {
        if (existing.enrolled >= existing.capacity) {
          return NextResponse.json(
            {
              error: "This class is full. Please choose another time or date.",
              spots_left: 0,
            },
            { status: 409 }
          );
        }
        // Increment enrollment
        const { error: updateErr } = await supabase
          .from("tu_class_slots")
          .update({ enrolled: existing.enrolled + 1 })
          .eq("id", existing.id);
        if (updateErr) console.error("[Bookings] Slot update failed:", updateErr);
        spotsLeft = existing.capacity - existing.enrolled - 1;
      } else {
        // First booking for this class on this date — create the slot
        const { error: insertErr } = await supabase
          .from("tu_class_slots")
          .insert({
            class_date: preferred_date,
            class_name: class_name || service,
            class_time,
            day_of_week: dayOfWeek,
            enrolled: 1,
            capacity: CAPACITY,
          });
        if (insertErr) console.error("[Bookings] Slot insert failed:", insertErr);
        spotsLeft = CAPACITY - 1;
      }
    }

    // --- Create booking ---
    const { data, error } = await supabase
      .from("tu_bookings")
      .insert({
        name,
        email: email || null,
        phone,
        service,
        preferred_date: preferred_date || null,
        message: message || null,
        source: "website",
        status: "new",
        class_date: preferred_date || null,
        class_time: class_time || null,
        class_name: class_name || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[API/bookings]", error);
      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 }
      );
    }

    // Notify Tata via Telegram with spots info
    try {
      const spotsMsg = spotsLeft !== null ? ` (${spotsLeft} spots left)` : "";
      await notifyNewBooking({
        name,
        email,
        phone,
        service: `${service}${spotsMsg}`,
        preferred_date,
        message,
      });
    } catch (e) {
      console.error("[Bookings] Telegram notification failed:", e);
    }

    return NextResponse.json({
      data,
      spots_left: spotsLeft,
      message: "Booking created",
    });
  } catch (err) {
    console.error("[API/bookings]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ data: [], message: "DB not configured" });
    }

    const { data, error } = await supabase
      .from("tu_bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[API/bookings]", error);
      return NextResponse.json(
        { error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[API/bookings]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
