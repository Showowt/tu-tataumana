"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function RootError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#FAF8F5" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <h1 style={{ fontSize: "24px", color: "#2C2C2C", marginBottom: "16px" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "14px", color: "#2C2C2C80", marginBottom: "24px" }}>
              Algo salio mal. Por favor intenta de nuevo.
            </p>
            <button
              onClick={reset}
              style={{
                fontSize: "12px",
                border: "1px solid #B87777",
                color: "#B87777",
                background: "transparent",
                padding: "12px 24px",
                cursor: "pointer",
              }}
            >
              Try again / Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
