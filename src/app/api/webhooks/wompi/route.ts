/**
 * Wompi Payment Webhook Handler
 * TU. by Tata Umana
 *
 * CRITICAL: This endpoint receives payment confirmations from Wompi.
 * Tata MUST be notified on every payment — approved or failed.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyWompiSignature,
  WOMPI_EVENTS_SECRET,
  type WompiWebhookEvent,
  type WompiPaymentStatus,
} from "@/lib/wompi";
import { notifyPaymentReceived } from "@/lib/telegram";

type WompiEventType =
  | "transaction.updated"
  | "nequi_token.updated"
  | "payment_link.updated";

interface WebhookResponse {
  success: boolean;
  message?: string;
}

async function handlePayment(
  transaction: WompiWebhookEvent["data"]["transaction"],
): Promise<void> {
  console.log("[webhook] Processing payment:", {
    id: transaction.id,
    reference: transaction.reference,
    amount: transaction.amount_in_cents,
    status: transaction.status,
    email: transaction.customer_email,
    name: transaction.customer_data?.full_name,
    method: transaction.payment_method_type,
  });

  // ALWAYS notify Tata — this is the most important thing
  try {
    await notifyPaymentReceived({
      reference: transaction.reference,
      amount: transaction.amount_in_cents,
      currency: transaction.currency,
      customerEmail: transaction.customer_email,
      customerName: transaction.customer_data?.full_name,
      status: transaction.status,
    });
    console.log("[webhook] Telegram notification sent for", transaction.status);
  } catch (e) {
    console.error("[webhook] CRITICAL: Telegram notification FAILED:", e);
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<WebhookResponse>> {
  try {
    const payload: WompiWebhookEvent = await request.json();

    console.log("[webhook] Received event:", {
      event: payload.event,
      environment: payload.environment,
      timestamp: payload.timestamp,
    });

    // Verify webhook signature if secret is configured
    if (WOMPI_EVENTS_SECRET) {
      const isValidSignature = verifyWompiSignature(payload);
      if (!isValidSignature) {
        console.error("[webhook] Invalid signature — but still processing to notify Tata");
        // Don't reject — still process and notify, but log the signature failure
      }
    } else {
      console.warn("[webhook] WOMPI_EVENTS_SECRET not set — processing without signature verification");
    }

    const eventType = payload.event as WompiEventType;

    switch (eventType) {
      case "transaction.updated": {
        const transaction = payload.data.transaction;
        // Notify for ALL statuses — Tata needs to know about everything
        await handlePayment(transaction);
        break;
      }

      case "payment_link.updated":
        console.log("[webhook] Payment link updated:", JSON.stringify(payload.data));
        break;

      case "nequi_token.updated":
        console.log("[webhook] Nequi token updated");
        break;

      default:
        console.log("[webhook] Unknown event type:", eventType);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[webhook] Processing error:", error);
    // Still return 200 so Wompi doesn't retry
    return NextResponse.json(
      { success: false, message: "Processing error" },
      { status: 200 },
    );
  }
}

// Return 405 for GET — Wompi only uses POST
export async function GET() {
  return new NextResponse(null, { status: 405 });
}
