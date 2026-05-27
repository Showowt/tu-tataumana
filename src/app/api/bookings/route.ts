import { NextResponse } from "next/server";
import { notifyNewBooking } from "@/lib/telegram";
import { DEFAULT_CLASS_CAPACITY as CAPACITY } from "@/lib/constants/business-rules";
import { getAdminClient } from "@/lib/admin-auth";

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

    let supabase;
    try {
      supabase = getAdminClient();
    } catch {
      supabase = null;
    }

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

    // --- Check for active class pass ---
    let passInfo = "";
    const normalizedPhone = phone.replace(/[\s\-\+]/g, "");
    try {
      const { data: passes } = await supabase
        .from("tu_passes")
        .select("*")
        .or(`phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1);

      if (passes && passes.length > 0) {
        const pass = passes[0];
        const isUnlimited = pass.total_classes === -1;
        const hasRemaining = isUnlimited || pass.classes_used < pass.total_classes;
        const notExpired = !pass.expires_at || new Date(pass.expires_at) > new Date();

        if (hasRemaining && notExpired) {
          // Atomic decrement — prevents race condition with concurrent bookings
          const newUsed = pass.classes_used + 1;
          let updateQuery = supabase
            .from("tu_passes")
            .update({ classes_used: newUsed, updated_at: new Date().toISOString() })
            .eq("id", pass.id)
            .eq("classes_used", pass.classes_used); // Optimistic lock: only update if count hasn't changed

          const { data: updated, error: updateErr } = await updateQuery.select().single();

          if (updated && !updateErr) {
            const remaining = isUnlimited ? "Unlimited" : pass.total_classes - newUsed;
            passInfo = ` [PASS: ${pass.pass_type} — ${remaining} classes remaining]`;
          } else {
            console.warn("[Bookings] Pass race condition — concurrent booking detected, pass not decremented");
          }
        }
      }
    } catch (e) {
      console.error("[Bookings] Pass check failed:", e);
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

    // Notify Tata via Telegram with spots + pass info
    try {
      const spotsMsg = spotsLeft !== null ? ` (${spotsLeft} spots left)` : "";
      await notifyNewBooking({
        name,
        email,
        phone,
        service: `${service}${spotsMsg}${passInfo}`,
        preferred_date,
        message,
      });
    } catch (e) {
      console.error("[Bookings] Telegram notification failed:", e);
    }

    return NextResponse.json({
      data,
      spots_left: spotsLeft,
      pass_used: passInfo ? true : false,
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

// GET removed — use /api/admin/dashboard or portal endpoints instead
