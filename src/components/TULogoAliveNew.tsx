"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

interface TrailParticle {
  id: number;
  x: number;
  y: number;
  born: number;
}

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  life: number;
  speed: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface VariantConfig {
  name: string;
  bg: string;
  color: string;
  glowRgba: string;
  accent: string;
  text: string;
  trail: string;
  filter: string;
}

interface TULogoAliveNewProps {
  size?: number;
  variant?: "rose" | "white" | "dark";
  showText?: boolean;
  interactive?: boolean;
  minimal?: boolean;
  className?: string;
}

const TULogoAliveNew = ({
  size = 200,
  variant = "rose",
  showText = true,
  interactive = true,
  minimal = false,
  className = "",
}: TULogoAliveNewProps) => {
  const [phase, setPhase] = useState<"intro" | "breathe" | "interact">("intro");
  const [hover, setHover] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [breathScale, setBreathScale] = useState(1);
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [heartbeat, setHeartbeat] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [trail, setTrail] = useState<TrailParticle[]>([]);
  const [cursorDist, setCursorDist] = useState(0);
  const [morphProgress, setMorphProgress] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const trailIdRef = useRef(0);
  const morphStartRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const breathFrameRef = useRef<number | null>(null);

  const rose = "#DEA5A4";

  const variants: Record<"rose" | "white" | "dark", VariantConfig> = {
    rose: {
      name: "Rosado",
      bg: "transparent",
      color: rose,
      glowRgba: "rgba(222,165,164,",
      accent: "#C9A96E",
      text: rose,
      trail: "rgba(222,165,164,0.12)",
      filter: "none",
    },
    white: {
      name: "Blanco",
      bg: "transparent",
      color: "#FFFFFF",
      glowRgba: "rgba(255,255,255,",
      accent: rose,
      text: "#FFF",
      trail: "rgba(255,255,255,0.06)",
      filter: "brightness(0) invert(1)",
    },
    dark: {
      name: "Negro",
      bg: "transparent",
      color: "#000000",
      glowRgba: "rgba(0,0,0,",
      accent: rose,
      text: "#000",
      trail: "rgba(0,0,0,0.04)",
      filter: "brightness(0)",
    },
  };

  const v = variants[variant];

  // Phase timing - faster for minimal mode
  const phaseTimings = minimal
    ? { breathe: 800, interact: 1200 }
    : { breathe: 2000, interact: 4000 };

  // Phase transitions
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("breathe"), phaseTimings.breathe);
    const t2 = setTimeout(() => setPhase("interact"), phaseTimings.interact);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phaseTimings.breathe, phaseTimings.interact]);

  // Morph animation (awakening effect)
  useEffect(() => {
    if (phase === "breathe" || phase === "interact") {
      if (!morphStartRef.current) morphStartRef.current = performance.now();

      const duration = minimal ? 1000 : 3000;

      const runMorph = (timestamp: number) => {
        const progress = Math.min(
          (timestamp - (morphStartRef.current ?? timestamp)) / duration,
          1,
        );
        // Ease-in-out cubic
        const eased =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        setMorphProgress(eased);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(runMorph);
        }
      };

      frameRef.current = requestAnimationFrame(runMorph);

      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };
    }
  }, [phase, minimal]);

  // Breathing + Heartbeat animation
  useEffect(() => {
    const animate = () => {
      const t = Date.now() / 1000;
      const alive = morphProgress > 0.3;

      // Breathing scale - reduced for minimal mode
      const breathAmount = minimal ? 0.008 : 0.018;
      setBreathScale(
        1 + (alive ? Math.sin(t * 0.5) * breathAmount * morphProgress : 0),
      );

      // Heartbeat: two quick pulses then pause
      const hbCycle = (t * 1.2) % 2;
      let hb = 0;
      if (alive) {
        if (hbCycle < 0.15) {
          hb = Math.sin((hbCycle / 0.15) * Math.PI);
        } else if (hbCycle > 0.25 && hbCycle < 0.4) {
          hb = Math.sin(((hbCycle - 0.25) / 0.15) * Math.PI) * 0.7;
        }
      }
      setHeartbeat(hb);

      breathFrameRef.current = requestAnimationFrame(animate);
    };

    breathFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (breathFrameRef.current) cancelAnimationFrame(breathFrameRef.current);
    };
  }, [morphProgress, minimal]);

  // Mouse tracking for cursor-reactive glow
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !interactive) return;

      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });

      if (logoRef.current) {
        const logoRect = logoRef.current.getBoundingClientRect();
        const logoCenterX = logoRect.left + logoRect.width / 2;
        const logoCenterY = logoRect.top + logoRect.height / 2;
        const dist = Math.sqrt(
          Math.pow(e.clientX - logoCenterX, 2) +
            Math.pow(e.clientY - logoCenterY, 2),
        );
        setCursorDist(1 - Math.min(dist / 400, 1));
      }

      // Add trail particles (skip for minimal mode)
      if (morphProgress > 0.3 && !minimal) {
        trailIdRef.current += 1;
        setTrail((prev) => [
          ...prev.slice(-35),
          {
            id: trailIdRef.current,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            born: Date.now(),
          },
        ]);
      }
    },
    [morphProgress, interactive, minimal],
  );

  // Trail cleanup
  useEffect(() => {
    if (minimal) return;
    const interval = setInterval(() => {
      setTrail((prev) => prev.filter((t) => Date.now() - t.born < 2000));
    }, 150);
    return () => clearInterval(interval);
  }, [minimal]);

  // Floating particles (skip for minimal mode)
  useEffect(() => {
    if (minimal) return;
    const interval = setInterval(() => {
      if (morphProgress > 0.6) {
        setParticles((prev) => {
          const filtered = prev.filter((p) => p.life > 0);
          if (filtered.length < 15) {
            const angle = Math.random() * Math.PI * 2;
            const dist = (size / 2) * 0.7 + Math.random() * (size / 4);
            filtered.push({
              id: Date.now() + Math.random(),
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              size: 1.5 + Math.random() * 2,
              life: 1,
              speed: 0.002 + Math.random() * 0.004,
            });
          }
          return filtered.map((p) => ({ ...p, life: p.life - p.speed }));
        });
      }
    }, 80);
    return () => clearInterval(interval);
  }, [morphProgress, size, minimal]);

  // Click ripple handler
  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || morphProgress < 0.5) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRipples((prev) => [...prev.slice(-4), { id: Date.now(), x, y }]);
    setTimeout(() => setRipples((prev) => prev.slice(1)), 1500);
  };

  // Computed values for glow effects
  const lightX = mousePos.x * 100;
  const lightY = mousePos.y * 100;
  const glowIntensity = 0.15 + cursorDist * 0.4 + heartbeat * 0.15;
  const glowSize = size * 0.7 + cursorDist * 80 + heartbeat * 35;

  // Fallback component when image fails to load
  const FallbackLogo = () => (
    <div
      className="flex items-center justify-center font-display"
      style={{
        width: size,
        height: size,
        color: v.color,
        fontSize: size * 0.3,
        fontWeight: 300,
        letterSpacing: "0.2em",
      }}
    >
      TU
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-col items-center justify-center ${className}`}
      style={{
        cursor: interactive && phase === "interact" ? "crosshair" : "default",
        overflow: "visible",
      }}
      onMouseMove={handleMouseMove}
      onClick={addRipple}
    >
      {/* CSS Animations */}
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
            opacity: 0.25;
          }
          50% {
            transform: scale(1.06);
            opacity: 0.12;
          }
        }
        @keyframes logoIn {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }
          60% {
            opacity: 1;
            transform: scale(1.01);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes textIn {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Warmth trail - skip for minimal */}
      {!minimal &&
        trail.map((t) => {
          const age = (Date.now() - t.born) / 2000;
          const trailSize = 35 + age * 50;
          return (
            <div
              key={t.id}
              className="absolute pointer-events-none"
              style={{
                left: t.x - trailSize / 2,
                top: t.y - trailSize / 2,
                width: trailSize,
                height: trailSize,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${v.trail} 0%, transparent 70%)`,
                opacity: Math.max(0, (1 - age) * 0.4),
              }}
            />
          );
        })}

      {/* Ambient rings - skip for minimal */}
      {!minimal && (
        <>
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: size * 2.5,
              height: size * 2.5,
              border: `1px solid ${v.color}`,
              opacity: 0.05 * morphProgress,
              animation: "pulseRing 120s linear infinite",
            }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: size * 1.9,
              height: size * 1.9,
              border: `1px solid ${v.accent}`,
              opacity: 0.07 * morphProgress,
              animation: "pulseRing 80s linear infinite reverse",
            }}
          />
        </>
      )}

      {/* Click ripples - skip for minimal */}
      {!minimal &&
        ripples.map((r) => (
          <div
            key={r.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `calc(50% + ${r.x}px)`,
              top: `calc(50% + ${r.y}px)`,
              width: size * 0.5,
              height: size * 0.5,
              border: `1px solid ${v.color}`,
              animation: "rippleOut 1.5s ease-out forwards",
            }}
          />
        ))}

      {/* Floating particles - skip for minimal */}
      {!minimal &&
        particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `calc(50% + ${p.x}px)`,
              top: `calc(50% + ${p.y}px)`,
              width: p.size,
              height: p.size,
              background: v.color,
              opacity: p.life * 0.5,
            }}
          />
        ))}

      {/* Main logo container */}
      <div
        ref={logoRef}
        className="relative"
        style={{
          transform: `scale(${breathScale})`,
          transition: "transform 0.08s linear",
          animation: minimal ? "none" : "logoIn 2s ease forwards",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Heartbeat pulse ring */}
        {!minimal && (
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -size * 0.2,
              border: `1px solid ${v.color}`,
              opacity: (0.2 + heartbeat * 0.3) * morphProgress,
              transform: `scale(${1 + heartbeat * 0.05 * morphProgress})`,
              animation:
                morphProgress > 0.5
                  ? "pulseRing 4s ease-in-out infinite"
                  : "none",
              transition: "opacity 0.08s, transform 0.08s",
            }}
          />
        )}

        {/* Second pulse ring */}
        {!minimal && (
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -size * 0.325,
              border: `1px solid ${v.color}`,
              opacity: (0.1 + heartbeat * 0.15) * morphProgress,
              transform: `scale(${1 + heartbeat * 0.03 * morphProgress})`,
              animation:
                morphProgress > 0.5
                  ? "pulseRing 4s ease-in-out infinite 2s"
                  : "none",
            }}
          />
        )}

        {/* Cursor-reactive glow */}
        {interactive && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${lightX}%`,
              top: `${lightY}%`,
              width: glowSize,
              height: glowSize,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${v.glowRgba}${(glowIntensity * morphProgress).toFixed(3)}) 0%, transparent 70%)`,
              filter: `blur(${25 + heartbeat * 12}px)`,
              transition: "width 0.3s, height 0.3s",
            }}
          />
        )}

        {/* Ambient underglow */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: -size * 0.15,
            borderRadius: "30%",
            background: `radial-gradient(ellipse at 50% 55%, ${v.glowRgba}${(0.1 * morphProgress + heartbeat * 0.1 * morphProgress).toFixed(3)}) 0%, transparent 65%)`,
            filter: "blur(30px)",
          }}
        />

        {/* Hover bloom */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: -size * 0.05,
            borderRadius: "20%",
            boxShadow: hover
              ? `0 0 50px ${v.glowRgba}0.12), 0 0 100px ${v.glowRgba}0.06), 0 0 150px ${v.glowRgba}0.03)`
              : `0 0 ${25 * morphProgress}px ${v.glowRgba}${(0.04 * morphProgress).toFixed(3)})`,
            transition: "box-shadow 0.6s ease",
          }}
        />

        {/* The Logo Image */}
        {imageError ? (
          <FallbackLogo />
        ) : (
          <Image
            src="/tu-logo.png"
            alt="Tata Umana"
            width={size}
            height={size}
            style={{
              display: "block",
              position: "relative",
              zIndex: 2,
              filter: v.filter,
              transition: "filter 0.6s ease",
              userSelect: "none",
              pointerEvents: "none",
              objectFit: "contain",
            }}
            draggable={false}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            priority={!minimal}
          />
        )}
      </div>

      {/* Wordmark text */}
      {showText && (
        <div
          className="text-center"
          style={{
            marginTop: size * 0.12,
            animation: minimal ? "none" : "textIn 1.8s ease 0.8s both",
          }}
        >
          <p
            className="font-body"
            style={{
              fontSize: size * 0.09,
              fontWeight: 400,
              letterSpacing: "0.5em",
              color: v.text,
            }}
          >
            TATA&nbsp;&nbsp;UMANA
          </p>
          <div
            style={{
              width: size * 0.2,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${v.accent}, transparent)`,
              margin: `${size * 0.08}px auto`,
              opacity: morphProgress,
              transition: "opacity 1s ease",
            }}
          />
          <p
            className="font-body"
            style={{
              fontSize: size * 0.05,
              fontWeight: 300,
              letterSpacing: "0.3em",
              color: v.accent,
              opacity: phase === "interact" ? 0.7 : 0,
              transition: "opacity 1s ease",
            }}
          >
            WELLNESS CURATOR · CARTAGENA
          </p>
        </div>
      )}
    </div>
  );
};

export default TULogoAliveNew;
