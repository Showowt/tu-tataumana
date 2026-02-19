import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "TU. by Tata Umaña — Wellness Curator · Cartagena";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#2C2C2C",
        position: "relative",
      }}
    >
      {/* Subtle radial gradient background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(ellipse at center, rgba(184,119,119,0.15) 0%, transparent 60%)",
        }}
      />

      {/* Corner decorations */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          width: 60,
          height: 60,
          borderTop: "2px solid rgba(201,169,110,0.3)",
          borderLeft: "2px solid rgba(201,169,110,0.3)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 40,
          width: 60,
          height: 60,
          borderBottom: "2px solid rgba(201,169,110,0.3)",
          borderRight: "2px solid rgba(201,169,110,0.3)",
        }}
      />

      {/* TU Logo Mark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 40,
        }}
      >
        <svg
          width="200"
          height="200"
          viewBox="0 0 240 240"
          fill="none"
          style={{ filter: "drop-shadow(0 0 40px rgba(212,165,165,0.3))" }}
        >
          <path
            d="M 60 45 L 60 140 C 60 185 85 210 120 210 C 155 210 180 185 180 140 L 180 45"
            stroke="url(#grad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M 60 45 L 180 45"
            stroke="url(#grad)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 75 60 L 75 135 C 75 172 94 195 120 195 C 146 195 165 172 165 135 L 165 60"
            stroke="#D4A5A5"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M 120 45 L 120 130"
            stroke="url(#grad)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 85 60 L 155 60"
            stroke="#D4A5A5"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A5A5" />
              <stop offset="100%" stopColor="#C9A96E" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Name */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: "0.4em",
            color: "#D4A5A5",
            fontFamily: "sans-serif",
          }}
        >
          TATA UMAÑA
        </span>

        <div
          style={{
            width: 80,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, #C9A96E, transparent)",
            marginTop: 8,
            marginBottom: 8,
          }}
        />

        <span
          style={{
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: "0.3em",
            color: "#C9A96E",
            fontFamily: "sans-serif",
          }}
        >
          WELLNESS CURATOR
        </span>
      </div>

      {/* Location tag */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 1,
            background: "rgba(212,165,165,0.3)",
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: "0.25em",
            color: "rgba(250,248,245,0.5)",
            fontFamily: "sans-serif",
          }}
        >
          CARTAGENA, COLOMBIA
        </span>
        <div
          style={{
            width: 40,
            height: 1,
            background: "rgba(212,165,165,0.3)",
          }}
        />
      </div>
    </div>,
    {
      ...size,
    },
  );
}
