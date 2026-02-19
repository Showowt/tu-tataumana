"use client";

import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

const PARTICLE_COLORS = [
  "#D4A5A5", // Rose soft
  "#C9A96E", // Gold
  "#B87777", // Rose deep
  "#E8D5D5", // Light rose
];

const PETAL_SHAPES = [
  // Simple circle (dot)
  (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  },
  // Teardrop/petal shape
  (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.5, -size * 0.5, size * 0.5, size * 0.5, 0, size);
    ctx.bezierCurveTo(
      -size * 0.5,
      size * 0.5,
      -size * 0.5,
      -size * 0.5,
      0,
      -size,
    );
    ctx.fill();
  },
  // Star/sparkle
  (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
    }
    ctx.lineWidth = size * 0.3;
    ctx.stroke();
  },
];

/**
 * Cursor Trail — Rose Petal Essence
 * Subtle, elegant particles that follow the cursor movement
 * Only active on desktop devices with hover capability
 */
export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0 });
  const frameRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  const createParticle = useCallback(
    (x: number, y: number, velocity: number) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5 + velocity * 0.1;
      const maxLife = 30 + Math.random() * 40;

      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5, // Slight upward bias
        life: maxLife,
        maxLife,
        size: 2 + Math.random() * 4,
        color:
          PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
      };
    },
    [],
  );

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate mouse velocity
    const dx = mouseRef.current.x - mouseRef.current.lastX;
    const dy = mouseRef.current.y - mouseRef.current.lastY;
    const velocity = Math.sqrt(dx * dx + dy * dy);

    // Spawn new particles based on movement speed
    if (velocity > 2 && isActiveRef.current) {
      const spawnCount = Math.min(Math.floor(velocity / 10), 3);
      for (let i = 0; i < spawnCount; i++) {
        particlesRef.current.push(
          createParticle(
            mouseRef.current.x + (Math.random() - 0.5) * 10,
            mouseRef.current.y + (Math.random() - 0.5) * 10,
            velocity,
          ),
        );
      }
    }

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter((p) => {
      p.life--;
      if (p.life <= 0) return false;

      // Physics
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02; // Gentle gravity
      p.vx *= 0.99; // Air resistance
      p.vy *= 0.99;
      p.rotation += p.rotationSpeed;

      // Draw
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio * 0.6;
      const size = p.size * (0.5 + lifeRatio * 0.5);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      // Randomly choose shape
      const shapeIndex = Math.floor(p.maxLife) % PETAL_SHAPES.length;
      PETAL_SHAPES[shapeIndex](ctx, size);

      ctx.restore();

      return true;
    });

    // Update last position
    mouseRef.current.lastX = mouseRef.current.x;
    mouseRef.current.lastY = mouseRef.current.y;

    frameRef.current = requestAnimationFrame(animate);
  }, [createParticle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    // Mouse enter/leave handlers
    const handleMouseEnter = () => {
      isActiveRef.current = true;
    };

    const handleMouseLeave = () => {
      isActiveRef.current = false;
    };

    // Check for hover capability
    const hasHover = window.matchMedia("(hover: hover)").matches;
    if (!hasHover) return;

    window.addEventListener("resize", updateSize, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Start animation
    isActiveRef.current = true;
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[5] hidden md:block"
      aria-hidden="true"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
