import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/lib/admin-auth";

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

  const supabase = getAdminClient();

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

  return NextResponse.json({
    student,
    packs: packs || [],
    transactions: transactions || [],
  });
}
