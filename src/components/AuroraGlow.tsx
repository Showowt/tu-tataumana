"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Aurora Glow v2 — Ethereal cursor-following ambient light
 *
 * Enhanced features:
 * - Smooth spring physics for organic movement
 * - Multi-layer glow for depth
 * - Color shifting based on scroll position
 * - Breathing animation when idle
 * - Intensity responds to cursor speed
 */
export default function AuroraGlow() {
  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const tertiaryRef = useRef<HTMLDivElement>(null);

  const positionRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const lastMoveRef = useRef(Date.now());

  const [isIdle, setIsIdle] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Track scroll for color shifting
  useEffect(() => {
    const handleScroll = () => {
      const progress =
        window.scrollY / (document.body.scrollHeight - window.innerHeight);
      setScrollProgress(Math.min(1, Math.max(0, progress)));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animation loop with spring physics
  const animate = useCallback(() => {
    const spring = 0.08;
    const damping = 0.85;

    // Calculate spring force
    const dx = targetRef.current.x - positionRef.current.x;
    const dy = targetRef.current.y - positionRef.current.y;

    velocityRef.current.x += dx * spring;
    velocityRef.current.y += dy * spring;

    velocityRef.current.x *= damping;
    velocityRef.current.y *= damping;

    positionRef.current.x += velocityRef.current.x;
    positionRef.current.y += velocityRef.current.y;

    // Calculate cursor speed for intensity
    const speed = Math.sqrt(
      velocityRef.current.x ** 2 + velocityRef.current.y ** 2,
    );
    const intensity = Math.min(1, speed / 20);

    // Apply transforms with different lag for each layer
    if (primaryRef.current) {
      primaryRef.current.style.transform = `translate(${positionRef.current.x - 300}px, ${positionRef.current.y - 300}px)`;
      primaryRef.current.style.opacity = `${0.6 + intensity * 0.3}`;
    }

    if (secondaryRef.current) {
      const lagX = positionRef.current.x + velocityRef.current.x * -3;
      const lagY = positionRef.current.y + velocityRef.current.y * -3;
      secondaryRef.current.style.transform = `translate(${lagX - 200}px, ${lagY - 200}px)`;
    }

    if (tertiaryRef.current) {
      const lagX = positionRef.current.x + velocityRef.current.x * -6;
      const lagY = positionRef.current.y + velocityRef.current.y * -6;
      tertiaryRef.current.style.transform = `translate(${lagX - 150}px, ${lagY - 150}px)`;
    }

    frameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      lastMoveRef.current = Date.now();
      setIsIdle(false);
    };

    // Idle detection
    const idleCheck = setInterval(() => {
      if (Date.now() - lastMoveRef.current > 2000) {
        setIsIdle(true);
      }
    }, 500);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(idleCheck);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [animate]);

  // Dynamic colors based on scroll
  const primaryColor = `rgba(${212 - scrollProgress * 30}, ${165 - scrollProgress * 20}, ${165 + scrollProgress * 40}, 0.08)`;
  const secondaryColor = `rgba(${201 - scrollProgress * 20}, ${169 + scrollProgress * 10}, ${110 + scrollProgress * 30}, 0.05)`;
  const tertiaryColor = `rgba(${184 + scrollProgress * 30}, ${119 + scrollProgress * 40}, ${119 + scrollProgress * 50}, 0.03)`;

  return (
    <>
      {/* Primary glow - largest, most visible */}
      <div
        ref={primaryRef}
        className={`fixed pointer-events-none z-[1] hidden md:block transition-opacity duration-1000 ${
          isIdle ? "animate-pulse" : ""
        }`}
        style={{
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
        aria-hidden="true"
      />

      {/* Secondary glow - medium, trails behind */}
      <div
        ref={secondaryRef}
        className="fixed pointer-events-none z-[1] hidden md:block"
        style={{
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${secondaryColor} 0%, transparent 60%)`,
          filter: "blur(60px)",
        }}
        aria-hidden="true"
      />

      {/* Tertiary glow - smallest, most lag */}
      <div
        ref={tertiaryRef}
        className="fixed pointer-events-none z-[1] hidden md:block"
        style={{
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${tertiaryColor} 0%, transparent 50%)`,
          filter: "blur(40px)",
        }}
        aria-hidden="true"
      />
    </>
  );
}
