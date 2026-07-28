import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { z } from "zod";

/**
 * Invite redemption for first-time portal access.
 *
 * GET  ?t=<token>  — validate only. Never consumes anything, so WhatsApp
 *                    link previews and email scanners are harmless.
 * POST { token }   — create the session. Called when the student presses
 *                    the button on /bienvenida. Generates a fresh Supabase
 *                    magic token server-side and verifies it in the same
 *                    request, so Supabase's 1-hour OTP expiry never matters.
 */

const RedeemSchema = z.object({ token: z.string().min(16).max(200) });

// Simple in-memory rate limit: 10 attempts per IP per minute.
const attempts = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  if (attempts.size > 5000) {
    for (const [key, val] of attempts) {
      if (now > val.resetAt) attempts.delete(key);
    }
  }
  return entry.count > 10;
}

function serviceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") || "";
  if (token.length < 16 || token.length > 200) {
    return NextResponse.json({ valid: false, reason: "invalid" });
  }

  const service = serviceClient();
  if (!service) {
    return NextResponse.json({ valid: false, reason: "config" }, { status: 500 });
  }

  const { data: student } = await service
    .from("tu_students")
    .select("full_name, invite_expires_at, is_blocked")
    .eq("invite_token", token)
    .single();

  if (!student || student.is_blocked) {
    return NextResponse.json({ valid: false, reason: "invalid" });
  }

  const expired =
    !student.invite_expires_at ||
    new Date(student.invite_expires_at).getTime() < Date.now();

  return NextResponse.json({
    valid: !expired,
    reason: expired ? "expired" : null,
    firstName: student.full_name.split(" ")[0],
  });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un minuto. / Too many attempts." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = RedeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enlace invalido" }, { status: 400 });
  }

  const service = serviceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Servicio no disponible" },
      { status: 500 },
    );
  }

  const { data: student } = await service
    .from("tu_students")
    .select("id, email, full_name, phone, auth_id, is_blocked, invite_expires_at")
    .eq("invite_token", parsed.data.token)
    .single();

  if (!student || student.is_blocked) {
    return NextResponse.json(
      {
        error:
          "Este enlace no es valido. Pide uno nuevo por WhatsApp. / This link is not valid.",
      },
      { status: 404 },
    );
  }

  if (
    !student.invite_expires_at ||
    new Date(student.invite_expires_at).getTime() < Date.now()
  ) {
    return NextResponse.json(
      {
        error:
          "Este enlace ya expiro. Pide uno nuevo por WhatsApp. / This link has expired.",
      },
      { status: 410 },
    );
  }

  // Ensure an auth account exists (CSV-imported students may not have one)
  if (!student.auth_id) {
    const { data: authData, error: authError } =
      await service.auth.admin.createUser({
        email: student.email,
        email_confirm: true,
        user_metadata: {
          full_name: student.full_name,
          phone: student.phone || null,
        },
      });

    if (authError && !authError.message?.includes("already been registered")) {
      console.error("[redeem-invite] createUser:", authError.message);
      return NextResponse.json(
        { error: "No se pudo activar la cuenta. Contacta por WhatsApp." },
        { status: 500 },
      );
    }

    if (authData?.user) {
      await service
        .from("tu_students")
        .update({ auth_id: authData.user.id })
        .eq("id", student.id);
    }
  }

  // Fresh magic token, verified immediately — expiry can't bite
  const { data: linkData, error: linkError } =
    await service.auth.admin.generateLink({
      type: "magiclink",
      email: student.email,
    });

  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error("[redeem-invite] generateLink:", linkError?.message);
    return NextResponse.json(
      { error: "No se pudo iniciar sesion. Intenta de nuevo." },
      { status: 500 },
    );
  }

  // Link auth_id if the auth user pre-existed but was never connected
  if (!student.auth_id && linkData.user?.id) {
    await service
      .from("tu_students")
      .update({ auth_id: linkData.user.id })
      .eq("id", student.id);
  }

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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

  if (verifyError) {
    console.error("[redeem-invite] verifyOtp:", verifyError.message);
    return NextResponse.json(
      { error: "No se pudo iniciar sesion. Intenta de nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, redirect: "/portal" });
}
