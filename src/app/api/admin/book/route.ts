import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { DEFAULT_CLASS_CAPACITY as CAPACITY } from "@/lib/constants/business-rules";

// POST /api/admin/book — Admin books a student into a class (legacy tu_bookings)
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;

  try {
    const body = await request.json();
    const { name, phone, email, class_date, class_time, class_name, payment_type, pass_id } = body;

    if (!name || !class_date || !class_time || !class_name) {
      return NextResponse.json(
        { error: "name, class_date, class_time, and class_name are required" },
        { status: 400 }
      );
    }

    // If using a pass, verify it has remaining credits and deduct with optimistic lock
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

      // Deduct one credit with optimistic lock
      const { data: updated, error: passErr } = await supabase
        .from("tu_passes")
        .update({
          classes_used: pass.classes_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pass_id)
        .eq("classes_used", pass.classes_used)
        .select("id")
        .single();

      if (passErr || !updated) {
        console.error("[Admin/book] Pass deduction error:", passErr);
        return NextResponse.json({ error: "Failed to deduct pass credit (concurrent update)" }, { status: 409 });
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
        .eq("id", existingSlot.id)
        .eq("enrolled", existingSlot.enrolled);
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
