/**
 * POST /api/auth/signup
 * Creates a new user account with auto-confirmed email.
 * Bypasses Supabase's default email confirmation which requires
 * custom SMTP (not configured). Uses admin API to create the user
 * directly with email_confirm: true.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ADMIN_EMAILS } from "@/lib/constants/business-rules";
import { sendTelegramMessage } from "@/lib/telegram";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2).max(100),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
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

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
    );

    // Create user with auto-confirmed email (no confirmation email needed)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone: phone || null,
      },
    });

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        return NextResponse.json(
          { error: "Ya existe una cuenta con este email. Inicia sesion o usa el enlace magico. / An account with this email already exists." },
          { status: 409 },
        );
      }
      console.error("[auth/signup]", authError.message);
      return NextResponse.json(
        { error: "Error al crear la cuenta. Intenta de nuevo." },
        { status: 500 },
      );
    }

    // Create student profile
    if (authData?.user) {
      const isAdmin = ADMIN_EMAILS.includes(cleanEmail);

      const { error: studentError } = await supabase.from("tu_students").insert({
        auth_id: authData.user.id,
        email: cleanEmail,
        full_name,
        phone: phone || null,
        role: isAdmin ? "admin" : "student",
        preferred_lang: "es",
      });

      if (studentError && studentError.code !== "23505") {
        console.error("[auth/signup] Student profile error:", studentError.message);
      }

      // Notify Tata
      try {
        await sendTelegramMessage(
          `👤 <b>NUEVO ALUMNO REGISTRADO</b>\n\n<b>Nombre:</b> ${full_name}\n<b>Email:</b> ${cleanEmail}${phone ? `\n<b>Tel:</b> ${phone}` : ""}\n\nSe registro directamente en el sitio web.`
        );
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cuenta creada exitosamente",
    });
  } catch (error) {
    console.error("[auth/signup]", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
