"use client";

import { useState, useEffect, useRef } from "react";
import TULogoAlive from "./TULogoAlive";

interface CinematicLoaderProps {
  onComplete: () => void;
  minDuration?: number;
}

/**
 * Cinematic Page Load Sequence
 *
 * The grand entrance:
 * 1. Black screen with subtle particle field
 * 2. Logo draws itself with sacred geometry patterns
 * 3. Golden light expands outward
 * 4. Content reveals with staggered fade
 */
export default function CinematicLoader({
  onComplete,
  minDuration = 2800,
}: CinematicLoaderProps) {
  const [phase, setPhase] = useState<"particles" | "logo" | "expand" | "fade">(
    "particles",
  );
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Particle field animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
    }

    const particles: Particle[] = [];
    const colors = ["#D4A5A5", "#C9A96E", "#B87777"];

    // Create particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.fillStyle = "rgba(44, 44, 44, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw connecting lines
      ctx.strokeStyle = "rgba(212, 165, 165, 0.03)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.globalAlpha = (1 - dist / 150) * 0.2;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw and update particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Breathing effect
        const breathe = Math.sin(frame * 0.01 + p.x * 0.01) * 0.3 + 0.7;

        ctx.globalAlpha = p.alpha * breathe;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * breathe, 0, Math.PI * 2);
        ctx.fill();
      });

      // Sacred geometry - subtle rotating triangles
      if (phase === "logo" || phase === "expand") {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const rotation = frame * 0.002;

        for (let i = 0; i < 3; i++) {
          const radius = 120 + i * 40;
          const opacity = 0.03 - i * 0.008;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rotation + (i * Math.PI) / 6);
          ctx.strokeStyle = `rgba(201, 169, 110, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const angle = (j * Math.PI * 2) / 6;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase]);

  // Phase progression
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 100));
    }, minDuration / 50);
    timers.push(progressInterval);

    // Phase transitions
    timers.push(setTimeout(() => setPhase("logo"), 400));
    timers.push(setTimeout(() => setPhase("expand"), minDuration * 0.7));
    timers.push(setTimeout(() => setPhase("fade"), minDuration * 0.9));
    timers.push(setTimeout(onComplete, minDuration));

    return () => timers.forEach(clearTimeout);
  }, [minDuration, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-700 ${
        phase === "fade" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ backgroundColor: "#2C2C2C" }}
    >
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Central light burst */}
      <div
        className={`absolute transition-all duration-1000 ease-out ${
          phase === "expand" || phase === "fade"
            ? "scale-[3] opacity-0"
            : "scale-100 opacity-100"
        }`}
        style={{
          width: 400,
          height: 400,
          background:
            "radial-gradient(circle, rgba(201,169,110,0.15) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />

      {/* Logo container */}
      <div
        className={`relative z-10 transition-all duration-700 ${
          phase === "particles"
            ? "opacity-0 scale-90"
            : phase === "expand" || phase === "fade"
              ? "opacity-0 scale-110"
              : "opacity-100 scale-100"
        }`}
      >
        <TULogoAlive
          size={200}
          variant="rose"
          showText={true}
          interactive={false}
        />
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        <div className="w-48 h-px bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-soft via-gold to-rose-soft transition-all duration-300"
            style={{
              width: `${progress}%`,
              boxShadow: "0 0 10px rgba(212,165,165,0.5)",
            }}
          />
        </div>
        <span
          className={`font-body text-[9px] tracking-[0.4em] text-cream/30 transition-opacity duration-500 ${
            phase === "fade" ? "opacity-0" : "opacity-100"
          }`}
        >
          ENTERING SANCTUARY
        </span>
      </div>
    </div>
  );
}
