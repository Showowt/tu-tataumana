import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
  const search = searchParams.get("search")?.slice(0, 100) ?? null;
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
  create_account: z.boolean().optional().default(true),
});

/**
 * POST /api/admin/students
 * Create a student profile + optionally create a Supabase Auth account
 * so they can log into the portal.
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

  const email = parsed.data.email.toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(email);

  // 1. Create the student DB record
  const { data, error } = await supabase
    .from("tu_students")
    .insert({
      email,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      preferred_lang: parsed.data.preferred_lang || "es",
      notes: parsed.data.notes || null,
      role: isAdmin ? "admin" : "student",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un alumno con este email / A student with this email already exists" },
        { status: 409 },
      );
    }
    console.error("[admin/students POST]", error.message);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }

  // 2. Create Supabase Auth account (so they can log in)
  let accountCreated = false;
  let loginLink: string | null = null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (parsed.data.create_account && serviceKey) {
    try {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
      );

      // Create auth user with confirmed email (no password — they'll use magic link)
      const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: parsed.data.full_name,
            phone: parsed.data.phone || null,
          },
        });

      if (!authError && authData?.user) {
        // Link auth_id to student record
        await supabase
          .from("tu_students")
          .update({ auth_id: authData.user.id })
          .eq("id", data.id);

        accountCreated = true;

        // Generate a magic link URL for Tata to send via WhatsApp
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tataumana.com";
        const { data: linkData } = await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: {
            redirectTo: `${baseUrl}/auth/callback?redirect=/portal`,
          },
        });

        if (linkData?.properties?.action_link) {
          loginLink = linkData.properties.action_link;
        }
      } else if (authError) {
        console.error("[admin/students] Auth creation failed:", authError.message);
        // Student record was still created — just no login account yet
      }
    } catch (err) {
      console.error("[admin/students] Auth error:", err);
    }
  }

  return NextResponse.json(
    {
      data,
      accountCreated,
      loginLink,
      message: accountCreated
        ? "Alumno creado con cuenta de acceso"
        : "Alumno creado (sin cuenta de acceso)",
    },
    { status: 201 },
  );
}

const PatchStudentSchema = z.object({
  id: z.string().min(1),
  full_name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  emergency_contact: z.string().nullable().optional(),
  preferred_lang: z.enum(["en", "es"]).optional(),
  is_blocked: z.boolean().optional(),
});

/**
 * PATCH /api/admin/students
 * Update a student. Supports email change + account blocking.
 */
export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = admin.supabase;
  const body = await request.json();
  const parsed = PatchStudentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id, email, is_blocked, ...updates } = parsed.data;

  // Get current student to find auth_id
  const { data: currentStudent } = await supabase
    .from("tu_students")
    .select("auth_id, email")
    .eq("id", id)
    .single();

  if (!currentStudent) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // If email changed, update auth.users too
  if (email && email !== currentStudent.email) {
    (updates as Record<string, unknown>).email = email;

    if (currentStudent.auth_id) {
      const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const adminClient = createClient(serviceUrl, serviceKey);
        const { error: authErr } = await adminClient.auth.admin.updateUserById(
          currentStudent.auth_id,
          { email },
        );
        if (authErr) {
          console.error("[admin/students PATCH] auth email update:", authErr.message);
          return NextResponse.json(
            { error: "Failed to update email in auth: " + authErr.message },
            { status: 500 },
          );
        }
      }
    }
  }

  // If blocking/unblocking, update auth ban
  if (is_blocked !== undefined) {
    (updates as Record<string, unknown>).is_blocked = is_blocked;

    if (currentStudent.auth_id) {
      const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const adminClient = createClient(serviceUrl, serviceKey);
        const { error: banErr } = await adminClient.auth.admin.updateUserById(
          currentStudent.auth_id,
          { ban_duration: is_blocked ? "876000h" : "none" },
        );
        if (banErr) {
          console.error("[admin/students PATCH] ban error:", banErr.message);
        }
      }
    }
  }

  const { data, error } = await supabase
    .from("tu_students")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    console.error("[admin/students PATCH]", error.message);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
