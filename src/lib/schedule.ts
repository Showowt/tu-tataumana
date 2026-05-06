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
    { time: "9:00 AM", name: "Power Yoga", teacher: "Alejandro", desc: { es: "Práctica energética para fortalecer el cuerpo y calmar la mente.", en: "Energetic practice to strengthen the body and calm the mind." } },
    { time: "10:30 AM", name: "Inner Journey · Meditation", note: "(solo en español)", teacher: "Álvaro", desc: { es: "Un viaje hacia adentro a través de la meditación y la quietud.", en: "A journey inward through meditation and stillness." } },
  ],
  1: [ // Monday
    { time: "9:30 AM", name: "Yoga Flow - Open Vinyasa", teacher: "Harold", desc: { es: "Fluye con intención. Movimiento, respiración y energía para empezar el día.", en: "Flow with intention. Movement, breath and energy to start the day." } },
    { time: "11:00 AM", name: "Yoga Flow", teacher: "Karla", desc: { es: "Una práctica fluida para conectar cuerpo y mente.", en: "A flowing practice to connect body and mind." } },
    { time: "7:15 PM", name: "Yoga Flow - Open Vinyasa", teacher: "Violeta", desc: { es: "Vinyasa creativo para soltar tensiones y reconectar contigo.", en: "Creative vinyasa to release tension and reconnect with yourself." } },
  ],
  2: [ // Tuesday
    { time: "9:30 AM", name: "Back Care Yoga", teacher: "Tata", desc: { es: "Cuida tu espalda, mejora tu postura y alivia tensiones.", en: "Care for your back, improve your posture and relieve tension." } },
    { time: "7:15 PM", name: "Hatha", teacher: "Alejandro", desc: { es: "Posturas conscientes y respiración para cultivar equilibrio y calma.", en: "Conscious postures and breathing to cultivate balance and calm." } },
  ],
  3: [ // Wednesday
    { time: "9:30 AM", name: "Yoga Flow - Open Vinyasa", teacher: "Harold", desc: { es: "Una práctica dinámica para despertar el cuerpo y enfocar la mente.", en: "A dynamic practice to awaken the body and focus the mind." } },
    { time: "10:45 AM", name: "Pilates", teacher: "Harold", desc: { es: "Fortalece, alinea y tonifica tu cuerpo desde el centro.", en: "Strengthen, align and tone your body from the core." } },
    { time: "7:15 PM", name: "Open Flow", teacher: "Violeta", desc: { es: "Secuencias fluidas para liberar, expandir y equilibrar tu energía.", en: "Fluid sequences to release, expand and balance your energy." } },
  ],
  4: [ // Thursday
    { time: "9:30 AM", name: "Yoga Intro · Power Up", teacher: "Tata", desc: { es: "Activa tu cuerpo y mente con una práctica poderosa y revitalizante.", en: "Activate your body and mind with a powerful and revitalizing practice." } },
    { time: "7:15 PM", name: "Hatha", teacher: "Alejandro", desc: { es: "Una práctica clásica para conectar cuerpo, mente y respiración.", en: "A classic practice to connect body, mind and breath." } },
  ],
  5: [ // Friday
    { time: "10:00 AM", name: "Power Yoga · Postura", teacher: "Tata", desc: { es: "Fuerza, alineación y presencia para activar tu poder interior.", en: "Strength, alignment and presence to activate your inner power." } },
    { time: "7:00 PM", name: "Open Flow", teacher: "Betty & Violeta", desc: { es: "Fluye, suelta y recarga tu energía para cerrar la semana en balance.", en: "Flow, release and recharge your energy to close the week in balance." } },
  ],
  6: [ // Saturday
    { time: "11:00 AM", name: "Sun Salutation", teacher: "Tata", desc: { es: "Salud al sol: movimiento consciente para despertar y agradecer.", en: "Sun salute: conscious movement to awaken and give thanks." } },
    { time: "6:00 PM", name: "Inner Journey · Meditation", note: "(solo en español)", teacher: "Álvaro", desc: { es: "Meditación guiada para volver a ti y encontrar paz interior.", en: "Guided meditation to return to yourself and find inner peace." } },
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
