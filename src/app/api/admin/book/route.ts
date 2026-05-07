import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { CAPACITY } from "@/lib/schedule";

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

// POST /api/admin/book — Admin books a student into a class
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { name, phone, email, class_date, class_time, class_name, payment_type, pass_id } = body;

    if (!name || !class_date || !class_time || !class_name) {
      return NextResponse.json(
        { error: "name, class_date, class_time, and class_name are required" },
        { status: 400 }
      );
    }

    // If using a pass, verify it has remaining credits and deduct
    if (payment_type === "package" && pass_id) {
      const { data: pass } = await supabase
        .from("tu_passes")
        .select("id, classes_remaining, classes_used, status")
        .eq("id", pass_id)
        .single();

      if (!pass || pass.status !== "active" || pass.classes_remaining <= 0) {
        return NextResponse.json(
          { error: "Pass has no remaining credits or is inactive" },
          { status: 400 }
        );
      }

      // Deduct one credit (classes_remaining is generated, only update classes_used)
      const { error: passErr } = await supabase
        .from("tu_passes")
        .update({
          classes_used: pass.classes_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pass_id);

      if (passErr) {
        console.error("[Admin/book] Pass deduction error:", passErr);
        return NextResponse.json({ error: "Failed to deduct pass credit" }, { status: 500 });
      }
    }

    // Update class_slots (capacity tracking)
    const dateObj = new Date(class_date + "T12:00:00");
    const dayOfWeek = dateObj.getDay();

    const { data: existingSlot } = await supabase
      .from("tu_class_slots")
      .select("id, enrolled, capacity")
      .eq("class_date", class_date)
      .eq("class_time", class_time)
      .single();

    if (existingSlot) {
      if (existingSlot.enrolled >= existingSlot.capacity) {
        return NextResponse.json(
          { error: "Class is full", spots_left: 0 },
          { status: 409 }
        );
      }
      await supabase
        .from("tu_class_slots")
        .update({ enrolled: existingSlot.enrolled + 1, updated_at: new Date().toISOString() })
        .eq("id", existingSlot.id);
    } else {
      await supabase.from("tu_class_slots").insert({
        class_date,
        class_name,
        class_time,
        day_of_week: dayOfWeek,
        enrolled: 1,
        capacity: CAPACITY,
      });
    }

    // Create the booking
    const { data, error } = await supabase
      .from("tu_bookings")
      .insert({
        name,
        phone: phone || "admin-entry",
        email: email || null,
        service: `${class_name} @ ${class_time}`,
        preferred_date: class_date,
        class_date,
        class_time,
        class_name,
        source: "admin",
        status: "confirmed",
        paid: payment_type === "cash" || payment_type === "package",
        payment_type: payment_type || "cash",
        pass_id: pass_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Admin/book] Booking insert error:", error);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    return NextResponse.json({ data, message: "Student booked successfully" }, { status: 201 });
  } catch (err) {
    console.error("[Admin/book] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
