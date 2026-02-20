import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 32,
  height: 32,
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
      {/* Simplified TU Monogram for small size */}
      <svg width="26" height="26" viewBox="0 0 240 240" fill="none">
        {/* Outer U Shape */}
        <path
          d="M 50 35 L 50 145 C 50 195 80 225 120 225 C 160 225 190 195 190 145 L 190 35"
          stroke="#D4A5A5"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Top bar */}
        <path
          d="M 50 35 L 190 35"
          stroke="#D4A5A5"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
        {/* T Vertical Stem */}
        <path
          d="M 120 35 L 120 120"
          stroke="#D4A5A5"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>,
    {
      ...size,
    },
  );
}
