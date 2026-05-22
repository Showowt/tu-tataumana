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
 * Verifies admin access via Supabase Auth session.
 * Only users with admin emails can access admin routes.
 *
 * Returns the admin record + service-role supabase client, or null.
 */
export async function verifyAdmin(
  _request?: NextRequest,
): Promise<AdminResult | null> {
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

    return {
      id: user.id,
      email: user.email!,
      role: "admin",
      supabase: getServiceClient(),
    };
  } catch {
    return null;
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
