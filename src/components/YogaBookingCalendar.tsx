"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";
import { getDateAvailabilityStatus } from "@/lib/yoga-classes";

interface YogaBookingCalendarProps {
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
}

type AvailabilityStatus =
  | "available"
  | "almost-full"
  | "full"
  | "limited"
  | "closed";

interface CalendarDay {
  date: Date;
  dateString: string;
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  isSelected: boolean;
  isBookable: boolean;
  availability: AvailabilityStatus;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function YogaBookingCalendar({
  onDateSelect,
  selectedDate,
}: YogaBookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfDay(new Date());
  const maxBookableDate = addDays(today, 30);

  const calendarDays = useMemo((): CalendarDay[] => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    // Start week on Monday (weekStartsOn: 1)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: CalendarDay[] = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      const dateString = format(day, "yyyy-MM-dd");
      const isPast = isBefore(day, today);
      const isAfterBookable = isBefore(maxBookableDate, day);
      const isCurrentMonth = isSameMonth(day, currentMonth);
      const isBookable = !isPast && !isAfterBookable && isCurrentMonth;

      days.push({
        date: day,
        dateString,
        isCurrentMonth,
        isPast,
        isToday: isToday(day),
        isSelected: selectedDate === dateString,
        isBookable,
        availability: isBookable
          ? getDateAvailabilityStatus(dateString)
          : "full",
      });

      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth, selectedDate, today, maxBookableDate]);

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (day: CalendarDay) => {
    if (day.isBookable && day.availability !== "full") {
      onDateSelect(day.dateString);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, day: CalendarDay) => {
    if ((e.key === "Enter" || e.key === " ") && day.isBookable) {
      e.preventDefault();
      handleDateClick(day);
    }
  };

  // Check if we can navigate to previous month (don't go before current month)
  const canGoPrev = !isSameMonth(currentMonth, new Date());

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className={`
            w-11 h-11 flex items-center justify-center
            text-charcoal transition-all duration-300
            border border-charcoal/20
            hover:border-rose-deep hover:text-rose-deep
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-charcoal/20 disabled:hover:text-charcoal
          `}
        >
          <ChevronLeft />
        </button>

        <h2 className="font-display text-2xl text-charcoal tracking-wide">
          {format(currentMonth, "MMMM yyyy")}
        </h2>

        <button
          type="button"
          onClick={handleNextMonth}
          aria-label="Next month"
          className={`
            w-11 h-11 flex items-center justify-center
            text-charcoal transition-all duration-300
            border border-charcoal/20
            hover:border-rose-deep hover:text-rose-deep
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
          `}
        >
          <ChevronRight />
        </button>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_LABELS.map((label, index) => (
          <div
            key={index}
            className="h-10 flex items-center justify-center font-body text-xs text-charcoal/60 uppercase tracking-widest"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label="Booking calendar"
      >
        {calendarDays.map((day, index) => (
          <CalendarCell
            key={index}
            day={day}
            onClick={() => handleDateClick(day)}
            onKeyDown={(e) => handleKeyDown(e, day)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6 font-body text-xs text-charcoal/70">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500" />
          <span>Almost Full</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-charcoal/20" />
          <span>Full</span>
        </div>
      </div>
    </div>
  );
}

interface CalendarCellProps {
  day: CalendarDay;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function CalendarCell({ day, onClick, onKeyDown }: CalendarCellProps) {
  const {
    date,
    isCurrentMonth,
    isPast,
    isToday: isTodayDate,
    isSelected,
    isBookable,
    availability,
  } = day;

  // Base styles
  let cellStyles = `
    relative flex flex-col items-center justify-center
    min-h-[44px] min-w-[44px] aspect-square
    font-body text-sm
    transition-all duration-200
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
  `;

  // State-based styles
  if (!isCurrentMonth) {
    cellStyles += " text-charcoal/20 cursor-default";
  } else if (isPast || !isBookable) {
    cellStyles += " text-charcoal/30 cursor-not-allowed";
  } else if (isSelected) {
    cellStyles += " bg-rose-deep text-cream cursor-pointer";
  } else if (availability === "full") {
    cellStyles += " text-charcoal/40 cursor-not-allowed";
  } else {
    cellStyles += " text-charcoal hover:bg-rose-soft/20 cursor-pointer";
  }

  // Today ring
  const todayRing =
    isTodayDate && isCurrentMonth ? "ring-2 ring-gold ring-inset" : "";

  // Availability dot
  const getAvailabilityDot = () => {
    if (!isCurrentMonth || isPast || !isBookable) return null;

    if (availability === "available") {
      return (
        <span className="absolute bottom-1.5 w-1.5 h-1.5 bg-emerald-500" />
      );
    }
    if (availability === "almost-full") {
      return <span className="absolute bottom-1.5 w-1.5 h-1.5 bg-amber-500" />;
    }
    return null;
  };

  const isInteractive = isBookable && availability !== "full";

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      disabled={!isInteractive}
      tabIndex={isInteractive ? 0 : -1}
      aria-label={`${format(date, "EEEE, MMMM d")}${isSelected ? ", selected" : ""}${isTodayDate ? ", today" : ""}${availability !== "full" ? `, ${availability.replace("-", " ")}` : ", fully booked"}`}
      aria-selected={isSelected}
      role="gridcell"
      className={`${cellStyles} ${todayRing}`}
    >
      <span className={isSelected ? "font-medium" : ""}>
        {format(date, "d")}
      </span>
      {getAvailabilityDot()}
    </button>
  );
}

function ChevronLeft() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
