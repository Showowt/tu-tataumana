/**
 * Colombia Timezone Utility — Single source of truth
 *
 * ALL date/time operations for booking, schedule, and availability
 * MUST use these helpers instead of raw `new Date()`.
 *
 * Why: Vercel servers run in UTC. After 7 PM Colombia time (UTC-5),
 * `new Date()` returns the NEXT day in UTC, breaking bookings.
 *
 * Colombia (America/Bogota) is UTC-5 year-round (no DST).
 */

export const COLOMBIA_TZ = "America/Bogota";
export const COLOMBIA_UTC_OFFSET = -5; // hours

/**
 * Get current Colombia date/time components.
 * Uses Intl API which is reliable across all server environments.
 */
export function getColombiaNow(): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dayOfWeek: number;
  dateStr: string;
  timeStr: string;
} {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COLOMBIA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
  const year = parseInt(get("year"));
  const month = parseInt(get("month"));
  const day = parseInt(get("day"));
  const hours = parseInt(get("hour"));
  const minutes = parseInt(get("minute"));
  const seconds = parseInt(get("second"));

  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  // Get day of week (0=Sunday) using a date constructed from these parts
  const dateObj = new Date(year, month - 1, day, 12, 0, 0);
  const dayOfWeek = dateObj.getDay();

  return { year, month, day, hours, minutes, seconds, dayOfWeek, dateStr, timeStr };
}

/**
 * Get today's date string in Colombia timezone (YYYY-MM-DD)
 */
export function getColombiaToday(): string {
  return getColombiaNow().dateStr;
}

/**
 * Get Colombia date string offset by N days from today
 */
export function getColombiaDateOffset(offsetDays: number): string {
  const { year, month, day } = getColombiaNow();
  const date = new Date(year, month - 1, day + offsetDays, 12, 0, 0);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get current time in Colombia as total minutes since midnight.
 * Useful for comparing against class start times.
 */
export function getColombiaTimeInMinutes(): number {
  const { hours, minutes } = getColombiaNow();
  return hours * 60 + minutes;
}

/**
 * Convert a class time string ("HH:MM" or "H:MM AM/PM") to minutes since midnight.
 */
export function classTimeToMinutes(time: string): number {
  // Handle 24h format "HH:MM"
  if (/^\d{1,2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  // Handle 12h format "H:MM AM" or "HH:MM PM"
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }

  return 0;
}

/**
 * Check if a class on a given date/time is in the past (Colombia time).
 */
export function isClassInPast(classDate: string, classTime: string): boolean {
  const todayStr = getColombiaToday();

  if (classDate < todayStr) return true;
  if (classDate > todayStr) return false;

  // Same day — compare times
  const classMinutes = classTimeToMinutes(classTime);
  const nowMinutes = getColombiaTimeInMinutes();
  return classMinutes <= nowMinutes;
}

/**
 * Check if booking window has closed for a class (2-hour advance rule).
 * Returns true if it's too late to book.
 */
export function isBookingWindowClosed(classDate: string, classTime: string, advanceHours = 2): boolean {
  const todayStr = getColombiaToday();

  // Future date — always open
  if (classDate > todayStr) return false;

  // Past date — always closed
  if (classDate < todayStr) return true;

  // Same day — check if we're within the advance window
  const classMinutes = classTimeToMinutes(classTime);
  const nowMinutes = getColombiaTimeInMinutes();
  const cutoffMinutes = classMinutes - (advanceHours * 60);

  return nowMinutes >= cutoffMinutes;
}

/**
 * Format Colombia date/time for display in AI context or logs.
 */
export function formatColombiaDateTime(): string {
  const { dateStr, hours, minutes, dayOfWeek } = getColombiaNow();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = dayNames[dayOfWeek];
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  const minStr = String(minutes).padStart(2, "0");
  return `${dayName}, ${dateStr} ${hour12}:${minStr} ${ampm} COT`;
}
