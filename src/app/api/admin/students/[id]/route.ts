import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/admin-auth";
import { createInviteLink } from "@/lib/invite";

/**
 * GET /api/admin/students/[id]
 * Returns student detail with their packs and transactions.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Student ID is required" },
      { status: 400 },
    );
  }

  const supabase = admin.supabase;

  // Fetch student
  const { data: student, error: studentError } = await supabase
    .from("tu_students")
    .select("*")
    .eq("id", id)
    .single();

  if (studentError || !student) {
    console.error("[admin/students/[id] GET]", studentError?.message);
    return NextResponse.json(
      { error: "Student not found" },
      { status: 404 },
    );
  }

  // Fetch packs
  const { data: packs, error: packsError } = await supabase
    .from("tu_packs")
    .select("*")
    .eq("student_id", id)
    .order("created_at", { ascending: false });

  if (packsError) {
    console.error("[admin/students/[id] GET] packs:", packsError.message);
  }

  // Fetch transactions
  const { data: transactions, error: txError } = await supabase
    .from("tu_transactions")
    .select("*")
    .eq("student_id", id)
    .order("created_at", { ascending: false });

  if (txError) {
    console.error("[admin/students/[id] GET] transactions:", txError.message);
  }

  // Fetch booking stats (attendance + no-shows)
  const { count: totalBookings } = await supabase
    .from("tu_class_bookings")
    .select("id", { count: "exact", head: true })
    .eq("student_id", id);

  const { count: noShowCount } = await supabase
    .from("tu_class_bookings")
    .select("id", { count: "exact", head: true })
    .eq("student_id", id)
    .eq("status", "no_show");

  const { count: attendedCount } = await supabase
    .from("tu_class_bookings")
    .select("id", { count: "exact", head: true })
    .eq("student_id", id)
    .eq("checked_in", true);

  const { count: cancelledCount } = await supabase
    .from("tu_class_bookings")
    .select("id", { count: "exact", head: true })
    .eq("student_id", id)
    .eq("status", "cancelled");

  const stats = {
    total_bookings: totalBookings || 0,
    attended: attendedCount || 0,
    no_shows: noShowCount || 0,
    cancelled: cancelledCount || 0,
    no_show_rate: totalBookings && totalBookings > 0
      ? Math.round(((noShowCount || 0) / totalBookings) * 100)
      : 0,
    attendance_rate: totalBookings && totalBookings > 0
      ? Math.round(((attendedCount || 0) / totalBookings) * 100)
      : 0,
  };

  return NextResponse.json({
    student,
    packs: packs || [],
    transactions: transactions || [],
    stats,
  });
}

/**
 * POST /api/admin/students/[id]
 * Generate a login link for the student.
 * Creates an auth account if one doesn't exist yet.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = admin.supabase;

  // Fetch student
  const { data: student, error: studentError } = await supabase
    .from("tu_students")
    .select("id, email, full_name, phone, auth_id")
    .eq("id", id)
    .single();

  if (studentError || !student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Service key not configured" },
      { status: 500 },
    );
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
  );

  try {
    // If student doesn't have an auth account, create one
    if (!student.auth_id) {
      const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
          email: student.email,
          email_confirm: true,
          user_metadata: {
            full_name: student.full_name,
            phone: student.phone || null,
          },
        });

      if (authError) {
        // If user already exists in auth (e.g. self-registered but not linked),
        // continue to generate the magic link — don't block
        if (!authError.message?.includes("already been registered")) {
          console.error("[admin/students/invite] Create user failed:", authError.message);
          return NextResponse.json(
            { error: `No se pudo crear la cuenta: ${authError.message}` },
            { status: 500 },
          );
        }
        console.warn("[admin/students/invite] Auth user exists but not linked:", student.email);
      }

      if (authData?.user) {
        const { error: linkErr } = await supabase
          .from("tu_students")
          .update({ auth_id: authData.user.id })
          .eq("id", id);
        if (linkErr) {
          console.error("[admin/students/invite] Failed to link auth_id:", linkErr.message);
        }
      }
    }

    // Durable invite link (7 days, reusable, safe for WhatsApp previews)
    const loginLink = await createInviteLink(supabase, student.id);

    return NextResponse.json({
      loginLink,
      message: `Enlace de acceso generado para ${student.full_name}`,
    });
  } catch (err) {
    console.error("[admin/students/invite] Error:", err);
    return NextResponse.json(
      { error: "Error generando enlace de acceso" },
      { status: 500 },
    );
  }
}
