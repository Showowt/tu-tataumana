"use client";

import { useRef, useEffect, useState, ReactNode } from "react";

interface ParallaxSectionProps {
  children: ReactNode;
  speed?: number;
  className?: string;
  fadeIn?: boolean;
  staggerChildren?: boolean;
  direction?: "up" | "down";
}

/**
 * Parallax Section Component
 *
 * Creates cinematic scroll effects:
 * - Parallax movement at configurable speeds
 * - Fade in on scroll with intersection observer
 * - Staggered children reveal
 */
export default function ParallaxSection({
  children,
  speed = 0.3,
  className = "",
  fadeIn = true,
  staggerChildren = false,
  direction = "up",
}: ParallaxSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [isVisible, setIsVisible] = useState(!fadeIn);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Only calculate when section is in view
      if (rect.top < windowHeight && rect.bottom > 0) {
        const scrollProgress =
          (windowHeight - rect.top) / (windowHeight + rect.height);
        const parallaxOffset = (scrollProgress - 0.5) * 100 * speed;
        setOffset(direction === "up" ? -parallaxOffset : parallaxOffset);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed, direction]);

  // Fade in effect
  useEffect(() => {
    if (!fadeIn || hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setHasAnimated(true);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -100px 0px" },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [fadeIn, hasAnimated]);

  return (
    <div
      ref={sectionRef}
      className={`${className} ${staggerChildren ? "stagger-children" : ""}`}
      style={{
        transform: `translateY(${offset}px)`,
        opacity: isVisible ? 1 : 0,
        transition:
          "opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 0.1s linear",
      }}
    >
      {children}
    </div>
  );
}
