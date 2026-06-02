/**
 * WellnessOS — Pack Definitions
 * TU. by Tata Umana
 *
 * All prices in COP (Colombian Pesos) unless noted.
 * USD prices are approximate conversions for international clients.
 */

export interface PackDefinition {
  type: string;
  name: { en: string; es: string };
  description: { en: string; es: string };
  totalClasses: number; // -1 = unlimited
  priceCop: number;
  priceUsd: number;
  expirationDays: number;
  isPromo: boolean;
  isActive: boolean;
  sortOrder: number;
}

export const PACK_DEFINITIONS: PackDefinition[] = [
  {
    type: "WALK_IN",
    name: { en: "Walk-In Class", es: "Clase Walk-In" },
    description: {
      en: "Single class — drop in to any session on the schedule",
      es: "Clase individual — asiste a cualquier sesion del horario",
    },
    totalClasses: 1,
    priceCop: 80000,
    priceUsd: 21,
    expirationDays: 14,
    isPromo: false,
    isActive: true,
    sortOrder: 1,
  },
  {
    type: "JUST_FLOW_PACK",
    name: { en: "Just Flow Pack", es: "Just Flow Pack" },
    description: {
      en: "6 classes — build your weekly practice",
      es: "6 clases — construye tu practica semanal",
    },
    totalClasses: 6,
    priceCop: 295000,
    priceUsd: 78,
    expirationDays: 45,
    isPromo: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    type: "TU_HEALING_PACK",
    name: { en: "Your Healing Pack", es: "TU Healing Pack" },
    description: {
      en: "8 classes — deepen your practice with consistency",
      es: "8 clases — profundiza tu practica con constancia",
    },
    totalClasses: 8,
    priceCop: 420000,
    priceUsd: 111,
    expirationDays: 60,
    isPromo: false,
    isActive: true,
    sortOrder: 3,
  },
  {
    type: "TU_BALANCE_PACK",
    name: { en: "Your Balance Pack", es: "TU Balance Pack" },
    description: {
      en: "12 classes — commit to transformation",
      es: "12 clases — comprometete con la transformacion",
    },
    totalClasses: 12,
    priceCop: 630000,
    priceUsd: 166,
    expirationDays: 90,
    isPromo: false,
    isActive: true,
    sortOrder: 4,
  },
  {
    type: "TU_UNLIMITED",
    name: { en: "Unlimited Monthly", es: "Ilimitado Mensual" },
    description: {
      en: "Unlimited monthly — your studio, your schedule",
      es: "Ilimitado mensual — tu estudio, tu horario",
    },
    totalClasses: -1,
    priceCop: 1050000,
    priceUsd: 277,
    expirationDays: 30,
    isPromo: false,
    isActive: true,
    sortOrder: 5,
  },
  {
    type: "PRIVATE_SESSION",
    name: { en: "Private Session / One on One Experience", es: "Sesion Privada / Experiencia Uno a Uno" },
    description: {
      en: "Personalized one-on-one session with a teacher",
      es: "Sesion personalizada uno a uno con un teacher",
    },
    totalClasses: 1,
    priceCop: 190000,
    priceUsd: 50,
    expirationDays: 30,
    isPromo: false,
    isActive: true,
    sortOrder: 6,
  },
  {
    type: "MAYO_MAMA",
    name: { en: "Anniversary Special", es: "Especial Aniversario" },
    description: {
      en: "Anniversary Special — celebrate with yoga!",
      es: "Especial Aniversario — celebra con yoga!",
    },
    totalClasses: 4,
    priceCop: 160000,
    priceUsd: 42,
    expirationDays: 30,
    isPromo: true,
    isActive: true,
    sortOrder: 10,
  },
  {
    type: "MAYO_2X1",
    name: { en: "2x1 Promo", es: "Promo 2x1" },
    description: {
      en: "Pay for one, bring your friend free!",
      es: "Paga por uno, trae a tu amigo gratis!",
    },
    totalClasses: 2,
    priceCop: 80000,
    priceUsd: 21,
    expirationDays: 14,
    isPromo: true,
    isActive: true,
    sortOrder: 11,
  },
  {
    type: "ANNIVERSARY_5EXP",
    name: { en: "5 Experiences — Anniversary Special", es: "5 Experiencias — Especial Aniversario" },
    description: {
      en: "First Shala Anniversary! 4 classes + 1 Sound Healing session",
      es: "Primer Aniversario del Shala! 4 clases + 1 sesion de Sound Healing",
    },
    totalClasses: 5,
    priceCop: 180000,
    priceUsd: 47,
    expirationDays: 45,
    isPromo: true,
    isActive: true,
    sortOrder: 12,
  },
  {
    type: "INDUSTRY_SPECIAL",
    name: { en: "Industry Special", es: "Especial Industria" },
    description: {
      en: "Special rate for hospitality industry — Tuesdays & Fridays",
      es: "Tarifa especial para industria hotelera — Martes y Viernes",
    },
    totalClasses: 1,
    priceCop: 45000,
    priceUsd: 12,
    expirationDays: 7,
    isPromo: true,
    isActive: true,
    sortOrder: 12,
  },
];

/** Get a pack definition by type */
export function getPackDefinition(type: string): PackDefinition | undefined {
  return PACK_DEFINITIONS.find((p) => p.type === type);
}

/** Get all active (non-promo) packs */
export function getActivePacks(): PackDefinition[] {
  return PACK_DEFINITIONS.filter((p) => p.isActive && !p.isPromo).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/** Get active promo packs */
export function getPromoPacks(): PackDefinition[] {
  return PACK_DEFINITIONS.filter((p) => p.isActive && p.isPromo).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/** Calculate expiration date from now */
export function calculateExpiration(expirationDays: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + expirationDays);
  return date;
}
