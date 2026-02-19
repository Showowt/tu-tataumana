"use client";

import { useEffect, useState } from "react";

interface MoonData {
  phase: string;
  phaseEs: string;
  icon: string;
  illumination: number;
  message: string;
  messageEs: string;
  daysUntilNext: number;
  nextPhase: string;
}

/**
 * Calculate the current moon phase
 * Based on synodic month calculation (29.53 days)
 */
function getMoonPhase(): MoonData {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // Calculate days since known new moon (Jan 6, 2000)
  const c = Math.floor((year - 2000) * 365.25);
  const e = Math.floor((month - 1) * 30.6);
  const jd = c + e + day - 694039.09;
  const daysInCycle = jd / 29.53058867;
  const phase = daysInCycle - Math.floor(daysInCycle);

  // Phase is 0-1, representing the lunar cycle
  const phaseValue = Math.floor(phase * 8);

  // Calculate days until next phase
  const phaseLength = 29.53058867 / 8;
  const daysIntoCurrentPhase = (phase * 8 - phaseValue) * phaseLength;
  const daysUntilNext = Math.ceil(phaseLength - daysIntoCurrentPhase);

  const phaseNames = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent",
  ];

  const phases: MoonData[] = [
    {
      phase: "New Moon",
      phaseEs: "Luna Nueva",
      icon: "🌑",
      illumination: 0,
      message: "Perfect for setting intentions and new beginnings",
      messageEs: "Ideal para establecer intenciones y nuevos comienzos",
      daysUntilNext,
      nextPhase: phaseNames[(phaseValue + 1) % 8],
    },
    {
      phase: "Waxing Crescent",
      phaseEs: "Luna Creciente",
      icon: "🌒",
      illumination: 12,
      message: "Time to nurture your intentions with action",
      messageEs: "Momento de nutrir tus intenciones con acción",
      daysUntilNext,
      nextPhase: phaseNames[(phaseValue + 1) % 8],
    },
    {
      phase: "First Quarter",
      phaseEs: "Cuarto Creciente",
      icon: "🌓",
      illumination: 50,
      message: "Face challenges with determination",
      messageEs: "Enfrenta los desafíos con determinación",
      daysUntilNext,
      nextPhase: phaseNames[(phaseValue + 1) % 8],
    },
    {
      phase: "Waxing Gibbous",
      phaseEs: "Gibosa Creciente",
      icon: "🌔",
      illumination: 75,
      message: "Refine and adjust your path",
      messageEs: "Refina y ajusta tu camino",
      daysUntilNext,
      nextPhase: phaseNames[(phaseValue + 1) % 8],
    },
    {
      phase: "Full Moon",
      phaseEs: "Luna Llena",
      icon: "🌕",
      illumination: 100,
      message: "Celebrate and release what no longer serves you",
      messageEs: "Celebra y libera lo que ya no te sirve",
      daysUntilNext,
      nextPhase: phaseNames[(phaseValue + 1) % 8],
    },
    {
      phase: "Waning Gibbous",
      phaseEs: "Gibosa Menguante",
      icon: "🌖",
      illumination: 75,
      message: "Share your wisdom and gratitude",
      messageEs: "Comparte tu sabiduría y gratitud",
      daysUntilNext,
      nextPhase: phaseNames[(phaseValue + 1) % 8],
    },
    {
      phase: "Last Quarter",
      phaseEs: "Cuarto Menguante",
      icon: "🌗",
      illumination: 50,
      message: "Reflect and release old patterns",
      messageEs: "Reflexiona y libera viejos patrones",
      daysUntilNext,
      nextPhase: phaseNames[(phaseValue + 1) % 8],
    },
    {
      phase: "Waning Crescent",
      phaseEs: "Luna Menguante",
      icon: "🌘",
      illumination: 12,
      message: "Rest, restore, and prepare for renewal",
      messageEs: "Descansa, restaura y prepárate para la renovación",
      daysUntilNext,
      nextPhase: phaseNames[(phaseValue + 1) % 8],
    },
  ];

  return phases[phaseValue] || phases[0];
}

/**
 * Moon Phase Widget — Lunar Awareness
 * Displays current moon phase with spiritual guidance
 * Perfect for ceremony scheduling and intention setting
 */
export default function MoonPhase() {
  const [moon, setMoon] = useState<MoonData | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setMoon(getMoonPhase());
  }, []);

  if (!moon) return null;

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2 cursor-pointer">
        <span className="moon-glow text-lg" role="img" aria-label={moon.phase}>
          {moon.icon}
        </span>
        <span className="font-body text-xs text-gold tracking-wide hidden sm:inline">
          {moon.phase}
        </span>
      </div>

      {/* Expanded tooltip */}
      <div
        className={`
          absolute top-full right-0 mt-3 w-64 p-4
          bg-charcoal/95 backdrop-blur-lg
          border border-rose-soft/20
          transition-all duration-300 z-50
          ${isHovered ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}
        `}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{moon.icon}</span>
          <div>
            <p className="font-display text-cream text-lg">{moon.phase}</p>
            <p className="font-body text-rose-soft text-xs">{moon.phaseEs}</p>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between font-body text-xs text-cream/60 mb-1">
            <span>Illumination</span>
            <span>{moon.illumination}%</span>
          </div>
          <div className="w-full h-1 bg-charcoal-light overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-soft to-gold transition-all duration-500"
              style={{ width: `${moon.illumination}%` }}
            />
          </div>
        </div>

        <p className="font-display text-cream/80 text-sm italic leading-relaxed">
          "{moon.message}"
        </p>
        <p className="font-body text-rose-soft/60 text-xs mt-1">
          {moon.messageEs}
        </p>

        {/* Next phase indicator */}
        <div className="mt-4 pt-3 border-t border-rose-soft/10">
          <p className="font-body text-[9px] text-cream/40">
            {moon.nextPhase} in ~{moon.daysUntilNext} day
            {moon.daysUntilNext !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
