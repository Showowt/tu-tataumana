/**
 * TU. Class Schedule — Single source of truth
 * Used by booking modal, chatbot, capacity tracking, and daily digest
 */

export interface ScheduleClass {
  time: string;
  name: string;
  /** Optional note displayed next to class name, e.g. "(solo en español)" */
  note?: string;
  /** Teacher name displayed next to the class */
  teacher?: string;
  /** Short class description */
  desc?: { es: string; en: string };
}

export const CAPACITY = 10;

export const SCHEDULE: Record<number, ScheduleClass[]> = {
  0: [ // Sunday
    { time: "9:00 AM", name: "Just Hatha Flow", teacher: "Alejandro", desc: { es: "Flujo suave de hatha yoga para conectar cuerpo, mente y respiración.", en: "Gentle hatha yoga flow to connect body, mind and breath." } },
    { time: "10:30 AM", name: "Meditación Viaje Interior", note: "(solo en español)", teacher: "Álvaro", desc: { es: "Un viaje hacia adentro a través de la meditación y la quietud.", en: "A journey inward through meditation and stillness." } },
  ],
  1: [ // Monday
    { time: "9:30 AM", name: "Stress Release", teacher: "Tata", desc: { es: "Libera tension y estres a traves de movimiento consciente y respiracion profunda.", en: "Release tension and stress through conscious movement and deep breathing." } },
    { time: "11:00 AM", name: "Sculpt Your Body", teacher: "Tata", desc: { es: "Tonifica y fortalece tu cuerpo con movimientos precisos y controlados.", en: "Tone and strengthen your body with precise, controlled movements." } },
    { time: "7:15 PM", name: "Hatha Flow", teacher: "Violeta", desc: { es: "Flujo de hatha yoga para liberar, expandir y equilibrar tu energia.", en: "Hatha yoga flow to release, expand and balance your energy." } },
  ],
  2: [ // Tuesday
    { time: "9:30 AM", name: "Yogalates", teacher: "Tata", desc: { es: "Fusion de yoga y pilates para fortalecer, estirar y equilibrar.", en: "Fusion of yoga and pilates to strengthen, stretch and balance." } },
    { time: "5:30 PM", name: "Inner Journey Meditation", note: "(solo en español)", teacher: "Alvaro", desc: { es: "Meditacion guiada para volver a ti y encontrar paz interior.", en: "Guided meditation to return to yourself and find inner peace." } },
    { time: "7:15 PM", name: "Hatha", teacher: "Alejandro", desc: { es: "Posturas conscientes de hatha para abrir caderas y liberar tension profunda.", en: "Conscious hatha postures to open hips and release deep tension." } },
  ],
  3: [ // Wednesday
    { time: "9:30 AM", name: "Yogalates", teacher: "Tata", desc: { es: "Fusion de yoga y pilates para fortalecer, estirar y equilibrar.", en: "Fusion of yoga and pilates to strengthen, stretch and balance." } },
    { time: "10:45 AM", name: "Pilates Flow", teacher: "Tata", desc: { es: "Fortalece, alinea y tonifica tu cuerpo con fluidez desde el centro.", en: "Strengthen, align and tone your body with fluidity from the core." } },
    { time: "5:30 PM", name: "Sound Therapy", teacher: "Leandra", desc: { es: "Terapia de sonido para relajacion profunda y sanacion interior.", en: "Sound therapy for deep relaxation and inner healing." } },
    { time: "7:15 PM", name: "Hatha Flow", teacher: "Violeta", desc: { es: "Flujo de hatha yoga para liberar, expandir y equilibrar tu energia.", en: "Hatha yoga flow to release, expand and balance your energy." } },
  ],
  4: [ // Thursday
    { time: "9:30 AM", name: "Yogalates", teacher: "Tata", desc: { es: "Fusion de yoga y pilates para fortalecer, estirar y equilibrar.", en: "Fusion of yoga and pilates to strengthen, stretch and balance." } },
    { time: "7:15 PM", name: "Hatha", teacher: "Alejandro", desc: { es: "Posturas conscientes de hatha para abrir caderas y liberar tension profunda.", en: "Conscious hatha postures to open hips and release deep tension." } },
  ],
  5: [ // Friday
    { time: "10:00 AM", name: "Yogalates", teacher: "Tata", desc: { es: "Fusion de yoga y pilates para fortalecer, estirar y equilibrar.", en: "Fusion of yoga and pilates to strengthen, stretch and balance." } },
    { time: "7:00 PM", name: "Hatha Flow", teacher: "Betty & Violeta", desc: { es: "Fluye, suelta y recarga tu energia para cerrar la semana en balance.", en: "Flow, release and recharge your energy to close the week in balance." } },
  ],
  6: [ // Saturday
    { time: "11:00 AM", name: "Yogalates", teacher: "Tata", desc: { es: "Fusion de yoga y pilates para fortalecer, estirar y equilibrar.", en: "Fusion of yoga and pilates to strengthen, stretch and balance." } },
    { time: "6:00 PM", name: "Meditación Viaje Interior", note: "(solo en español)", teacher: "Álvaro", desc: { es: "Meditación guiada para volver a ti y encontrar paz interior.", en: "Guided meditation to return to yourself and find inner peace." } },
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
