/**
 * WellnessOS — Business Rules
 * TU. by Tata Umana
 *
 * Central source of truth for all booking, cancellation,
 * and operational rules.
 */

// ============================================
// BOOKING RULES
// ============================================

/** Minimum hours before class start to allow booking */
export const BOOKING_CUTOFF_HOURS = 2;

/** Minimum hours before class start to allow free cancellation */
export const CANCELLATION_WINDOW_HOURS = 24;

/** Maximum concurrent bookings per student (prevent hoarding) */
export const MAX_ACTIVE_BOOKINGS = 5;

/** Default class capacity if not specified */
export const DEFAULT_CLASS_CAPACITY = 12;

/** Default class duration in minutes */
export const DEFAULT_CLASS_DURATION = 60;

// ============================================
// PACK RULES
// ============================================

/** Pack expiration windows in days, keyed by pack type */
export const PACK_EXPIRATION_DAYS: Record<string, number> = {
  WALK_IN: 14,
  DROP_IN: 14,
  JUST_FLOW_PACK: 45,
  TU_HEALING_PACK: 60,
  TU_BALANCE_PACK: 90,
  TU_UNLIMITED: 30,
  MAYO_MAMA: 30,
  MAYO_2X1: 14,
  INDUSTRY_SPECIAL: 7,
};

/** Value representing unlimited classes */
export const UNLIMITED_CLASSES = -1;

/** Display value for unlimited remaining classes */
export const UNLIMITED_DISPLAY = 999;

// ============================================
// PRICING (COP)
// ============================================

/** Standard walk-in class price in COP */
export const DROP_IN_PRICE_COP = 80000;

/** Standard walk-in class price in USD */
export const DROP_IN_PRICE_USD = 19;

/** Industry rate (Tuesday & Friday) price in COP */
export const INDUSTRY_RATE_COP = 45000;

/** Industry rate (Tuesday & Friday) price in USD */
export const INDUSTRY_RATE_USD = 11;

// ============================================
// SCHEDULE
// ============================================

/** Days of week (0 = Sunday, 6 = Saturday) */
export const DAY_NAMES = {
  en: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  es: [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ],
} as const;

/** How many weeks ahead to generate sessions */
export const SESSION_GENERATION_WEEKS = 4;

/** Studio location */
export const STUDIO_LOCATION = "Casa Carolina";
export const STUDIO_ADDRESS =
  "Centro Histórico, Cartagena de Indias, Colombia";

// ============================================
// AUTH & ROLES
// ============================================

/** Admin emails — these get admin role on signup */
export const ADMIN_EMAILS = [
  "tataumana@gmail.com",
  "tata@tuisyou.com",
  "machinemindconsulting@gmail.com",
];

/** Magic link redirect URL path */
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** Session cookie name */
export const SESSION_COOKIE = "tu-session";

// ============================================
// NOTIFICATIONS
// ============================================

/** Hours before class to send reminder */
export const REMINDER_HOURS_BEFORE = 3;

/** WhatsApp message templates */
export const WA_TEMPLATES = {
  bookingConfirmation: "booking_confirmation",
  classReminder: "class_reminder",
  packPurchase: "pack_purchase",
  cancellationConfirm: "cancellation_confirm",
} as const;

// ============================================
// TIMEZONE
// ============================================

/** Colombia timezone (UTC-5, no DST) */
export const TIMEZONE = "America/Bogota";

/** Format time for display (24h → 12h) */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** Check if a date is within booking cutoff */
export function isWithinBookingCutoff(
  sessionDate: string,
  startTime: string,
): boolean {
  const sessionDateTime = new Date(`${sessionDate}T${startTime}-05:00`);
  const cutoff = new Date(
    sessionDateTime.getTime() - BOOKING_CUTOFF_HOURS * 60 * 60 * 1000,
  );
  return new Date() < cutoff;
}

/** Check if a booking can be cancelled (24h window) */
export function canCancelBooking(
  sessionDate: string,
  startTime: string,
): boolean {
  const sessionDateTime = new Date(`${sessionDate}T${startTime}-05:00`);
  const window = new Date(
    sessionDateTime.getTime() - CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000,
  );
  return new Date() < window;
}
