import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * POST /api/admin/send-instructions
 * One-time endpoint to send login instructions to Telegram.
 * Protected by admin session auth.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured" },
      { status: 500 },
    );
  }

  const message = `<b>TU. ADMIN — Instrucciones de Acceso</b>

Hola Tata! Tu panel de administracion esta listo.

<b>Como iniciar sesion:</b>
1. Ve a <b>tataumana.com/login</b>
2. Usa tu email de admin
3. Click "Enlace Magico" — te llega un link al email
4. O usa tu contrasena si la tienes configurada

<b>Que puedes hacer en el Admin:</b>

<b>Hoy</b> — Ver las clases del dia, lista de alumnos reservados, hacer check-in

<b>Clases</b> — Ver todas las sesiones de la semana, generar nuevas sesiones, completar o cancelar clases

<b>Alumnos</b> — Buscar y ver todos los alumnos registrados, crear nuevos alumnos manualmente, ver sus packs y pagos

<b>Packs</b> — Ver todos los packs activos/expirados, crear nuevos packs para alumnos, gestionar membresías

<b>Pagos</b> — Ver transacciones pendientes y aprobadas, verificar pagos manuales (Nequi, efectivo, etc.)

<b>Link directo:</b> tataumana.com/admin

Si tienes alguna pregunta, escribe por aqui!`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: "Telegram send failed", details: err },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: "Instructions sent to Telegram" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send", details: String(error) },
      { status: 500 },
    );
  }
}
