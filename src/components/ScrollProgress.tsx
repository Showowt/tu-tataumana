"use client";

import { useEffect, useState } from "react";

/**
 * Scroll Progress Indicator — Chakra Energy Flow
 * A thin progress bar at the top of the page that fills with chakra gradient
 * as the user scrolls down. Represents the spiritual journey through the site.
 */
export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const calculateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(scrollPercent);
      setIsVisible(scrollTop > 100);
    };

    window.addEventListener("scroll", calculateProgress, { passive: true });
    calculateProgress();

    return () => window.removeEventListener("scroll", calculateProgress);
  }, []);

  // Map progress to chakra colors (root to crown as you scroll up, crown to root as you scroll down)
  const getChakraColor = (percent: number): string => {
    // Gradient through chakras: Crown (top) -> Root (bottom of page)
    if (percent < 14.3) return "#8E24AA"; // Crown - Purple
    if (percent < 28.6) return "#5E35B1"; // Third Eye - Indigo
    if (percent < 42.9) return "#0288D1"; // Throat - Blue
    if (percent < 57.2) return "#43A047"; // Heart - Green
    if (percent < 71.5) return "#FBC02D"; // Solar Plexus - Yellow
    if (percent < 85.8) return "#EF6C00"; // Sacral - Orange
    return "#C62828"; // Root - Red
  };

  return (
    <>
      {/* Main progress bar */}
      <div
        className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        {/* Background track */}
        <div className="absolute inset-0 bg-charcoal/10" />

        {/* Progress fill with chakra gradient */}
        <div
          className="h-full relative overflow-hidden"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg,
              #8E24AA 0%,
              #5E35B1 16.6%,
              #0288D1 33.3%,
              #43A047 50%,
              #FBC02D 66.6%,
              #EF6C00 83.3%,
              #C62828 100%
            )`,
            transition: "width 0.1s ease-out",
          }}
        >
          {/* Shimmer effect */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
              backgroundSize: "200% 100%",
              animation: "shimmerScroll 2s linear infinite",
            }}
          />
        </div>

        {/* Glow at the leading edge */}
        <div
          className="absolute top-0 h-[6px] w-[30px] blur-sm pointer-events-none"
          style={{
            left: `calc(${progress}% - 15px)`,
            background: getChakraColor(progress),
            opacity: progress > 1 ? 0.8 : 0,
            transition: "left 0.1s ease-out, background 0.3s ease",
          }}
        />
      </div>

      {/* Percentage indicator (appears on hover/focus) */}
      <div
        className="fixed top-3 right-4 z-[60] pointer-events-none"
        style={{
          opacity: isVisible && progress > 5 ? 0.6 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        <span
          className="font-body text-[9px] tracking-[0.1em]"
          style={{ color: getChakraColor(progress) }}
        >
          {Math.round(progress)}%
        </span>
      </div>

      <style jsx>{`
        @keyframes shimmerScroll {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </>
  );
}
