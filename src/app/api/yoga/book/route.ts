import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClassesForDate, YogaClass } from "@/lib/yoga-classes";

/**
 * Constants for booking rules
 */
const ADVANCE_BOOKING_HOURS = 2;
const PRIVATE_CLASS_CAPACITY = 1;
const GROUP_CLASS_CAPACITY = 8;

/**
 * Zod schema for booking request validation
 */
const BookingRequestSchema = z.object({
  classId: z.string().min(1, "Class ID is required"),
  customerName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z.string().email("Invalid email address"),
  whatsapp: z
    .string()
    .regex(
      /^\+?[1-9]\d{6,14}$/,
      "Invalid WhatsApp number. Include country code (e.g., +57300123456)",
    ),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"], {
    error: "Experience level must be beginner, intermediate, or advanced",
  }),
});

type BookingRequest = z.infer<typeof BookingRequestSchema>;

interface BookingResponse {
  success: boolean;
  booking: {
    id: string;
    classId: string;
    className: string;
    classDate: string;
    classTime: string;
    customerName: string;
    email: string;
    whatsapp: string;
    experienceLevel: string;
    status: "pending" | "confirmed";
    createdAt: string;
  };
  paymentUrl: string;
  message: string;
}

/**
 * POST /api/yoga/book
 * Creates a new yoga class booking
 *
 * Body:
 * - classId: string - The unique identifier of the yoga class
 * - customerName: string - Customer's full name
 * - email: string - Customer's email address
 * - whatsapp: string - WhatsApp number with country code
 * - experienceLevel: "beginner" | "intermediate" | "advanced"
 *
 * Response:
 * - success: boolean
 * - booking: Object with booking details
 * - paymentUrl: string - URL to complete payment
 * - message: string - Confirmation message
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body", code: "INVALID_JSON" },
        { status: 400 },
      );
    }

    // Validate input with Zod
    const validationResult = BookingRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const zodError = validationResult.error;
      const errors = zodError.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: errors,
        },
        { status: 400 },
      );
    }

    const bookingData: BookingRequest = validationResult.data;

    // Extract date from classId (format: YYYY-MM-DD-timeSlot)
    const dateMatch = bookingData.classId.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) {
      return NextResponse.json(
        { error: "Invalid classId format", code: "INVALID_CLASS_ID" },
        { status: 400 },
      );
    }

    const classDate = dateMatch[1];

    // Get class details
    const classes = getClassesForDate(classDate);
    const yogaClass = classes.find((c) => c.id === bookingData.classId);

    if (!yogaClass) {
      return NextResponse.json(
        { error: "Class not found", code: "CLASS_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check availability (prevent race conditions by checking again before booking)
    const availabilityCheck = checkBookingEligibility(yogaClass, classDate);
    if (!availabilityCheck.canBook) {
      return NextResponse.json(
        {
          error: availabilityCheck.reason,
          code: "BOOKING_NOT_ALLOWED",
        },
        { status: 400 },
      );
    }

    // Generate booking ID
    const bookingId = generateBookingId();

    // Create booking record
    // In production, this would insert into Supabase
    const booking = {
      id: bookingId,
      classId: bookingData.classId,
      className: yogaClass.name,
      classDate: classDate,
      classTime: yogaClass.time,
      customerName: bookingData.customerName,
      email: bookingData.email,
      whatsapp: bookingData.whatsapp,
      experienceLevel: bookingData.experienceLevel,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };

    // Generate payment URL
    // In production, this would create a Wompi payment link
    const paymentUrl = generatePaymentUrl(booking, yogaClass);

    const response: BookingResponse = {
      success: true,
      booking,
      paymentUrl,
      message: `Your spot in ${yogaClass.name} on ${classDate} at ${yogaClass.time} has been reserved. Please complete payment to confirm your booking.`,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Yoga booking API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: `Failed to process booking: ${errorMessage}`,
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}

/**
 * Checks if a booking can be made for the given class
 */
function checkBookingEligibility(
  yogaClass: YogaClass,
  classDate: string,
): { canBook: boolean; reason?: string } {
  const now = new Date();

  // Parse class datetime
  const [hours, minutes] = yogaClass.time.split(":").map(Number);
  const classDateTime = new Date(classDate);
  classDateTime.setHours(hours, minutes, 0, 0);

  // Check if class is in the past
  if (now > classDateTime) {
    return {
      canBook: false,
      reason: "This class has already started or ended",
    };
  }

  // Check 2-hour advance booking rule
  const advanceBookingCutoff = new Date(
    classDateTime.getTime() - ADVANCE_BOOKING_HOURS * 60 * 60 * 1000,
  );
  if (now >= advanceBookingCutoff) {
    return {
      canBook: false,
      reason: `Bookings close ${ADVANCE_BOOKING_HOURS} hours before class starts`,
    };
  }

  // Calculate effective capacity
  const isPrivate = yogaClass.style.toLowerCase().includes("private");
  const effectiveCapacity = isPrivate
    ? PRIVATE_CLASS_CAPACITY
    : Math.min(yogaClass.capacity, GROUP_CLASS_CAPACITY);

  // Check availability
  if (yogaClass.enrolled >= effectiveCapacity) {
    return {
      canBook: false,
      reason: "This class is fully booked",
    };
  }

  return { canBook: true };
}

/**
 * Generates a unique booking ID
 * Format: TU-YYYYMMDD-XXXXX (e.g., TU-20240115-A3B7C)
 */
function generateBookingId(): string {
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TU-${dateStr}-${randomPart}`;
}

/**
 * Generates a payment URL for the booking
 * In production, this would integrate with Wompi payment gateway
 */
function generatePaymentUrl(
  booking: { id: string; customerName: string; email: string },
  yogaClass: YogaClass,
): string {
  // Base price depends on class style (placeholder pricing)
  const basePrice = yogaClass.style.toLowerCase().includes("private")
    ? 150000 // 150,000 COP for private
    : 45000; // 45,000 COP for group

  // In production, this would create a real Wompi payment link
  // For now, return a placeholder URL with booking reference
  const params = new URLSearchParams({
    reference: booking.id,
    amount: basePrice.toString(),
    currency: "COP",
    name: booking.customerName,
    email: booking.email,
    description: `${yogaClass.name} - TU. by Tata Umana`,
  });

  return `https://checkout.wompi.co/tu-tataumana?${params.toString()}`;
}
