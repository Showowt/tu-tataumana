import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
    const { name, email, phone, service, preferred_date, message } = body;

    if (!name || !phone || !service) {
      return NextResponse.json(
        { error: "Name, phone, and service are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    if (!supabase) {
      // Supabase not configured — still return success so UX works
      console.warn("[API/bookings] Supabase not configured, skipping DB write");
      return NextResponse.json({
        data: { name, phone, service, preferred_date },
        message: "Booking received (DB not configured)",
      });
    }

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

    return NextResponse.json({ data, message: "Booking created" });
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
