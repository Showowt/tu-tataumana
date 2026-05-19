import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getPackDefinition } from "@/lib/constants/packs";

const ValidateSchema = z.object({
  code: z.string().min(1).max(50),
  pack_type: z.string().min(1),
});

function calculateDiscount(
  originalPrice: number,
  type: "percentage" | "fixed",
  value: number,
): number {
  if (type === "percentage") {
    return Math.round(originalPrice * (1 - value / 100));
  }
  return Math.max(originalPrice - value, 0);
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
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

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado", errorCode: "unauthorized" },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const parsed = ValidateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", errorCode: "invalid_data" },
        { status: 400 },
      );
    }

    const { code, pack_type } = parsed.data;

    // Look up pack definition
    const packDef = getPackDefinition(pack_type);
    if (!packDef) {
      return NextResponse.json(
        { error: "Pack no encontrado", errorCode: "invalid_pack" },
        { status: 400 },
      );
    }

    // Use service role for discount lookups (bypass RLS)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbClient = serviceKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
      : supabase;

    // Look up student
    const { data: student } = await dbClient
      .from("tu_students")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!student) {
      return NextResponse.json(
        { error: "Perfil no encontrado", errorCode: "no_profile" },
        { status: 404 },
      );
    }

    // Look up discount code (exact match, uppercase)
    const { data: discount } = await dbClient
      .from("tu_discount_codes")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (!discount) {
      return NextResponse.json(
        { valid: false, error: "Codigo no valido", errorCode: "invalid_code" },
        { status: 200 },
      );
    }

    // Check active
    if (!discount.active) {
      return NextResponse.json(
        { valid: false, error: "Codigo inactivo", errorCode: "code_inactive" },
        { status: 200 },
      );
    }

    // Check validity period
    const now = new Date();
    if (new Date(discount.valid_from) > now) {
      return NextResponse.json(
        {
          valid: false,
          error: "Codigo aun no vigente",
          errorCode: "code_not_yet_valid",
        },
        { status: 200 },
      );
    }
    if (discount.valid_until && new Date(discount.valid_until) < now) {
      return NextResponse.json(
        { valid: false, error: "Codigo expirado", errorCode: "code_expired" },
        { status: 200 },
      );
    }

    // Check max uses
    if (
      discount.max_uses !== null &&
      discount.uses_count >= discount.max_uses
    ) {
      return NextResponse.json(
        { valid: false, error: "Codigo agotado", errorCode: "code_exhausted" },
        { status: 200 },
      );
    }

    // Check student-specific
    if (
      discount.specific_student_id &&
      discount.specific_student_id !== student.id
    ) {
      return NextResponse.json(
        {
          valid: false,
          error: "Codigo no valido para tu cuenta",
          errorCode: "code_not_for_you",
        },
        { status: 200 },
      );
    }

    // Check applicable packs (empty array = no restriction)
    if (
      discount.applicable_packs &&
      discount.applicable_packs.length > 0 &&
      !discount.applicable_packs.includes(pack_type)
    ) {
      return NextResponse.json(
        {
          valid: false,
          error: "Codigo no aplica para este pack",
          errorCode: "code_not_applicable",
        },
        { status: 200 },
      );
    }

    // Check one-time-per-student
    if (discount.one_time_per_student) {
      const { data: usage } = await dbClient
        .from("tu_discount_usage")
        .select("id")
        .eq("discount_code_id", discount.id)
        .eq("student_id", student.id)
        .single();

      if (usage) {
        return NextResponse.json(
          {
            valid: false,
            error: "Ya usaste este codigo",
            errorCode: "code_already_used",
          },
          { status: 200 },
        );
      }
    }

    // Calculate discounted price
    const originalPrice = packDef.priceCop;
    const discountedPrice = calculateDiscount(
      originalPrice,
      discount.discount_type as "percentage" | "fixed",
      Number(discount.discount_value),
    );

    return NextResponse.json({
      valid: true,
      code_id: discount.id,
      discount_type: discount.discount_type,
      discount_value: Number(discount.discount_value),
      original_price: originalPrice,
      discounted_price: discountedPrice,
      savings: originalPrice - discountedPrice,
    });
  } catch (error) {
    console.error("[discounts/validate]", error);
    return NextResponse.json(
      { error: "Error validando codigo", errorCode: "server_error" },
      { status: 500 },
    );
  }
}
