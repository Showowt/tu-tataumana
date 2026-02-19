"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface SoundWaveVisualizerProps {
  bars?: number;
  height?: number;
  playing?: boolean;
  variant?: "default" | "spectrum" | "heartbeat";
}

/**
 * Sound Wave Visualizer v2 — Cinematic audio frequency visualization
 *
 * Features:
 * - Canvas-based rendering for smooth 60fps
 * - Multiple wave variants (default, spectrum, heartbeat)
 * - Realistic frequency distribution
 * - Glow effects and gradients
 * - Intersection Observer for performance
 */
export default function SoundWaveVisualizer({
  bars = 24,
  height = 80,
  playing = true,
  variant = "default",
}: SoundWaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Generate frequency data with realistic audio patterns
  const generateFrequencies = useCallback(
    (time: number): number[] => {
      const frequencies: number[] = [];

      for (let i = 0; i < bars; i++) {
        const normalizedIndex = i / bars;

        if (variant === "spectrum") {
          // Spectrum analyzer style - bass heavy, treble decay
          const bassBoost = Math.pow(1 - normalizedIndex, 2);
          const wave1 = Math.sin(time * 2 + i * 0.5) * 0.3;
          const wave2 = Math.sin(time * 3.7 + i * 0.3) * 0.2;
          const wave3 = Math.sin(time * 5.3 + i * 0.7) * 0.15;
          const noise = (Math.random() - 0.5) * 0.1;

          frequencies.push(
            Math.max(
              0.05,
              (bassBoost * 0.5 + wave1 + wave2 + wave3 + noise + 0.3) * 0.8,
            ),
          );
        } else if (variant === "heartbeat") {
          // Heartbeat pattern - rhythmic pulses
          const beatPhase = (time * 1.2) % (Math.PI * 2);
          const beat = Math.pow(Math.sin(beatPhase), 20) * 0.8;
          const afterBeat = Math.pow(Math.sin(beatPhase + 0.3), 10) * 0.4;
          const ambient = Math.sin(time * 0.5 + i * 0.2) * 0.1 + 0.15;

          const centeredness = 1 - Math.abs(normalizedIndex - 0.5) * 2;
          frequencies.push(
            Math.max(0.05, (beat + afterBeat) * centeredness + ambient),
          );
        } else {
          // Default - organic breathing waves
          const wave1 = Math.sin(time * 1.5 + i * 0.4) * 0.25;
          const wave2 = Math.sin(time * 2.3 + i * 0.6) * 0.2;
          const wave3 = Math.sin(time * 0.7 + i * 0.2) * 0.15;
          const wave4 = Math.sin(time * 4.1 + i * 0.8) * 0.1;

          // Center bars tend to be taller
          const centerBias =
            1 - Math.pow(Math.abs(normalizedIndex - 0.5) * 2, 2) * 0.3;

          frequencies.push(
            Math.max(0.08, (wave1 + wave2 + wave3 + wave4 + 0.35) * centerBias),
          );
        }
      }

      return frequencies;
    },
    [bars, variant],
  );

  // Canvas animation
  useEffect(() => {
    if (!isVisible || !playing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crispness
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const barWidth = (rect.width - (bars - 1) * 3) / bars;
    const startTime = Date.now();

    const draw = () => {
      const time = (Date.now() - startTime) / 1000;
      const frequencies = generateFrequencies(time);

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      frequencies.forEach((freq, i) => {
        const barHeight = freq * rect.height;
        const x = i * (barWidth + 3);
        const y = rect.height - barHeight;

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, rect.height, x, y);
        gradient.addColorStop(0, "rgba(212, 165, 165, 0.9)");
        gradient.addColorStop(0.5, "rgba(201, 169, 110, 0.8)");
        gradient.addColorStop(1, "rgba(212, 165, 165, 0.6)");

        // Draw glow
        ctx.shadowColor = "rgba(212, 165, 165, 0.5)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 0;

        // Draw bar with rounded top
        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = Math.min(barWidth / 2, 3);
        ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
      });

      // Draw reflection
      ctx.globalAlpha = 0.15;
      frequencies.forEach((freq, i) => {
        const barHeight = freq * rect.height * 0.3;
        const x = i * (barWidth + 3);
        const y = rect.height;

        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, "rgba(212, 165, 165, 0.4)");
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
      });
      ctx.globalAlpha = 1;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, playing, bars, generateFrequencies]);

  // Intersection Observer for performance
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height }}
      role="img"
      aria-label="Sound wave visualization representing healing frequencies"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />

      {/* Ambient glow underneath */}
      <div
        className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center bottom, rgba(212,165,165,0.15) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />
    </div>
  );
}
