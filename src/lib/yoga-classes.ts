/**
 * Yoga Classes Data Model and Helpers
 * Tu Tataumana - Costa Rica Yoga Retreat
 * JustbYoga Academy by TuIsYou
 *
 * Comprehensive implementation for booking system
 */

import {
  format,
  addDays,
  parseISO,
  isBefore,
  addHours,
  startOfDay,
} from "date-fns";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type YogaStyle =
  | "vinyasa"
  | "hatha"
  | "yin"
  | "kundalini"
  | "restorative"
  | "power"
  | "private";

export type YogaLevel = "all" | "beginner" | "intermediate" | "advanced";

export type ClassType = "group" | "private";

export interface YogaClass {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  time: string; // "07:00" or "18:00"
  type: ClassType;
  style: YogaStyle;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  instructor: string;
  level: YogaLevel;
  location: string;
  capacity: number;
  enrolled: number;
  price: number; // in COP
  duration: number; // minutes
}

export interface Booking {
  id: string;
  classId: string;
  customerName: string;
  email: string;
  whatsapp: string;
  experienceLevel: ExperienceLevel;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  createdAt: string;
  yogaClass?: YogaClass;
}

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type PaymentStatus = "pending" | "completed" | "failed";
export type BookingStatus = "pending" | "confirmed" | "cancelled";

// ============================================================================
// PRICING CONSTANTS (COP - Colombian Pesos)
// ============================================================================

export const PRICING = {
  GROUP_VINYASA: 45000,
  GROUP_HATHA: 40000,
  GROUP_YIN: 45000,
  GROUP_KUNDALINI: 55000,
  GROUP_RESTORATIVE: 40000,
  GROUP_POWER: 50000,
  PRIVATE_SESSION: 150000,
  PACKAGE_5_CLASSES: 200000,
  PACKAGE_10_CLASSES: 380000,
  MONTHLY_UNLIMITED: 350000,
} as const;

// ============================================================================
// CLASS SCHEDULE CONFIGURATION
// ============================================================================

interface ScheduleSlot {
  time: string;
  style: YogaStyle;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  duration: number;
  level: YogaLevel;
  price: number;
}

const GROUP_SCHEDULE: ScheduleSlot[] = [
  {
    time: "07:00",
    style: "vinyasa",
    name: "Morning Vinyasa Flow",
    nameEs: "Flujo Vinyasa Matutino",
    description: "Start your day with breath-synchronized movement",
    descriptionEs:
      "Comienza tu día con movimiento sincronizado con la respiración",
    duration: 75,
    level: "all",
    price: PRICING.GROUP_VINYASA,
  },
  {
    time: "09:30",
    style: "restorative",
    name: "Gentle Restore",
    nameEs: "Restauración Suave",
    description: "Slow, nurturing practice with extended holds",
    descriptionEs: "Práctica lenta y nutritiva con posturas prolongadas",
    duration: 60,
    level: "beginner",
    price: PRICING.GROUP_RESTORATIVE,
  },
  {
    time: "12:00",
    style: "power",
    name: "Power Yoga",
    nameEs: "Yoga de Poder",
    description: "Dynamic, strength-building practice",
    descriptionEs: "Práctica dinámica para fortalecer el cuerpo",
    duration: 60,
    level: "intermediate",
    price: PRICING.GROUP_POWER,
  },
  {
    time: "17:30",
    style: "yin",
    name: "Sunset Yin",
    nameEs: "Yin al Atardecer",
    description: "Deep stretching and meditation as the sun sets",
    descriptionEs: "Estiramiento profundo y meditación al atardecer",
    duration: 90,
    level: "all",
    price: PRICING.GROUP_YIN,
  },
  {
    time: "19:00",
    style: "kundalini",
    name: "Kundalini Awakening",
    nameEs: "Despertar Kundalini",
    description: "Energy work, breathwork, and kriyas",
    descriptionEs: "Trabajo energético, pranayama y kriyas",
    duration: 90,
    level: "advanced",
    price: PRICING.GROUP_KUNDALINI,
  },
];

const PRIVATE_SCHEDULE: ScheduleSlot[] = [
  {
    time: "08:30",
    style: "private",
    name: "Private Session",
    nameEs: "Sesión Privada",
    description: "Personalized one-on-one practice with Tata",
    descriptionEs: "Práctica personalizada uno a uno con Tata",
    duration: 60,
    level: "all",
    price: PRICING.PRIVATE_SESSION,
  },
  {
    time: "10:30",
    style: "private",
    name: "Private Session",
    nameEs: "Sesión Privada",
    description: "Personalized one-on-one practice with Tata",
    descriptionEs: "Práctica personalizada uno a uno con Tata",
    duration: 60,
    level: "all",
    price: PRICING.PRIVATE_SESSION,
  },
  {
    time: "14:00",
    style: "private",
    name: "Private Session",
    nameEs: "Sesión Privada",
    description: "Personalized one-on-one practice with Tata",
    descriptionEs: "Práctica personalizada uno a uno con Tata",
    duration: 60,
    level: "all",
    price: PRICING.PRIVATE_SESSION,
  },
  {
    time: "16:00",
    style: "private",
    name: "Private Session",
    nameEs: "Sesión Privada",
    description: "Personalized one-on-one practice with Tata",
    descriptionEs: "Práctica personalizada uno a uno con Tata",
    duration: 60,
    level: "all",
    price: PRICING.PRIVATE_SESSION,
  },
];

const DEFAULT_INSTRUCTOR = "Tata";
const DEFAULT_LOCATION = "TU. Wellness Center";
const GROUP_CAPACITY = 8;
const PRIVATE_CAPACITY = 1;
const ADVANCE_BOOKING_HOURS = 2;

// ============================================================================
// IN-MEMORY STATE (MVP)
// ============================================================================

const bookingsStore: Map<string, Booking> = new Map();
const classEnrollmentCount: Map<string, number> = new Map();

// ============================================================================
// CLASS GENERATION
// ============================================================================

function generateClassId(date: string, time: string, type: ClassType): string {
  const timeSlug = time.replace(":", "");
  return `${date}-${timeSlug}-${type}`;
}

function generateClassesForDate(date: string): YogaClass[] {
  const classes: YogaClass[] = [];

  // Generate group classes
  for (const slot of GROUP_SCHEDULE) {
    const classId = generateClassId(date, slot.time, "group");
    classes.push({
      id: classId,
      date,
      time: slot.time,
      type: "group",
      style: slot.style,
      name: slot.name,
      nameEs: slot.nameEs,
      description: slot.description,
      descriptionEs: slot.descriptionEs,
      instructor: DEFAULT_INSTRUCTOR,
      level: slot.level,
      location: DEFAULT_LOCATION,
      capacity: GROUP_CAPACITY,
      enrolled: classEnrollmentCount.get(classId) ?? 0,
      price: slot.price,
      duration: slot.duration,
    });
  }

  // Generate private sessions
  for (const slot of PRIVATE_SCHEDULE) {
    const classId = generateClassId(date, slot.time, "private");
    classes.push({
      id: classId,
      date,
      time: slot.time,
      type: "private",
      style: "private",
      name: slot.name,
      nameEs: slot.nameEs,
      description: slot.description,
      descriptionEs: slot.descriptionEs,
      instructor: DEFAULT_INSTRUCTOR,
      level: "all",
      location: DEFAULT_LOCATION,
      capacity: PRIVATE_CAPACITY,
      enrolled: classEnrollmentCount.get(classId) ?? 0,
      price: slot.price,
      duration: slot.duration,
    });
  }

  return classes;
}

/**
 * Generates classes for the next N days (default 30)
 */
export function generateClasses(days: number = 30): YogaClass[] {
  const classes: YogaClass[] = [];
  const today = startOfDay(new Date());

  for (let i = 0; i < days; i++) {
    const date = format(addDays(today, i), "yyyy-MM-dd");
    classes.push(...generateClassesForDate(date));
  }

  return classes;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets all classes for a specific date
 */
export function getClassesForDate(date: string): YogaClass[] {
  return generateClassesForDate(date);
}

/**
 * Gets a specific class by ID
 */
export function getClassById(classId: string): YogaClass | null {
  // Parse class ID: YYYY-MM-DD-HHMM-type
  const parts = classId.split("-");
  if (parts.length < 5) return null;

  const date = `${parts[0]}-${parts[1]}-${parts[2]}`;
  const classes = getClassesForDate(date);
  return classes.find((c) => c.id === classId) ?? null;
}

/**
 * Filter classes by type (all, group, or private)
 */
export function filterClassesByType(
  classes: YogaClass[],
  type: "all" | ClassType,
): YogaClass[] {
  if (type === "all") return classes;
  return classes.filter((c) => c.type === type);
}

/**
 * Formats time for display (e.g., "07:00" -> "7:00 AM")
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Formats price for display in COP
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Gets available spots for a class
 */
export function getAvailableSpots(yogaClass: YogaClass): number {
  return Math.max(0, yogaClass.capacity - yogaClass.enrolled);
}

/**
 * Checks if a class is sold out
 */
export function isSoldOut(yogaClass: YogaClass): boolean {
  return yogaClass.enrolled >= yogaClass.capacity;
}

/**
 * Checks if booking is closed (2-hour advance rule)
 */
export function isBookingClosed(yogaClass: YogaClass): boolean {
  const classDateTime = parseISO(`${yogaClass.date}T${yogaClass.time}:00`);
  const twoHoursFromNow = addHours(new Date(), ADVANCE_BOOKING_HOURS);
  return isBefore(classDateTime, twoHoursFromNow);
}

/**
 * Checks if a class can be booked
 */
export function canBookClass(yogaClass: YogaClass): boolean {
  return !isSoldOut(yogaClass) && !isBookingClosed(yogaClass);
}

/**
 * Gets availability text for display
 */
export function getAvailabilityText(yogaClass: YogaClass): string {
  if (isSoldOut(yogaClass)) {
    return "Sold out";
  }
  const spots = getAvailableSpots(yogaClass);
  if (yogaClass.type === "private") {
    return spots > 0 ? "Available" : "Booked";
  }
  return `${spots} spot${spots !== 1 ? "s" : ""} left`;
}

/**
 * Gets availability status for calendar
 */
export function getAvailabilityStatus(
  yogaClass: YogaClass,
): "available" | "limited" | "full" | "closed" {
  if (isBookingClosed(yogaClass)) return "closed";
  if (isSoldOut(yogaClass)) return "full";
  const spots = getAvailableSpots(yogaClass);
  if (spots <= 2) return "limited";
  return "available";
}

/**
 * Gets color for yoga style badge
 */
export function getStyleColor(style: YogaStyle): string {
  const colors: Record<YogaStyle, string> = {
    vinyasa: "bg-chakra-throat/10 text-chakra-throat",
    hatha: "bg-chakra-heart/10 text-chakra-heart",
    yin: "bg-chakra-third-eye/10 text-chakra-third-eye",
    kundalini: "bg-chakra-crown/10 text-chakra-crown",
    restorative: "bg-chakra-solar/10 text-chakra-solar",
    power: "bg-chakra-root/10 text-chakra-root",
    private: "bg-gold/20 text-gold",
  };
  return colors[style] || "bg-charcoal/10 text-charcoal";
}

/**
 * Gets level display label
 */
export function getLevelLabel(
  level: YogaLevel,
  language: "en" | "es" = "en",
): string {
  const labels: Record<YogaLevel, { en: string; es: string }> = {
    all: { en: "All Levels", es: "Todos los Niveles" },
    beginner: { en: "Beginner", es: "Principiante" },
    intermediate: { en: "Intermediate", es: "Intermedio" },
    advanced: { en: "Advanced", es: "Avanzado" },
  };
  return labels[level]?.[language] || level;
}

/**
 * Gets classes grouped by date for the next N days
 */
export function getClassesByDate(days: number = 7): Map<string, YogaClass[]> {
  const groupedClasses = new Map<string, YogaClass[]>();
  const today = startOfDay(new Date());

  for (let i = 0; i < days; i++) {
    const date = format(addDays(today, i), "yyyy-MM-dd");
    groupedClasses.set(date, getClassesForDate(date));
  }

  return groupedClasses;
}

/**
 * Gets only available classes (with open spots and meeting 2-hour rule)
 */
export function getAvailableClasses(days: number = 7): YogaClass[] {
  const allClasses = generateClasses(days);
  return allClasses.filter((c) => canBookClass(c));
}

/**
 * Gets today's remaining classes
 */
export function getTodaysClasses(): YogaClass[] {
  const today = format(new Date(), "yyyy-MM-dd");
  return getClassesForDate(today).filter((c) => canBookClass(c));
}

/**
 * Formats duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
}

// ============================================================================
// BOOKING FUNCTIONS (MVP - In-Memory)
// ============================================================================

function generateBookingId(): string {
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TU-${dateStr}-${randomPart}`;
}

/**
 * Creates a new booking
 */
export function createBooking(
  classId: string,
  customerName: string,
  email: string,
  whatsapp: string,
  experienceLevel: ExperienceLevel,
): Booking | null {
  const yogaClass = getClassById(classId);
  if (!yogaClass || !canBookClass(yogaClass)) {
    return null;
  }

  const booking: Booking = {
    id: generateBookingId(),
    classId,
    customerName,
    email,
    whatsapp,
    experienceLevel,
    paymentStatus: "pending",
    status: "pending",
    createdAt: new Date().toISOString(),
    yogaClass,
  };

  // Store booking
  bookingsStore.set(booking.id, booking);

  // Update class enrollment count
  const currentCount = classEnrollmentCount.get(classId) ?? 0;
  classEnrollmentCount.set(classId, currentCount + 1);

  return booking;
}

/**
 * Gets a booking by ID
 */
export function getBooking(bookingId: string): Booking | null {
  return bookingsStore.get(bookingId) ?? null;
}

/**
 * Updates booking payment status
 */
export function updateBookingPaymentStatus(
  bookingId: string,
  paymentStatus: PaymentStatus,
): boolean {
  const booking = bookingsStore.get(bookingId);
  if (!booking) return false;

  booking.paymentStatus = paymentStatus;
  if (paymentStatus === "completed") {
    booking.status = "confirmed";
  }
  bookingsStore.set(bookingId, booking);
  return true;
}

/**
 * Gets all bookings for a specific class
 */
export function getBookingsForClass(classId: string): Booking[] {
  const bookings: Booking[] = [];
  bookingsStore.forEach((booking) => {
    if (booking.classId === classId) {
      bookings.push(booking);
    }
  });
  return bookings;
}

/**
 * Gets all bookings for a customer email
 */
export function getBookingsForCustomer(email: string): Booking[] {
  const bookings: Booking[] = [];
  bookingsStore.forEach((booking) => {
    if (booking.email.toLowerCase() === email.toLowerCase()) {
      bookings.push(booking);
    }
  });
  return bookings;
}

/**
 * Cancels a booking
 */
export function cancelBooking(bookingId: string): boolean {
  const booking = bookingsStore.get(bookingId);
  if (!booking) return false;

  // Update status
  booking.status = "cancelled";
  bookingsStore.set(bookingId, booking);

  // Decrement class enrollment count
  const currentCount = classEnrollmentCount.get(booking.classId) ?? 0;
  if (currentCount > 0) {
    classEnrollmentCount.set(booking.classId, currentCount - 1);
  }

  return true;
}

// ============================================================================
// DATE AVAILABILITY (For Calendar)
// ============================================================================

type DateAvailabilityStatus = "available" | "almost-full" | "full";

/**
 * Gets aggregated availability status for a date (for calendar display)
 */
export function getDateAvailabilityStatus(
  dateString: string,
): DateAvailabilityStatus {
  const classes = getClassesForDate(dateString);

  if (classes.length === 0) return "full";

  const availableClasses = classes.filter((c) => canBookClass(c));

  if (availableClasses.length === 0) return "full";

  // Check how many classes have limited spots
  const limitedClasses = availableClasses.filter((c) => {
    const spots = getAvailableSpots(c);
    return spots <= 2;
  });

  // If more than half have limited spots, show almost-full
  if (limitedClasses.length > availableClasses.length / 2) {
    return "almost-full";
  }

  return "available";
}

// ============================================================================
// PACKAGE INFO
// ============================================================================

export function getPackageInfo(): Array<{
  name: string;
  nameEs: string;
  price: number;
  classes: number | "unlimited";
  pricePerClass: string;
  savings: number;
}> {
  const avgGroupPrice = 45000;

  return [
    {
      name: "Single Class",
      nameEs: "Clase Individual",
      price: avgGroupPrice,
      classes: 1,
      pricePerClass: formatPrice(avgGroupPrice),
      savings: 0,
    },
    {
      name: "5-Class Package",
      nameEs: "Paquete 5 Clases",
      price: PRICING.PACKAGE_5_CLASSES,
      classes: 5,
      pricePerClass: formatPrice(PRICING.PACKAGE_5_CLASSES / 5),
      savings: avgGroupPrice * 5 - PRICING.PACKAGE_5_CLASSES,
    },
    {
      name: "10-Class Package",
      nameEs: "Paquete 10 Clases",
      price: PRICING.PACKAGE_10_CLASSES,
      classes: 10,
      pricePerClass: formatPrice(PRICING.PACKAGE_10_CLASSES / 10),
      savings: avgGroupPrice * 10 - PRICING.PACKAGE_10_CLASSES,
    },
    {
      name: "Monthly Unlimited",
      nameEs: "Mensual Ilimitado",
      price: PRICING.MONTHLY_UNLIMITED,
      classes: "unlimited",
      pricePerClass: "Varies",
      savings: 0,
    },
  ];
}

// ============================================================================
// MOCK DATA SEEDING (For Development)
// ============================================================================

export function seedMockBookings(): void {
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const morningClassId = generateClassId(today, "07:00", "group");

  const mockCustomers = [
    {
      name: "Sarah Johnson",
      email: "sarah@example.com",
      whatsapp: "+573001234567",
      level: "intermediate" as ExperienceLevel,
    },
    {
      name: "Michael Chen",
      email: "michael@example.com",
      whatsapp: "+573001234568",
      level: "beginner" as ExperienceLevel,
    },
    {
      name: "Emma Williams",
      email: "emma@example.com",
      whatsapp: "+573001234569",
      level: "advanced" as ExperienceLevel,
    },
  ];

  mockCustomers.forEach((customer) => {
    createBooking(
      morningClassId,
      customer.name,
      customer.email,
      customer.whatsapp,
      customer.level,
    );
  });

  const eveningClassId = generateClassId(tomorrow, "17:30", "group");
  createBooking(
    eveningClassId,
    "Lisa Anderson",
    "lisa@example.com",
    "+573001234570",
    "beginner",
  );

  const privateClassId = generateClassId(tomorrow, "10:30", "private");
  createBooking(
    privateClassId,
    "James Wilson",
    "james@example.com",
    "+573001234571",
    "intermediate",
  );
}
