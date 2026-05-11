import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";
import { notifyNewAccount } from "@/lib/telegram";

const ALLOWED_REDIRECTS = ["/portal", "/admin", "/admin/students", "/portal/bookings", "/portal/packs", "/portal/profile", "/portal/schedule"];

/**
 * GET /auth/callback
 * Handles Supabase magic link redirect.
 * Exchanges auth code for session, auto-creates student profile if needed.
 * Uses service role client for tu_students operations to bypass RLS.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const rawRedirect = searchParams.get("redirect") || "/portal";
  const redirect = ALLOWED_REDIRECTS.includes(rawRedirect) ? rawRedirect : "/portal";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  // Exchange code for session
  const { error: authError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (authError) {
    console.error("[auth/callback] Exchange error:", authError.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  // Use service role client for tu_students operations (bypasses RLS)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbClient = serviceKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    : supabase;

  // Auto-create student profile if it doesn't exist
  // Check by auth_id first, then by email (for admin-created students without auth_id)
  let existingStudent: { id: string; role: string } | null = null;

  const { data: byAuthId } = await dbClient
    .from("tu_students")
    .select("id, role")
    .eq("auth_id", user.id)
    .single();

  if (byAuthId) {
    existingStudent = byAuthId;
  } else {
    // Check if admin created this student (has email but no auth_id)
    const { data: byEmail } = await dbClient
      .from("tu_students")
      .select("id, role")
      .eq("email", user.email)
      .is("auth_id", null)
      .single();

    if (byEmail) {
      // Link the auth_id to the existing admin-created student
      const { error: linkErr } = await dbClient
        .from("tu_students")
        .update({ auth_id: user.id })
        .eq("id", byEmail.id);

      if (linkErr) {
        console.error("[auth/callback] Failed to link auth_id:", linkErr.message);
      } else {
        existingStudent = byEmail;
      }
    }
  }

  if (!existingStudent) {
    const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());

    const { error: insertError } = await dbClient.from("tu_students").insert({
      auth_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email.split("@")[0],
      phone: user.user_metadata?.phone || null,
      role: isAdmin ? "admin" : "student",
      preferred_lang: "es",
    });

    if (insertError) {
      console.error(
        "[auth/callback] Student creation error:",
        insertError.message,
      );
    } else {
      notifyNewAccount({
        name: user.user_metadata?.full_name || user.email.split("@")[0],
        email: user.email,
        source: "magic_link",
      }).catch(() => {});
    }

    // Redirect admins to admin panel
    if (isAdmin) {
      return NextResponse.redirect(`${origin}/admin`);
    }
  } else if (existingStudent.role === "admin") {
    // Existing admin — redirect to admin panel
    if (redirect === "/portal") {
      return NextResponse.redirect(`${origin}/admin`);
    }
  }

  return NextResponse.redirect(`${origin}${redirect}`);
}
