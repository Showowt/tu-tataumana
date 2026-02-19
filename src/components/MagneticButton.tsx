"use client";

import { useRef, useState, ReactNode, MouseEvent } from "react";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  strength?: number;
  variant?: "primary" | "secondary" | "ghost";
}

/**
 * Magnetic Button with Luxury Micro-interactions
 *
 * Features:
 * - Magnetic cursor attraction
 * - Ripple effect on click
 * - Glow state on hover
 * - Scale bounce on press
 * - Shimmer effect
 */
export default function MagneticButton({
  children,
  className = "",
  href,
  onClick,
  strength = 0.3,
  variant = "primary",
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);

  const handleMouseMove = (e: MouseEvent) => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;

    setPosition({
      x: distanceX * strength,
      y: distanceY * strength,
    });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const handleClick = (
    e: MouseEvent<HTMLAnchorElement & HTMLButtonElement>,
  ) => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = { id: Date.now(), x, y };
    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 800);

    onClick?.();
  };

  const variantStyles = {
    primary: `
      bg-rose-soft text-charcoal
      hover:bg-gold hover:text-charcoal
      shadow-[0_0_0_0_rgba(212,165,165,0)]
      hover:shadow-[0_0_30px_rgba(212,165,165,0.3)]
    `,
    secondary: `
      bg-transparent text-cream border border-cream/30
      hover:border-rose-soft hover:text-rose-soft
      hover:shadow-[0_0_20px_rgba(212,165,165,0.15)]
    `,
    ghost: `
      bg-transparent text-rose-soft
      hover:text-gold
    `,
  };

  const commonStyles = `
    relative overflow-hidden
    font-body text-[11px] tracking-[0.15em]
    px-8 py-4 min-h-[56px]
    inline-flex items-center justify-center gap-3
    transition-all duration-500 ease-out
    active:scale-[0.97]
    ${variantStyles[variant]}
    ${className}
  `;

  const content = (
    <>
      {/* Shimmer overlay */}
      <div
        className={`absolute inset-0 opacity-0 transition-opacity duration-500 ${
          isHovered ? "opacity-100" : ""
        }`}
        style={{
          background:
            "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%)",
          backgroundSize: "200% 100%",
          animation: isHovered ? "shimmerMove 1.5s infinite" : "none",
        }}
      />

      {/* Ripples */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 10,
            height: 10,
            transform: "translate(-50%, -50%)",
            animation:
              "rippleExpand 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards",
          }}
        />
      ))}

      {/* Content */}
      <span className="relative z-10">{children}</span>

      {/* Glow effect */}
      <div
        className={`absolute -inset-1 rounded-full opacity-0 transition-opacity duration-500 pointer-events-none ${
          isHovered ? "opacity-100" : ""
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(212,165,165,0.2) 0%, transparent 70%)",
          filter: "blur(10px)",
        }}
      />

      <style jsx>{`
        @keyframes shimmerMove {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        @keyframes rippleExpand {
          0% {
            width: 10px;
            height: 10px;
            opacity: 0.6;
          }
          100% {
            width: 300px;
            height: 300px;
            opacity: 0;
          }
        }
      `}</style>
    </>
  );

  const styleTransform = {
    transform: `translate(${position.x}px, ${position.y}px)`,
    transition: isHovered
      ? "transform 0.15s ease-out"
      : "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  if (href) {
    return (
      <a
        ref={buttonRef}
        href={href}
        className={commonStyles}
        style={styleTransform}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={buttonRef}
      className={commonStyles}
      style={styleTransform}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {content}
    </button>
  );
}
