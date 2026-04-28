/**
 * Telegram Bot Notifications for TU. by Tata Umana
 *
 * Sends real-time alerts to Tata's Telegram bot for:
 * - New bookings
 * - Chat conversations
 * - Payment confirmations
 * - Site activity
 */

async function sendTelegramMessage(text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error("[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
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
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[Telegram] Failed to send message:", response.status, err);
      return false;
    }

    console.log("[Telegram] Notification sent successfully");
    return true;
  } catch (error) {
    console.error("[Telegram] Error sending message:", error);
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
