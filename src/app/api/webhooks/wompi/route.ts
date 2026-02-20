/**
 * Wompi Payment Webhook Handler
 * TU. by Tata Umana
 *
 * Handles payment confirmation events from Wompi
 * Must return 200 OK quickly to prevent retries
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyWompiSignature,
  type WompiWebhookEvent,
  type WompiPaymentStatus,
} from "@/lib/wompi";

// Wompi webhook event types
type WompiEventType =
  | "transaction.updated"
  | "nequi_token.updated"
  | "payment_link.updated";

interface WebhookResponse {
  success: boolean;
  message?: string;
}

/**
 * Process approved payment
 * Update booking status, send confirmation emails, etc.
 */
async function handleApprovedPayment(
  transaction: WompiWebhookEvent["data"]["transaction"],
): Promise<void> {
  console.log("Processing approved payment:", {
    id: transaction.id,
    reference: transaction.reference,
    amount: transaction.amount_in_cents,
    email: transaction.customer_email,
  });

  // In production with Supabase:
  // 1. Update booking payment status
  // const { error: updateError } = await supabase
  //   .from('yoga_bookings')
  //   .update({
  //     payment_status: 'PAID',
  //     payment_id: transaction.id,
  //     payment_method: transaction.payment_method_type,
  //     paid_at: new Date().toISOString(),
  //     updated_at: new Date().toISOString(),
  //   })
  //   .eq('payment_reference', transaction.reference);
  //
  // if (updateError) {
  //   console.error('Failed to update booking:', updateError);
  //   throw new Error('Database update failed');
  // }

  // 2. Record the transaction
  // await supabase
  //   .from('payment_transactions')
  //   .insert({
  //     wompi_id: transaction.id,
  //     reference: transaction.reference,
  //     amount_cents: transaction.amount_in_cents,
  //     currency: transaction.currency,
  //     status: transaction.status,
  //     payment_method: transaction.payment_method_type,
  //     customer_email: transaction.customer_email,
  //     customer_name: transaction.customer_data?.full_name,
  //     created_at: transaction.created_at,
  //     finalized_at: transaction.finalized_at,
  //   });

  // 3. Send confirmation email via Resend/SendGrid
  // await sendEmail({
  //   to: transaction.customer_email,
  //   subject: 'Payment Confirmed - TU. Wellness',
  //   template: 'payment-confirmation',
  //   data: {
  //     reference: transaction.reference,
  //     amount: formatWompiAmount(transaction.amount_in_cents, transaction.currency),
  //     customerName: transaction.customer_data?.full_name,
  //   },
  // });

  // 4. Send WhatsApp notification (optional)
  // await sendWhatsAppMessage({
  //   to: transaction.customer_data?.phone_number,
  //   template: 'booking_confirmed',
  //   data: { reference: transaction.reference },
  // });
}

/**
 * Process declined/failed payment
 */
async function handleFailedPayment(
  transaction: WompiWebhookEvent["data"]["transaction"],
): Promise<void> {
  console.log("Processing failed payment:", {
    id: transaction.id,
    reference: transaction.reference,
    status: transaction.status,
    message: transaction.status_message,
  });

  // Update payment intent status
  // await supabase
  //   .from('payment_intents')
  //   .update({
  //     status: transaction.status,
  //     error_message: transaction.status_message,
  //     updated_at: new Date().toISOString(),
  //   })
  //   .eq('reference', transaction.reference);

  // Optionally notify customer about failed payment
  // await sendEmail({
  //   to: transaction.customer_email,
  //   subject: 'Payment Issue - TU. Wellness',
  //   template: 'payment-failed',
  //   data: {
  //     reference: transaction.reference,
  //     errorMessage: transaction.status_message,
  //   },
  // });
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<WebhookResponse>> {
  try {
    // Parse webhook payload
    const payload: WompiWebhookEvent = await request.json();

    console.log("Received Wompi webhook:", {
      event: payload.event,
      environment: payload.environment,
      timestamp: payload.timestamp,
    });

    // Verify webhook signature
    const isValidSignature = verifyWompiSignature(payload);

    if (!isValidSignature) {
      console.error("Invalid Wompi webhook signature");
      // Still return 200 to prevent retries, but log for monitoring
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 200 },
      );
    }

    // Handle different event types
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
            // Payment still processing, no action needed
            console.log("Payment pending:", transaction.reference);
            break;

          default:
            console.log("Unknown transaction status:", status);
        }
        break;
      }

      case "payment_link.updated":
        // Handle payment link status changes if needed
        console.log("Payment link updated:", payload.data);
        break;

      case "nequi_token.updated":
        // Handle Nequi token updates if needed
        console.log("Nequi token updated:", payload.data);
        break;

      default:
        console.log("Unknown event type:", eventType);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);

    // Return 200 even on error to prevent Wompi from retrying
    // Log the error for investigation
    return NextResponse.json(
      { success: false, message: "Processing error" },
      { status: 200 },
    );
  }
}

// Wompi may send GET requests for webhook verification
export async function GET() {
  return NextResponse.json(
    { status: "Webhook endpoint active" },
    { status: 200 },
  );
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Wompi-Signature",
    },
  });
}
