"use client";

import { useEffect, useState, useCallback } from "react";

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
}

const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
];

const WELLNESS_EMOJIS = [
  "🧘‍♀️",
  "🕉️",
  "✨",
  "🙏",
  "🌸",
  "🦋",
  "🌙",
  "💫",
  "🔔",
  "💜",
  "🌿",
  "🕯️",
];

/**
 * Konami Easter Egg — Lotus Rain
 * ↑↑↓↓←→←→BA triggers a magical cascade of wellness emojis
 */
export default function KonamiEasterEgg() {
  const [inputSequence, setInputSequence] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

  const triggerLotusRain = useCallback(() => {
    setIsActive(true);

    // Create 50 floating emojis
    const newEmojis: FloatingEmoji[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      emoji:
        WELLNESS_EMOJIS[Math.floor(Math.random() * WELLNESS_EMOJIS.length)],
      x: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 4 + Math.random() * 4,
    }));

    setEmojis(newEmojis);

    // Console message
    console.log(
      "%c🕉️ NAMASTE! You found the secret! 🧘‍♀️",
      "font-size: 20px; color: #C9A96E; font-weight: bold;",
    );
    console.log(
      "%c✨ The universe smiles upon your curiosity ✨",
      "font-size: 14px; color: #D4A5A5; font-style: italic;",
    );

    // End animation after 8 seconds
    setTimeout(() => {
      setIsActive(false);
      setEmojis([]);
    }, 8000);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const newSequence = [...inputSequence, e.code].slice(-10);
      setInputSequence(newSequence);

      // Check if sequence matches Konami code
      if (
        newSequence.length === 10 &&
        newSequence.every((key, i) => key === KONAMI_CODE[i])
      ) {
        setInputSequence([]);
        triggerLotusRain();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputSequence, triggerLotusRain]);

  if (!isActive) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
      aria-hidden="true"
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-transparent" />

      {/* Falling emojis */}
      {emojis.map((emoji) => (
        <div
          key={emoji.id}
          className="absolute text-4xl"
          style={{
            left: `${emoji.x}%`,
            top: "-50px",
            animation: `fall ${emoji.duration}s ease-in ${emoji.delay}s forwards`,
          }}
        >
          {emoji.emoji}
        </div>
      ))}

      {/* Secret message */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
        style={{
          animation: "fadeInOut 4s ease-in-out forwards",
        }}
      >
        <p className="font-display text-4xl md:text-6xl text-gold mb-4">
          Namaste ✨
        </p>
        <p className="font-display text-xl text-rose-soft italic">
          The universe rewards the curious
        </p>
      </div>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(calc(100vh + 100px)) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          80% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
