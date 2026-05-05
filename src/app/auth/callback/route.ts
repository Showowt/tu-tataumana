import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";
import { notifyNewAccount } from "@/lib/telegram";

/**
 * GET /auth/callback
 * Handles Supabase magic link redirect.
 * Exchanges auth code for session, auto-creates student profile if needed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/portal";

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

  // Auto-create student profile if it doesn't exist
  const { data: existingStudent } = await supabase
    .from("tu_students")
    .select("id, role")
    .eq("auth_id", user.id)
    .single();

  if (!existingStudent) {
    const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());

    const { error: insertError } = await supabase.from("tu_students").insert({
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
      // Don't block login — profile can be created later
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
