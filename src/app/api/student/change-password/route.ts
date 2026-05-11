import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { z } from "zod";
import { sendTelegramMessage } from "@/lib/telegram";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => { cookieStore.set(name, value, options); }); } catch {}
          },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos invalidos" }, { status: 400 });
    }

    // Verify current password by attempting sign-in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });

    if (signInError) {
      return NextResponse.json({ error: "Contrasena actual incorrecta / Current password is incorrect" }, { status: 400 });
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (updateError) {
      console.error("[change-password]", updateError.message);
      return NextResponse.json({ error: "Error al cambiar la contrasena" }, { status: 500 });
    }

    // Get student info for notification
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let studentName = user.email;
    if (serviceKey) {
      const dbClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
      const { data: student } = await dbClient
        .from("tu_students")
        .select("full_name, phone")
        .eq("auth_id", user.id)
        .single();
      if (student) {
        studentName = student.full_name || user.email;
      }
    }

    // Notify Tata via Telegram
    try {
      await sendTelegramMessage(
        `🔐 <b>CAMBIO DE CONTRASENA</b>\n\n<b>Alumno:</b> ${studentName}\n<b>Email:</b> ${user.email}\n<b>Hora:</b> ${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })}\n\nEl alumno cambio su contrasena exitosamente.`
      );
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      message: "Contrasena cambiada exitosamente / Password changed successfully",
    });
  } catch (error) {
    console.error("[change-password]", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
