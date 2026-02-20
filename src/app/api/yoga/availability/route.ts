import { NextRequest, NextResponse } from "next/server";
import { getClassesForDate, YogaClass } from "@/lib/yoga-classes";

/**
 * Constants for booking rules
 */
const ADVANCE_BOOKING_HOURS = 2; // Must book at least 2 hours in advance
const PRIVATE_CLASS_CAPACITY = 1;
const GROUP_CLASS_CAPACITY = 8;

interface AvailabilityResponse {
  available: boolean;
  spotsRemaining: number;
  canBook: boolean;
  reason?: string;
  classDetails?: {
    name: string;
    time: string;
    date: string;
    instructor: string;
    style: string;
    level: string;
  };
}

/**
 * GET /api/yoga/availability
 * Returns availability status for a specific class
 *
 * Query params:
 * - classId (required): The unique identifier of the yoga class
 *
 * Response:
 * - available: boolean - Whether there are spots remaining
 * - spotsRemaining: number - Number of open spots
 * - canBook: boolean - Whether booking is currently allowed
 * - reason?: string - Explanation if canBook is false
 * - classDetails: Object with class information
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get("classId");

    // Validate required classId parameter
    if (!classId) {
      return NextResponse.json(
        { error: "classId parameter is required", code: "MISSING_CLASS_ID" },
        { status: 400 },
      );
    }

    // Extract date from classId (format: YYYY-MM-DD-timeSlot)
    const dateMatch = classId.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) {
      return NextResponse.json(
        {
          error: "Invalid classId format",
          code: "INVALID_CLASS_ID",
        },
        { status: 400 },
      );
    }

    const classDate = dateMatch[1];

    // Get classes for that date and find the specific class
    const classes = getClassesForDate(classDate);
    const yogaClass = classes.find((c) => c.id === classId);

    if (!yogaClass) {
      return NextResponse.json(
        { error: "Class not found", code: "CLASS_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Check availability
    const availabilityResult = checkClassAvailability(yogaClass, classDate);

    return NextResponse.json(availabilityResult);
  } catch (error) {
    console.error("Yoga availability API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: `Failed to check availability: ${errorMessage}`,
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}

/**
 * Checks availability and booking eligibility for a yoga class
 */
function checkClassAvailability(
  yogaClass: YogaClass,
  classDate: string,
): AvailabilityResponse {
  const now = new Date();

  // Parse class datetime
  const [hours, minutes] = yogaClass.time.split(":").map(Number);
  const classDateTime = new Date(classDate);
  classDateTime.setHours(hours, minutes, 0, 0);

  // Calculate spots remaining
  // Use special capacity for private classes (style contains "Private")
  const isPrivate = yogaClass.style.toLowerCase().includes("private");
  const effectiveCapacity = isPrivate
    ? PRIVATE_CLASS_CAPACITY
    : Math.min(yogaClass.capacity, GROUP_CLASS_CAPACITY);
  const spotsRemaining = Math.max(0, effectiveCapacity - yogaClass.enrolled);
  const available = spotsRemaining > 0;

  // Check 2-hour advance booking rule
  const advanceBookingCutoff = new Date(
    classDateTime.getTime() - ADVANCE_BOOKING_HOURS * 60 * 60 * 1000,
  );
  const withinBookingWindow = now < advanceBookingCutoff;

  // Check if class is in the past
  const classInPast = now > classDateTime;

  // Determine if booking is allowed and provide reason if not
  let canBook = true;
  let reason: string | undefined;

  if (classInPast) {
    canBook = false;
    reason = "This class has already started or ended";
  } else if (!withinBookingWindow) {
    canBook = false;
    reason = `Bookings close ${ADVANCE_BOOKING_HOURS} hours before class starts`;
  } else if (!available) {
    canBook = false;
    reason = "This class is fully booked";
  }

  return {
    available,
    spotsRemaining,
    canBook,
    reason,
    classDetails: {
      name: yogaClass.name,
      time: yogaClass.time,
      date: classDate,
      instructor: yogaClass.instructor,
      style: yogaClass.style,
      level: yogaClass.level,
    },
  };
}
