/**
 * Payment Creation API
 * TU. by Tata Umana — WellnessOS v1.1
 *
 * POST /api/payments/create
 * Creates a Square checkout link OR records a manual payment pending.
 *
 * Body: { pack_type: string, payment_method: 'square' | 'nequi' | 'bancolombia' | 'zelle' }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getPackDefinition } from "@/lib/constants/packs";
import { createSquareCheckout } from "@/lib/square";
import { notifyPaymentReceived, notifyPackPurchase, notifyDiscountUsed } from "@/lib/telegram";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type PaymentMethod = "square" | "nequi" | "bancolombia" | "zelle";

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

interface ErrorResponse {
  data: null;
  error: string;
  message: string;
}

type CreatePaymentResponse = SquareSuccessResponse | ManualSuccessResponse | ErrorResponse;

// -------------------------------------------------------------------
// Manual payment account details
// -------------------------------------------------------------------

const MANUAL_ACCOUNTS: Record<"nequi" | "bancolombia" | "zelle", { label: string; info: string }> = {
  nequi: {
    label: "Nequi",
    info: "3185083035",
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

const VALID_PAYMENT_METHODS: PaymentMethod[] = ["square", "nequi", "bancolombia", "zelle"];

const TATA_WHATSAPP = "573185083035";

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
  // Look up code (exact match, uppercase)
  const { data: discount } = await serviceDb
    .from("tu_discount_codes")
    .select("*")
    .eq("code", discountCode.trim().toUpperCase())
    .single();

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
 * Increments uses_count and inserts usage record.
 */
async function consumeDiscountCode(
  serviceDb: ReturnType<typeof getServiceSupabase>,
  discount: DiscountApplication,
  studentId: string,
  transactionId: string,
): Promise<void> {
  // Read current uses_count and increment
  const { data: current } = await serviceDb
    .from("tu_discount_codes")
    .select("uses_count")
    .eq("id", discount.code_id)
    .single();

  if (current) {
    await serviceDb
      .from("tu_discount_codes")
      .update({ uses_count: (current.uses_count ?? 0) + 1 })
      .eq("id", discount.code_id);
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
    // MANUAL PAYMENT (nequi / bancolombia / zelle)
    // -------------------------------------------------------------------
    const account = MANUAL_ACCOUNTS[payment_method];

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
    console.error("[payments/create] Unexpected error:", error);
    return NextResponse.json(
      { data: null, error: "server_error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
