"use client";

import { useState, useRef, ReactNode, MouseEvent } from "react";

interface HoverCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  tiltIntensity?: number;
}

/**
 * Hover Card — Luxury 3D tilt effect with glow
 *
 * Features:
 * - 3D perspective tilt following cursor
 * - Dynamic glow that follows cursor position
 * - Subtle shine effect on hover
 * - Smooth spring-like transitions
 */
export default function HoverCard({
  children,
  className = "",
  glowColor = "rgba(212, 165, 165, 0.15)",
  tiltIntensity = 10,
}: HoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const tiltX = ((y - centerY) / centerY) * -tiltIntensity;
    const tiltY = ((x - centerX) / centerX) * tiltIntensity;

    setTilt({ x: tiltX, y: tiltY });
    setGlowPosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setGlowPosition({ x: 50, y: 50 });
    setIsHovered(false);
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.02 : 1})`,
        transition: isHovered
          ? "transform 0.1s ease-out"
          : "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Dynamic glow that follows cursor */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${glowPosition.x}% ${glowPosition.y}%, ${glowColor} 0%, transparent 50%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: `linear-gradient(${105 + tilt.y * 2}deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Border glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{
          boxShadow: isHovered
            ? `inset 0 0 0 1px rgba(212, 165, 165, 0.2), 0 20px 40px rgba(0,0,0,0.1)`
            : "inset 0 0 0 1px transparent",
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
