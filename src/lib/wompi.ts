/**
 * Wompi Payment Integration
 * TU. by Tata Umana - Colombian Payment Processor
 *
 * Wompi is Colombia's leading payment gateway supporting:
 * - Credit/Debit cards (Visa, Mastercard, Amex)
 * - PSE (bank transfers)
 * - Nequi
 * - Bancolombia QR
 * - Cash (Efecty, Baloto)
 */

import crypto from "crypto";

// Environment variables - server-side only for private key
export const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
export const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;
export const WOMPI_EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET;
export const WOMPI_INTEGRITY_KEY = process.env.WOMPI_INTEGRITY_KEY;

// Wompi API endpoints
const WOMPI_API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";

const WOMPI_CHECKOUT_BASE =
  process.env.NODE_ENV === "production"
    ? "https://checkout.wompi.co/p/"
    : "https://checkout.wompi.co/p/";

export type WompiCurrency = "COP" | "USD";

export type WompiPaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "DECLINED"
  | "VOIDED"
  | "ERROR";

export interface WompiPaymentData {
  /** Amount in smallest currency unit (cents for USD, pesos for COP) */
  amount: number;
  /** Currency code */
  currency: WompiCurrency;
  /** Unique booking/order reference */
  reference: string;
  /** Customer email */
  customerEmail: string;
  /** Customer full name */
  customerName: string;
  /** URL to redirect after payment */
  redirectUrl: string;
  /** Optional: Expiration time in minutes (default 30) */
  expirationMinutes?: number;
  /** Optional: Description for payment */
  description?: string;
}

export interface WompiCheckoutConfig {
  publicKey: string;
  currency: WompiCurrency;
  amountInCents: number;
  reference: string;
  signature: string;
  redirectUrl: string;
  customerEmail: string;
  customerFullname: string;
  expirationTime?: string;
}

export interface WompiPaymentLink {
  id: string;
  name: string;
  description: string;
  single_use: boolean;
  collect_shipping: boolean;
  currency: WompiCurrency;
  amount_in_cents: number;
  redirect_url: string;
  expires_at: string;
  active: boolean;
  payment_link_url: string;
}

export interface WompiWebhookEvent {
  event: string;
  data: {
    transaction: {
      id: string;
      amount_in_cents: number;
      reference: string;
      customer_email: string;
      currency: WompiCurrency;
      payment_method_type: string;
      payment_method: Record<string, unknown>;
      status: WompiPaymentStatus;
      status_message: string | null;
      shipping_address: Record<string, unknown> | null;
      redirect_url: string;
      payment_source_id: string | null;
      payment_link_id: string | null;
      customer_data: {
        legal_id: string | null;
        legal_id_type: string | null;
        full_name: string;
        phone_number: string | null;
      };
      billing_data: Record<string, unknown> | null;
      created_at: string;
      finalized_at: string | null;
    };
  };
  sent_at: string;
  timestamp: number;
  signature: {
    checksum: string;
    properties: string[];
  };
  environment: "test" | "prod";
}

/**
 * Generate integrity signature for Wompi checkout
 * Signature = SHA256(reference + amountInCents + currency + integrityKey)
 */
export function generateIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: WompiCurrency,
): string {
  if (!WOMPI_INTEGRITY_KEY) {
    throw new Error("WOMPI_INTEGRITY_KEY is not configured");
  }

  const signatureString = `${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_KEY}`;
  return crypto.createHash("sha256").update(signatureString).digest("hex");
}

/**
 * Create Wompi checkout configuration for widget or redirect
 */
export function createWompiCheckout(
  data: WompiPaymentData,
): WompiCheckoutConfig {
  if (!WOMPI_PUBLIC_KEY) {
    throw new Error("WOMPI_PUBLIC_KEY is not configured");
  }

  // Convert amount to cents if needed (Wompi expects cents)
  const amountInCents = Math.round(data.amount);

  const signature = generateIntegritySignature(
    data.reference,
    amountInCents,
    data.currency,
  );

  // Calculate expiration time
  const expirationMinutes = data.expirationMinutes || 30;
  const expirationTime = new Date(
    Date.now() + expirationMinutes * 60 * 1000,
  ).toISOString();

  return {
    publicKey: WOMPI_PUBLIC_KEY,
    currency: data.currency,
    amountInCents,
    reference: data.reference,
    signature,
    redirectUrl: data.redirectUrl,
    customerEmail: data.customerEmail,
    customerFullname: data.customerName,
    expirationTime,
  };
}

/**
 * Create a payment link via Wompi API
 * Returns URL to redirect customer to
 */
export async function createPaymentLink(
  data: WompiPaymentData,
): Promise<WompiPaymentLink> {
  if (!WOMPI_PRIVATE_KEY) {
    throw new Error("WOMPI_PRIVATE_KEY is not configured");
  }

  const expirationMinutes = data.expirationMinutes || 30;
  const expiresAt = new Date(
    Date.now() + expirationMinutes * 60 * 1000,
  ).toISOString();

  const response = await fetch(`${WOMPI_API_BASE}/payment_links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Booking ${data.reference}`,
      description:
        data.description || `TU. Wellness - Booking ${data.reference}`,
      single_use: true,
      collect_shipping: false,
      currency: data.currency,
      amount_in_cents: Math.round(data.amount),
      redirect_url: data.redirectUrl,
      expires_at: expiresAt,
      customer_data: {
        customer_email: data.customerEmail,
        customer_full_name: data.customerName,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Wompi API error: ${response.status} - ${JSON.stringify(errorData)}`,
    );
  }

  const result = await response.json();
  return result.data as WompiPaymentLink;
}

/**
 * Get a transaction by reference
 */
export async function getTransactionByReference(
  reference: string,
): Promise<WompiWebhookEvent["data"]["transaction"] | null> {
  if (!WOMPI_PRIVATE_KEY) {
    throw new Error("WOMPI_PRIVATE_KEY is not configured");
  }

  const response = await fetch(
    `${WOMPI_API_BASE}/transactions?reference=${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  const transactions =
    result.data as WompiWebhookEvent["data"]["transaction"][];

  // Return the most recent transaction for this reference
  return transactions.length > 0 ? transactions[0] : null;
}

/**
 * Verify Wompi webhook signature
 * Wompi sends signature as: checksum = SHA256(concatenated properties + events_secret)
 */
export function verifyWompiSignature(event: WompiWebhookEvent): boolean {
  if (!WOMPI_EVENTS_SECRET) {
    console.error("WOMPI_EVENTS_SECRET is not configured");
    return false;
  }

  try {
    const { properties, checksum } = event.signature;
    const transaction = event.data.transaction;

    // Build the string to hash based on the properties array
    const values = properties.map((prop) => {
      const keys = prop.split(".");
      let value: unknown = event.data;

      for (const key of keys) {
        if (value && typeof value === "object" && key in value) {
          value = (value as Record<string, unknown>)[key];
        } else {
          return "";
        }
      }

      return String(value);
    });

    // Concatenate values + timestamp + events_secret
    const signatureString =
      values.join("") + event.timestamp + WOMPI_EVENTS_SECRET;
    const calculatedChecksum = crypto
      .createHash("sha256")
      .update(signatureString)
      .digest("hex");

    return calculatedChecksum === checksum;
  } catch (error) {
    console.error("Error verifying Wompi signature:", error);
    return false;
  }
}

/**
 * Format currency for display
 */
export function formatWompiAmount(
  amountInCents: number,
  currency: WompiCurrency,
): string {
  const amount = amountInCents / (currency === "USD" ? 100 : 1);

  if (currency === "COP") {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get human-readable payment status
 */
export function getPaymentStatusLabel(
  status: WompiPaymentStatus,
  language: "en" | "es" = "en",
): string {
  const labels: Record<WompiPaymentStatus, { en: string; es: string }> = {
    PENDING: { en: "Pending", es: "Pendiente" },
    APPROVED: { en: "Approved", es: "Aprobado" },
    DECLINED: { en: "Declined", es: "Rechazado" },
    VOIDED: { en: "Voided", es: "Anulado" },
    ERROR: { en: "Error", es: "Error" },
  };

  return labels[status]?.[language] || status;
}

/**
 * Generate a unique booking reference
 */
export function generateBookingReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TU-${timestamp}-${random}`;
}
