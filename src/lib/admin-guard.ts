import { createSupabaseServer } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verifies admin access for API routes.
 * Returns the Supabase client and user, or a 401 response.
 */
export async function requireAdmin(): Promise<
  | { ok: true; supabase: SupabaseClient; userId: string; email: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, supabase, userId: user.id, email: user.email! };
}
