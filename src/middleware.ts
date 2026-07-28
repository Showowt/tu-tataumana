import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";

/**
 * Check if email has admin access — hardcoded list + database check.
 */
async function checkAdminAccess(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();

  // Fast path: hardcoded list
  if (ADMIN_EMAILS.includes(normalized)) return true;

  // DB check via service role
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  try {
    const supabase = createClient(url, key);
    const { data } = await supabase
      .from("tu_admin_users")
      .select("id")
      .eq("email", normalized)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  // Server-to-server admin API calls (Telegram bot, health checks) carry
  // x-admin-key instead of a session cookie. Let them through — the route
  // handler re-validates the key in verifyAdmin.
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    const adminKey = request.headers.get("x-admin-key");
    const expectedKey = process.env.TU_ADMIN_KEY?.trim();
    if (adminKey && expectedKey && adminKey === expectedKey) {
      return NextResponse.next({ request });
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — MUST call getUser() to refresh expired tokens
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes: redirect to login if not authenticated
  const isProtectedPage =
    request.nextUrl.pathname.startsWith("/portal") ||
    request.nextUrl.pathname.startsWith("/admin");

  if (isProtectedPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Admin routes (pages + API): single DB check for both
  const isAdminRoute =
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/api/admin");

  if (isAdminRoute && user?.email) {
    const isAdmin = await checkAdminAccess(user.email);
    if (!isAdmin) {
      if (request.nextUrl.pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Non-admin user trying to access admin pages — redirect to portal
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }
  } else if (isAdminRoute && request.nextUrl.pathname.startsWith("/api/admin")) {
    // No user at all on admin API
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect authenticated users away from login page
  if (request.nextUrl.pathname === "/login" && user) {
    const redirect = request.nextUrl.searchParams.get("redirect") || "/portal";
    // Only allow relative paths starting with / (prevent open redirect)
    const safeRedirect =
      redirect.startsWith("/") && !redirect.startsWith("//")
        ? redirect
        : "/portal";
    const url = request.nextUrl.clone();
    url.pathname = safeRedirect;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*", "/login", "/api/admin/:path*"],
};
