"use client";

import { useState, useMemo } from "react";
import {
  YogaClass,
  getClassesForDate,
  filterClassesByType,
  formatTime,
  formatPrice,
  getAvailabilityText,
  isSoldOut,
  isBookingClosed,
  getStyleColor,
} from "@/lib/yoga-classes";

interface ClassSelectorProps {
  selectedDate: string;
  onClassSelect: (classData: YogaClass) => void;
  selectedClass: YogaClass | null;
}

type FilterType = "all" | "group" | "private";

/**
 * JustbYoga Academy Class Selector
 * Premium yoga class selection with filtering and availability
 */
export default function ClassSelector({
  selectedDate,
  onClassSelect,
  selectedClass,
}: ClassSelectorProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Get classes for the selected date
  const allClasses = useMemo(() => {
    return getClassesForDate(selectedDate);
  }, [selectedDate]);

  // Filter classes based on active filter
  const filteredClasses = useMemo(() => {
    return filterClassesByType(allClasses, activeFilter);
  }, [allClasses, activeFilter]);

  // Filter tabs configuration
  const filterTabs: { label: string; value: FilterType }[] = [
    { label: "All Classes", value: "all" },
    { label: "Group", value: "group" },
    { label: "Private", value: "private" },
  ];

  // Check if we have any classes
  const hasClasses = filteredClasses.length > 0;

  return (
    <div className="w-full">
      {/* JustbYoga Academy Branding Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-8 h-px bg-gradient-to-r from-transparent to-rose-soft" />
          <span className="font-body text-[10px] tracking-[0.3em] text-rose-deep">
            JUSTBYOGA ACADEMY
          </span>
          <div className="w-8 h-px bg-gradient-to-l from-transparent to-rose-soft" />
        </div>
        <p className="font-display text-charcoal/60 text-sm">
          Select your practice for{" "}
          <span className="text-charcoal font-medium">
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`
              font-body text-[11px] tracking-[0.1em] px-5 py-3 min-h-[44px]
              transition-all duration-300
              focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
              ${
                activeFilter === tab.value
                  ? "bg-rose-deep text-cream"
                  : "bg-transparent text-charcoal/60 border border-charcoal/20 hover:border-rose-soft hover:text-rose-deep"
              }
            `}
          >
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Classes List */}
      {hasClasses ? (
        <div className="space-y-4">
          {filteredClasses.map((yogaClass) => {
            const soldOut = isSoldOut(yogaClass);
            const bookingClosed = isBookingClosed(yogaClass);
            const isSelected = selectedClass?.id === yogaClass.id;
            const isDisabled = soldOut || bookingClosed;

            return (
              <div
                key={yogaClass.id}
                className={`
                  relative border p-5 md:p-6 transition-all duration-300
                  ${isSelected ? "border-rose-deep bg-rose-deep/5" : "border-charcoal/10 bg-white"}
                  ${isDisabled ? "opacity-60" : "hover:border-rose-soft hover:bg-cream-warm/30"}
                  ${!isDisabled && "cursor-pointer active:scale-[0.995]"}
                `}
                onClick={() => !isDisabled && onClassSelect(yogaClass)}
                role="button"
                tabIndex={isDisabled ? -1 : 0}
                onKeyDown={(e) => {
                  if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onClassSelect(yogaClass);
                  }
                }}
                aria-selected={isSelected}
                aria-disabled={isDisabled}
              >
                {/* Booking Closed Overlay */}
                {bookingClosed && !soldOut && (
                  <div className="absolute top-4 right-4">
                    <span className="font-body text-[9px] tracking-[0.1em] text-charcoal/50 bg-charcoal/10 px-3 py-1.5">
                      BOOKING CLOSED
                    </span>
                  </div>
                )}

                {/* Sold Out Badge */}
                {soldOut && (
                  <div className="absolute top-4 right-4">
                    <span className="font-body text-[9px] tracking-[0.1em] text-rose-deep bg-rose-soft/20 px-3 py-1.5">
                      SOLD OUT
                    </span>
                  </div>
                )}

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-deep" />
                )}

                {/* Main Content Grid */}
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                  {/* Time Block */}
                  <div className="flex-shrink-0 md:w-24 md:text-center">
                    <span className="font-display text-2xl md:text-3xl text-charcoal">
                      {formatTime(yogaClass.time)}
                    </span>
                    <p className="font-body text-[10px] text-charcoal/40 mt-1">
                      {yogaClass.duration} min
                    </p>
                  </div>

                  {/* Class Info */}
                  <div className="flex-1 min-w-0">
                    {/* Type Badge & Style */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`
                          font-body text-[9px] tracking-[0.1em] px-2.5 py-1
                          ${
                            yogaClass.type === "private"
                              ? "bg-gold/20 text-gold"
                              : "bg-rose-soft/20 text-rose-deep"
                          }
                        `}
                      >
                        {yogaClass.type === "private" ? "PRIVATE" : "GROUP"}
                      </span>
                      <span
                        className={`
                          font-body text-[9px] tracking-[0.1em] px-2.5 py-1
                          ${getStyleColor(yogaClass.style)}
                        `}
                      >
                        {yogaClass.style.toUpperCase()}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-display text-lg md:text-xl text-charcoal mb-1">
                      {yogaClass.name}
                    </h3>

                    {/* Description */}
                    <p className="font-display text-sm text-charcoal/60 mb-3 line-clamp-2">
                      {yogaClass.description}
                    </p>

                    {/* Availability */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`
                          w-2 h-2 rounded-full
                          ${
                            soldOut
                              ? "bg-rose-deep"
                              : yogaClass.type === "private"
                                ? "bg-gold"
                                : "bg-chakra-heart"
                          }
                        `}
                      />
                      <span className="font-body text-[11px] text-charcoal/60">
                        {getAvailabilityText(yogaClass)}
                      </span>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 mt-3 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-charcoal/10">
                    <span className="font-display text-xl md:text-2xl text-gold">
                      {formatPrice(yogaClass.price)}
                    </span>
                    <button
                      className={`
                        font-body text-[10px] tracking-[0.1em] px-5 py-3 min-h-[56px]
                        transition-all duration-300
                        focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
                        ${
                          isDisabled
                            ? "bg-charcoal/10 text-charcoal/40 cursor-not-allowed"
                            : isSelected
                              ? "bg-rose-deep text-cream"
                              : "bg-rose-soft text-charcoal hover:bg-rose-deep hover:text-cream"
                        }
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDisabled) {
                          onClassSelect(yogaClass);
                        }
                      }}
                      disabled={isDisabled}
                      aria-label={`Book ${yogaClass.name}`}
                    >
                      {isSelected
                        ? "SELECTED"
                        : isDisabled
                          ? "UNAVAILABLE"
                          : "BOOK THIS CLASS"}
                    </button>
                  </div>
                </div>

                {/* Location Footer */}
                <div className="mt-4 pt-3 border-t border-charcoal/5">
                  <div className="flex items-center gap-2 text-charcoal/40">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="font-body text-[10px] tracking-[0.05em]">
                      {yogaClass.location}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-6">
          <div className="w-16 h-16 mx-auto mb-6 border border-charcoal/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-charcoal/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="font-display text-xl text-charcoal mb-2">
            No classes available
          </h3>
          <p className="font-display text-charcoal/50 max-w-sm mx-auto">
            There are no {activeFilter !== "all" ? activeFilter : ""} classes
            scheduled for this date. Try selecting a different date or filter.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="w-8 h-px bg-rose-soft/30" />
            <span className="font-body text-[9px] tracking-[0.2em] text-charcoal/30">
              JUSTBYOGA ACADEMY
            </span>
            <div className="w-8 h-px bg-rose-soft/30" />
          </div>
        </div>
      )}

      {/* Bottom Branding */}
      {hasClasses && (
        <div className="mt-10 text-center">
          <p className="font-display text-sm text-charcoal/40 italic">
            &ldquo;Come home to yourself&rdquo;
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="w-6 h-px bg-rose-soft/30" />
            <span className="font-body text-[8px] tracking-[0.25em] text-charcoal/30">
              TU. BY TATA UMANA
            </span>
            <div className="w-6 h-px bg-rose-soft/30" />
          </div>
        </div>
      )}
    </div>
  );
}
