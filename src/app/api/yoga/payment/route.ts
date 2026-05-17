/**
 * Yoga Booking Payment API
 * TU. by Tata Umana
 *
 * Creates Wompi checkout configs for yoga bookings.
 * Prices are validated server-side — never trusted from client.
 *
 * Supports two flows:
 *   1. NEW (BookingModal): { serviceName, customerName, ... } → checkout config
 *   2. LEGACY (PaymentCheckout): { amount, customerEmail, ... } → payment link
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  createPaymentLink,
  generateBookingReference,
  type WompiCurrency,
} from "@/lib/wompi";

// ──────────────────────────────────────────────────────────────────────────────
// Canonical service prices (COP) — server-side source of truth
// ──────────────────────────────────────────────────────────────────────────────

const PRIVATE_SERVICE_PRICES: Record<string, number> = {
  "Discovery Session": 85000,
  "Personalized Yoga": 190000,
  "Video Connection": 170000,
  "Quantum Surgery": 360000,
  "Superior Connection": 730000,
  "Energy Cleansing": 485000,
  "Sacred Ceremonies": 3500000,
  "Leadership Integration": 1220000,
  "TUISYOU Program": 7750000,
};

// Walk-in group class price
const GROUP_CLASS_PRICE_COP = 80000;

/**
 * Look up the canonical COP price for a service.
 * Checks: private services → events DB → default group class price.
 *
 * Input may include time suffix like "Sound Healing @ 5:30 PM"
 * or dash separator like "Mayo Mes Mamá — 4 Clases". Both are stripped.
 */
async function getServicePriceCop(serviceName: string): Promise<number> {
  // Strip time suffix and dash separators the BookingModal appends
  const baseName = serviceName
    .split(" @ ")[0]
    .split(" — ")[0]
    .trim();

  // 1. Check hardcoded private service prices (exact match on base name)
  if (PRIVATE_SERVICE_PRICES[baseName]) {
    return PRIVATE_SERVICE_PRICES[baseName];
  }
  // Also check the raw name in case it's an exact match
  if (PRIVATE_SERVICE_PRICES[serviceName]) {
    return PRIVATE_SERVICE_PRICES[serviceName];
  }

  // 2. Check tu_events for matching event/promo prices
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    try {
      const supabase = createClient(url, key);
      const { data } = await supabase
        .from("tu_events")
        .select("price_cop")
        .eq("is_active", true)
        .or(
          `title.ilike.%${baseName}%,title_es.ilike.%${baseName}%,booking_service.ilike.%${baseName}%`,
        )
        .gt("price_cop", 0)
        .limit(1)
        .maybeSingle();

      if (data?.price_cop) {
        console.log(`[Payment] Event price found for "${baseName}": $${data.price_cop} COP`);
        return data.price_cop;
      }
    } catch (err) {
      console.error("[Payment] Event price lookup failed for:", baseName, err);
    }
  }

  return GROUP_CLASS_PRICE_COP;
}

// ──────────────────────────────────────────────────────────────────────────────
// Rate limiting (in-memory)
// ──────────────────────────────────────────────────────────────────────────────

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
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

// ──────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ──────────────────────────────────────────────────────────────────────────────

// New format: BookingModal sends service name, server looks up price
const CheckoutRequestSchema = z.object({
  serviceName: z.string().min(1, "Service name required"),
  customerEmail: z
    .string()
    .email("Valid email required")
    .optional()
    .or(z.literal("")),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  bookingDate: z.string().optional(),
  bookingTime: z.string().optional(),
});

// Legacy format: PaymentCheckout sends explicit amount
const LegacyRequestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(["COP", "USD"]).default("COP"),
  reference: z.string().optional(),
  customerEmail: z.string().email("Valid email required"),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  classId: z.string().optional(),
  bookingId: z.string().optional(),
});

// ──────────────────────────────────────────────────────────────────────────────
// POST handler
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          error:
            "Demasiadas solicitudes. Too many requests. Please try again later.",
        },
        { status: 429 },
      );
    }

    const body = await request.json();

    // ── NEW FLOW: BookingModal sends serviceName ──────────────────────────
    const newResult = CheckoutRequestSchema.safeParse(body);

    if (newResult.success) {
      const data = newResult.data;
      const priceCop = await getServicePriceCop(data.serviceName);
      const reference = generateBookingReference();

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://www.tataumana.com";
      const redirectUrl = `${baseUrl}/payment/success?ref=${encodeURIComponent(reference)}`;

      const description = data.bookingDate
        ? `TU. ${data.serviceName} — ${data.bookingDate}${data.bookingTime ? ` ${data.bookingTime}` : ""}`
        : `TU. ${data.serviceName}`;

      // Create a fresh Wompi payment link (unique per booking, auto-expires)
      const paymentLink = await createPaymentLink({
        amount: priceCop * 100, // Wompi expects centavos
        currency: "COP",
        reference,
        customerEmail: data.customerEmail || "",
        customerName: data.customerName,
        redirectUrl,
        description,
        expirationMinutes: 30,
      });

      return NextResponse.json({
        success: true,
        reference,
        paymentUrl: paymentLink.payment_link_url,
        priceCop,
        description,
      });
    }

    // ── LEGACY FLOW: PaymentCheckout sends explicit amount ────────────────
    const legacyResult = LegacyRequestSchema.safeParse(body);

    if (!legacyResult.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos. Invalid request data.",
          details: legacyResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const legacyData = legacyResult.data;
    const reference = legacyData.reference || generateBookingReference();
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://www.tataumana.com";
    const redirectUrl = `${baseUrl}?payment=success&ref=${encodeURIComponent(reference)}`;

    const paymentLink = await createPaymentLink({
      amount: legacyData.amount,
      currency: legacyData.currency as WompiCurrency,
      reference,
      customerEmail: legacyData.customerEmail,
      customerName: legacyData.customerName,
      redirectUrl,
      description:
        legacyData.description || "TU. Wellness - Yoga Booking",
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
          ? "Sistema de pagos no configurado. Card payment not available. Please use Nequi, Bancolombia, or Zelle."
          : "Error al crear el pago. Failed to create payment. Please try again.",
        notConfigured: isConfigError,
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
