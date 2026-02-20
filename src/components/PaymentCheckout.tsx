"use client";

import React, { useState, useCallback } from "react";
import type { WompiCurrency, WompiCheckoutConfig } from "@/lib/wompi";

interface PaymentCheckoutProps {
  /** Amount in smallest currency unit (cents for USD, pesos for COP) */
  amount: number;
  /** Currency code */
  currency: WompiCurrency;
  /** Unique booking reference */
  bookingRef: string;
  /** Customer email */
  customerEmail: string;
  /** Customer full name */
  customerName: string;
  /** Service/booking description */
  description?: string;
  /** Called when payment is successful */
  onSuccess?: (transactionId: string) => void;
  /** Called when payment fails or is cancelled */
  onError?: (error: string) => void;
  /** Called when checkout is cancelled */
  onCancel?: () => void;
}

type CheckoutState = "idle" | "loading" | "redirecting" | "error";

export default function PaymentCheckout({
  amount,
  currency,
  bookingRef,
  customerEmail,
  customerName,
  description,
  onSuccess,
  onError,
  onCancel,
}: PaymentCheckoutProps) {
  const [state, setState] = useState<CheckoutState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Format amount for display
  const displayAmount =
    currency === "COP"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount)
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
        }).format(amount / 100);

  const handlePayment = useCallback(async () => {
    setState("loading");
    setErrorMessage("");

    try {
      // Call API to create payment link
      const response = await fetch("/api/yoga/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency,
          reference: bookingRef,
          customerEmail,
          customerName,
          description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create payment");
      }

      const data = await response.json();

      if (data.paymentUrl) {
        setState("redirecting");
        // Redirect to Wompi checkout
        window.location.href = data.paymentUrl;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment failed";
      setErrorMessage(message);
      setState("error");
      onError?.(message);
    }
  }, [
    amount,
    currency,
    bookingRef,
    customerEmail,
    customerName,
    description,
    onError,
  ]);

  const handleCancel = useCallback(() => {
    setState("idle");
    setErrorMessage("");
    onCancel?.();
  }, [onCancel]);

  return (
    <div className="bg-cream border border-charcoal/10 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-2 bg-gold rounded-full" />
        <h3 className="font-body text-[10px] tracking-[0.3em] text-charcoal/60 uppercase">
          Secure Payment
        </h3>
      </div>

      {/* Order Summary */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-charcoal/10">
          <span className="font-display text-charcoal/70">
            Booking Reference
          </span>
          <span className="font-body text-sm tracking-wider text-charcoal">
            {bookingRef}
          </span>
        </div>

        {description && (
          <div className="mb-4 pb-4 border-b border-charcoal/10">
            <span className="font-display text-charcoal/70 block mb-1">
              Service
            </span>
            <span className="font-display text-charcoal">{description}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="font-display text-lg text-charcoal">Total</span>
          <span className="font-display text-2xl text-rose-deep">
            {displayAmount}
          </span>
        </div>
      </div>

      {/* Payment Methods Info */}
      <div className="mb-8 p-4 bg-charcoal/5">
        <p className="font-body text-[10px] tracking-[0.15em] text-charcoal/50 uppercase mb-3">
          Accepted Payment Methods
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {/* Payment method icons - simplified for now */}
          <div className="flex items-center gap-2">
            <svg
              className="w-8 h-6 text-charcoal/60"
              viewBox="0 0 32 24"
              fill="currentColor"
            >
              <rect
                x="1"
                y="1"
                width="30"
                height="22"
                rx="3"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
              <rect x="1" y="7" width="30" height="4" fill="currentColor" />
              <text x="6" y="18" fontSize="6" fill="currentColor">
                VISA
              </text>
            </svg>
            <svg
              className="w-8 h-6 text-charcoal/60"
              viewBox="0 0 32 24"
              fill="currentColor"
            >
              <rect
                x="1"
                y="1"
                width="30"
                height="22"
                rx="3"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.6" />
              <circle cx="20" cy="12" r="6" fill="currentColor" opacity="0.6" />
            </svg>
          </div>
          <span className="font-body text-xs text-charcoal/40">
            Cards, PSE, Nequi, Bancolombia
          </span>
        </div>
      </div>

      {/* Error Message */}
      {state === "error" && errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-body text-sm text-red-700">{errorMessage}</p>
              <button
                onClick={() => setState("idle")}
                className="font-body text-xs text-red-600 underline mt-1 hover:text-red-800"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Button */}
      <button
        onClick={handlePayment}
        disabled={state === "loading" || state === "redirecting"}
        className="w-full font-body text-[11px] tracking-[0.15em] bg-rose-deep hover:bg-rose-soft text-cream py-4 min-h-[56px] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {state === "loading" && (
          <>
            <svg
              className="w-5 h-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="40"
                strokeDashoffset="10"
              />
            </svg>
            <span>PROCESSING...</span>
          </>
        )}
        {state === "redirecting" && (
          <>
            <svg
              className="w-5 h-5 animate-pulse"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
            <span>REDIRECTING TO PAYMENT...</span>
          </>
        )}
        {(state === "idle" || state === "error") && (
          <>
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <span>PAY {displayAmount}</span>
          </>
        )}
      </button>

      {/* Cancel Option */}
      {onCancel && state === "idle" && (
        <button
          onClick={handleCancel}
          className="w-full mt-4 font-body text-[10px] tracking-[0.1em] text-charcoal/40 hover:text-charcoal transition-colors py-2"
        >
          Cancel and go back
        </button>
      )}

      {/* Security Badge */}
      <div className="mt-8 pt-6 border-t border-charcoal/10 flex items-center justify-center gap-2">
        <svg
          className="w-4 h-4 text-gold"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
        </svg>
        <span className="font-body text-[9px] tracking-[0.1em] text-charcoal/40">
          SECURED BY WOMPI
        </span>
      </div>

      {/* Legal Text */}
      <p className="mt-4 font-body text-[9px] text-charcoal/30 text-center leading-relaxed">
        By proceeding, you agree to our terms of service and privacy policy.
        Payment processed securely by Wompi.
      </p>
    </div>
  );
}
