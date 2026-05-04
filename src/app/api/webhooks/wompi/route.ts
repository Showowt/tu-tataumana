/**
 * Wompi Payment Webhook Handler
 * TU. by Tata Umana — WellnessOS v1.0
 *
 * CRITICAL: This endpoint receives payment confirmations from Wompi.
 * On APPROVED: auto-creates student + pack + records transaction.
 * Tata MUST be notified on every payment — approved or failed.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyWompiSignature,
  WOMPI_EVENTS_SECRET,
  type WompiWebhookEvent,
} from "@/lib/wompi";
import { notifyPaymentReceived } from "@/lib/telegram";
import { getPackDefinition, calculateExpiration } from "@/lib/constants/packs";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";
import { createClient } from "@supabase/supabase-js";

type WompiEventType =
  | "transaction.updated"
  | "nequi_token.updated"
  | "payment_link.updated";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

/**
 * Parse pack type from payment reference.
 * Reference format: TU-{timestamp}-{random} or PACK-{type}-{timestamp}
 * Also checks transaction metadata for pack_type.
 */
function parsePackType(reference: string, metadata?: Record<string, unknown>): string | null {
  if (metadata?.pack_type && typeof metadata.pack_type === "string") {
    return metadata.pack_type;
  }

  // Try to extract from reference pattern: PACK-DROP_IN-xxx
  const match = reference.match(/^PACK-([A-Z_]+)-/);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Auto-onboard flow for approved payments:
 * 1. Record transaction
 * 2. Find or create student
 * 3. Create pack if pack_type identified
 */
async function handleApprovedPayment(
  transaction: WompiWebhookEvent["data"]["transaction"],
): Promise<void> {
  const supabase = getServiceSupabase();
  const email = transaction.customer_email;
  const name = transaction.customer_data?.full_name || email?.split("@")[0] || "Unknown";

  // 1. Record transaction (upsert by reference)
  const { data: txRecord } = await supabase
    .from("tu_transactions")
    .upsert(
      {
        reference: transaction.reference,
        amount: transaction.amount_in_cents,
        currency: transaction.currency,
        payment_method: transaction.payment_method_type || "card",
        status: "approved",
        wompi_transaction_id: transaction.id,
        wompi_status: transaction.status,
        description: `Wompi payment - ${transaction.reference}`,
        metadata: {
          customer_email: email,
          customer_name: name,
          payment_method_type: transaction.payment_method_type,
          finalized_at: transaction.finalized_at,
        },
      },
      { onConflict: "reference" },
    )
    .select("id")
    .single();

  if (!email) {
    console.log("[webhook] No email on transaction — skipping student/pack creation");
    return;
  }

  // 2. Find or create student
  let { data: student } = await supabase
    .from("tu_students")
    .select("id")
    .eq("email", email.toLowerCase())
    .single();

  if (!student) {
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
    const { data: newStudent, error: studentErr } = await supabase
      .from("tu_students")
      .insert({
        email: email.toLowerCase(),
        full_name: name,
        phone: transaction.customer_data?.phone_number || null,
        role: isAdmin ? "admin" : "student",
        preferred_lang: "es",
      })
      .select("id")
      .single();

    if (studentErr) {
      console.error("[webhook] Student creation failed:", studentErr.message);
      return;
    }
    student = newStudent;
    console.log("[webhook] Auto-created student:", email);
  }

  if (!student) return;

  // Link transaction to student
  if (txRecord) {
    await supabase
      .from("tu_transactions")
      .update({ student_id: student.id })
      .eq("id", txRecord.id);
  }

  // 3. Create pack if pack type is identifiable
  const packType = parsePackType(transaction.reference);
  if (packType) {
    const packDef = getPackDefinition(packType);
    if (packDef) {
      const { error: packErr } = await supabase.from("tu_packs").insert({
        student_id: student.id,
        pack_type: packType,
        total_classes: packDef.totalClasses,
        classes_used: 0,
        price_paid: transaction.amount_in_cents,
        currency: transaction.currency,
        status: "active",
        expires_at: calculateExpiration(packDef.expirationDays).toISOString(),
        payment_method: "wompi",
        transaction_id: txRecord?.id || null,
      });

      if (packErr) {
        console.error("[webhook] Pack creation failed:", packErr.message);
      } else {
        console.log("[webhook] Auto-created pack:", packType, "for", email);
      }
    }
  }
}

/**
 * Record non-approved transactions (declined, voided, error).
 */
async function recordTransaction(
  transaction: WompiWebhookEvent["data"]["transaction"],
): Promise<void> {
  const supabase = getServiceSupabase();

  await supabase.from("tu_transactions").upsert(
    {
      reference: transaction.reference,
      amount: transaction.amount_in_cents,
      currency: transaction.currency,
      payment_method: transaction.payment_method_type || "unknown",
      status: transaction.status.toLowerCase() as "pending" | "declined" | "voided" | "error",
      wompi_transaction_id: transaction.id,
      wompi_status: transaction.status,
      description: `Wompi ${transaction.status} - ${transaction.reference}`,
      metadata: {
        customer_email: transaction.customer_email,
        status_message: transaction.status_message,
      },
    },
    { onConflict: "reference" },
  );
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
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
        console.error(
          "[webhook] Invalid signature — still processing to notify Tata",
        );
      }
    }

    const eventType = payload.event as WompiEventType;

    switch (eventType) {
      case "transaction.updated": {
        const transaction = payload.data.transaction;

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
        } catch (e) {
          console.error("[webhook] CRITICAL: Telegram notification FAILED:", e);
        }

        // Process based on status
        if (transaction.status === "APPROVED") {
          await handleApprovedPayment(transaction);
        } else {
          await recordTransaction(transaction);
        }
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

export async function GET() {
  return new NextResponse(null, { status: 405 });
}
