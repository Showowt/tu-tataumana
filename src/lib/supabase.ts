import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser/anon client — use in client components and public reads */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Server client with service role — use ONLY in API routes and server actions */
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Legacy type — kept for backward compatibility with existing tu_bookings
export interface Booking {
  id?: string;
  created_at?: string;
  name: string;
  email?: string;
  phone: string;
  service: string;
  preferred_date?: string;
  message?: string;
  status?: string;
  source?: string;
}
