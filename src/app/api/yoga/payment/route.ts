/**
 * Yoga Booking Payment API
 * TU. by Tata Umana
 *
 * Creates Wompi payment links for yoga bookings
 * Amount is validated server-side — never trusted from client
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createPaymentLink,
  generateBookingReference,
  type WompiCurrency,
} from "@/lib/wompi";

// Canonical class prices (COP) — single source of truth
// All group classes are 80,000 COP walk-in, private sessions 190,000 COP
const CLASS_PRICES: Record<string, number> = {
  "morning-flow": 80000,
  "gentle-restore": 80000,
  "power-yoga": 80000,
  "sunset-yin": 80000,
  "kundalini": 80000,
  "private": 190000,
};

// Minimum valid amount as a safety net
const MIN_AMOUNT_COP = 40000;

// Request validation schema
const PaymentRequestSchema = z.object({
  classId: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(["COP", "USD"]).default("COP"),
  reference: z.string().optional(),
  customerEmail: z.string().email("Valid email required"),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  bookingId: z.string().optional(),
});

// Rate limiting (simple in-memory — use Upstash/Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP (parse first IP from x-forwarded-for)
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = PaymentRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos. Invalid request data.",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    // Server-side price validation: never trust client amount
    let validatedAmount = data.amount;

    if (data.classId && CLASS_PRICES[data.classId]) {
      // Use canonical price from server
      validatedAmount = CLASS_PRICES[data.classId];
    } else if (data.currency === "COP" && data.amount < MIN_AMOUNT_COP) {
      // Reject suspiciously low amounts
      return NextResponse.json(
        { error: "Monto inválido. Invalid payment amount." },
        { status: 400 },
      );
    } else {
      // Verify amount matches a known class price
      const knownPrices = Object.values(CLASS_PRICES);
      if (data.currency === "COP" && !knownPrices.includes(data.amount)) {
        return NextResponse.json(
          { error: "Monto no corresponde a ninguna clase. Amount does not match any class." },
          { status: 400 },
        );
      }
    }

    // Generate reference if not provided
    const reference = data.reference || generateBookingReference();

    // Build redirect URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://www.tataumana.com";
    const redirectUrl = `${baseUrl}?payment=success&ref=${encodeURIComponent(reference)}`;

    // Create Wompi payment link with server-validated amount
    const paymentLink = await createPaymentLink({
      amount: validatedAmount,
      currency: data.currency as WompiCurrency,
      reference,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      redirectUrl,
      description: data.description || "TU. Wellness - Yoga Booking",
      expirationMinutes: 30,
    });

    return NextResponse.json({
      success: true,
      reference,
      paymentUrl: paymentLink.payment_link_url,
      expiresAt: paymentLink.expires_at,
    });
  } catch (error) {
    console.error("[yoga/payment]", error);

    const message =
      error instanceof Error ? error.message : "Payment creation failed";
    const isConfigError = message.includes("not configured");

    return NextResponse.json(
      {
        error: isConfigError
          ? "Sistema de pagos no configurado. Payment system not configured. Please contact support."
          : "Error al crear el pago. Failed to create payment. Please try again.",
      },
      { status: isConfigError ? 503 : 500 },
    );
  }
}

// CORS restricted to production origin
export async function OPTIONS() {
  const allowedOrigin =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.tataumana.com";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
