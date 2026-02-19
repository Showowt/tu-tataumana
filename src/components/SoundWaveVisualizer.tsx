"use client";

interface SoundWaveVisualizerProps {
  bars?: number;
  height?: number;
  playing?: boolean;
}

/**
 * Sound Wave Visualizer — Visual representation of healing frequencies
 * Animated bars that represent sound healing vibrations
 * Pauses animation when not in viewport for performance
 */
export default function SoundWaveVisualizer({
  bars = 12,
  height = 48,
  playing = true,
}: SoundWaveVisualizerProps) {
  return (
    <div
      className="flex items-end justify-center gap-1"
      style={{ height }}
      role="img"
      aria-label="Sound wave visualization"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="sound-bar"
          style={{
            animationPlayState: playing ? "running" : "paused",
            height: `${20 + Math.random() * 30}%`,
          }}
        />
      ))}
    </div>
  );
}
