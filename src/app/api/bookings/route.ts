import { NextResponse } from "next/server";
import { notifyNewBooking, notifyWaitlistRequest } from "@/lib/telegram";
import { WEB_PREREGISTRATION_HOLD_HOURS } from "@/lib/constants/business-rules";
import { getAdminClient } from "@/lib/admin-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** Shape returned by the tu_web_prereserve RPC. */
interface PrereserveResult {
  status: "created" | "duplicate" | "full";
  booking_id: number;
  session_id: string | null;
  capacity: number | null;
  confirmed: number | null;
  pending: number | null;
  spots_left: number | null;
}

export async function POST(request: Request) {
  try {
    if (rateLimit(`bookings:${clientIp(request)}`, 10, 60_000)) {
      return NextResponse.json({ error: "Demasiadas solicitudes. / Too many requests." }, { status: 429 });
    }

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

    // --- Capacity check + booking, as one atomic step ---
    // This used to gate on tu_slot_reserve → tu_class_slots: a legacy table
    // written only by this endpoint, with a hardcoded capacity, that has no
    // relationship to the real schedule. A class could be packed in
    // tu_class_sessions while this counter still reported "spots left" — which
    // is exactly what Tata hit on 2026-10-17 (real session 14/15 against a
    // 10-person room, slots table claiming 7 of 12 used).
    //
    // tu_web_prereserve resolves the REAL session for this date+time, locks it,
    // counts confirmed seats plus outstanding web pre-registrations, and inserts
    // only if there is room — so the check cannot race the write. A full class
    // is recorded as a waitlist row, never as a seat.
    const { data: rpcResult, error: reserveErr } = await supabase.rpc("tu_web_prereserve", {
      p_name: name,
      p_phone: phone,
      p_email: email || null,
      p_service: service,
      p_date: preferred_date || null,
      p_time: class_time || null,
      p_class_name: class_name || null,
      p_message: message || null,
      p_hold_hours: WEB_PREREGISTRATION_HOLD_HOURS,
    });

    if (reserveErr || !rpcResult) {
      console.error("[API/bookings] tu_web_prereserve failed:", reserveErr?.message);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    const reservation = rpcResult as PrereserveResult;
    const spotsLeft = reservation.spots_left;

    const bookingRow = {
      id: reservation.booking_id,
      name,
      email: email || null,
      phone,
      service,
      preferred_date: preferred_date || null,
      class_date: preferred_date || null,
      class_time: class_time || null,
      class_name: class_name || null,
      status: reservation.status === "full" ? "waitlist" : "new",
    };

    // A resubmit of the same form (same person, same class) returns the original
    // row instead of holding a second seat and firing a second notification.
    // The payment-method PATCH then lands on that row, so a corrected resubmit
    // still updates what Tata sees.
    if (reservation.status === "duplicate") {
      return NextResponse.json({
        data: { ...bookingRow, id: reservation.booking_id },
        duplicate: true,
        message: "Booking already registered",
      });
    }

    if (reservation.status === "full") {
      try {
        await notifyWaitlistRequest({
          name,
          email,
          phone,
          service,
          preferred_date,
          capacity: reservation.capacity,
          confirmed: reservation.confirmed,
        });
      } catch (e) {
        console.error("[Bookings] Waitlist notification failed:", e);
      }

      return NextResponse.json(
        {
          error:
            "Esta clase ya está llena. Te anotamos en la lista de espera y Tata te escribe si se libera un cupo. / This class is full. We've added you to the waitlist and Tata will message you if a spot opens.",
          full: true,
          waitlisted: true,
          spots_left: 0,
          booking_id: reservation.booking_id,
        },
        { status: 409 },
      );
    }

    // --- Check for active class pass ---
    let passInfo = "";
    // Strip to DIGITS ONLY before it enters the PostgREST .or() filter — a stray
    // comma/paren in `phone` would otherwise inject extra OR terms and match another
    // person's pass (R2E-01/R2C-06). Digits cannot break the filter grammar.
    const normalizedPhone = phone.replace(/\D/g, "");
    try {
      const { data: passes } = normalizedPhone.length < 6 ? { data: [] } : await supabase
        .from("tu_passes")
        .select("*")
        .or(`phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`)
        .eq("status", "active")
        .eq("payment_confirmed", true) // never honor an unpaid pass (admin-created passes set this true)
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

    // The row was already written by tu_web_prereserve above — inserting here
    // would hand out a second seat for the same person.

    // Notify Tata via Telegram with REAL spots + pass info.
    // spotsLeft now counts confirmed seats and outstanding pre-registrations
    // against the session's own capacity, so the number she reads is the number
    // of mats actually free.
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
      data: bookingRow,
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

// PATCH /api/bookings — record the payment method the student selected in the
// booking modal. The booking row is created before the payment step, so the
// method arrives in a second call. Public endpoint: only allows setting
// payment_method on a recent, still-new booking.
const ALLOWED_PAYMENT_METHODS = ["cash", "nequi", "bancolombia", "zelle", "wompi"];

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, payment_method } = body;

    if (typeof id !== "number" || !ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    let supabase;
    try {
      supabase = getAdminClient();
    } catch {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("tu_bookings")
      .update({ payment_method, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "new")
      .gte("created_at", sixHoursAgo);

    if (error) {
      console.error("[API/bookings] PATCH", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ message: "Payment method recorded" });
  } catch (err) {
    console.error("[API/bookings] PATCH", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET removed — use /api/admin/dashboard or portal endpoints instead
