import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";

/**
 * GET /api/admin/students
 * List all students. Supports search by name/email/phone.
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const role = searchParams.get("role");

  let query = supabase
    .from("tu_students")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
    );
  }

  if (role) {
    query = query.eq("role", role);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin/students GET]", error.message);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }

  return NextResponse.json({ data: data || [], total: (data || []).length });
}

const CreateStudentSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).max(100),
  phone: z.string().optional().nullable(),
  preferred_lang: z.enum(["en", "es"]).optional(),
  notes: z.string().optional().nullable(),
});

/**
 * POST /api/admin/students
 * Manually create a student (no auth account — admin-created).
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;

  const body = await request.json();
  const parsed = CreateStudentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const isAdmin = ADMIN_EMAILS.includes(parsed.data.email.toLowerCase());

  const { data, error } = await supabase
    .from("tu_students")
    .insert({
      ...parsed.data,
      role: isAdmin ? "admin" : "student",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A student with this email already exists" },
        { status: 409 },
      );
    }
    console.error("[admin/students POST]", error.message);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

/**
 * PATCH /api/admin/students
 * Update a student. Requires `id` in body.
 */
export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Student id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tu_students")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[admin/students PATCH]", error.message);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
