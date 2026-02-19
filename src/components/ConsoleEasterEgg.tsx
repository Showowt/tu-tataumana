"use client";

import { useEffect } from "react";

/**
 * Console Easter Egg — Developer Delights
 * Adds hidden console messages and a secret menu for developers
 * Inspired by luxury brand digital experiences
 */
export default function ConsoleEasterEgg() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;

    // ASCII Art Logo
    const asciiArt = `
%c
    ████████╗██╗   ██╗
    ╚══██╔══╝██║   ██║
       ██║   ██║   ██║   ✦
       ██║   ██║   ██║
       ██║   ╚██████╔╝   by Tata Umaña
       ╚═╝    ╚═════╝

    ✦ Wellness Curator ✦ Cartagena, Colombia ✦

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    console.log(
      asciiArt,
      "font-family: monospace; color: #B87777; font-size: 10px;",
    );

    console.log(
      "%c🧘 Come home to yourself.",
      "font-family: Georgia; font-size: 14px; color: #C9A96E; font-style: italic; padding: 8px 0;",
    );

    console.log(
      "%c✨ Featured in Vogue, Forbes, Caribbean Journal",
      "font-family: system-ui; font-size: 11px; color: #D4A5A5;",
    );

    console.log(
      "%c🏛️ Lead Instructor at Casa Carolina — Nominated Best Hotel Spa 2025",
      "font-family: system-ui; font-size: 11px; color: #D4A5A5;",
    );

    console.log(
      "\n%c💻 Built with intention by MachineMind Consulting",
      "font-family: system-ui; font-size: 11px; color: #888;",
    );

    console.log(
      "%c🔮 Type TU.explore() for hidden experiences...",
      "font-family: system-ui; font-size: 11px; color: #5E35B1;",
    );

    // Add secret global object
    const TU = {
      explore: () => {
        console.log(
          "\n%c═══════════════════════════════════",
          "color: #C9A96E",
        );
        console.log(
          "%c✦ SECRET MENU ✦",
          "color: #C9A96E; font-size: 14px; font-weight: bold",
        );
        console.log(
          "%c═══════════════════════════════════\n",
          "color: #C9A96E",
        );

        console.log(
          "%cTU.breathe()    → Guided breathing exercise",
          "color: #D4A5A5",
        );
        console.log(
          "%cTU.intention()  → Set a daily intention",
          "color: #D4A5A5",
        );
        console.log("%cTU.gratitude()  → Gratitude prompt", "color: #D4A5A5");
        console.log("%cTU.mantra()     → Receive a mantra", "color: #D4A5A5");
        console.log("%cTU.chakra()     → Chakra reading", "color: #D4A5A5");

        return "🌸 Choose your practice...";
      },

      breathe: () => {
        console.log(
          "\n%c🌬️ BREATHE WITH ME",
          "color: #0288D1; font-size: 14px",
        );
        console.log("%c━━━━━━━━━━━━━━━━━━", "color: #0288D1");

        const breathe = async () => {
          console.log(
            "%c↑ INHALE... (4 seconds)",
            "color: #43A047; font-size: 12px",
          );
          await new Promise((r) => setTimeout(r, 4000));

          console.log(
            "%c⏸ HOLD... (4 seconds)",
            "color: #FBC02D; font-size: 12px",
          );
          await new Promise((r) => setTimeout(r, 4000));

          console.log(
            "%c↓ EXHALE... (6 seconds)",
            "color: #B87777; font-size: 12px",
          );
          await new Promise((r) => setTimeout(r, 6000));

          console.log(
            "%c\n✨ One breath completed. Type TU.breathe() for another.\n",
            "color: #C9A96E",
          );
        };

        breathe();
        return "Follow the breath...";
      },

      intention: () => {
        const intentions = [
          "Today I choose peace over perfection",
          "I am exactly where I need to be",
          "My breath is my anchor to the present",
          "I release what no longer serves me",
          "I am worthy of rest and restoration",
          "I trust the timing of my life",
          "I embrace stillness as strength",
          "My energy flows where my attention goes",
        ];
        const chosen =
          intentions[Math.floor(Math.random() * intentions.length)];
        console.log(
          `\n%c🌟 YOUR INTENTION: "${chosen}"\n`,
          "color: #C9A96E; font-size: 14px; font-style: italic",
        );
        return chosen;
      },

      gratitude: () => {
        console.log(
          "\n%c🙏 GRATITUDE PRACTICE",
          "color: #43A047; font-size: 14px",
        );
        console.log("%c━━━━━━━━━━━━━━━━━━━━━", "color: #43A047");
        console.log("%cTake a moment to reflect:", "color: #D4A5A5");
        console.log("%c  → What made you smile today?", "color: #D4A5A5");
        console.log("%c  → Who are you grateful for?", "color: #D4A5A5");
        console.log(
          "%c  → What simple pleasure did you enjoy?\n",
          "color: #D4A5A5",
        );
        return "Gratitude transforms everything ✨";
      },

      mantra: () => {
        const mantras = [
          { sanskrit: "Om Shanti", meaning: "Peace in body, mind, and spirit" },
          {
            sanskrit: "So Hum",
            meaning: "I am that (universal consciousness)",
          },
          {
            sanskrit: "Om Namah Shivaya",
            meaning: "I honor the divine within",
          },
          {
            sanskrit: "Lokah Samastah Sukhino Bhavantu",
            meaning: "May all beings be happy and free",
          },
          { sanskrit: "Sat Nam", meaning: "Truth is my identity" },
        ];
        const chosen = mantras[Math.floor(Math.random() * mantras.length)];
        console.log("\n%c🕉️ YOUR MANTRA", "color: #8E24AA; font-size: 14px");
        console.log(
          `%c"${chosen.sanskrit}"`,
          "color: #C9A96E; font-size: 16px; font-style: italic",
        );
        console.log(`%c${chosen.meaning}\n`, "color: #D4A5A5; font-size: 12px");
        return chosen.sanskrit;
      },

      chakra: () => {
        const chakras = [
          {
            name: "Root (Muladhara)",
            color: "#C62828",
            message: "Ground yourself. You are safe and supported.",
          },
          {
            name: "Sacral (Svadhisthana)",
            color: "#EF6C00",
            message: "Embrace your creativity and emotional flow.",
          },
          {
            name: "Solar Plexus (Manipura)",
            color: "#FBC02D",
            message: "Step into your power with confidence.",
          },
          {
            name: "Heart (Anahata)",
            color: "#43A047",
            message: "Lead with love and compassion.",
          },
          {
            name: "Throat (Vishuddha)",
            color: "#0288D1",
            message: "Speak your truth with clarity.",
          },
          {
            name: "Third Eye (Ajna)",
            color: "#5E35B1",
            message: "Trust your intuition and inner wisdom.",
          },
          {
            name: "Crown (Sahasrara)",
            color: "#8E24AA",
            message: "Connect with universal consciousness.",
          },
        ];
        const chosen = chakras[Math.floor(Math.random() * chakras.length)];
        console.log(
          "\n%c🔮 CHAKRA READING",
          "font-size: 14px; color: " + chosen.color,
        );
        console.log(
          `%c${chosen.name}`,
          "font-size: 16px; font-weight: bold; color: " + chosen.color,
        );
        console.log(
          `%c"${chosen.message}"\n`,
          "font-size: 12px; font-style: italic; color: #D4A5A5",
        );
        return chosen.name;
      },
    };

    // Attach to window
    (window as unknown as Record<string, typeof TU>).TU = TU;
  }, []);

  return null;
}
