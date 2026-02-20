import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#2C2C2C",
      }}
    >
      {/* TU Monogram */}
      <svg width="140" height="140" viewBox="0 0 240 240" fill="none">
        {/* Outer U Shape - the shield/chalice */}
        <path
          d="M 50 35 L 50 145 C 50 195 80 225 120 225 C 160 225 190 195 190 145 L 190 35"
          stroke="#D4A5A5"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Top bar connecting the U */}
        <path
          d="M 50 35 L 190 35"
          stroke="#D4A5A5"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        {/* Inner U Shape */}
        <path
          d="M 70 55 L 70 140 C 70 180 92 205 120 205 C 148 205 170 180 170 140 L 170 55"
          stroke="#D4A5A5"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.6"
        />
        {/* T Vertical Stem */}
        <path
          d="M 120 35 L 120 125"
          stroke="#D4A5A5"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        {/* T Crossbar */}
        <path
          d="M 80 55 L 160 55"
          stroke="#D4A5A5"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
      </svg>
    </div>,
    {
      ...size,
    },
  );
}
