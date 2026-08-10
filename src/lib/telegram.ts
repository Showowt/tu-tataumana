/**
 * Telegram Bot Notifications for TU. by Tata Umana
 *
 * Sends real-time alerts to Tata's Telegram bot for:
 * - New bookings
 * - Chat conversations
 * - Payment confirmations
 * - Site activity
 */

// Map raw pack_type codes to friendly display names
const PACK_DISPLAY_NAMES: Record<string, string> = {
  WALK_IN: "Clase Walk-In",
  DROP_IN: "Clase Walk-In",
  JUST_FLOW_PACK: "Just Flow Pack",
  TU_HEALING_PACK: "TU Healing Pack",
  TU_BALANCE_PACK: "TU Balance Pack",
  TU_UNLIMITED: "Ilimitado Mensual",
  TU_EQUILIBRIUM: "TU Balance Pack",
  TU_LIFE_PACK: "Ilimitado Mensual",
  PRIVATE_SESSION: "Sesion Privada",
  MAYO_MAMA: "Especial Aniversario",
  MAYO_2X1: "Promo 2x1",
  ANNIVERSARY_5EXP: "Aniversario 5 Experiencias",
  INDUSTRY_SPECIAL: "Especial Industria",
  FRIDAY_OPEN: "Viernes Open Flow",
};

function packDisplayName(packType: string): string {
  return PACK_DISPLAY_NAMES[packType] || packType.replace(/_/g, " ");
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const primaryChatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !primaryChatId) {
    console.error("[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
    return false;
  }

  // Send to primary + any extra notification recipients
  const extraIds = (process.env.TELEGRAM_EXTRA_CHAT_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  const allChatIds = [primaryChatId, ...extraIds];

  let anySuccess = false;

  for (const chatId of allChatIds) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error(`[Telegram] Failed to send to ${chatId}:`, response.status, err);
      } else {
        anySuccess = true;
      }
    } catch (error) {
      console.error(`[Telegram] Error sending to ${chatId}:`, error);
    }
  }

  if (anySuccess) {
    console.log(`[Telegram] Notification sent to ${allChatIds.length} recipient(s)`);
  }
  return anySuccess;
}

export async function sendTelegramReply(
  chatId: string,
  text: string,
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("[Telegram] TELEGRAM_BOT_TOKEN not set");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[Telegram] Reply failed:", response.status, err);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Telegram] Reply error:", error);
    return false;
  }
}

export async function notifyNewBooking(booking: {
  name: string;
  email?: string;
  phone: string;
  service: string;
  preferred_date?: string;
  message?: string;
}): Promise<void> {
  const lines = [
    "<b>NEW BOOKING</b>",
    "",
    `<b>Name:</b> ${booking.name}`,
    `<b>Phone:</b> ${booking.phone}`,
    booking.email ? `<b>Email:</b> ${booking.email}` : "",
    `<b>Service:</b> ${booking.service}`,
    booking.preferred_date ? `<b>Date:</b> ${booking.preferred_date}` : "",
    booking.message ? `<b>Note:</b> ${booking.message}` : "",
    "",
    `<a href="https://wa.me/${booking.phone.replace(/[^0-9]/g, "")}">Message on WhatsApp</a>`,
  ].filter(Boolean);

  await sendTelegramMessage(lines.join("\n"));
}

export async function notifyChatConversation(data: {
  userMessage: string;
  botResponse: string;
}): Promise<void> {
  const truncatedUser =
    data.userMessage.length > 300
      ? data.userMessage.slice(0, 300) + "..."
      : data.userMessage;
  const truncatedBot =
    data.botResponse.length > 500
      ? data.botResponse.slice(0, 500) + "..."
      : data.botResponse;

  const lines = [
    "<b>CHAT - Website Visitor</b>",
    "",
    `<b>Visitor:</b> ${escapeHtml(truncatedUser)}`,
    "",
    `<b>YOU replied:</b> ${escapeHtml(truncatedBot)}`,
  ];

  await sendTelegramMessage(lines.join("\n"));
}

export async function notifyPaymentReceived(data: {
  reference: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  status: string;
}): Promise<void> {
  const amountFormatted =
    data.currency === "COP"
      ? `$${(data.amount / 100).toLocaleString("es-CO")} COP`
      : `$${(data.amount / 100).toFixed(2)} USD`;

  const lines = [
    `<b>PAYMENT ${data.status === "APPROVED" ? "CONFIRMED" : data.status}</b>`,
    "",
    `<b>Amount:</b> ${amountFormatted}`,
    `<b>Reference:</b> ${data.reference}`,
    data.customerName ? `<b>Customer:</b> ${data.customerName}` : "",
    data.customerEmail ? `<b>Email:</b> ${data.customerEmail}` : "",
  ].filter(Boolean);

  await sendTelegramMessage(lines.join("\n"));
}

export async function notifyHotLead(data: {
  source: string;
  name?: string;
  phone?: string;
  email?: string;
  service_interest?: string;
  booking_step?: string;
}): Promise<void> {
  const isAbandoned = data.booking_step === "abandoned";
  const emoji = isAbandoned ? "ABANDONED BOOKING" : "HOT LEAD";

  const lines = [
    `<b>${emoji}</b>`,
    "",
    data.name ? `<b>Name:</b> ${escapeHtml(data.name)}` : "",
    data.phone ? `<b>Phone:</b> ${data.phone}` : "",
    data.email ? `<b>Email:</b> ${data.email}` : "",
    data.service_interest
      ? `<b>Interested in:</b> ${escapeHtml(data.service_interest)}`
      : "",
    `<b>Source:</b> ${data.source}`,
    data.booking_step ? `<b>Stopped at:</b> ${data.booking_step}` : "",
    "",
    data.phone
      ? `<a href="https://wa.me/${data.phone.replace(/[^0-9]/g, "")}">Reach out on WhatsApp NOW</a>`
      : "No phone captured — check chat transcript",
  ].filter(Boolean);

  await sendTelegramMessage(lines.join("\n"));
}

export async function notifyChatLeadScore(data: {
  score: number;
  intent: string;
  messageCount: number;
  lastMessage: string;
  extractedName?: string;
  extractedPhone?: string;
}): Promise<void> {
  // Only alert for high-scoring leads (50+) who didn't book
  if (data.score < 50) return;

  const lines = [
    `<b>HIGH-INTENT VISITOR (Score: ${data.score}/100)</b>`,
    "",
    `<b>Intent:</b> ${data.intent}`,
    `<b>Messages exchanged:</b> ${data.messageCount}`,
    data.extractedName ? `<b>Name:</b> ${escapeHtml(data.extractedName)}` : "",
    data.extractedPhone ? `<b>Phone:</b> ${data.extractedPhone}` : "",
    "",
    `<b>Last question:</b> ${escapeHtml(data.lastMessage.slice(0, 200))}`,
    "",
    "This visitor showed strong interest but hasn't booked yet.",
  ].filter(Boolean);

  await sendTelegramMessage(lines.join("\n"));
}

export async function notifyNewMembership(data: {
  studentName: string;
  email: string;
  packType: string;
  totalClasses: number;
  paymentMethod?: string;
}): Promise<void> {
  const lines = [
    "<b>NEW MEMBERSHIP ACTIVATED</b>",
    "",
    `<b>Student:</b> ${escapeHtml(data.studentName)}`,
    `<b>Email:</b> ${data.email}`,
    `<b>Pack:</b> ${escapeHtml(packDisplayName(data.packType))}`,
    `<b>Classes:</b> ${data.totalClasses}`,
    data.paymentMethod ? `<b>Payment:</b> ${escapeHtml(data.paymentMethod)}` : "",
    "",
    "Member can now book classes from the portal.",
  ].filter(Boolean);

  await sendTelegramMessage(lines.join("\n"));
}

export async function notifyNewAccount(data: {
  name: string;
  email: string;
  source: string;
}): Promise<void> {
  const lines = [
    "<b>NEW ACCOUNT CREATED</b>",
    "",
    `<b>Name:</b> ${escapeHtml(data.name)}`,
    `<b>Email:</b> ${data.email}`,
    `<b>Source:</b> ${data.source}`,
  ];

  await sendTelegramMessage(lines.join("\n"));
}

export async function notifyClassBooking(data: {
  studentName: string;
  studentEmail?: string;
  className: string;
  classDate: string;
  classTime: string;
  teacher: string;
  packType: string;
  creditsRemaining: number;
}): Promise<void> {
  const creditsText = data.creditsRemaining === -1 ? "Ilimitado" : `${data.creditsRemaining}`;
  const msg = [
    "📋 <b>NUEVA RESERVA</b>",
    "",
    `<b>Alumno:</b> ${data.studentName}`,
    data.studentEmail ? `<b>Email:</b> ${data.studentEmail}` : "",
    `<b>Clase:</b> ${data.className}`,
    `<b>Fecha:</b> ${data.classDate} · ${data.classTime}`,
    `<b>Profesor:</b> ${data.teacher}`,
    `<b>Pack:</b> ${packDisplayName(data.packType)} (${creditsText} creditos restantes)`,
  ].filter(Boolean).join("\n");
  await sendTelegramMessage(msg);
}

export async function notifyPackPurchase(data: {
  studentName: string;
  studentEmail?: string;
  packName: string;
  packType: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  discountCode?: string;
  discountAmount?: number;
  originalAmount?: number;
}): Promise<void> {
  const formatMoney = (amt: number, cur: string) =>
    cur === "USD"
      ? `$${amt} USD`
      : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amt);

  const lines = [
    "💰 <b>COMPRA DE PACK</b>",
    "",
    `<b>Alumno:</b> ${data.studentName}`,
    data.studentEmail ? `<b>Email:</b> ${data.studentEmail}` : "",
    `<b>Pack:</b> ${data.packName}`,
    `<b>Monto:</b> ${formatMoney(data.amount, data.currency)}`,
    `<b>Metodo:</b> ${data.paymentMethod}`,
  ];

  if (data.discountCode) {
    lines.push("");
    lines.push(`<b>Descuento:</b> ${data.discountCode} (-${formatMoney(data.discountAmount || 0, data.currency)})`);
    if (data.originalAmount) {
      lines.push(`<b>Precio original:</b> ${formatMoney(data.originalAmount, data.currency)}`);
    }
  }

  await sendTelegramMessage(lines.filter(Boolean).join("\n"));
}

export async function notifyDiscountUsed(data: {
  studentName: string;
  code: string;
  discountType: string;
  discountValue: number;
  packName: string;
  originalPrice: number;
  finalPrice: number;
}): Promise<void> {
  const discountLabel = data.discountType === "percentage"
    ? `${data.discountValue}%`
    : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(data.discountValue);

  const msg = [
    "🏷️ <b>CODIGO DE DESCUENTO USADO</b>",
    "",
    `<b>Codigo:</b> ${data.code}`,
    `<b>Alumno:</b> ${data.studentName}`,
    `<b>Pack:</b> ${data.packName}`,
    `<b>Descuento:</b> ${discountLabel}`,
    `<b>Precio final:</b> ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(data.finalPrice)}`,
  ].join("\n");
  await sendTelegramMessage(msg);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Set the Telegram bot menu commands.
 * Call once to register commands with BotFather.
 */
export async function setTelegramBotCommands(): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const commands = [
    { command: "ayuda", description: "Ver todos los comandos disponibles" },
    { command: "hoy", description: "Clases y reservas de hoy" },
    { command: "clases", description: "Clases de la semana con reservas" },
    { command: "buscar", description: "Buscar alumno por nombre" },
    { command: "reservas", description: "Reservas de hoy (o /reservas mañana, +2)" },
    { command: "creditos", description: "Alumnos con creditos disponibles" },
    { command: "descuento", description: "Crear codigo de descuento" },
    { command: "descuentos", description: "Ver codigos activos" },
    { command: "alumno", description: "Crear cuenta para alumno" },
    { command: "ingresos", description: "Ver ingresos del mes" },
  ];

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}
