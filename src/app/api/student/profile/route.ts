import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { z } from "zod";

/**
 * GET /api/student/profile
 * Returns the current authenticated student's profile.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: student, error } = await supabase
      .from("tu_students")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    if (error || !student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: student });
  } catch (error) {
    console.error("[student/profile GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

const UpdateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/)
    .optional()
    .nullable(),
  preferred_lang: z.enum(["en", "es"]).optional(),
  emergency_contact: z.string().max(200).optional().nullable(),
});

/**
 * PATCH /api/student/profile
 * Updates the current student's profile.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { data: student, error } = await supabase
      .from("tu_students")
      .update(parsed.data)
      .eq("auth_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[student/profile PATCH]", error.message);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: student });
  } catch (error) {
    console.error("[student/profile PATCH]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
