import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";

// Supabase being unreachable (paused project, outage) must NEVER hang the
// middleware into a 504 MIDDLEWARE_INVOCATION_TIMEOUT — auth-js retries
// network failures with backoff, so every call below is double-bounded:
// a per-request fetch abort plus a race on the whole operation.
const AUTH_FETCH_TIMEOUT_MS = 3500;
const AUTH_OPERATION_TIMEOUT_MS = 5000;

const TIMED_OUT = Symbol("timed_out");

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), ms)),
  ]);
}

const timeoutFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(AUTH_FETCH_TIMEOUT_MS) });

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
    const supabase = createClient(url, key, { global: { fetch: timeoutFetch } });
    const result = await withTimeout(
      supabase
        .from("tu_admin_users")
        .select("id")
        .eq("email", normalized)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      AUTH_OPERATION_TIMEOUT_MS,
    );
    if (result === TIMED_OUT) return false;
    return !!result.data;
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
      global: { fetch: timeoutFetch },
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

  // Refresh session — MUST call getUser() to refresh expired tokens.
  // Bounded: if Supabase is unreachable (paused project, outage), fail FAST
  // and treat the visitor as signed out instead of hanging into a 504 —
  // protected pages fall through to the /login redirect below, and
  // /api/admin returns an explicit 503.
  let user: import("@supabase/supabase-js").User | null = null;
  let authUnavailable = false;
  try {
    const result = await withTimeout(supabase.auth.getUser(), AUTH_OPERATION_TIMEOUT_MS);
    if (result === TIMED_OUT) {
      authUnavailable = true;
    } else {
      user = result.data.user;
      // "Auth session missing" = normal signed-out; network-class errors = outage
      if (result.error && /fetch|network|abort|timeout/i.test(result.error.message ?? "")) {
        authUnavailable = true;
      }
    }
  } catch {
    authUnavailable = true;
  }

  if (authUnavailable && request.nextUrl.pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { error: "Service temporarily unavailable — auth backend unreachable" },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }

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
