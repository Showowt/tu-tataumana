/**
 * Square Payment Integration
 * TU. by Tata Umana
 *
 * Uses Square Checkout API to create payment links.
 * Flow: Create link → redirect customer → webhook on completion.
 */

import crypto from "crypto";

export const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
export const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

const SQUARE_API_BASE =
  process.env.SQUARE_ENVIRONMENT === "sandbox"
    ? "https://connect.squareupsandbox.com/v2"
    : "https://connect.squareup.com/v2";

export interface SquareCheckoutResult {
  paymentLinkUrl: string;
  orderId: string;
  reference: string;
}

interface SquarePaymentLinkResponse {
  payment_link: {
    id: string;
    version: number;
    order_id: string;
    url: string;
    long_url: string;
    created_at: string;
  };
  related_resources?: {
    orders?: Array<{ id: string }>;
  };
}

/**
 * Create a Square Checkout payment link.
 * Returns the URL to redirect the customer to.
 */
export async function createSquareCheckout(data: {
  amountCents: number;
  currency: string;
  reference: string;
  description: string;
  customerEmail?: string;
  redirectUrl: string;
}): Promise<SquareCheckoutResult> {
  if (!SQUARE_ACCESS_TOKEN) {
    throw new Error("SQUARE_ACCESS_TOKEN is not configured");
  }
  if (!SQUARE_LOCATION_ID) {
    throw new Error("SQUARE_LOCATION_ID is not configured");
  }

  const idempotencyKey = crypto.randomUUID();

  const body = {
    idempotency_key: idempotencyKey,
    quick_pay: {
      name: data.description,
      price_money: {
        amount: data.amountCents,
        currency: data.currency,
      },
      location_id: SQUARE_LOCATION_ID,
    },
    checkout_options: {
      redirect_url: data.redirectUrl,
      ask_for_shipping_address: false,
    },
    pre_populated_data: data.customerEmail
      ? { buyer_email: data.customerEmail }
      : undefined,
    payment_note: data.reference,
  };

  const response = await fetch(`${SQUARE_API_BASE}/online-checkout/payment-links`, {
    method: "POST",
    headers: {
      "Square-Version": "2024-12-18",
      Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("[square] API error:", response.status, JSON.stringify(errorData));
    throw new Error(
      `Square API error: ${response.status} - ${JSON.stringify(errorData)}`,
    );
  }

  const result: SquarePaymentLinkResponse = await response.json();

  return {
    paymentLinkUrl: result.payment_link.url,
    orderId: result.payment_link.order_id,
    reference: data.reference,
  };
}

/**
 * Verify Square webhook signature.
 * Square uses HMAC-SHA256 with the signature key.
 */
export function verifySquareWebhook(
  body: string,
  signature: string,
  webhookUrl: string,
): boolean {
  if (!SQUARE_WEBHOOK_SIGNATURE_KEY) {
    console.error("[square] SQUARE_WEBHOOK_SIGNATURE_KEY not configured");
    return false;
  }

  try {
    const hmac = crypto.createHmac("sha256", SQUARE_WEBHOOK_SIGNATURE_KEY);
    hmac.update(webhookUrl + body);
    const expectedSignature = hmac.digest("base64");

    // Timing-safe comparison
    const expected = Buffer.from(expectedSignature);
    const received = Buffer.from(signature);
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  } catch (error) {
    console.error("[square] Signature verification error:", error);
    return false;
  }
}

/**
 * Get payment details from Square by payment ID.
 */
export async function getSquarePayment(paymentId: string): Promise<{
  id: string;
  status: string;
  amountMoney: { amount: number; currency: string };
  receiptUrl: string | null;
  orderId: string | null;
  note: string | null;
  buyerEmailAddress: string | null;
} | null> {
  if (!SQUARE_ACCESS_TOKEN) return null;

  const response = await fetch(`${SQUARE_API_BASE}/payments/${paymentId}`, {
    headers: {
      "Square-Version": "2024-12-18",
      Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) return null;

  const result = await response.json();
  const p = result.payment;

  return {
    id: p.id,
    status: p.status,
    amountMoney: p.amount_money,
    receiptUrl: p.receipt_url || null,
    orderId: p.order_id || null,
    note: p.note || null,
    buyerEmailAddress: p.buyer_email_address || null,
  };
}

/**
 * Square webhook event types we care about.
 */
export interface SquareWebhookEvent {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: {
      payment?: {
        id: string;
        status: string;
        amount_money: { amount: number; currency: string };
        order_id: string;
        receipt_url: string;
        note: string | null;
        buyer_email_address: string | null;
        created_at: string;
        updated_at: string;
      };
    };
  };
}
