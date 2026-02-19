"use client";

import { useEffect, useState, useCallback } from "react";

type BreathPhase = "inhale" | "hold" | "exhale" | "rest";

interface BreathingState {
  phase: BreathPhase;
  timeLeft: number;
  isActive: boolean;
}

const BREATH_TIMINGS = {
  inhale: 4,
  hold: 4,
  exhale: 6,
  rest: 2,
};

const PHASE_LABELS = {
  inhale: { en: "Inhale", es: "Inhala" },
  hold: { en: "Hold", es: "Sostener" },
  exhale: { en: "Exhale", es: "Exhala" },
  rest: { en: "Rest", es: "Descansa" },
};

const PHASE_COLORS = {
  inhale: "#43A047", // Heart chakra green
  hold: "#FBC02D", // Solar plexus yellow
  exhale: "#B87777", // Rose deep
  rest: "#5E35B1", // Third eye indigo
};

/**
 * Breathing Guide — Meditative Companion
 * A subtle, toggleable breathing circle that guides box breathing
 * Appears in the bottom-left corner, respecting the WhatsApp button position
 */
export default function BreathingGuide() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [breathState, setBreathState] = useState<BreathingState>({
    phase: "inhale",
    timeLeft: BREATH_TIMINGS.inhale,
    isActive: false,
  });
  const [cycleCount, setCycleCount] = useState(0);
  const [scale, setScale] = useState(1);

  const getNextPhase = (current: BreathPhase): BreathPhase => {
    const sequence: BreathPhase[] = ["inhale", "hold", "exhale", "rest"];
    const idx = sequence.indexOf(current);
    return sequence[(idx + 1) % sequence.length];
  };

  // Breathing timer
  useEffect(() => {
    if (!breathState.isActive) return;

    const interval = setInterval(() => {
      setBreathState((prev) => {
        if (prev.timeLeft <= 1) {
          const nextPhase = getNextPhase(prev.phase);
          if (nextPhase === "inhale") {
            setCycleCount((c) => c + 1);
          }
          return {
            ...prev,
            phase: nextPhase,
            timeLeft: BREATH_TIMINGS[nextPhase],
          };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [breathState.isActive]);

  // Scale animation based on breath phase
  useEffect(() => {
    if (!breathState.isActive) {
      setScale(1);
      return;
    }

    const { phase, timeLeft } = breathState;
    const duration = BREATH_TIMINGS[phase];
    const progress = 1 - timeLeft / duration;

    switch (phase) {
      case "inhale":
        setScale(1 + progress * 0.3); // Grow from 1 to 1.3
        break;
      case "hold":
        setScale(1.3); // Stay expanded
        break;
      case "exhale":
        setScale(1.3 - progress * 0.3); // Shrink from 1.3 to 1
        break;
      case "rest":
        setScale(1); // Stay at rest
        break;
    }
  }, [breathState]);

  const toggleActive = useCallback(() => {
    setBreathState((prev) => ({
      phase: "inhale",
      timeLeft: BREATH_TIMINGS.inhale,
      isActive: !prev.isActive,
    }));
    if (!breathState.isActive) {
      setCycleCount(0);
    }
  }, [breathState.isActive]);

  const handleMinimize = () => {
    setIsExpanded(false);
    setBreathState({
      phase: "inhale",
      timeLeft: BREATH_TIMINGS.inhale,
      isActive: false,
    });
    setCycleCount(0);
  };

  return (
    <>
      {/* Minimized state - Small lotus button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full bg-charcoal/90 backdrop-blur-sm border border-rose-soft/20 flex items-center justify-center transition-all duration-300 hover:border-rose-soft/50 hover:scale-105 group"
          aria-label="Open breathing guide"
        >
          <span className="text-xl group-hover:scale-110 transition-transform">
            🧘
          </span>
        </button>
      )}

      {/* Expanded breathing guide */}
      {isExpanded && (
        <div className="fixed bottom-6 left-6 z-40 w-48 bg-charcoal/95 backdrop-blur-lg border border-rose-soft/20 p-4 transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="font-body text-[9px] tracking-[0.2em] text-gold">
              BREATHING GUIDE
            </span>
            <button
              onClick={handleMinimize}
              className="text-cream/40 hover:text-cream transition-colors text-lg leading-none"
              aria-label="Close breathing guide"
            >
              &times;
            </button>
          </div>

          {/* Breathing circle */}
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 flex items-center justify-center mb-3">
              {/* Outer ring */}
              <div
                className="absolute inset-0 rounded-full border-2 transition-all duration-300"
                style={{
                  borderColor: breathState.isActive
                    ? PHASE_COLORS[breathState.phase]
                    : "rgba(212,165,165,0.2)",
                  boxShadow: breathState.isActive
                    ? `0 0 20px ${PHASE_COLORS[breathState.phase]}40`
                    : "none",
                }}
              />

              {/* Inner breathing circle */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
                style={{
                  transform: `scale(${scale})`,
                  background: breathState.isActive
                    ? `radial-gradient(circle, ${PHASE_COLORS[breathState.phase]}40, transparent)`
                    : "radial-gradient(circle, rgba(212,165,165,0.1), transparent)",
                  transitionDuration: "1000ms",
                  transitionTimingFunction:
                    breathState.phase === "inhale" ||
                    breathState.phase === "exhale"
                      ? "ease-in-out"
                      : "linear",
                }}
              >
                {breathState.isActive ? (
                  <span
                    className="font-display text-2xl transition-colors duration-500"
                    style={{ color: PHASE_COLORS[breathState.phase] }}
                  >
                    {breathState.timeLeft}
                  </span>
                ) : (
                  <span className="text-2xl">🪷</span>
                )}
              </div>
            </div>

            {/* Phase label */}
            {breathState.isActive && (
              <div className="text-center mb-3">
                <p
                  className="font-display text-sm transition-colors duration-500"
                  style={{ color: PHASE_COLORS[breathState.phase] }}
                >
                  {PHASE_LABELS[breathState.phase].en}
                </p>
                <p className="font-body text-[9px] text-cream/40">
                  {PHASE_LABELS[breathState.phase].es}
                </p>
              </div>
            )}

            {/* Start/Stop button */}
            <button
              onClick={toggleActive}
              className={`font-body text-[10px] tracking-[0.1em] px-4 py-2 transition-all duration-300 ${
                breathState.isActive
                  ? "border border-rose-soft/30 text-rose-soft hover:bg-rose-soft/10"
                  : "bg-rose-deep text-cream hover:bg-rose-soft"
              }`}
            >
              {breathState.isActive ? "PAUSE" : "BEGIN"}
            </button>

            {/* Cycle counter */}
            {cycleCount > 0 && (
              <p className="font-body text-[9px] text-cream/30 mt-3">
                {cycleCount} breath{cycleCount !== 1 ? "s" : ""} completed
              </p>
            )}
          </div>

          {/* Instructions (when not active) */}
          {!breathState.isActive && (
            <p className="font-body text-[9px] text-cream/40 text-center mt-3 leading-relaxed">
              4-4-6-2 box breathing
              <br />
              for calm and presence
            </p>
          )}
        </div>
      )}
    </>
  );
}
