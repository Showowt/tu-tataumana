"use client";

import { useState, useEffect, useRef } from "react";

interface TULogoAliveProps {
  size?: number;
  variant?: "rose" | "white" | "dark";
  showText?: boolean;
  interactive?: boolean;
  className?: string;
}

const TULogoAlive = ({
  size = 240,
  variant: initialVariant = "rose",
  showText = true,
  interactive = true,
  className = "",
}: TULogoAliveProps) => {
  const variantIndex =
    initialVariant === "rose" ? 0 : initialVariant === "white" ? 1 : 2;

  const [phase, setPhase] = useState<"intro" | "breathe" | "interact">("intro");
  const [variant, setVariant] = useState(variantIndex);
  const [hover, setHover] = useState(false);
  const [ripples, setRipples] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  const [breathScale, setBreathScale] = useState(1);
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      size: number;
      life: number;
      speed: number;
      angle: number;
    }>
  >([]);
  const frameRef = useRef<number | null>(null);

  const variants = [
    {
      name: "Rose",
      stroke: "#D4A5A5",
      text: "#D4A5A5",
      bg: "transparent",
      glow: "rgba(212,165,165,0.3)",
      accent: "#C9A96E",
    },
    {
      name: "White",
      stroke: "#FAF8F5",
      text: "#FAF8F5",
      bg: "transparent",
      glow: "rgba(250,248,245,0.2)",
      accent: "#D4A5A5",
    },
    {
      name: "Dark",
      stroke: "#2C2C2C",
      text: "#2C2C2C",
      bg: "transparent",
      glow: "rgba(44,44,44,0.15)",
      accent: "#B87777",
    },
  ];

  const v = variants[variant];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("breathe"), 800);
    const t2 = setTimeout(() => setPhase("interact"), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Breathing animation
  useEffect(() => {
    const breathe = () => {
      const t = Date.now() / 1000;
      setBreathScale(1 + Math.sin(t * 0.5) * 0.015);
      frameRef.current = requestAnimationFrame(breathe);
    };
    frameRef.current = requestAnimationFrame(breathe);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Particle system
  useEffect(() => {
    const interval = setInterval(() => {
      if (phase === "interact") {
        setParticles((prev) => {
          const filtered = prev.filter((p) => p.life > 0);
          if (filtered.length < 8) {
            const angle = Math.random() * Math.PI * 2;
            const dist = (size / 2) * 0.8 + Math.random() * (size / 4);
            filtered.push({
              id: Date.now() + Math.random(),
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              size: 1.5 + Math.random() * 2,
              life: 1,
              speed: 0.004 + Math.random() * 0.006,
              angle,
            });
          }
          return filtered.map((p) => ({ ...p, life: p.life - p.speed }));
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [phase, size]);

  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRipples((prev) => [...prev.slice(-3), { id: Date.now(), x, y }]);
    setTimeout(() => setRipples((prev) => prev.slice(1)), 1500);
  };

  const scale = size / 240;

  // The TU monogram SVG
  const LogoSVG = ({
    strokeColor,
    glowColor,
  }: {
    strokeColor: string;
    glowColor: string;
  }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={hover ? "6" : "3"} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} />
          <stop offset="50%" stopColor={strokeColor} stopOpacity={0.8} />
          <stop offset="100%" stopColor={variants[variant].accent} />
        </linearGradient>
      </defs>

      {/* Ambient glow behind logo */}
      <ellipse
        cx="120"
        cy="130"
        rx="80"
        ry="85"
        fill={glowColor}
        filter="url(#softGlow)"
        opacity={hover ? 0.6 : 0.3}
        style={{ transition: "opacity 0.6s" }}
      />

      {/* OUTER U SHAPE — the shield/chalice */}
      <path
        d="M 60 45 L 60 140 C 60 185 85 210 120 210 C 155 210 180 185 180 140 L 180 45"
        stroke="url(#strokeGrad)"
        strokeWidth={hover ? 3.5 : 3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#glow)"
        style={{
          strokeDasharray: 500,
          strokeDashoffset: phase === "intro" ? 500 : 0,
          transition:
            "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1), stroke-width 0.4s",
        }}
      />

      {/* TOP BAR connecting the U */}
      <path
        d="M 60 45 L 180 45"
        stroke="url(#strokeGrad)"
        strokeWidth={hover ? 3.5 : 3}
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
        style={{
          strokeDasharray: 120,
          strokeDashoffset: phase === "intro" ? 120 : 0,
          transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1) 0.3s",
        }}
      />

      {/* INNER U SHAPE — nested, slightly smaller */}
      <path
        d="M 75 60 L 75 135 C 75 172 94 195 120 195 C 146 195 165 172 165 135 L 165 60"
        stroke={strokeColor}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.7}
        style={{
          strokeDasharray: 420,
          strokeDashoffset: phase === "intro" ? 420 : 0,
          transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1) 0.5s",
        }}
      />

      {/* T VERTICAL STEM — drops down from top center */}
      <path
        d="M 120 45 L 120 130"
        stroke="url(#strokeGrad)"
        strokeWidth={hover ? 3.5 : 3}
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
        style={{
          strokeDasharray: 85,
          strokeDashoffset: phase === "intro" ? 85 : 0,
          transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1) 0.7s",
        }}
      />

      {/* T CROSSBAR — sits at the top, slightly inset from U edges */}
      <path
        d="M 85 60 L 155 60"
        stroke={strokeColor}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
        opacity={0.8}
        style={{
          strokeDasharray: 70,
          strokeDashoffset: phase === "intro" ? 70 : 0,
          transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1) 0.9s",
        }}
      />
    </svg>
  );

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center ${className}`}
      onClick={addRipple}
      style={{ cursor: interactive ? "pointer" : "default" }}
    >
      {/* Ripples */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `calc(50% + ${r.x}px)`,
            top: `calc(50% + ${r.y}px)`,
            width: 80 * scale,
            height: 80 * scale,
            border: `1px solid ${v.stroke}`,
            animation: "rippleOut 1.5s ease-out forwards",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            width: p.size,
            height: p.size,
            background:
              variant === 0 ? "#D4A5A5" : variant === 1 ? "#FAF8F5" : "#B87777", // Rose Soft, Cream, Rose Deep
            opacity: p.life * 0.5,
          }}
        />
      ))}

      {/* Main logo container */}
      <div
        style={{
          transform: `scale(${breathScale})`,
          transition: "transform 0.1s linear",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Pulse ring */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -20 * scale,
            border: `1px solid ${v.stroke}`,
            opacity: 0.2,
            animation: "pulseRing 4s ease-in-out infinite",
          }}
        />

        <LogoSVG strokeColor={v.stroke} glowColor={v.glow} />
      </div>

      {/* Text */}
      {showText && (
        <div
          className="text-center"
          style={{
            marginTop: 16 * scale,
            opacity: phase === "intro" ? 0 : 1,
            transform: phase === "intro" ? "translateY(8px)" : "translateY(0)",
            transition: "all 0.8s ease 0.6s",
          }}
        >
          <p
            className="font-body font-light"
            style={{
              fontSize: 14 * scale,
              letterSpacing: "0.35em",
              color: v.text,
            }}
          >
            TATA UMAÑA
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes rippleOut {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(3);
            opacity: 0;
          }
        }
        @keyframes pulseRing {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.1;
          }
        }
      `}</style>
    </div>
  );
};

export default TULogoAlive;
