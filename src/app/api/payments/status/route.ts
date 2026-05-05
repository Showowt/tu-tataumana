/**
 * Payment Status API
 * TU. by Tata Umana — WellnessOS v1.0
 *
 * GET /api/payments/status?ref=xxx
 * Public endpoint — returns minimal payment status info.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface StatusSuccessResponse {
  data: {
    status: string;
    pack_type: string | null;
  };
  error: null;
  message: string;
}

interface StatusErrorResponse {
  data: null;
  error: string;
  message: string;
}

type StatusResponse = StatusSuccessResponse | StatusErrorResponse;

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const STATUS_MESSAGES: Record<string, { en: string; es: string }> = {
  pending: { en: "Payment is pending", es: "Pago pendiente" },
  approved: { en: "Payment approved", es: "Pago aprobado" },
  declined: { en: "Payment was declined", es: "Pago rechazado" },
  voided: { en: "Payment was voided", es: "Pago anulado" },
  error: { en: "Payment error", es: "Error en el pago" },
};

// -------------------------------------------------------------------
// GET handler
// -------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse<StatusResponse>> {
  try {
    const ref = request.nextUrl.searchParams.get("ref");

    if (!ref || typeof ref !== "string" || ref.trim().length === 0) {
      return NextResponse.json(
        { data: null, error: "missing_ref", message: "Query parameter 'ref' is required" },
        { status: 400 },
      );
    }

    const supabase = getServiceSupabase();

    const { data: transaction, error: dbError } = await supabase
      .from("tu_transactions")
      .select("status, related_pack_type")
      .eq("wompi_reference", ref.trim())
      .single();

    if (dbError || !transaction) {
      return NextResponse.json(
        { data: null, error: "not_found", message: "No transaction found for this reference" },
        { status: 404 },
      );
    }

    const status = transaction.status as string;
    const statusMsg = STATUS_MESSAGES[status] || { en: "Unknown status", es: "Estado desconocido" };

    return NextResponse.json({
      data: {
        status,
        pack_type: (transaction.related_pack_type as string) || null,
      },
      error: null,
      message: `${statusMsg.en} / ${statusMsg.es}`,
    });
  } catch (error) {
    console.error("[payments/status] Unexpected error:", error);
    return NextResponse.json(
      { data: null, error: "server_error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
