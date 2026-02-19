"use client";

import { useEffect, useRef } from "react";

/**
 * Aurora Glow — Ethereal cursor-following ambient light
 * Creates a soft, meditative glow that follows the user's cursor
 * Disabled on mobile for performance
 */
export default function AuroraGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!glowRef.current) return;

      // Smooth follow with offset to center the glow
      const x = e.clientX - 250;
      const y = e.clientY - 250;

      glowRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="aurora-glow hidden md:block"
      aria-hidden="true"
    />
  );
}
