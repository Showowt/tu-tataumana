import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as adminCreateClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";

export type AdminRole = "owner" | "admin" | "manager";

interface AdminResult {
  id: string;
  email: string;
  role: AdminRole;
  supabase: SupabaseClient;
}

/**
 * Verifies admin access via Supabase Auth session.
 * Checks tu_admin_users table first, falls back to ADMIN_EMAILS.
 *
 * Returns the admin record + service-role supabase client, or null.
 */
export async function verifyAdmin(
  request?: NextRequest,
): Promise<AdminResult | null> {
  try {
    // Check x-admin-key header for internal server-to-server calls (e.g. Telegram bot)
    if (request) {
      const adminKey = request.headers.get("x-admin-key");
      // trim(): env values set via `echo | vercel env add` carry a trailing
      // newline that can never match an HTTP header value
      const expectedKey = process.env.TU_ADMIN_KEY?.trim();
      if (adminKey && expectedKey && adminKey === expectedKey) {
        const serviceClient = getServiceClient();
        return {
          id: "internal-bot",
          email: "bot@tataumana.com",
          role: "admin",
          supabase: serviceClient,
        };
      }
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
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Read-only in some contexts
            }
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) return null;

    const email = user.email.toLowerCase();
    const serviceClient = getServiceClient();

    // Check tu_admin_users table first
    const { data: adminUser } = await serviceClient
      .from("tu_admin_users")
      .select("role, is_active")
      .eq("email", email)
      .eq("is_active", true)
      .single();

    if (adminUser) {
      return {
        id: user.id,
        email,
        role: adminUser.role as AdminRole,
        supabase: serviceClient,
      };
    }

    // Fallback to hardcoded ADMIN_EMAILS (backwards compatibility)
    if (ADMIN_EMAILS.includes(email)) {
      return {
        id: user.id,
        email,
        role: "admin",
        supabase: serviceClient,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if an email has admin access (for middleware — lightweight check).
 * Uses service role client to query tu_admin_users.
 */
export async function isAdminEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  // Fast path: hardcoded list
  if (ADMIN_EMAILS.includes(normalizedEmail)) return true;

  // DB check
  try {
    const serviceClient = getServiceClient();
    const { data } = await serviceClient
      .from("tu_admin_users")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    return !!data;
  } catch {
    // If DB check fails, fall back to hardcoded list only
    return false;
  }
}

/**
 * Gets a service-role Supabase client for admin operations.
 * Throws if SUPABASE_SERVICE_ROLE_KEY is not configured.
 */
export function getAdminClient(): SupabaseClient {
  return getServiceClient();
}

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations");
  }
  return adminCreateClient(url, key);
}
