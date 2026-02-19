"use client";

import { useEffect, useState } from "react";

interface ChakraPoint {
  id: string;
  name: string;
  nameEs: string;
  color: string;
  section: string;
}

const chakras: ChakraPoint[] = [
  {
    id: "crown",
    name: "Crown",
    nameEs: "Corona",
    color: "#8E24AA",
    section: "hero",
  },
  {
    id: "third",
    name: "Third Eye",
    nameEs: "Tercer Ojo",
    color: "#5E35B1",
    section: "about",
  },
  {
    id: "throat",
    name: "Throat",
    nameEs: "Garganta",
    color: "#0288D1",
    section: "services",
  },
  {
    id: "heart",
    name: "Heart",
    nameEs: "Corazón",
    color: "#43A047",
    section: "retreats",
  },
  {
    id: "solar",
    name: "Solar Plexus",
    nameEs: "Plexo Solar",
    color: "#FBC02D",
    section: "content",
  },
  {
    id: "sacral",
    name: "Sacral",
    nameEs: "Sacro",
    color: "#EF6C00",
    section: "testimonials",
  },
  {
    id: "root",
    name: "Root",
    nameEs: "Raíz",
    color: "#C62828",
    section: "book",
  },
];

/**
 * Chakra Journey Navigation — Energy Center Navigation
 * Seven chakra points that navigate to different sections
 * Visual representation of the wellness journey from crown to root
 */
export default function ChakraNavigation() {
  const [activeSection, setActiveSection] = useState("hero");
  const [hoveredChakra, setHoveredChakra] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const sections = chakras.map((c) => c.section);
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className="chakra-nav hidden lg:flex"
      aria-label="Chakra journey navigation"
    >
      {chakras.map((chakra) => (
        <div key={chakra.id} className="relative group">
          <button
            onClick={() => scrollToSection(chakra.section)}
            onMouseEnter={() => setHoveredChakra(chakra.id)}
            onMouseLeave={() => setHoveredChakra(null)}
            className={`chakra-dot ${activeSection === chakra.section ? "active" : ""}`}
            style={{
              backgroundColor: chakra.color,
              boxShadow:
                activeSection === chakra.section || hoveredChakra === chakra.id
                  ? `0 0 16px ${chakra.color}60`
                  : "none",
            }}
            aria-label={`Navigate to ${chakra.name} section`}
            aria-current={activeSection === chakra.section ? "true" : undefined}
          />

          {/* Tooltip */}
          <div
            className={`
              absolute right-8 top-1/2 -translate-y-1/2
              whitespace-nowrap px-3 py-1.5
              bg-charcoal/95 text-cream text-xs font-body tracking-wide
              transition-all duration-300 pointer-events-none
              ${hoveredChakra === chakra.id ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"}
            `}
            style={{ borderLeft: `2px solid ${chakra.color}` }}
          >
            <span className="block">{chakra.name}</span>
            <span className="block text-rose-soft text-[10px]">
              {chakra.nameEs}
            </span>
          </div>
        </div>
      ))}
    </nav>
  );
}
