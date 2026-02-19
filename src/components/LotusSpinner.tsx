"use client";

import { useEffect, useRef } from "react";

interface LotusSpinnerProps {
  size?: number;
  color?: string;
  secondaryColor?: string;
  speed?: number;
}

/**
 * Lotus Spinner — Sacred loading animation
 *
 * Features:
 * - Blooming lotus petals
 * - Breathing scale effect
 * - Golden glow aura
 * - Canvas-based for smooth animation
 */
export default function LotusSpinner({
  size = 64,
  color = "#D4A5A5",
  secondaryColor = "#C9A96E",
  speed = 1,
}: LotusSpinnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const startTime = Date.now();

    const drawPetal = (
      ctx: CanvasRenderingContext2D,
      angle: number,
      petalSize: number,
      opacity: number,
    ) => {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);

      const gradient = ctx.createRadialGradient(
        0,
        -petalSize / 2,
        0,
        0,
        -petalSize / 2,
        petalSize,
      );
      gradient.addColorStop(0, `${color}`);
      gradient.addColorStop(1, "transparent");

      ctx.globalAlpha = opacity;
      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        -petalSize * 0.3,
        -petalSize * 0.4,
        -petalSize * 0.2,
        -petalSize * 0.9,
        0,
        -petalSize,
      );
      ctx.bezierCurveTo(
        petalSize * 0.2,
        -petalSize * 0.9,
        petalSize * 0.3,
        -petalSize * 0.4,
        0,
        0,
      );
      ctx.fill();

      ctx.restore();
    };

    const draw = () => {
      const elapsed = ((Date.now() - startTime) / 1000) * speed;
      ctx.clearRect(0, 0, size, size);

      // Breathing effect
      const breathe = 1 + Math.sin(elapsed * 2) * 0.08;

      // Center glow
      const glowGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        size * 0.4,
      );
      glowGradient.addColorStop(0, `${secondaryColor}30`);
      glowGradient.addColorStop(0.5, `${color}10`);
      glowGradient.addColorStop(1, "transparent");

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 0.4 * breathe, 0, Math.PI * 2);
      ctx.fill();

      // Draw multiple layers of petals
      const petalLayers = [
        { count: 8, size: size * 0.35, rotation: elapsed * 0.5, opacity: 0.3 },
        { count: 6, size: size * 0.28, rotation: -elapsed * 0.7, opacity: 0.5 },
        { count: 5, size: size * 0.2, rotation: elapsed * 1, opacity: 0.7 },
      ];

      petalLayers.forEach((layer) => {
        for (let i = 0; i < layer.count; i++) {
          const angle = (i / layer.count) * Math.PI * 2 + layer.rotation;
          const petalPhase = elapsed + i * 0.3;
          const petalOpacity =
            layer.opacity * (0.5 + Math.sin(petalPhase) * 0.5);
          const petalSize =
            layer.size * breathe * (0.8 + Math.sin(petalPhase * 0.7) * 0.2);

          drawPetal(ctx, angle, petalSize, petalOpacity);
        }
      });

      // Center dot
      const dotGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        size * 0.06,
      );
      dotGradient.addColorStop(0, secondaryColor);
      dotGradient.addColorStop(1, color);

      ctx.fillStyle = dotGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 0.05 * breathe, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, color, secondaryColor, speed]);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block"
      />

      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full animate-pulse"
        style={{
          background: `radial-gradient(circle, transparent 50%, ${color}10 100%)`,
          filter: "blur(4px)",
        }}
      />
    </div>
  );
}
