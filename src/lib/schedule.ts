/**
 * TU. Class Schedule — Single source of truth
 * Used by booking modal, chatbot, capacity tracking, and daily digest
 */

export interface ScheduleClass {
  time: string;
  name: string;
}

export const CAPACITY = 10;

export const SCHEDULE: Record<number, ScheduleClass[]> = {
  0: [ // Sunday
    { time: "9:00 AM", name: "Just Hatha Flow" },
    { time: "10:30 AM", name: "Inner Journey · Meditation" },
  ],
  1: [ // Monday
    { time: "9:30 AM", name: "Yoga Conscious" },
    { time: "7:15 PM", name: "Yoga Conscious" },
  ],
  2: [ // Tuesday
    { time: "9:30 AM", name: "Back Care Yoga" },
    { time: "7:15 PM", name: "Hip Opener · Hatha" },
  ],
  3: [ // Wednesday
    { time: "9:30 AM", name: "Yoga Conscious" },
    { time: "10:45 AM", name: "Pilates" },
    { time: "7:15 PM", name: "Open Flow" },
  ],
  4: [ // Thursday
    { time: "9:30 AM", name: "Yoga Intro · Power Up" },
    { time: "5:30 PM", name: "Sound Healing" },
    { time: "7:15 PM", name: "Hip Opener" },
  ],
  5: [ // Friday
    { time: "10:00 AM", name: "Power Yoga · Postura" },
    { time: "7:00 PM", name: "Open Flow" },
  ],
  6: [ // Saturday
    { time: "11:00 AM", name: "Sun Salutation" },
    { time: "6:00 PM", name: "Inner Journey · Meditation" },
  ],
};

export const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export function getClassesForDay(dayOfWeek: number): ScheduleClass[] {
  return SCHEDULE[dayOfWeek] || [];
}

export function formatDateShort(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getColombiaDate(offsetDays = 0): Date {
  const now = new Date();
  const colombia = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  colombia.setDate(colombia.getDate() + offsetDays);
  return colombia;
}
