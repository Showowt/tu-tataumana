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
    type: "DROP_IN",
    name: { en: "Drop-In Class", es: "Clase Individual" },
    description: {
      en: "Single class — try any session on the schedule",
      es: "Clase individual — prueba cualquier sesión del horario",
    },
    totalClasses: 1,
    priceCop: 45000,
    priceUsd: 12,
    expirationDays: 14,
    isPromo: false,
    isActive: true,
    sortOrder: 1,
  },
  {
    type: "JUST_FLOW_PACK",
    name: { en: "Just Flow Pack", es: "Just Flow Pack" },
    description: {
      en: "4 classes — perfect for weekly practice",
      es: "4 clases — perfecto para práctica semanal",
    },
    totalClasses: 4,
    priceCop: 160000,
    priceUsd: 42,
    expirationDays: 30,
    isPromo: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    type: "TU_HEALING_PACK",
    name: { en: "TU Healing Pack", es: "TU Healing Pack" },
    description: {
      en: "8 classes — deepen your practice with consistency",
      es: "8 clases — profundiza tu práctica con constancia",
    },
    totalClasses: 8,
    priceCop: 280000,
    priceUsd: 74,
    expirationDays: 60,
    isPromo: false,
    isActive: true,
    sortOrder: 3,
  },
  {
    type: "TU_EQUILIBRIUM",
    name: { en: "TU Equilibrium", es: "TU Equilibrium" },
    description: {
      en: "12 classes — commit to transformation",
      es: "12 clases — comprométete con la transformación",
    },
    totalClasses: 12,
    priceCop: 360000,
    priceUsd: 95,
    expirationDays: 90,
    isPromo: false,
    isActive: true,
    sortOrder: 4,
  },
  {
    type: "TU_LIFE_PACK",
    name: { en: "TU Life Pack", es: "TU Life Pack" },
    description: {
      en: "Unlimited monthly — your studio, your schedule",
      es: "Ilimitado mensual — tu estudio, tu horario",
    },
    totalClasses: -1,
    priceCop: 450000,
    priceUsd: 118,
    expirationDays: 30,
    isPromo: false,
    isActive: true,
    sortOrder: 5,
  },
  {
    type: "MAYO_MES_MAMA",
    name: { en: "Mayo Mes Mamá", es: "Mayo Mes Mamá" },
    description: {
      en: "Mother's Month Special — 4 classes at a special price",
      es: "Especial Mes de las Madres — 4 clases a precio especial",
    },
    totalClasses: 4,
    priceCop: 120000,
    priceUsd: 32,
    expirationDays: 30,
    isPromo: true,
    isActive: true,
    sortOrder: 10,
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
