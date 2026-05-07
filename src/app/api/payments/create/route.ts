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
import { notifyPaymentReceived } from "@/lib/telegram";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type PaymentMethod = "square" | "nequi" | "bancolombia" | "zelle";

interface CreatePaymentBody {
  pack_type: string;
  payment_method: PaymentMethod;
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

    const { pack_type, payment_method } = body as CreatePaymentBody;

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
    // SQUARE CHECKOUT
    // -------------------------------------------------------------------
    if (payment_method === "square") {
      const amountCents = packDef.priceCop * 100;

      const checkout = await createSquareCheckout({
        amountCents,
        currency: "COP",
        reference,
        customerEmail: student?.email || undefined,
        redirectUrl: `https://www.tataumana.com/payment/success?ref=${reference}`,
        description: `TU. ${packDef.name.es} — ${packDef.totalClasses === -1 ? "Ilimitado" : packDef.totalClasses + " clases"}`,
      });

      // Insert pending transaction
      const { error: txError } = await serviceDb.from("tu_transactions").insert({
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
        },
      });

      if (txError) {
        console.error("[payments/create] Transaction insert failed:", txError.message);
        return NextResponse.json(
          { data: null, error: "db_error", message: "Failed to create payment record" },
          { status: 500 },
        );
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
    const { error: txError } = await serviceDb.from("tu_transactions").insert({
      wompi_reference: reference,
      amount: packDef.priceCop,
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
      },
    });

    if (txError) {
      console.error("[payments/create] Transaction insert failed:", txError.message);
      return NextResponse.json(
        { data: null, error: "db_error", message: "Failed to create payment record" },
        { status: 500 },
      );
    }

    // Notify Tata of pending manual payment
    try {
      await notifyPaymentReceived({
        reference,
        amount: packDef.priceCop * 100,
        currency: "COP",
        customerEmail: student?.email || undefined,
        customerName: student?.full_name || undefined,
        status: "PENDING_MANUAL",
      });
    } catch (notifyErr) {
      console.error("[payments/create] Telegram notification failed:", notifyErr);
    }

    // Build WhatsApp prefilled message
    const priceFormatted = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(packDef.priceCop);

    const waMessage = encodeURIComponent(
      `Hola Tata! Acabo de hacer un pago por ${account.label} para el pack ${packDef.name.es} (${priceFormatted}). Referencia: ${reference}`,
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
