import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for Server Components, Route Handlers, and Server Actions.
 * Reads/writes auth cookies automatically.
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // setAll can throw in Server Components (read-only).
            // Safe to ignore — middleware handles refresh.
          }
        },
      },
    },
  );
}

/**
 * Get the current authenticated student from the database.
 * Returns null if not authenticated or no student profile exists.
 */
export async function getCurrentStudent() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: student } = await supabase
    .from("tu_students")
    .select("*")
    .eq("auth_id", user.id)
    .single();

  return student;
}
