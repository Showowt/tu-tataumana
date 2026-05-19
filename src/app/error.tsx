"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
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
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="font-display text-3xl text-charcoal mb-4">
          Something went wrong
        </h1>
        <p className="font-body text-sm text-charcoal/60 mb-6">
          Algo sali&oacute; mal. Por favor intenta de nuevo.
        </p>
        <button
          onClick={reset}
          className="font-body text-sm border border-rose-soft text-rose-soft px-6 py-3 min-h-[44px] hover:bg-rose-soft hover:text-cream transition-colors"
        >
          Try again / Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
