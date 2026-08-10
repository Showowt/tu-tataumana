/**
 * POST /api/auth/signup
 * Creates a new user account with auto-confirmed email.
 * Bypasses Supabase's default email confirmation which requires
 * custom SMTP (not configured). Uses admin API to create the user
 * directly with email_confirm: true.
 *
 * Safety: A DB trigger on auth.users auto-fixes NULL string fields
 * that break GoTrue's Go SQL scanner. If the bug still surfaces,
 * this route detects it, runs an emergency SQL fix, and retries.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";
import { sendTelegramMessage } from "@/lib/telegram";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2).max(100),
  phone: z.string().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = ReturnType<typeof createClient<any>>;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: public account creation — blunt mass auth.users pollution.
    // 15/min tolerates a workshop signing up from one front-desk WiFi (shared NAT).
    if (rateLimit(`signup:${clientIp(request)}`, 15, 60_000)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera un momento. / Too many attempts, try again shortly." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos invalidos" },
        { status: 400 },
      );
    }

    const { email, password, full_name, phone } = parsed.data;
    const cleanEmail = email.trim().toLowerCase();

    // Admin accounts must be provisioned out-of-band (tu_admin_users / seeded auth),
    // NEVER self-served. A public signup with email_confirm:true + a client-chosen
    // password for an admin email = privilege escalation (attacker logs in as admin).
    if (ADMIN_EMAILS.includes(cleanEmail)) {
      return NextResponse.json(
        { error: "Este email no puede registrarse aqui. Contacta al administrador. / This email cannot self-register." },
        { status: 403 },
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      console.error("[auth/signup] SUPABASE_SERVICE_ROLE_KEY not configured");
      return NextResponse.json(
        { error: "Servidor no configurado. Contacta al administrador. / Server not configured." },
        { status: 500 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Create user with auto-confirmed email (no confirmation email needed)
    let { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone: phone || null,
      },
    });

    if (authError) {
      // Duplicate email
      if (authError.message?.includes("already been registered")) {
        return NextResponse.json(
          { error: "Ya existe una cuenta con este email. Inicia sesion con tu contraseña o usa el enlace magico. / An account with this email already exists." },
          { status: 409 },
        );
      }
      // GoTrue NULL scan bug — run emergency fix and retry once
      if (authError.message?.includes("Scan error") || authError.message?.includes("email_change")) {
        console.error("[auth/signup] GoTrue NULL column bug detected, running emergency fix...");
        await fixAuthUserNulls(supabaseUrl, serviceKey);
        // Retry the creation
        const retry = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: { full_name, phone: phone || null },
        });
        if (retry.error) {
          console.error("[auth/signup] Retry failed:", retry.error.message);
          return NextResponse.json(
            { error: "Error temporal del servidor. Intenta de nuevo en unos segundos. / Temporary server error. Try again shortly." },
            { status: 500 },
          );
        }
        authData = retry.data;
        authError = null;
      } else {
        console.error("[auth/signup]", authError.message, authError.status);
        return NextResponse.json(
          { error: "No se pudo crear la cuenta. Intenta de nuevo. / Could not create the account, please try again." },
          { status: 500 },
        );
      }
    }

    // Create student profile + notify
    if (authData?.user) {
      await createStudentProfile(supabase, authData.user.id, cleanEmail, full_name, phone);
    }

    return NextResponse.json({
      success: true,
      message: "Cuenta creada exitosamente",
    });
  } catch (error) {
    console.error("[auth/signup] Unexpected error:", error);
    return NextResponse.json(
      { error: "Error inesperado del servidor. Intenta de nuevo. / Unexpected server error." },
      { status: 500 },
    );
  }
}

/**
 * Create student profile and notify admin via Telegram.
 */
async function createStudentProfile(
  supabase: ServiceClient,
  userId: string,
  email: string,
  fullName: string,
  phone: string | undefined,
) {
  // Self-serve signup ALWAYS creates a plain student. Admin role is granted only
  // via ADMIN_EMAILS / tu_admin_users, never from a public account-creation path.
  const { error: studentError } = await supabase.from("tu_students").insert({
    auth_id: userId,
    email,
    full_name: fullName,
    phone: phone || null,
    role: "student",
    preferred_lang: "es",
  });

  if (studentError && studentError.code !== "23505") {
    console.error("[auth/signup] Student profile error:", studentError.message);
  }

  // Notify Tata
  try {
    await sendTelegramMessage(
      `👤 <b>NUEVO ALUMNO REGISTRADO</b>\n\n<b>Nombre:</b> ${fullName}\n<b>Email:</b> ${email}${phone ? `\n<b>Tel:</b> ${phone}` : ""}\n\nSe registro directamente en el sitio web.`
    );
  } catch {
    // Non-critical
  }
}

/**
 * Emergency fix: set NULL string columns in auth.users to empty strings.
 * GoTrue's Go SQL scanner crashes on NULL values in varchar columns.
 * Uses direct PostgREST SQL via service role.
 */
async function fixAuthUserNulls(supabaseUrl: string, serviceKey: string) {
  try {
    const sql = `UPDATE auth.users SET
      email_change = COALESCE(email_change, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, '')
    WHERE email_change IS NULL
       OR email_change_token_new IS NULL
       OR email_change_token_current IS NULL
       OR confirmation_token IS NULL
       OR recovery_token IS NULL`;

    // Use the Supabase Management/SQL API via fetch (PostgREST can't run raw SQL)
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!res.ok) {
      // RPC function doesn't exist — that's fine, the DB trigger is the primary fix
      console.warn("[auth/signup] exec_sql RPC not available — relying on DB trigger");
    }
  } catch {
    // Non-critical — the DB trigger is the primary safety net
    console.warn("[auth/signup] fixAuthUserNulls failed — relying on DB trigger");
  }
}
