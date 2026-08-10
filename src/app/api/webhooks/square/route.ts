/**
 * Square Payment Webhook Handler
 * TU. by Tata Umana — WellnessOS v1.1
 *
 * Receives payment.completed events from Square.
 * On completion: auto-creates student + pack + records transaction.
 * Tata MUST be notified on every payment.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifySquareWebhook,
  getSquarePayment,
  type SquareWebhookEvent,
} from "@/lib/square";
import { notifyPaymentReceived, notifyNewMembership } from "@/lib/telegram";
import { getPackDefinition, calculateExpiration } from "@/lib/constants/packs";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";
import { createClient } from "@supabase/supabase-js";
import { captureApiError } from "@/lib/sentry-helpers";
import { systemLog } from "@/lib/system-log";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY required for webhooks");
  return createClient(url, key);
}

/**
 * Parse pack type from payment note/reference.
 * Reference format: PACK-{TYPE}-{timestamp}
 */
function parsePackType(note: string | null): string | null {
  if (!note) return null;
  const match = note.match(/PACK-([A-Z_]+)-/);
  return match ? match[1] : null;
}

/**
 * Handle a completed Square payment:
 * 1. Update transaction record
 * 2. Find or create student
 * 3. Create pack
 * 4. Notify Tata
 */
async function handleCompletedPayment(
  paymentId: string,
  event: SquareWebhookEvent,
): Promise<void> {
  const supabase = getServiceSupabase();
  const payment = event.data.object.payment;

  if (!payment) {
    // Fetch from API if not in webhook payload
    const fetched = await getSquarePayment(paymentId);
    if (!fetched || fetched.status !== "COMPLETED") return;
  }

  const paymentData = payment || (await getSquarePayment(paymentId));
  if (!paymentData) return;

  const amount = "amount_money" in paymentData
    ? (paymentData as SquareWebhookEvent["data"]["object"]["payment"] & object).amount_money.amount
    : (paymentData as { amountMoney: { amount: number } }).amountMoney.amount;

  const currency = "amount_money" in paymentData
    ? (paymentData as SquareWebhookEvent["data"]["object"]["payment"] & object).amount_money.currency
    : (paymentData as { amountMoney: { currency: string } }).amountMoney.currency;

  const email = "buyer_email_address" in paymentData
    ? (paymentData as { buyer_email_address: string | null }).buyer_email_address
    : (paymentData as { buyerEmailAddress: string | null }).buyerEmailAddress;

  const note = "note" in paymentData ? (paymentData as { note: string | null }).note : null;
  const pId = "id" in paymentData ? (paymentData as { id: string }).id : paymentId;

  const reference = note || "";
  const packType = parsePackType(reference);

  // 1. Update or insert transaction
  const { data: txRecord } = await supabase
    .from("tu_transactions")
    .update({
      status: "approved",
      wompi_id: pId,
      metadata: {
        square_payment_id: pId,
        square_event_id: event.event_id,
        customer_email: email,
        completed_at: new Date().toISOString(),
      },
    })
    .eq("wompi_reference", reference)
    .select("id, student_id")
    .single();

  if (!txRecord) {
    // Transaction not found by reference — insert new record
    const { error: sqTxInsErr } = await supabase.from("tu_transactions").insert({
      wompi_reference: reference,
      wompi_id: pId,
      amount: Math.round(amount / 100), // COP pesos (R2B-03) — Square amount_money is in the minor unit
      currency,
      payment_method: "square",
      status: "approved",
      related_pack_type: packType || null,
      description: `Square payment - ${reference}`,
      metadata: {
        square_payment_id: pId,
        square_event_id: event.event_id,
        customer_email: email,
      },
    });
    if (sqTxInsErr) {
      console.error(
        "[square-webhook] APPROVED payment tx insert FAILED — ledger row missing for ref",
        reference,
        sqTxInsErr.message,
      );
    }
  }

  if (!email) {
    console.log("[square-webhook] No email on payment — skipping student/pack creation");
    return;
  }

  // 2. Find or create student
  let { data: student } = await supabase
    .from("tu_students")
    .select("id, full_name, email")
    .eq("email", email.toLowerCase())
    .single();

  if (!student) {
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
    const { data: newStudent, error: studentErr } = await supabase
      .from("tu_students")
      .insert({
        email: email.toLowerCase(),
        full_name: email.split("@")[0],
        role: isAdmin ? "admin" : "student",
        preferred_lang: "es",
      })
      .select("id, full_name, email")
      .single();

    if (studentErr) {
      console.error("[square-webhook] Student creation failed:", studentErr.message);
      return;
    }
    student = newStudent;
  }

  if (!student) return;

  // Link transaction to student
  if (txRecord) {
    await supabase
      .from("tu_transactions")
      .update({ student_id: student.id })
      .eq("id", txRecord.id);
  }

  // 3. Create pack (with duplicate prevention)
  if (packType) {
    const packDef = getPackDefinition(packType);
    if (packDef) {
      // Prevent duplicate pack creation on webhook replay
      const { data: existingPack } = await supabase
        .from("tu_packs")
        .select("id")
        .eq("student_id", student.id)
        .eq("wompi_transaction_id", pId)
        .single();

      if (existingPack) {
        console.log("[square-webhook] Pack already exists for payment:", pId);
        return;
      }

      const { error: packErr } = await supabase.from("tu_packs").insert({
        student_id: student.id,
        pack_type: packType,
        total_classes: packDef.totalClasses,
        classes_used: 0,
        price_paid: Math.round(amount / 100), // COP pesos (R2B-03)
        currency,
        status: "active",
        expires_at: calculateExpiration(packDef.expirationDays).toISOString(),
        payment_method: "square",
        wompi_transaction_id: pId,
      });

      if (packErr) {
        console.error("[square-webhook] Pack creation failed:", packErr.message);
      } else {
        try {
          await notifyNewMembership({
            studentName: student.full_name || email,
            email: student.email || email,
            packType: packDef.name.en,
            totalClasses: packDef.totalClasses,
            paymentMethod: "Square",
          });
        } catch (notifyErr) {
          console.error("[square-webhook] Membership notification failed:", notifyErr);
        }
      }
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-square-hmacsha256-signature") || "";
    const webhookUrl = request.url;

    // Verify signature — MANDATORY
    if (!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
      console.error("[square-webhook] SQUARE_WEBHOOK_SIGNATURE_KEY not configured — rejecting all events");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 },
      );
    }
    const isValid = verifySquareWebhook(rawBody, signature, webhookUrl);
    if (!isValid) {
      console.error("[square-webhook] REJECTED: Invalid Square signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }

    const payload: SquareWebhookEvent = JSON.parse(rawBody);

    console.log("[square-webhook] Received event:", {
      type: payload.type,
      event_id: payload.event_id,
    });

    // ALWAYS notify Tata
    const payment = payload.data?.object?.payment;
    if (payment) {
      try {
        await notifyPaymentReceived({
          reference: payment.note || payment.id,
          amount: payment.amount_money.amount,
          currency: payment.amount_money.currency,
          customerEmail: payment.buyer_email_address || undefined,
          status: payment.status === "COMPLETED" ? "APPROVED" : payment.status,
        });
      } catch (e) {
        systemLog({ category: "payment", level: "error", message: "Square Telegram notification failed", route: "webhooks/square", details: { error: e instanceof Error ? e.message : String(e), reference: payment.note || payment.id } });
        console.error("[square-webhook] CRITICAL: Telegram notification FAILED:", e);
      }
    }

    // Process based on event type
    if (payload.type === "payment.completed") {
      systemLog({ category: "payment", level: "info", message: "Square payment completed", route: "webhooks/square", details: { event_id: payload.event_id, payment_id: payment?.id, amount: payment?.amount_money?.amount, currency: payment?.amount_money?.currency, email: payment?.buyer_email_address } });
      await handleCompletedPayment(payload.data.id, payload);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureApiError("webhooks/square", error, { route: "POST /api/webhooks/square" });
    systemLog({ category: "payment", level: "error", message: "Square webhook processing error", route: "webhooks/square", details: { error: error instanceof Error ? error.message : String(error) } });
    console.error("[square-webhook] Processing error:", error);
    return NextResponse.json(
      { success: false, message: "Processing error" },
      { status: 200 },
    );
  }
}

export async function GET() {
  return new NextResponse(null, { status: 405 });
}
