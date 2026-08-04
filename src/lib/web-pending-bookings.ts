import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Pending web pre-registrations.
 *
 * Public website bookings land in the legacy tu_bookings table (not in
 * tu_class_bookings, which powers the admin Reservas tab and the Telegram
 * lists). Tata confirms them by hand once the student pays. These helpers
 * surface those rows as "pendiente" entries in the Telegram /reservas view
 * and the nightly digest, matched to real sessions by date + start time.
 */

export interface PendingWebBooking {
  name: string;
  /** "HH:MM" 24h, or null when the booking has no class time */
  time24: string | null;
  paymentLabel: string;
  service: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "efectivo",
  nequi: "Nequi",
  bancolombia: "Bancolombia",
  zelle: "Zelle",
  wompi: "tarjeta",
};

/** "11:00 AM" / "7:15 PM" / "11:00:00" / "11:00" → "HH:MM" 24h, else null */
export function normalizeTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const period = m[3]?.toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${min}`;
}

/** Accent-insensitive, case-insensitive name key for dedup */
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch pending website bookings for a date. Rows stay status "new" until an
 * admin flow touches them, so the date filter is what scopes this list.
 * Duplicate names (double-submits) are collapsed, keeping the most recent
 * submission — a resubmit usually corrects the time or payment method.
 */
export async function getPendingWebBookings(
  supabase: SupabaseClient,
  dateStr: string
): Promise<PendingWebBooking[]> {
  const { data, error } = await supabase
    .from("tu_bookings")
    .select("name, class_time, payment_method, service, class_name")
    .eq("class_date", dateStr)
    .eq("source", "website")
    .eq("status", "new")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[web-pending-bookings]", error.message);
    return [];
  }

  const seen = new Set<string>();
  const result: PendingWebBooking[] = [];
  for (const row of data || []) {
    const key = nameKey(row.name || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({
      name: (row.name || "").replace(/\s+/g, " ").trim(),
      time24: normalizeTime(row.class_time),
      paymentLabel: PAYMENT_LABELS[row.payment_method as string] || "web",
      service: row.class_name || row.service || "Clase",
    });
  }
  // Rows were scanned newest-first for dedup; show oldest-first in lists
  return result.reverse();
}

/**
 * Split pendings into those matching a known session start time and the rest.
 * `sessionTimes` are raw start_time values (e.g. "11:00:00").
 */
export function splitBySessionTimes(
  pendings: PendingWebBooking[],
  sessionTimes: string[]
): { bySession: Map<string, PendingWebBooking[]>; unmatched: PendingWebBooking[] } {
  const known = new Map<string, string>(); // "HH:MM" → raw start_time
  for (const t of sessionTimes) {
    const norm = normalizeTime(t);
    if (norm) known.set(norm, t);
  }

  const bySession = new Map<string, PendingWebBooking[]>();
  const unmatched: PendingWebBooking[] = [];
  for (const p of pendings) {
    const raw = p.time24 ? known.get(p.time24) : undefined;
    if (raw) {
      const list = bySession.get(raw) || [];
      list.push(p);
      bySession.set(raw, list);
    } else {
      unmatched.push(p);
    }
  }
  return { bySession, unmatched };
}
