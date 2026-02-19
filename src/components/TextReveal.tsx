"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface TextRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  variant?: "fade" | "slide" | "blur" | "split";
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
}

/**
 * Text Reveal Animation Component
 *
 * Features:
 * - Multiple animation variants
 * - Character-by-character or word-by-word reveal
 * - Intersection observer triggered
 * - Smooth cubic-bezier easing
 */
export default function TextReveal({
  children,
  className = "",
  delay = 0,
  duration = 0.8,
  variant = "fade",
  as: Component = "div",
}: TextRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
              setHasAnimated(true);
            }, delay * 1000);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay, hasAnimated]);

  const getVariantStyles = () => {
    const base = {
      transition: `all ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`,
    };

    switch (variant) {
      case "slide":
        return {
          ...base,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(40px)",
        };
      case "blur":
        return {
          ...base,
          opacity: isVisible ? 1 : 0,
          filter: isVisible ? "blur(0)" : "blur(10px)",
          transform: isVisible ? "translateY(0)" : "translateY(20px)",
        };
      case "split":
        return {
          ...base,
          opacity: isVisible ? 1 : 0,
          clipPath: isVisible
            ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
            : "polygon(0 0, 0 0, 0 100%, 0 100%)",
        };
      case "fade":
      default:
        return {
          ...base,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(20px)",
        };
    }
  };

  return (
    <Component
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={getVariantStyles()}
    >
      {children}
    </Component>
  );
}

/**
 * Split Text Animation - Word by Word
 */
export function SplitTextReveal({
  text,
  className = "",
  delay = 0,
  wordDelay = 0.05,
  as: Component = "p",
}: {
  text: string;
  className?: string;
  delay?: number;
  wordDelay?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), delay * 1000);
          }
        });
      },
      { threshold: 0.2 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const words = text.split(" ");

  return (
    <Component
      ref={ref as React.RefObject<HTMLParagraphElement>}
      className={className}
    >
      {words.map((word, index) => (
        <span
          key={index}
          className="inline-block overflow-hidden"
          style={{ marginRight: "0.25em" }}
        >
          <span
            className="inline-block"
            style={{
              transform: isVisible ? "translateY(0)" : "translateY(100%)",
              opacity: isVisible ? 1 : 0,
              transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * wordDelay}s`,
            }}
          >
            {word}
          </span>
        </span>
      ))}
    </Component>
  );
}

/**
 * Character by Character Reveal
 */
export function CharReveal({
  text,
  className = "",
  delay = 0,
  charDelay = 0.02,
}: {
  text: string;
  className?: string;
  delay?: number;
  charDelay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), delay * 1000);
          }
        });
      },
      { threshold: 0.2 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <span ref={ref} className={className}>
      {text.split("").map((char, index) => (
        <span
          key={index}
          className="inline-block"
          style={{
            transform: isVisible
              ? "translateY(0) rotateX(0)"
              : "translateY(20px) rotateX(-90deg)",
            opacity: isVisible ? 1 : 0,
            transition: `all 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * charDelay}s`,
            transformOrigin: "bottom",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}
