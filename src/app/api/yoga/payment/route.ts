/**
 * Yoga Booking Payment API
 * TU. by Tata Umana
 *
 * Creates Wompi payment links for yoga bookings
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createPaymentLink,
  generateBookingReference,
  type WompiCurrency,
} from "@/lib/wompi";

// Request validation schema
const PaymentRequestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(["COP", "USD"]).default("COP"),
  reference: z.string().optional(),
  customerEmail: z.string().email("Valid email required"),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  // Optional: booking ID to verify it exists and isn't already paid
  bookingId: z.string().optional(),
});

type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

// Rate limiting (simple in-memory, use Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

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
    // Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = PaymentRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data: PaymentRequest = validationResult.data;

    // Generate reference if not provided
    const reference = data.reference || generateBookingReference();

    // In production, verify booking exists and isn't already paid
    // Example Supabase query:
    // if (data.bookingId) {
    //   const { data: booking, error } = await supabase
    //     .from('yoga_bookings')
    //     .select('id, status, payment_status, amount')
    //     .eq('id', data.bookingId)
    //     .single();
    //
    //   if (error || !booking) {
    //     return NextResponse.json(
    //       { error: "Booking not found" },
    //       { status: 404 }
    //     );
    //   }
    //
    //   if (booking.payment_status === 'PAID') {
    //     return NextResponse.json(
    //       { error: "Booking is already paid" },
    //       { status: 400 }
    //     );
    //   }
    //
    //   // Verify amount matches
    //   if (booking.amount !== data.amount) {
    //     return NextResponse.json(
    //       { error: "Amount mismatch" },
    //       { status: 400 }
    //     );
    //   }
    // }

    // Build redirect URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://tu-tataumana.vercel.app";
    const redirectUrl = `${baseUrl}/booking/confirmation?ref=${encodeURIComponent(reference)}`;

    // Create Wompi payment link
    const paymentLink = await createPaymentLink({
      amount: data.amount,
      currency: data.currency as WompiCurrency,
      reference,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      redirectUrl,
      description: data.description || "TU. Wellness - Yoga Booking",
      expirationMinutes: 30,
    });

    // In production, save payment intent to database
    // await supabase
    //   .from('payment_intents')
    //   .insert({
    //     reference,
    //     booking_id: data.bookingId,
    //     amount: data.amount,
    //     currency: data.currency,
    //     status: 'PENDING',
    //     wompi_link_id: paymentLink.id,
    //     customer_email: data.customerEmail,
    //     customer_name: data.customerName,
    //     created_at: new Date().toISOString(),
    //   });

    return NextResponse.json({
      success: true,
      reference,
      paymentUrl: paymentLink.payment_link_url,
      expiresAt: paymentLink.expires_at,
    });
  } catch (error) {
    console.error("Payment API error:", error);

    // Don't expose internal errors to client
    const message =
      error instanceof Error ? error.message : "Payment creation failed";
    const isConfigError = message.includes("not configured");

    return NextResponse.json(
      {
        error: isConfigError
          ? "Payment system is not configured. Please contact support."
          : "Failed to create payment. Please try again.",
      },
      { status: isConfigError ? 503 : 500 },
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
