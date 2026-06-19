/**
 * Payment Creation API
 * TU. by Tata Umana — WellnessOS v1.1
 *
 * POST /api/payments/create
 * Creates a Square checkout link OR records a manual payment pending.
 *
 * Body: { pack_type: string, payment_method: 'square' | 'wompi' | 'nequi' | 'bancolombia' | 'zelle' }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getPackDefinition } from "@/lib/constants/packs";
import { createSquareCheckout } from "@/lib/square";
import { createPaymentLink } from "@/lib/wompi";
import { notifyPaymentReceived, notifyPackPurchase, notifyDiscountUsed } from "@/lib/telegram";
import { captureApiError } from "@/lib/sentry-helpers";
import { systemLog } from "@/lib/system-log";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type PaymentMethod = "square" | "wompi" | "nequi" | "bancolombia" | "zelle";

interface CreatePaymentBody {
  pack_type: string;
  payment_method: PaymentMethod;
  discount_code?: string;
}

interface DiscountApplication {
  code_id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  original_price: number;
  discounted_price: number;
  savings: number;
}

interface StudentRecord {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface SquareSuccessResponse {
  data: {
    method: "square";
    checkout_url: string;
    reference: string;
  };
  error: null;
  message: string;
}

interface WompiSuccessResponse {
  data: {
    method: "wompi";
    checkout_url: string;
    reference: string;
  };
  error: null;
  message: string;
}

interface ManualSuccessResponse {
  data: {
    method: PaymentMethod;
    reference: string;
    whatsapp_url: string;
    account_info: string;
  };
  error: null;
  message: string;
}

interface FreeSuccessResponse {
  data: {
    method: "free";
    reference: string;
  };
  error: null;
  message: string;
}

interface ErrorResponse {
  data: null;
  error: string;
  message: string;
}

type CreatePaymentResponse = SquareSuccessResponse | WompiSuccessResponse | ManualSuccessResponse | FreeSuccessResponse | ErrorResponse;

// -------------------------------------------------------------------
// Manual payment account details
// -------------------------------------------------------------------

const MANUAL_ACCOUNTS: Record<"nequi" | "bancolombia" | "zelle", { label: string; info: string }> = {
  nequi: {
    label: "Nequi",
    info: "3166333663",
  },
  bancolombia: {
    label: "Bancolombia Cuenta Ahorros",
    info: "207-859047-00",
  },
  zelle: {
    label: "Zelle / PayPal",
    info: "+1 917 453 8307",
  },
};

const VALID_PAYMENT_METHODS: PaymentMethod[] = ["square", "wompi", "nequi", "bancolombia", "zelle"];

const TATA_WHATSAPP = "573166333663";

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getAuthenticatedUser(): Promise<{
  userId: string | null;
  student: StudentRecord | null;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Read-only in some contexts — safe to ignore
            }
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { userId: null, student: null };

    const { data: student } = await supabase
      .from("tu_students")
      .select("id, full_name, email")
      .eq("auth_id", user.id)
      .single();

    return {
      userId: user.id,
      student: student as StudentRecord | null,
    };
  } catch {
    return { userId: null, student: null };
  }
}

function generateReference(packType: string): string {
  return `PACK-${packType}-${Date.now().toString(36).toUpperCase()}`;
}

function isValidPaymentMethod(method: unknown): method is PaymentMethod {
  return typeof method === "string" && VALID_PAYMENT_METHODS.includes(method as PaymentMethod);
}

function applyDiscountCalc(
  originalPrice: number,
  type: "percentage" | "fixed",
  value: number,
): number {
  if (type === "percentage") {
    return Math.round(originalPrice * (1 - value / 100));
  }
  return Math.max(originalPrice - value, 0);
}

/**
 * Validates a discount code WITHOUT consuming it.
 * Consumption (uses_count increment + usage record) happens only after
 * the payment/transaction is successfully created, preventing wasted codes
 * when payment creation fails.
 */
async function resolveDiscountCode(
  serviceDb: ReturnType<typeof getServiceSupabase>,
  discountCode: string,
  packType: string,
  studentId: string,
  originalPrice: number,
): Promise<DiscountApplication> {
  // Normalize code: strip non-alphanumeric, uppercase
  const normalizedCode = discountCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const rawCodeUpper = discountCode.trim().toUpperCase();

  // Look up code — try normalized first, then raw
  let { data: discount } = await serviceDb
    .from("tu_discount_codes")
    .select("*")
    .eq("code", normalizedCode)
    .single();

  if (!discount && rawCodeUpper !== normalizedCode) {
    const { data: fallback } = await serviceDb
      .from("tu_discount_codes")
      .select("*")
      .eq("code", rawCodeUpper)
      .single();
    discount = fallback;
  }

  if (!discount) throw "Codigo de descuento no valido";
  if (!discount.active) throw "Codigo de descuento inactivo";

  const now = new Date();
  if (new Date(discount.valid_from) > now) throw "Codigo aun no vigente";
  if (discount.valid_until && new Date(discount.valid_until) < now) {
    throw "Codigo de descuento expirado";
  }
  if (
    discount.max_uses !== null &&
    discount.uses_count >= discount.max_uses
  ) {
    throw "Codigo de descuento agotado";
  }
  if (
    discount.specific_student_id &&
    discount.specific_student_id !== studentId
  ) {
    throw "Codigo no valido para esta cuenta";
  }
  if (
    discount.applicable_packs &&
    discount.applicable_packs.length > 0 &&
    !discount.applicable_packs.includes(packType)
  ) {
    throw "Codigo no aplica para este pack";
  }

  // Check one-time-per-student
  if (discount.one_time_per_student) {
    const { data: existingUsage } = await serviceDb
      .from("tu_discount_usage")
      .select("id")
      .eq("discount_code_id", discount.id)
      .eq("student_id", studentId)
      .single();

    if (existingUsage) throw "Ya usaste este codigo de descuento";
  }

  // DO NOT increment uses_count here — wait until payment succeeds
  const discountedPrice = applyDiscountCalc(
    originalPrice,
    discount.discount_type as "percentage" | "fixed",
    Number(discount.discount_value),
  );

  return {
    code_id: discount.id,
    code: discount.code,
    discount_type: discount.discount_type as "percentage" | "fixed",
    discount_value: Number(discount.discount_value),
    original_price: originalPrice,
    discounted_price: discountedPrice,
    savings: originalPrice - discountedPrice,
  };
}

/**
 * Consumes a discount code AFTER payment/transaction succeeds.
 * Uses read + optimistic-lock update to prevent TOCTOU race conditions.
 */
async function consumeDiscountCode(
  serviceDb: ReturnType<typeof getServiceSupabase>,
  discount: DiscountApplication,
  studentId: string,
  transactionId: string,
): Promise<void> {
  // Read current state
  const { data: codeRow } = await serviceDb
    .from("tu_discount_codes")
    .select("uses_count, max_uses")
    .eq("id", discount.code_id)
    .single();

  if (!codeRow) return;

  const currentCount = codeRow.uses_count ?? 0;

  // Bail if already at max
  if (codeRow.max_uses !== null && currentCount >= codeRow.max_uses) {
    console.error("[payments/create] Discount code already at max uses:", discount.code_id);
    return;
  }

  // Atomic increment with optimistic lock: only update if uses_count hasn't changed
  const { error: incErr } = await serviceDb
    .from("tu_discount_codes")
    .update({ uses_count: currentCount + 1 })
    .eq("id", discount.code_id)
    .eq("uses_count", currentCount);

  if (incErr) {
    console.error("[payments/create] Discount increment failed (concurrent use):", incErr.message);
  }

  // Insert usage record
  await serviceDb
    .from("tu_discount_usage")
    .insert({
      discount_code_id: discount.code_id,
      student_id: studentId,
      transaction_id: transactionId,
    });
}

// -------------------------------------------------------------------
// POST handler
// -------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse<CreatePaymentResponse>> {
  try {
    // Parse and validate body
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { data: null, error: "invalid_body", message: "Request body is required" },
        { status: 400 },
      );
    }

    const {
      pack_type,
      payment_method,
      discount_code,
    } = body as CreatePaymentBody;

    if (!pack_type || typeof pack_type !== "string") {
      return NextResponse.json(
        { data: null, error: "missing_pack_type", message: "pack_type is required" },
        { status: 400 },
      );
    }

    if (!isValidPaymentMethod(payment_method)) {
      return NextResponse.json(
        {
          data: null,
          error: "invalid_payment_method",
          message: `payment_method must be one of: ${VALID_PAYMENT_METHODS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate pack exists
    const packDef = getPackDefinition(pack_type);
    if (!packDef) {
      return NextResponse.json(
        { data: null, error: "invalid_pack", message: `Pack type '${pack_type}' not found` },
        { status: 400 },
      );
    }

    if (!packDef.isActive) {
      return NextResponse.json(
        { data: null, error: "pack_inactive", message: "This pack is no longer available" },
        { status: 400 },
      );
    }

    // Get current user (optional — guest checkout allowed)
    const { student } = await getAuthenticatedUser();
    const reference = generateReference(pack_type);
    const serviceDb = getServiceSupabase();

    // -------------------------------------------------------------------
    // DISCOUNT CODE (optional) — resolve and atomically claim before payment
    // -------------------------------------------------------------------
    let discountApplication: DiscountApplication | null = null;

    if (discount_code && typeof discount_code === "string" && discount_code.trim().length > 0) {
      if (!student) {
        return NextResponse.json(
          {
            data: null,
            error: "auth_required",
            message: "Debes iniciar sesion para usar un codigo de descuento",
          },
          { status: 401 },
        );
      }

      try {
        discountApplication = await resolveDiscountCode(
          serviceDb,
          discount_code,
          pack_type,
          student.id,
          packDef.priceCop,
        );
      } catch (discountError) {
        return NextResponse.json(
          {
            data: null,
            error: "invalid_discount",
            message: typeof discountError === "string" ? discountError : "Codigo no valido",
          },
          { status: 400 },
        );
      }
    }

    // Effective price after discount (falls back to full price)
    const effectivePrice = discountApplication
      ? discountApplication.discounted_price
      : packDef.priceCop;

    // -------------------------------------------------------------------
    // FREE CHECKOUT (100% discount — no payment gateway needed)
    // -------------------------------------------------------------------
    if (effectivePrice <= 0 && discountApplication && student) {
      const reference = generateReference(pack_type);

      // Create pack directly
      const { error: freePackErr } = await serviceDb.from("tu_packs").insert({
        student_id: student.id,
        pack_type,
        total_classes: packDef.totalClasses,
        classes_used: 0,
        status: "active",
        price_paid: 0,
        currency: "COP",
        payment_method: "free_discount",
        notes: `100% discount: ${discountApplication.code}`,
        expires_at: new Date(Date.now() + packDef.expirationDays * 86400000).toISOString(),
      });

      if (freePackErr) {
        console.error("[payments/create] Free pack insert failed:", freePackErr.message);
        return NextResponse.json({ data: null, error: "db_error", message: "Error creando pack gratuito" }, { status: 500 });
      }

      // Record transaction
      await serviceDb.from("tu_transactions").insert({
        wompi_reference: reference,
        amount: 0,
        currency: "COP",
        payment_method: "free_discount",
        status: "approved",
        student_id: student.id,
        related_pack_type: pack_type,
        description: `Free pack via ${discountApplication.code}`,
        metadata: {
          discount_code: discountApplication.code,
          discount_code_id: discountApplication.code_id,
          original_price: discountApplication.original_price,
          savings: discountApplication.savings,
        },
      });

      // Consume the discount code
      try {
        await consumeDiscountCode(serviceDb, discountApplication, student.id, reference);
      } catch (usageErr) {
        console.error("[payments/create] Free discount consumption failed:", usageErr);
      }

      // Notify
      try {
        await notifyPackPurchase({
          studentName: student.full_name ?? "Alumno",
          studentEmail: student.email ?? undefined,
          packName: packDef.name.es,
          packType: pack_type,
          amount: 0,
          currency: "COP",
          paymentMethod: "Descuento 100%",
          discountCode: discountApplication.code,
          originalAmount: discountApplication.original_price,
          discountAmount: discountApplication.savings,
        });
      } catch {}

      systemLog({ category: "payment", level: "info", message: "Free pack activated via 100% discount", route: "payments/create", details: { reference, pack_type, student_id: student.id, discount_code: discountApplication.code } });

      return NextResponse.json({
        data: { method: "free" as const, reference },
        error: null,
        message: "Pack activado con descuento 100%",
      });
    }

    // -------------------------------------------------------------------
    // SQUARE CHECKOUT
    // -------------------------------------------------------------------
    if (payment_method === "square") {
      const amountCents = effectivePrice * 100;

      const checkout = await createSquareCheckout({
        amountCents,
        currency: "COP",
        reference,
        customerEmail: student?.email || undefined,
        redirectUrl: `https://www.tataumana.com/payment/success?ref=${reference}`,
        description: `TU. ${packDef.name.es} — ${packDef.totalClasses === -1 ? "Ilimitado" : packDef.totalClasses + " clases"}`,
      });

      // Insert pending transaction
      const { data: txData, error: txError } = await serviceDb
        .from("tu_transactions")
        .insert({
          wompi_reference: reference,
          amount: amountCents,
          currency: "COP",
          payment_method: "square",
          status: "pending",
          student_id: student?.id || null,
          related_pack_type: pack_type,
          description: `${packDef.name.en} — Square checkout`,
          metadata: {
            pack_name: packDef.name.en,
            pack_classes: packDef.totalClasses,
            customer_email: student?.email || null,
            customer_name: student?.full_name || null,
            square_order_id: checkout.orderId,
            initiated_at: new Date().toISOString(),
            ...(discountApplication && {
              discount_code: discountApplication.code,
              discount_code_id: discountApplication.code_id,
              discount_type: discountApplication.discount_type,
              discount_value: discountApplication.discount_value,
              original_price: discountApplication.original_price,
              discounted_price: discountApplication.discounted_price,
              savings: discountApplication.savings,
            }),
          },
        })
        .select("id")
        .single();

      if (txError) {
        systemLog({ category: "payment", level: "error", message: "Square payment DB insert failed", route: "payments/create", details: { error: txError.message, reference, pack_type, student_id: student?.id } });
        console.error("[payments/create] Transaction insert failed:", txError.message);
        return NextResponse.json(
          { data: null, error: "db_error", message: "Failed to create payment record" },
          { status: 500 },
        );
      }

      // Consume discount code AFTER transaction was successfully created
      if (discountApplication && student?.id && txData?.id) {
        try {
          await consumeDiscountCode(serviceDb, discountApplication, student.id, txData.id);
        } catch (usageErr) {
          console.error("[payments/create] Discount consumption failed:", usageErr);
        }
      }

      systemLog({ category: "payment", level: "info", message: "Square checkout created", route: "payments/create", details: { reference, pack_type, student_id: student?.id, amount: effectivePrice, has_discount: !!discountApplication } });

      return NextResponse.json({
        data: {
          method: "square" as const,
          checkout_url: checkout.paymentLinkUrl,
          reference,
        },
        error: null,
        message: "Square checkout ready",
      });
    }

    // -------------------------------------------------------------------
    // WOMPI CHECKOUT (card payments via Colombian gateway)
    // -------------------------------------------------------------------
    if (payment_method === "wompi") {
      const amountCentavos = effectivePrice * 100;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tataumana.com";
      const redirectUrl = `${baseUrl}/payment/success?ref=${encodeURIComponent(reference)}`;
      const description = `TU. ${packDef.name.es} — ${packDef.totalClasses === -1 ? "Ilimitado" : packDef.totalClasses + " clases"}`;

      const paymentLink = await createPaymentLink({
        amount: amountCentavos,
        currency: "COP",
        reference,
        customerEmail: student?.email || "",
        customerName: student?.full_name || "Guest",
        redirectUrl,
        description,
        expirationMinutes: 30,
      });

      // Insert pending transaction
      const { data: wompiTxData, error: wompiTxError } = await serviceDb
        .from("tu_transactions")
        .insert({
          wompi_reference: reference,
          amount: effectivePrice,
          currency: "COP",
          payment_method: "wompi",
          status: "pending",
          student_id: student?.id || null,
          related_pack_type: pack_type,
          description: `${packDef.name.en} — Wompi checkout`,
          metadata: {
            pack_name: packDef.name.en,
            pack_classes: packDef.totalClasses,
            customer_email: student?.email || null,
            customer_name: student?.full_name || null,
            wompi_link_id: paymentLink.id,
            initiated_at: new Date().toISOString(),
            ...(discountApplication && {
              discount_code: discountApplication.code,
              discount_code_id: discountApplication.code_id,
              discount_type: discountApplication.discount_type,
              discount_value: discountApplication.discount_value,
              original_price: discountApplication.original_price,
              discounted_price: discountApplication.discounted_price,
              savings: discountApplication.savings,
            }),
          },
        })
        .select("id")
        .single();

      if (wompiTxError) {
        systemLog({ category: "payment", level: "error", message: "Wompi payment DB insert failed", route: "payments/create", details: { error: wompiTxError.message, reference, pack_type, student_id: student?.id } });
        console.error("[payments/create] Wompi transaction insert failed:", wompiTxError.message);
        return NextResponse.json(
          { data: null, error: "db_error", message: "Failed to create payment record" },
          { status: 500 },
        );
      }

      // Consume discount code AFTER transaction was successfully created
      if (discountApplication && student?.id && wompiTxData?.id) {
        try {
          await consumeDiscountCode(serviceDb, discountApplication, student.id, wompiTxData.id);
        } catch (usageErr) {
          console.error("[payments/create] Discount consumption failed:", usageErr);
        }
      }

      systemLog({ category: "payment", level: "info", message: "Wompi checkout created", route: "payments/create", details: { reference, pack_type, student_id: student?.id, amount: effectivePrice, has_discount: !!discountApplication } });

      return NextResponse.json({
        data: {
          method: "wompi" as const,
          checkout_url: paymentLink.payment_link_url,
          reference,
        },
        error: null,
        message: "Wompi checkout ready",
      });
    }

    // -------------------------------------------------------------------
    // MANUAL PAYMENT (nequi / bancolombia / zelle)
    // -------------------------------------------------------------------
    const account = MANUAL_ACCOUNTS[payment_method];

    // Deduplication: reject if same student + pack_type has a pending manual
    // transaction created within the last 2 minutes (prevents double-click)
    if (student?.id) {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: recentTx } = await serviceDb
        .from("tu_transactions")
        .select("id, wompi_reference")
        .eq("student_id", student.id)
        .eq("related_pack_type", pack_type)
        .eq("payment_method", payment_method)
        .eq("status", "pending")
        .gte("created_at", twoMinutesAgo)
        .limit(1)
        .single();

      if (recentTx) {
        systemLog({ category: "payment", level: "warn", message: "Duplicate manual payment blocked", route: "payments/create", details: { existing_ref: recentTx.wompi_reference, pack_type, payment_method, student_id: student.id } });
        // Return the existing transaction's WhatsApp link instead of creating a duplicate
        const priceFormatted = new Intl.NumberFormat("es-CO", {
          style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0,
        }).format(effectivePrice);
        const waMessage = encodeURIComponent(
          `Hola Tata! Acabo de hacer un pago por ${account.label} para el pack ${packDef.name.es} (${priceFormatted}). Referencia: ${recentTx.wompi_reference}`,
        );
        return NextResponse.json({
          data: {
            method: payment_method,
            reference: recentTx.wompi_reference,
            whatsapp_url: `https://wa.me/${TATA_WHATSAPP}?text=${waMessage}`,
            account_info: `${account.label}: ${account.info}`,
          },
          error: null,
          message: `Transfer to ${account.label} and confirm via WhatsApp`,
        });
      }
    }

    // Insert pending transaction
    const { data: manualTxData, error: txError } = await serviceDb
      .from("tu_transactions")
      .insert({
        wompi_reference: reference,
        amount: effectivePrice,
        currency: "COP",
        payment_method,
        status: "pending",
        student_id: student?.id || null,
        related_pack_type: pack_type,
        description: `${packDef.name.en} — ${account.label} (manual)`,
        metadata: {
          pack_name: packDef.name.en,
          pack_classes: packDef.totalClasses,
          customer_email: student?.email || null,
          customer_name: student?.full_name || null,
          account_label: account.label,
          account_info: account.info,
          initiated_at: new Date().toISOString(),
          ...(discountApplication && {
            discount_code: discountApplication.code,
            discount_code_id: discountApplication.code_id,
            discount_type: discountApplication.discount_type,
            discount_value: discountApplication.discount_value,
            original_price: discountApplication.original_price,
            discounted_price: discountApplication.discounted_price,
            savings: discountApplication.savings,
          }),
        },
      })
      .select("id")
      .single();

    if (txError) {
      systemLog({ category: "payment", level: "error", message: "Manual payment DB insert failed", route: "payments/create", details: { error: txError.message, reference, pack_type, payment_method, student_id: student?.id } });
      console.error("[payments/create] Transaction insert failed:", txError.message);
      return NextResponse.json(
        { data: null, error: "db_error", message: "Failed to create payment record" },
        { status: 500 },
      );
    }

    // Consume discount code AFTER transaction was successfully created
    if (discountApplication && student?.id && manualTxData?.id) {
      try {
        await consumeDiscountCode(serviceDb, discountApplication, student.id, manualTxData.id);
      } catch (usageErr) {
        console.error("[payments/create] Discount consumption failed:", usageErr);
      }
    }

    // Notify Tata of pending manual payment
    try {
      await notifyPackPurchase({
        studentName: student?.full_name || "Guest",
        studentEmail: student?.email || undefined,
        packName: packDef.name.en,
        packType: pack_type,
        amount: effectivePrice,
        currency: "COP",
        paymentMethod: account.label,
        discountCode: discountApplication?.code,
        discountAmount: discountApplication ? packDef.priceCop - discountApplication.discounted_price : undefined,
        originalAmount: discountApplication ? packDef.priceCop : undefined,
      });

      if (discountApplication) {
        await notifyDiscountUsed({
          studentName: student?.full_name || "Guest",
          code: discountApplication.code,
          discountType: discountApplication.discount_type,
          discountValue: discountApplication.discount_value,
          packName: packDef.name.en,
          originalPrice: packDef.priceCop,
          finalPrice: discountApplication.discounted_price,
        });
      }
    } catch (notifyErr) {
      console.error("[payments/create] Telegram notification failed:", notifyErr);
    }

    // Build WhatsApp prefilled message
    const priceFormatted = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(effectivePrice);

    const discountNote = discountApplication
      ? ` (con descuento ${discountApplication.discount_type === "percentage" ? discountApplication.discount_value + "%" : "$" + discountApplication.discount_value + " COP"})`
      : "";

    const waMessage = encodeURIComponent(
      `Hola Tata! Acabo de hacer un pago por ${account.label} para el pack ${packDef.name.es}${discountNote} (${priceFormatted}). Referencia: ${reference}`,
    );
    const whatsappUrl = `https://wa.me/${TATA_WHATSAPP}?text=${waMessage}`;

    systemLog({ category: "payment", level: "info", message: "Manual payment created", route: "payments/create", details: { reference, pack_type, payment_method, student_id: student?.id, amount: effectivePrice, has_discount: !!discountApplication } });

    return NextResponse.json({
      data: {
        method: payment_method,
        reference,
        whatsapp_url: whatsappUrl,
        account_info: `${account.label}: ${account.info}`,
      },
      error: null,
      message: `Transfer to ${account.label} and confirm via WhatsApp`,
    });
  } catch (error) {
    captureApiError("payments/create", error, { route: "POST /api/payments/create" });
    systemLog({ category: "payment", level: "error", message: "Payment creation unexpected error", route: "payments/create", details: { error: error instanceof Error ? error.message : String(error) } });
    console.error("[payments/create] Unexpected error:", error);
    return NextResponse.json(
      { data: null, error: "server_error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
