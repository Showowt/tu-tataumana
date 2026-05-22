import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";

export async function middleware(request: NextRequest) {
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

  // Admin API routes: reject with 401 if not admin
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
