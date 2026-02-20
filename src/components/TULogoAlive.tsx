"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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

interface Variant {
  name: string;
  stroke: string;
  text: string;
  bg: string;
  glow: string;
  accent: string;
  trail: string;
}

interface TULogoAliveProps {
  size?: number;
  variant?: "rose" | "white" | "dark";
  showText?: boolean;
  interactive?: boolean;
  className?: string;
  standalone?: boolean;
}

const TULogoAlive = ({
  size = 260,
  variant: initialVariant = "rose",
  showText = true,
  interactive = true,
  className = "",
  standalone = false,
}: TULogoAliveProps) => {
  const variantIndex =
    initialVariant === "rose" ? 0 : initialVariant === "white" ? 1 : 2;

  const [phase, setPhase] = useState<"intro" | "breathe" | "interact">("intro");
  const [variant, setVariant] = useState(variantIndex);
  const [hover, setHover] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [breathScale, setBreathScale] = useState(1);
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [smileWarmth, setSmileWarmth] = useState(0);
  const [heartbeat, setHeartbeat] = useState(0);
  const [hasBlinked, setHasBlinked] = useState(false);
  const [blinkState, setBlinkState] = useState(0); // 0=open, 1=closing, 2=closed, 3=opening
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<TrailParticle[]>([]);
  const [cursorDist, setCursorDist] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const trailIdRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const variants: Variant[] = [
    {
      name: "Rose",
      stroke: "#D4A5A5",
      text: "#D4A5A5",
      bg: "transparent",
      glow: "rgba(212,165,165,0.3)",
      accent: "#C9A96E",
      trail: "rgba(212,165,165,0.12)",
    },
    {
      name: "White",
      stroke: "#FAF8F5",
      text: "#FAF8F5",
      bg: "transparent",
      glow: "rgba(250,248,245,0.2)",
      accent: "#D4A5A5",
      trail: "rgba(250,250,248,0.08)",
    },
    {
      name: "Dark",
      stroke: "#2C2C2C",
      text: "#2C2C2C",
      bg: "transparent",
      glow: "rgba(44,44,44,0.15)",
      accent: "#B87777",
      trail: "rgba(44,44,44,0.06)",
    },
  ];

  const v = variants[variant];

  // Phase transitions - slower for dramatic effect
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("breathe"), 3500);
    const t2 = setTimeout(() => setPhase("interact"), 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // === THE BLINK — happens once, when eyes first appear ===
  useEffect(() => {
    if (phase === "interact" && !hasBlinked) {
      const blinkTimer = setTimeout(() => {
        setBlinkState(1); // closing
        setTimeout(() => setBlinkState(2), 120); // closed
        setTimeout(() => setBlinkState(3), 250); // opening
        setTimeout(() => {
          setBlinkState(0);
          setHasBlinked(true);
        }, 400); // open — done forever
      }, 800);
      return () => clearTimeout(blinkTimer);
    }
  }, [phase, hasBlinked]);

  // === BREATHING + HEARTBEAT + SMILE WARMTH ===
  useEffect(() => {
    const animate = () => {
      const t = Date.now() / 1000;
      setBreathScale(1 + Math.sin(t * 0.5) * 0.015);
      setSmileWarmth(Math.sin(t * 0.3) * 3);
      // Heartbeat: two quick pulses then pause — like a real heart
      const hbCycle = (t * 1.2) % 2;
      let hb = 0;
      if (hbCycle < 0.15) hb = Math.sin((hbCycle / 0.15) * Math.PI);
      else if (hbCycle > 0.25 && hbCycle < 0.4)
        hb = Math.sin(((hbCycle - 0.25) / 0.15) * Math.PI) * 0.7;
      setHeartbeat(hb);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // === MOUSE TRACKING — eyes follow cursor ===
  const handleMouseMove = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!containerRef.current || !logoRef.current || !interactive) return;
      const rect = logoRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.max(window.innerWidth, window.innerHeight) * 0.5;
      const norm = Math.min(dist / maxDist, 1);
      // Clamp eye movement to subtle range
      const eyeX = (dx / (dist || 1)) * Math.min(norm * 4, 4);
      const eyeY = (dy / (dist || 1)) * Math.min(norm * 3, 3);
      setMousePos({ x: eyeX, y: eyeY });
      // Proximity — 0 = far, 1 = close
      const prox = 1 - Math.min(dist / 350, 1);
      setCursorDist(prox);

      // === WARMTH TRAIL ===
      if (containerRef.current) {
        trailIdRef.current += 1;
        const cRect = containerRef.current.getBoundingClientRect();
        setTrail((prev) => [
          ...prev.slice(-30),
          {
            id: trailIdRef.current,
            x: e.clientX - cRect.left,
            y: e.clientY - cRect.top,
            born: Date.now(),
          },
        ]);
      }
    },
    [interactive],
  );

  // Global mouse tracking
  useEffect(() => {
    if (interactive) {
      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }
  }, [handleMouseMove, interactive]);

  // Trail cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTrail((prev) => prev.filter((t) => now - t.born < 1800));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Particles
  useEffect(() => {
    const interval = setInterval(() => {
      if (phase === "interact") {
        setParticles((prev) => {
          const filtered = prev.filter((p) => p.life > 0);
          if (filtered.length < 12) {
            const angle = Math.random() * Math.PI * 2;
            const dist = (size / 2) * 1.1 + Math.random() * (size / 4);
            filtered.push({
              id: Date.now() + Math.random(),
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              size: 1.5 + Math.random() * 2.5,
              life: 1,
              speed: 0.003 + Math.random() * 0.005,
            });
          }
          return filtered.map((p) => ({ ...p, life: p.life - p.speed }));
        });
      }
    }, 80);
    return () => clearInterval(interval);
  }, [phase, size]);

  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRipples((prev) => [...prev.slice(-4), { id: Date.now(), x, y }]);
    setTimeout(() => setRipples((prev) => prev.slice(1)), 1500);
  };

  const smileLift = hover ? 6 : cursorDist * 3;
  const sw = smileWarmth;
  const hbGlow = heartbeat * 0.15;
  const mx = mousePos.x;
  const my = mousePos.y;

  // Blink: controls eye curve height. 0=open, 2=closed
  const blinkAmount =
    blinkState === 0 ? 0 : blinkState === 1 ? 0.7 : blinkState === 2 ? 1 : 0.3;
  const eyeOpenness = hover ? 11 : 7;
  const eyeCurve = eyeOpenness * (1 - blinkAmount);

  const scale = size / 260;

  // The living TU monogram SVG
  const LogoSVG = ({
    strokeColor,
    glowColor,
  }: {
    strokeColor: string;
    glowColor: string;
  }) => (
    <svg
      width={size}
      height={size + 20 * scale}
      viewBox="0 0 260 280"
      fill="none"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={hover ? "5" : "2.5"} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="warmGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={hover ? "7" : "3"} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="heartGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur
            stdDeviation={(3 + heartbeat * 6).toString()}
            result="blur"
          />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} />
          <stop offset="60%" stopColor={strokeColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor={variants[variant].accent} />
        </linearGradient>
        <linearGradient id="smileStroke" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.7" />
          <stop offset="30%" stopColor={strokeColor} />
          <stop offset="70%" stopColor={strokeColor} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id="heartPulse" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor={strokeColor}
            stopOpacity={0.15 + hbGlow}
          />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Heartbeat pulse — radiates from center */}
      <circle
        cx="130"
        cy="148"
        r={90 + heartbeat * 20}
        fill="url(#heartPulse)"
        style={{ transition: "r 0.08s linear" }}
      />

      {/* Ambient glow */}
      <ellipse
        cx="130"
        cy="148"
        rx="85"
        ry="95"
        fill={glowColor}
        filter="url(#softGlow)"
        opacity={(hover ? 0.55 : 0.25) + hbGlow}
        style={{ transition: "opacity 0.15s" }}
      />

      {/* OUTER U — Shield */}
      <path
        d="M 55 42 L 55 165 C 55 210 88 248 130 248 C 172 248 205 210 205 165 L 205 42 L 55 42 Z"
        stroke="url(#strokeGrad)"
        strokeWidth={hover ? 3.2 : 2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#heartGlow)"
        style={{
          strokeDasharray: 650,
          strokeDashoffset: phase === "intro" ? 650 : 0,
          transition:
            "stroke-dashoffset 2.6s cubic-bezier(0.4,0,0.2,1), stroke-width 0.4s",
        }}
      />

      {/* INNER U — The Smile */}
      <path
        d={`M 78 120
            L 78 ${158 - smileLift}
            C 78 ${188 - smileLift + sw} 96 ${215 - smileLift} 118 ${224 - smileLift}
            Q 130 ${228 - smileLift} 142 ${224 - smileLift}
            C 164 ${215 - smileLift} 182 ${188 - smileLift + sw} 182 ${158 - smileLift}
            L 182 120`}
        stroke="url(#smileStroke)"
        strokeWidth={hover ? 3.2 : 2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={hover ? "url(#warmGlow)" : "url(#heartGlow)"}
        style={{
          strokeDasharray: 420,
          strokeDashoffset: phase === "intro" ? 420 : 0,
          transition:
            "stroke-dashoffset 2s cubic-bezier(0.4,0,0.2,1) 0.8s, stroke-width 0.4s, filter 0.6s",
        }}
      />

      {/* === THE EYES — track cursor, blink on entry === */}

      {/* Left eye */}
      <path
        d={`M ${90 + mx * 0.3} ${96 + my * 0.3} Q ${101 + mx * 0.5} ${96 - eyeCurve + my * 0.3} ${112 + mx * 0.3} ${96 + my * 0.3}`}
        stroke={strokeColor}
        strokeWidth={hover ? 2.4 : 2}
        strokeLinecap="round"
        fill="none"
        filter={hover ? "url(#warmGlow)" : "url(#glow)"}
        opacity={
          phase === "intro" ? 0 : blinkState === 2 ? 0.3 : hover ? 0.95 : 0.65
        }
        style={{ transition: "opacity 0.12s ease" }}
      />

      {/* Right eye */}
      <path
        d={`M ${148 + mx * 0.3} ${96 + my * 0.3} Q ${159 + mx * 0.5} ${96 - eyeCurve + my * 0.3} ${172 + mx * 0.3} ${96 + my * 0.3}`}
        stroke={strokeColor}
        strokeWidth={hover ? 2.4 : 2}
        strokeLinecap="round"
        fill="none"
        filter={hover ? "url(#warmGlow)" : "url(#glow)"}
        opacity={
          phase === "intro" ? 0 : blinkState === 2 ? 0.3 : hover ? 0.95 : 0.65
        }
        style={{ transition: "opacity 0.12s ease" }}
      />

      {/* Eye sparkles — follow gaze direction */}
      <circle
        cx={101 + mx * 1.2}
        cy={93 + my * 0.8}
        r="1.5"
        fill={variants[variant].accent}
        opacity={
          phase === "intro"
            ? 0
            : blinkState === 2
              ? 0
              : hover
                ? 0.9
                : cursorDist * 0.6
        }
        style={{ transition: "opacity 0.2s ease" }}
      />
      <circle
        cx={160 + mx * 1.2}
        cy={93 + my * 0.8}
        r="1.5"
        fill={variants[variant].accent}
        opacity={
          phase === "intro"
            ? 0
            : blinkState === 2
              ? 0
              : hover
                ? 0.9
                : cursorDist * 0.6
        }
        style={{ transition: "opacity 0.2s ease" }}
      />

      {/* T CROSSBAR */}
      <path
        d="M 78 120 L 182 120"
        stroke="url(#strokeGrad)"
        strokeWidth={hover ? 3.2 : 2.8}
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
        style={{
          strokeDasharray: 104,
          strokeDashoffset: phase === "intro" ? 104 : 0,
          transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1) 1.6s",
        }}
      />

      {/* T STEM */}
      <path
        d="M 130 120 L 130 178"
        stroke="url(#strokeGrad)"
        strokeWidth={hover ? 3.2 : 2.8}
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
        style={{
          strokeDasharray: 58,
          strokeDashoffset: phase === "intro" ? 58 : 0,
          transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1) 2.2s",
        }}
      />

      {/* T FOOT */}
      <path
        d="M 118 178 L 142 178"
        stroke="url(#strokeGrad)"
        strokeWidth={hover ? 3.2 : 2.8}
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
        style={{
          strokeDasharray: 24,
          strokeDashoffset: phase === "intro" ? 24 : 0,
          transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1) 2.6s",
        }}
      />
    </svg>
  );

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-col items-center justify-center ${className}`}
      onClick={addRipple}
      style={{
        cursor: interactive ? "crosshair" : "default",
        overflow: "visible",
      }}
    >
      {/* === WARMTH TRAIL — her energy lingers === */}
      {trail.map((t) => {
        const age = (Date.now() - t.born) / 1800;
        const opacity = (1 - age) * 0.35;
        const trailSize = 30 + age * 40;
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
              opacity: Math.max(0, opacity),
              willChange: "opacity",
            }}
          />
        );
      })}

      {/* Ripples */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `calc(50% + ${r.x}px)`,
            top: `calc(50% + ${r.y}px)`,
            width: 100 * scale,
            height: 100 * scale,
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
              variant === 0 ? "#D4A5A5" : variant === 1 ? "#FAF8F5" : "#B87777",
            opacity: p.life * 0.6,
          }}
        />
      ))}

      {/* Main logo container */}
      <div
        ref={logoRef}
        style={{
          transform: `scale(${breathScale + heartbeat * 0.008})`,
          transition: "transform 0.08s linear",
          position: "relative",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Pulse ring */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -30 * scale,
            border: `1px solid ${v.stroke}`,
            opacity: 0.3 + heartbeat * 0.2,
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
            marginTop: 20 * scale,
            opacity: phase === "intro" ? 0 : 1,
            transform: phase === "intro" ? "translateY(16px)" : "translateY(0)",
            transition: "all 1.2s ease 2.8s",
          }}
        >
          <p
            className="font-body font-light"
            style={{
              fontSize: 22 * scale,
              letterSpacing: "0.35em",
              color: v.text,
              marginBottom: 6 * scale,
            }}
          >
            TATA UMAÑA
          </p>
          <div
            style={{
              width: 40 * scale,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${v.accent}, transparent)`,
              margin: `${12 * scale}px auto`,
              opacity: phase === "interact" ? 1 : 0,
              transition: "opacity 1s ease 0.5s",
            }}
          />
          <p
            className="font-body font-light"
            style={{
              fontSize: 10 * scale,
              letterSpacing: "0.3em",
              color: v.accent,
              opacity: phase === "interact" ? 0.7 : 0,
              transition: "opacity 1s ease 0.8s",
            }}
          >
            WELLNESS CURATOR · CARTAGENA
          </p>
        </div>
      )}

      {/* Hint text - SHE SEES YOU */}
      {standalone && (
        <div
          className="absolute"
          style={{
            bottom: -60 * scale,
            opacity: phase === "interact" ? 0.3 : 0,
            transition: "opacity 1.2s ease",
            textAlign: "center",
          }}
        >
          <p
            className="font-body"
            style={{
              fontSize: 10 * scale,
              letterSpacing: "0.2em",
              color: v.text,
            }}
          >
            SHE SEES YOU
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
            opacity: 0.3;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.15;
          }
        }
      `}</style>
    </div>
  );
};

export default TULogoAlive;
