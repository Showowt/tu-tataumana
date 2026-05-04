import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Verifies admin access via two methods:
 * 1. Supabase Auth session with admin role in tu_students
 * 2. Legacy x-admin-key header (for mobile/Tata quick access)
 *
 * Returns the admin student record or null.
 */
export async function verifyAdmin(
  request?: NextRequest,
): Promise<{ id: string; email: string; role: string } | null> {
  // Method 1: Legacy header auth
  if (request) {
    const adminKey = request.headers.get("x-admin-key");
    const expected = process.env.TU_ADMIN_KEY || "tata2026";
    if (adminKey && adminKey === expected) {
      // Return a synthetic admin record for header-based auth
      return { id: "header-admin", email: "admin@tataumana.com", role: "admin" };
    }
  }

  // Method 2: Supabase session auth
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

    if (!user) return null;

    const { data: student } = await supabase
      .from("tu_students")
      .select("id, email, role")
      .eq("auth_id", user.id)
      .eq("role", "admin")
      .single();

    return student as { id: string; email: string; role: string } | null;
  } catch {
    return null;
  }
}

/**
 * Gets a service-role Supabase client for admin operations.
 * Falls back to anon key if service role isn't set.
 */
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // Dynamic import avoided — use createClient from top-level
  return adminCreateClient(url, key);
}

// Separate import to avoid circular deps
import { createClient as adminCreateClient } from "@supabase/supabase-js";
