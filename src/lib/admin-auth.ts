import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as adminCreateClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";

interface AdminResult {
  id: string;
  email: string;
  role: string;
  supabase: SupabaseClient;
}

/**
 * Verifies admin access via two methods:
 * 1. Supabase Auth session with admin email
 * 2. Legacy x-admin-key header (for mobile/Tata quick access)
 *
 * Returns the admin record + session-aware supabase client, or null.
 */
export async function verifyAdmin(
  request?: NextRequest,
): Promise<AdminResult | null> {
  // Method 1: Legacy header auth — uses service role or anon client
  if (request) {
    const adminKey = request.headers.get("x-admin-key");
    const expected = process.env.TU_ADMIN_KEY || "";
    if (adminKey && adminKey === expected) {
      return {
        id: "header-admin",
        email: "admin@tataumana.com",
        role: "admin",
        supabase: getServiceOrAnonClient(),
      };
    }
  }

  // Method 2: Supabase session auth — returns session-aware client
  try {
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

    if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
      return null;
    }

    // Use service role client if available (bypasses RLS), otherwise session client
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const queryClient = serviceKey ? getServiceOrAnonClient() : supabase;

    return {
      id: user.id,
      email: user.email!,
      role: "admin",
      supabase: queryClient,
    };
  } catch {
    return null;
  }
}

/**
 * Gets a service-role Supabase client for admin operations.
 * Falls back to anon key if service role isn't set.
 */
export function getAdminClient() {
  return getServiceOrAnonClient();
}

function getServiceOrAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return adminCreateClient(url, key);
}
