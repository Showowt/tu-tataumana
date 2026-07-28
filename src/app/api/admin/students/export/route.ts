import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/students/export
 * Export all students as CSV with credits, registration date, classes taken.
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;

  // Fetch all students
  const { data: students, error: studErr } = await supabase
    .from("tu_students")
    .select("id, full_name, email, phone, birthday, created_at")
    .order("full_name", { ascending: true });

  if (studErr || !students) {
    return NextResponse.json({ error: "Error fetching students" }, { status: 500 });
  }

  // Fetch all active packs grouped by student
  const { data: packs } = await supabase
    .from("tu_packs")
    .select("student_id, total_classes, classes_used, classes_remaining, status")
    .eq("status", "active");

  // Fetch booking counts per student (confirmed only)
  const { data: bookings } = await supabase
    .from("tu_class_bookings")
    .select("student_id, created_at")
    .eq("status", "confirmed");

  type PackRow = { student_id: string; total_classes: number; classes_used: number; classes_remaining: number; status: string };
  type BookingRow = { student_id: string; created_at: string };

  // Index packs by student
  const packsByStudent = new Map<string, PackRow[]>();
  for (const p of (packs || []) as PackRow[]) {
    if (!packsByStudent.has(p.student_id)) packsByStudent.set(p.student_id, []);
    packsByStudent.get(p.student_id)!.push(p);
  }

  // Index bookings by student
  const bookingsByStudent = new Map<string, BookingRow[]>();
  for (const b of (bookings || []) as BookingRow[]) {
    if (!bookingsByStudent.has(b.student_id)) bookingsByStudent.set(b.student_id, []);
    bookingsByStudent.get(b.student_id)!.push(b);
  }

  // Build CSV
  const headers = [
    "Nombre",
    "Email",
    "Telefono",
    "Cumpleanos",
    "Fecha Registro",
    "Creditos Activos",
    "Total Clases Tomadas",
    "Ultima Reserva",
  ];

  const rows: string[][] = [];

  for (const s of students as Array<{ id: string; full_name: string; email: string | null; phone: string | null; birthday: string | null; created_at: string }>) {
    const studentPacks = packsByStudent.get(s.id) || [];
    const studentBookings = bookingsByStudent.get(s.id) || [];

    // Sum active credits
    let activeCredits = 0;
    for (const p of studentPacks) {
      if (p.total_classes === -1) {
        activeCredits = -1; // unlimited
        break;
      }
      const remaining = p.classes_remaining ?? (p.total_classes - p.classes_used);
      if (remaining > 0) activeCredits += remaining;
    }

    // Total classes taken = total bookings with confirmed status
    const totalClasses = studentBookings.length;

    // Last booking date
    let lastBooking = "";
    if (studentBookings.length > 0) {
      const sorted = studentBookings.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      lastBooking = new Date(sorted[0].created_at).toLocaleDateString("es-CO");
    }

    rows.push([
      escapeCsv(s.full_name || ""),
      escapeCsv(s.email || ""),
      escapeCsv(s.phone || ""),
      escapeCsv(s.birthday || ""),
      new Date(s.created_at).toLocaleDateString("es-CO"),
      activeCredits === -1 ? "Ilimitado" : String(activeCredits),
      String(totalClasses),
      lastBooking,
    ]);
  }

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const today = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alumnos_tu_${today}.csv"`,
    },
  });
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
