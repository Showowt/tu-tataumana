import { NextRequest, NextResponse } from "next/server";
import { getClassesForDate, YogaClass } from "@/lib/yoga-classes";

/**
 * GET /api/yoga/classes
 * Returns yoga classes for a specific date or date range
 *
 * Query params:
 * - date (required): Start date in YYYY-MM-DD format
 * - endDate (optional): End date in YYYY-MM-DD format for range queries
 *
 * Response: Array of YogaClass objects with current booking counts
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");
    const endDateParam = searchParams.get("endDate");

    // Validate required date parameter
    if (!dateParam) {
      return NextResponse.json(
        { error: "Date parameter is required", code: "MISSING_DATE" },
        { status: 400 },
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateParam)) {
      return NextResponse.json(
        {
          error: "Invalid date format. Use YYYY-MM-DD",
          code: "INVALID_DATE_FORMAT",
        },
        { status: 400 },
      );
    }

    // Validate the date is actually valid
    const startDate = new Date(dateParam);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date value", code: "INVALID_DATE" },
        { status: 400 },
      );
    }

    // Handle single date query
    if (!endDateParam) {
      const classes = getClassesForDate(dateParam);
      const filteredClasses = filterPastClasses(classes, dateParam);

      return NextResponse.json({
        date: dateParam,
        classes: filteredClasses,
        totalClasses: filteredClasses.length,
      });
    }

    // Validate end date format
    if (!dateRegex.test(endDateParam)) {
      return NextResponse.json(
        {
          error: "Invalid endDate format. Use YYYY-MM-DD",
          code: "INVALID_END_DATE_FORMAT",
        },
        { status: 400 },
      );
    }

    const endDate = new Date(endDateParam);
    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid endDate value", code: "INVALID_END_DATE" },
        { status: 400 },
      );
    }

    // Validate end date is not before start date
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "endDate must be after date", code: "INVALID_DATE_RANGE" },
        { status: 400 },
      );
    }

    // Limit date range to prevent abuse (max 30 days)
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysDiff > 30) {
      return NextResponse.json(
        { error: "Date range cannot exceed 30 days", code: "RANGE_TOO_LARGE" },
        { status: 400 },
      );
    }

    // Fetch classes for date range
    const schedules: Array<{ date: string; classes: YogaClass[] }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split("T")[0];
      const classes = getClassesForDate(dateString);
      const filteredClasses = filterPastClasses(classes, dateString);

      schedules.push({
        date: dateString,
        classes: filteredClasses,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      startDate: dateParam,
      endDate: endDateParam,
      schedules,
      totalDays: schedules.length,
    });
  } catch (error) {
    console.error("Yoga classes API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: `Failed to fetch yoga classes: ${errorMessage}`,
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}

/**
 * Filters out classes that have already passed based on current time
 */
function filterPastClasses(
  classes: YogaClass[],
  dateString: string,
): YogaClass[] {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // If the date is in the future, return all classes
  if (dateString > today) {
    return classes;
  }

  // If the date is in the past, return no classes
  if (dateString < today) {
    return [];
  }

  // For today, filter out classes that have already started
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinutes;

  return classes.filter((yogaClass) => {
    const [hours, minutes] = yogaClass.time.split(":").map(Number);
    const classTimeInMinutes = hours * 60 + minutes;
    return classTimeInMinutes > currentTimeInMinutes;
  });
}
