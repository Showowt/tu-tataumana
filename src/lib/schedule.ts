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
    { time: "9:30 AM", name: "Stress Release", teacher: "Tata", desc: { es: "Libera tensión y estrés a través de movimiento consciente y respiración profunda.", en: "Release tension and stress through conscious movement and deep breathing." } },
    { time: "11:00 AM", name: "Sculpt Your Body", teacher: "Tata", desc: { es: "Tonifica y fortalece tu cuerpo con movimientos precisos y controlados.", en: "Tone and strengthen your body with precise, controlled movements." } },
    { time: "7:15 PM", name: "Open Flow", teacher: "Violeta", desc: { es: "Secuencias fluidas para liberar, expandir y equilibrar tu energía.", en: "Fluid sequences to release, expand and balance your energy." } },
  ],
  2: [ // Tuesday
    { time: "9:30 AM", name: "Yoga for the Back", teacher: "Tata", desc: { es: "Cuida tu espalda, mejora tu postura y alivia tensiones.", en: "Care for your back, improve your posture and relieve tension." } },
    { time: "5:30 PM", name: "Meditación Viaje Interior", note: "(solo en español)", teacher: "Álvaro", desc: { es: "Meditación guiada para volver a ti y encontrar paz interior.", en: "Guided meditation to return to yourself and find inner peace." } },
    { time: "7:15 PM", name: "Hip Opening · Hatha", teacher: "Alejandro", desc: { es: "Abre tus caderas y libera tensión profunda con posturas conscientes de hatha.", en: "Open your hips and release deep tension with conscious hatha postures." } },
  ],
  3: [ // Wednesday
    { time: "9:30 AM", name: "Yogalates", teacher: "Tata", desc: { es: "Fusión de yoga y pilates para fortalecer, estirar y equilibrar.", en: "Fusion of yoga and pilates to strengthen, stretch and balance." } },
    { time: "10:45 AM", name: "Pilates Flow", teacher: "Tata", desc: { es: "Fortalece, alinea y tonifica tu cuerpo con fluidez desde el centro.", en: "Strengthen, align and tone your body with fluidity from the core." } },
    { time: "7:15 PM", name: "Open Flow", teacher: "Violeta", desc: { es: "Secuencias fluidas para liberar, expandir y equilibrar tu energía.", en: "Fluid sequences to release, expand and balance your energy." } },
  ],
  4: [ // Thursday
    { time: "9:30 AM", name: "Yoga Intro", teacher: "Tata", desc: { es: "Práctica accesible para descubrir el yoga y activar tu cuerpo.", en: "Accessible practice to discover yoga and activate your body." } },
    { time: "5:30 PM", name: "Sound Healing", teacher: "Tata", desc: { es: "Relajación profunda a través de sonidos sanadores que armonizan tu energía.", en: "Deep relaxation through healing sounds that harmonize your energy." } },
    { time: "7:15 PM", name: "Hip Opening", teacher: "Alejandro", desc: { es: "Abre tus caderas y libera tensión profunda con movimiento consciente.", en: "Open your hips and release deep tension with conscious movement." } },
  ],
  5: [ // Friday
    { time: "10:00 AM", name: "Power Yoga", teacher: "Tata", desc: { es: "Fuerza, alineación y presencia para activar tu poder interior.", en: "Strength, alignment and presence to activate your inner power." } },
    { time: "7:00 PM", name: "Open Flow", teacher: "Betty & Violeta", desc: { es: "Fluye, suelta y recarga tu energía para cerrar la semana en balance.", en: "Flow, release and recharge your energy to close the week in balance." } },
  ],
  6: [ // Saturday
    { time: "11:00 AM", name: "Sun Salutation", teacher: "Tata", desc: { es: "Salud al sol: movimiento consciente para despertar y agradecer.", en: "Sun salute: conscious movement to awaken and give thanks." } },
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
