"use client";

import { ReactNode } from "react";

interface SectionTransitionProps {
  children: ReactNode;
  from?: "light" | "dark";
  to?: "light" | "dark";
  className?: string;
}

/**
 * Section Transition — Cinematic gradient fade between sections
 *
 * Creates a smooth visual flow between sections with different backgrounds
 * Uses ambient glow and gradient overlays for seamless transitions
 */
export default function SectionTransition({
  children,
  from = "light",
  to = "dark",
  className = "",
}: SectionTransitionProps) {
  const gradientColors = {
    lightToDark: {
      top: "rgba(250, 248, 245, 1)",
      mid: "rgba(44, 44, 44, 0.1)",
      bottom: "rgba(44, 44, 44, 1)",
    },
    darkToLight: {
      top: "rgba(44, 44, 44, 1)",
      mid: "rgba(250, 248, 245, 0.1)",
      bottom: "rgba(250, 248, 245, 1)",
    },
  };

  const colors =
    from === "light" ? gradientColors.lightToDark : gradientColors.darkToLight;

  return (
    <div className={`relative ${className}`}>
      {/* Top fade overlay */}
      <div
        className="absolute inset-x-0 top-0 h-32 pointer-events-none z-10"
        style={{
          background: `linear-gradient(to bottom, ${colors.top}, transparent)`,
        }}
      />

      {/* Content */}
      <div className="relative z-0">{children}</div>

      {/* Bottom fade overlay */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none z-10"
        style={{
          background: `linear-gradient(to top, ${colors.bottom}, transparent)`,
        }}
      />

      {/* Ambient glow in the middle */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-64 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${colors.mid}, transparent)`,
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}
