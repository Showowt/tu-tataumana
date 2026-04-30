/**
 * Wompi Payment Webhook Handler
 * TU. by Tata Umana
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyWompiSignature,
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

async function handleApprovedPayment(
  transaction: WompiWebhookEvent["data"]["transaction"],
): Promise<void> {
  console.log("[webhook] Approved payment:", {
    id: transaction.id,
    reference: transaction.reference,
    amount: transaction.amount_in_cents,
  });

  // Notify Tata via Telegram
  notifyPaymentReceived({
    reference: transaction.reference,
    amount: transaction.amount_in_cents,
    currency: transaction.currency,
    customerEmail: transaction.customer_email,
    customerName: transaction.customer_data?.full_name,
    status: "APPROVED",
  }).catch(() => {});
}

async function handleFailedPayment(
  transaction: WompiWebhookEvent["data"]["transaction"],
): Promise<void> {
  console.log("[webhook] Failed payment:", {
    id: transaction.id,
    reference: transaction.reference,
    status: transaction.status,
    message: transaction.status_message,
  });

  // Notify Tata via Telegram
  notifyPaymentReceived({
    reference: transaction.reference,
    amount: transaction.amount_in_cents,
    currency: transaction.currency,
    customerEmail: transaction.customer_email,
    customerName: transaction.customer_data?.full_name,
    status: transaction.status,
  }).catch(() => {});
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<WebhookResponse>> {
  try {
    const payload: WompiWebhookEvent = await request.json();

    console.log("[webhook] Received:", {
      event: payload.event,
      environment: payload.environment,
    });

    // Verify webhook signature
    const isValidSignature = verifyWompiSignature(payload);

    if (!isValidSignature) {
      console.error("[webhook] Invalid signature — rejecting");
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 400 },
      );
    }

    const eventType = payload.event as WompiEventType;

    switch (eventType) {
      case "transaction.updated": {
        const transaction = payload.data.transaction;
        const status = transaction.status as WompiPaymentStatus;

        switch (status) {
          case "APPROVED":
            await handleApprovedPayment(transaction);
            break;

          case "DECLINED":
          case "VOIDED":
          case "ERROR":
            await handleFailedPayment(transaction);
            break;

          case "PENDING":
            console.log("[webhook] Payment pending:", transaction.reference);
            break;

          default:
            console.log("[webhook] Unknown status:", status);
        }
        break;
      }

      case "payment_link.updated":
        console.log("[webhook] Payment link updated");
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
