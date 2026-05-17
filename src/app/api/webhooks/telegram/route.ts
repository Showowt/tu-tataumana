import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramMessage {
  message_id: number;
  from: { id: number; first_name: string };
  chat: { id: number; type: string };
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhoto[];
}

interface TelegramPhoto {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface ParsedIntent {
  action:
    | "today_schedule"
    | "week_schedule"
    | "cancel_session"
    | "close_date"
    | "open_date"
    | "mark_full"
    | "create_event_text"
    | "cancel_event"
    | "student_count"
    | "pending_payments"
    | "active_packs"
    | "search_student"
    | "recent_leads"
    | "dashboard"
    | "bookings_today"
    | "health_check"
    | "help"
    | "create_discount"
    | "list_discounts"
    | "deactivate_discount"
    | "create_student_account"
    | "unknown";
  params: Record<string, string>;
}

interface SessionWithDef {
  id: string;
  session_date: string;
  start_time: string;
  teacher: string;
  capacity: number;
  enrolled: number;
  status: string;
  cancel_reason: string | null;
  definition: {
    name: string;
    name_es: string;
    style: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Env / Clients
// ---------------------------------------------------------------------------

function getSupabase(): SupabaseClient | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

function getBotToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN || "").trim();
}

function getAllowedChatId(): string {
  return (process.env.TELEGRAM_CHAT_ID || "").trim();
}

function getAnthropicKey(): string {
  return (process.env.ANTHROPIC_API_KEY || "").trim();
}

// ---------------------------------------------------------------------------
// Colombia timezone helpers
// ---------------------------------------------------------------------------

function getColombiaDate(offsetDays = 0): Date {
  const now = new Date();
  const colombia = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Bogota" })
  );
  colombia.setDate(colombia.getDate() + offsetDays);
  return colombia;
}

function getColombiaDateStr(offsetDays = 0): string {
  return getColombiaDate(offsetDays).toISOString().split("T")[0];
}

function getColombiaWeekRange(): { start: string; end: string } {
  const today = getColombiaDate();
  const dayOfWeek = today.getDay();
  const start = new Date(today);
  start.setDate(start.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

const DAY_NAMES_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
];

function spanishDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const dayName = DAY_NAMES_ES[d.getDay()];
  const day = d.getDate();
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const month = months[d.getMonth()];
  return `${dayName} ${day} ${month}`;
}

// ---------------------------------------------------------------------------
// Telegram API helpers
// ---------------------------------------------------------------------------

async function sendTelegram(text: string): Promise<boolean> {
  const botToken = getBotToken();
  const chatId = getAllowedChatId();
  if (!botToken || !chatId) return false;

  // Telegram limit is 4096 chars — split if needed
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= 4096) {
      chunks.push(remaining);
      break;
    }
    // Find a good break point
    let breakIdx = remaining.lastIndexOf("\n", 4096);
    if (breakIdx < 2000) breakIdx = 4096;
    chunks.push(remaining.slice(0, breakIdx));
    remaining = remaining.slice(breakIdx);
  }

  for (const chunk of chunks) {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );
    if (!res.ok) {
      console.error("[Telegram] sendMessage failed:", await res.text());
      return false;
    }
  }
  return true;
}

async function downloadTelegramFile(fileId: string): Promise<Buffer | null> {
  const botToken = getBotToken();
  if (!botToken) return null;

  // Get file path
  const fileInfoRes = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
  );
  if (!fileInfoRes.ok) return null;
  const fileInfo = await fileInfoRes.json();
  const filePath = fileInfo.result?.file_path;
  if (!filePath) return null;

  // Download file
  const downloadRes = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${filePath}`
  );
  if (!downloadRes.ok) return null;

  const arrayBuffer = await downloadRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ---------------------------------------------------------------------------
// Claude AI — Intent parsing
// ---------------------------------------------------------------------------

async function parseIntent(userMessage: string): Promise<ParsedIntent> {
  const apiKey = getAnthropicKey();
  if (!apiKey) {
    return { action: "unknown", params: {} };
  }

  const todayStr = getColombiaDateStr();
  const todayDate = getColombiaDate();
  const dayName = DAY_NAMES_ES[todayDate.getDay()];

  const systemPrompt = `Eres un parser de comandos para un bot de Telegram de un estudio de yoga. Hoy es ${dayName} ${todayStr}. Colombia timezone (UTC-5).

Extrae la accion y parametros del mensaje de la administradora. Responde SOLO con JSON valido, sin markdown.

Acciones posibles:
- "today_schedule": ver clases de hoy. Params: { "date": "YYYY-MM-DD" }
- "week_schedule": ver clases de la semana. Params: {}
- "cancel_session": cancelar una sesion. Params: { "date": "YYYY-MM-DD", "time": "HH:MM" (24h), "reason": "..." }
- "close_date": cerrar un dia (sin clases). Params: { "date": "YYYY-MM-DD", "reason": "..." }
- "open_date": reabrir un dia cerrado. Params: { "date": "YYYY-MM-DD" }
- "mark_full": marcar una sesion como llena. Params: { "date": "YYYY-MM-DD", "time": "HH:MM" (24h) }
- "create_event_text": crear un evento especial. Params: { "title": "...", "date": "YYYY-MM-DD", "time": "HH:MM" (24h), "price_cop": numero, "capacity": numero, "description": "..." }
- "cancel_event": cancelar un evento. Params: { "title": "..." }
- "student_count": ver cuantos alumnos hay. Params: {}
- "pending_payments": ver pagos pendientes. Params: {}
- "active_packs": ver packs activos. Params: {}
- "search_student": buscar alumno por nombre. Params: { "name": "..." }
- "recent_leads": ver leads recientes. Params: {}
- "dashboard": resumen general del negocio. Params: {}
- "bookings_today": ver reservas de hoy con nombres. Params: {}
- "health_check": verificar que el sitio funciona. Params: {}
- "help": mostrar ayuda. Params: {}
- "create_discount": crear codigo de descuento. Params: { "code": "...", "type": "percentage|fixed", "value": numero, "max_uses": numero o null, "valid_days": numero o null }
- "list_discounts": ver codigos de descuento activos
- "deactivate_discount": desactivar un codigo. Params: { "code": "..." }
- "create_student_account": crear cuenta para un alumno. Params: { "name": "nombre completo", "email": "email@example.com", "phone": "telefono (opcional)" }
- "unknown": no se entiende. Params: {}

Reglas:
- "hoy" = ${todayStr}
- "manana" = fecha de manana
- "viernes" = proximo viernes desde hoy
- Convierte horas 12h a 24h: "9:30 AM" -> "09:30", "7:15 PM" -> "19:15", "5:30 PM" -> "17:30"
- Si dice "que hay hoy" o "clases de hoy" -> today_schedule
- Si dice "semana" o "esta semana" -> week_schedule
- Si dice "cancelar clase" -> cancel_session
- Si dice "cerrar" -> close_date
- Si dice "abrir" -> open_date
- Si dice "llena" o "full" -> mark_full
- Si dice "evento" y datos -> create_event_text
- Si dice "cancelar evento" -> cancel_event
- Si dice "alumnos" o "cuantos" -> student_count
- Si dice "pagos" o "pagos pendientes" -> pending_payments
- Si dice "packs" o "packs activos" -> active_packs
- Si dice "buscar" seguido de un nombre -> search_student
- Si dice "leads" o "interesados" -> recent_leads
- Si dice "resumen" o "dashboard" o "estadisticas" -> dashboard
- Si dice "reservas" o "reservas de hoy" -> bookings_today
- Si dice "sitio" o "health" o "status" o "verificar" -> health_check
- Si dice "ayuda" o "help" -> help
- Si dice "descuento" y quiere CREAR uno -> create_discount
- Si dice "descuentos activos" o "ver descuentos" -> list_discounts
- Si dice "desactivar" y menciona un codigo -> deactivate_discount
- Si dice "crear cuenta" o "nueva cuenta" o "registrar alumno" o "crear alumno" o "crear perfil" -> create_student_account`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      console.error("[Claude] parseIntent failed:", await res.text());
      return { action: "unknown", params: {} };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";

    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { action: "unknown", params: {} };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      action: parsed.action || "unknown",
      params: parsed.params || {},
    };
  } catch (err) {
    console.error("[Claude] parseIntent error:", err);
    return { action: "unknown", params: {} };
  }
}

// ---------------------------------------------------------------------------
// Claude Vision — Extract event from photo
// ---------------------------------------------------------------------------

async function extractEventFromImage(
  imageBase64: string,
  caption?: string
): Promise<Record<string, string> | null> {
  const apiKey = getAnthropicKey();
  if (!apiKey) return null;

  const todayStr = getColombiaDateStr();

  const systemPrompt = `Eres un asistente que extrae informacion de eventos de imagenes de flyers para un estudio de yoga en Cartagena, Colombia. Hoy es ${todayStr}.

Extrae estos campos del flyer/imagen y responde SOLO con JSON valido, sin markdown:
{
  "title": "nombre del evento",
  "title_es": "nombre en español",
  "description": "descripcion breve en ingles",
  "description_es": "descripcion breve en español",
  "date": "YYYY-MM-DD",
  "time": "HH:MM (24h)",
  "end_time": "HH:MM (24h) o null",
  "price_cop": "numero o 0",
  "capacity": "numero o 15",
  "teacher": "nombre del profesor o Tata",
  "cta_text": "call-to-action button text in English (e.g. RESERVE YOUR SPOT, RESERVE PROMO)",
  "cta_text_es": "call-to-action en español (e.g. RESERVA TU CUPO, RESERVAR PROMO)",
  "booking_service": "service name for booking system (e.g. Sound Healing May 22, Mayo Mes Mamá — 4 Clases)"
}

Si no puedes determinar algun campo, usa valores razonables por defecto. El estudio se llama TU. Tataumana.`;

  const userContent: Array<
    | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
    | { type: "text"; text: string }
  > = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: imageBase64,
      },
    },
  ];

  if (caption) {
    userContent.push({
      type: "text",
      text: `La administradora envio esta imagen con el texto: "${caption}". Extrae la info del evento.`,
    });
  } else {
    userContent.push({
      type: "text",
      text: "Extrae la informacion del evento de esta imagen de flyer.",
    });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      console.error("[Claude Vision] failed:", await res.text());
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[Claude Vision] error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Supabase Storage — upload event flyer
// ---------------------------------------------------------------------------

async function uploadEventFlyer(
  supabase: SupabaseClient,
  imageBuffer: Buffer,
  eventId: string,
): Promise<string | null> {
  const filePath = `flyers/${eventId}.jpg`;

  const { error } = await supabase.storage
    .from("event-flyers")
    .upload(filePath, imageBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    console.error("[Storage] upload error:", error.message);
    return null;
  }

  const { data } = supabase.storage
    .from("event-flyers")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Promo handlers (homepage event management via Telegram)
// ---------------------------------------------------------------------------

async function handlePromoAdd(
  supabase: SupabaseClient,
  imageBuffer: Buffer,
  caption?: string,
): Promise<string> {
  const imageBase64 = imageBuffer.toString("base64");

  // Use Claude Vision to extract event details from the flyer
  const extracted = await extractEventFromImage(imageBase64, caption);
  if (!extracted) {
    return "No pude extraer la info del flyer. Intenta con /promo add Titulo | fecha YYYY-MM-DD | precio | texto del boton";
  }

  const eventData = {
    title: extracted.title || "Evento TU.",
    title_es: extracted.title_es || extracted.title || "Evento TU.",
    description: extracted.description || null,
    description_es: extracted.description_es || extracted.description || null,
    event_date: extracted.date || getColombiaDateStr(7),
    start_time: extracted.time || "18:00",
    end_time: extracted.end_time || null,
    teacher: extracted.teacher || "Tata",
    capacity: parseInt(extracted.capacity || "15", 10),
    enrolled: 0,
    price_cop:
      parseInt(String(extracted.price_cop || "0").replace(/[^0-9]/g, ""), 10) ||
      0,
    price_usd: 0,
    location: "TU. Studio",
    is_active: true,
    status: "upcoming" as const,
    show_on_homepage: true,
    cta_text: extracted.cta_text || "RESERVE YOUR SPOT",
    cta_text_es: extracted.cta_text_es || "RESERVA TU CUPO",
    booking_service: extracted.booking_service || extracted.title_es || extracted.title || null,
    accent_color: "gold",
    display_order: 0,
  };

  const { data, error } = await supabase
    .from("tu_events")
    .insert(eventData)
    .select()
    .single();

  if (error) {
    console.error("[Telegram/promo] create error:", error.message);
    return `Error al crear la promo: ${error.message}`;
  }

  // Upload the flyer image to Supabase Storage
  const imageUrl = await uploadEventFlyer(supabase, imageBuffer, data.id);
  if (imageUrl) {
    await supabase
      .from("tu_events")
      .update({ image_url: imageUrl })
      .eq("id", data.id);
  }

  const priceStr =
    eventData.price_cop > 0
      ? `$${eventData.price_cop.toLocaleString("es-CO")} COP`
      : "Gratis";

  return (
    `<b>PROMO AGREGADA A LA HOMEPAGE</b>\n\n` +
    `<b>${data.title_es}</b>\n` +
    `${spanishDate(data.event_date)} a las ${data.start_time}\n` +
    `${priceStr}\n` +
    `Boton: "${eventData.cta_text_es}"\n` +
    (imageUrl ? `Flyer: subido\n` : `Flyer: no se pudo subir\n`) +
    `\nYa esta visible en tataumana.com`
  );
}

async function handlePromoList(supabase: SupabaseClient): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("tu_events")
    .select("id, title, title_es, event_date, start_time, price_cop, show_on_homepage, is_active, image_url")
    .eq("is_active", true)
    .gte("event_date", today)
    .order("display_order", { ascending: true })
    .order("event_date", { ascending: true })
    .limit(10);

  if (error) {
    return `Error: ${error.message}`;
  }

  if (!data || data.length === 0) {
    return "<b>Promos</b>\n\nNo hay eventos activos. Envia una foto con /promo para agregar uno.";
  }

  const lines = data.map((e, i) => {
    const onHomepage = e.show_on_homepage ? "EN HOMEPAGE" : "oculto";
    const hasImage = e.image_url ? "con flyer" : "sin flyer";
    const price = e.price_cop > 0 ? `$${e.price_cop.toLocaleString("es-CO")}` : "Gratis";
    return `${i + 1}. <b>${e.title_es}</b>\n   ${spanishDate(e.event_date)} · ${price} · ${hasImage}\n   [${onHomepage}] ID: ${e.id.slice(0, 8)}`;
  });

  return `<b>Promos Activas (${data.length})</b>\n\n${lines.join("\n\n")}\n\nPara quitar: /promo remove [titulo o ID]`;
}

async function handlePromoRemove(
  supabase: SupabaseClient,
  target: string,
): Promise<string> {
  if (!target) {
    return "Cual promo quieres quitar? Escribe: /promo remove [titulo o ID]";
  }

  // Search by title or ID prefix
  const { data: events } = await supabase
    .from("tu_events")
    .select("id, title, title_es, event_date, show_on_homepage")
    .eq("is_active", true)
    .order("event_date", { ascending: true });

  const targetLower = target.toLowerCase();
  const match = (events || []).find(
    (e) =>
      e.id.toLowerCase().startsWith(targetLower) ||
      e.title.toLowerCase().includes(targetLower) ||
      e.title_es.toLowerCase().includes(targetLower),
  );

  if (!match) {
    return `No encontre promo "${target}". Usa /promo list para ver las activas.`;
  }

  // Remove from homepage (keep the event but hide it)
  const { error } = await supabase
    .from("tu_events")
    .update({ show_on_homepage: false })
    .eq("id", match.id);

  if (error) {
    return `Error: ${error.message}`;
  }

  return (
    `<b>Promo quitada de la homepage</b>\n\n` +
    `${match.title_es}\n` +
    `${spanishDate(match.event_date)}\n\n` +
    `El evento sigue activo en el sistema pero ya no aparece en la pagina.`
  );
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handleTodaySchedule(
  supabase: SupabaseClient,
  params: Record<string, string>
): Promise<string> {
  const dateStr = params.date || getColombiaDateStr();
  const dateLabel = spanishDate(dateStr);

  const { data: sessions, error } = await supabase
    .from("tu_class_sessions")
    .select(
      `
      id, session_date, start_time, teacher, capacity, enrolled, status, cancel_reason,
      definition:tu_class_definitions (name, name_es, style)
    `
    )
    .eq("session_date", dateStr)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("[Telegram] today_schedule error:", error.message);
    return "Error al consultar las clases. Intenta de nuevo.";
  }

  const typedSessions = (sessions || []) as unknown as SessionWithDef[];

  if (typedSessions.length === 0) {
    // Check if it's a closed date
    const { data: closed } = await supabase
      .from("tu_closed_dates")
      .select("date, reason")
      .eq("date", dateStr)
      .single();

    if (closed) {
      return `<b>Horario ${dateLabel}</b>\n\nDia cerrado${closed.reason ? `: ${closed.reason}` : ""}. No hay clases programadas.`;
    }
    return `<b>Horario ${dateLabel}</b>\n\nNo hay sesiones programadas para este dia.`;
  }

  let totalEnrolled = 0;
  let totalCapacity = 0;
  const lines: string[] = [];

  for (const s of typedSessions) {
    const name = s.definition?.name_es || s.definition?.name || s.start_time;
    const enrolled = s.enrolled || 0;
    const capacity = s.capacity || 10;
    totalEnrolled += enrolled;
    totalCapacity += capacity;

    const bar =
      enrolled > 0
        ? "\u2588".repeat(Math.min(enrolled, capacity)) +
          "\u2591".repeat(Math.max(capacity - enrolled, 0))
        : "\u2591".repeat(capacity);

    let statusTag = "";
    if (s.status === "cancelled") {
      statusTag = " CANCELADA";
    } else if (enrolled >= capacity) {
      statusTag = " LLENA";
    } else if (capacity - enrolled <= 3) {
      statusTag = ` ${capacity - enrolled} cupos`;
    }

    lines.push(
      `<b>${s.start_time} - ${name}</b> (${s.teacher})\n${bar}  ${enrolled}/${capacity}${statusTag}`
    );
  }

  const header = `<b>Horario ${dateLabel}</b>\n${typedSessions.length} clases \u00b7 ${totalEnrolled}/${totalCapacity} inscritos\n`;
  return header + "\n" + lines.join("\n\n");
}

async function handleWeekSchedule(
  supabase: SupabaseClient
): Promise<string> {
  const { start, end } = getColombiaWeekRange();

  const { data: sessions, error } = await supabase
    .from("tu_class_sessions")
    .select(
      `
      id, session_date, start_time, teacher, capacity, enrolled, status,
      definition:tu_class_definitions (name, name_es, style)
    `
    )
    .gte("session_date", start)
    .lte("session_date", end)
    .neq("status", "cancelled")
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("[Telegram] week_schedule error:", error.message);
    return "Error al consultar la semana. Intenta de nuevo.";
  }

  const typedSessions = (sessions || []) as unknown as SessionWithDef[];

  if (typedSessions.length === 0) {
    return `<b>Semana ${spanishDate(start)} - ${spanishDate(end)}</b>\n\nNo hay sesiones programadas.`;
  }

  // Get closed dates for the week
  const { data: closedDates } = await supabase
    .from("tu_closed_dates")
    .select("date, reason")
    .gte("date", start)
    .lte("date", end);

  const closedSet = new Set((closedDates || []).map((d: { date: string }) => d.date));

  // Group by date
  const byDate: Record<string, SessionWithDef[]> = {};
  for (const s of typedSessions) {
    if (!byDate[s.session_date]) byDate[s.session_date] = [];
    byDate[s.session_date].push(s);
  }

  let totalEnrolled = 0;
  let totalSessions = 0;
  const dayBlocks: string[] = [];

  // Iterate through each day of the week
  const current = new Date(start + "T12:00:00");
  const endDate = new Date(end + "T12:00:00");

  while (current <= endDate) {
    const ds = current.toISOString().split("T")[0];
    const dayLabel = spanishDate(ds);

    if (closedSet.has(ds)) {
      dayBlocks.push(`<b>${dayLabel}</b> - Cerrado`);
    } else if (byDate[ds] && byDate[ds].length > 0) {
      const dayLines: string[] = [];
      for (const s of byDate[ds]) {
        const name = s.definition?.name_es || s.definition?.name || "Clase";
        const enrolled = s.enrolled || 0;
        totalEnrolled += enrolled;
        totalSessions++;
        const fullTag = enrolled >= s.capacity ? " LLENA" : "";
        dayLines.push(
          `  ${s.start_time} ${name} (${s.teacher}) ${enrolled}/${s.capacity}${fullTag}`
        );
      }
      dayBlocks.push(`<b>${dayLabel}</b>\n${dayLines.join("\n")}`);
    }

    current.setDate(current.getDate() + 1);
  }

  const header = `<b>Esta semana</b>\n${totalSessions} clases \u00b7 ${totalEnrolled} inscritos\n`;
  return header + "\n" + dayBlocks.join("\n\n");
}

async function handleCancelSession(
  supabase: SupabaseClient,
  params: Record<string, string>
): Promise<string> {
  const { date, time, reason } = params;
  if (!date || !time) {
    return "Necesito la fecha y hora de la clase a cancelar. Ej: cancelar clase de las 9:30 manana";
  }

  // Find the session
  const { data: sessions, error: findError } = await supabase
    .from("tu_class_sessions")
    .select(
      `
      id, session_date, start_time, teacher, capacity, enrolled, status,
      definition:tu_class_definitions (name, name_es, style)
    `
    )
    .eq("session_date", date)
    .eq("status", "scheduled");

  if (findError) {
    console.error("[Telegram] cancel_session find error:", findError.message);
    return "Error al buscar la sesion. Intenta de nuevo.";
  }

  const typedSessions = (sessions || []) as unknown as SessionWithDef[];

  // Match by time (flexible: compare HH:MM)
  const targetTime = time.padStart(5, "0"); // ensure "9:30" -> "09:30"
  const match = typedSessions.find((s) => {
    const sessTime = s.start_time.replace(/\s*(AM|PM)/i, "");
    // Try exact match first
    if (sessTime === targetTime) return true;
    // Try converting 12h format stored in DB
    const converted = convertTo24h(s.start_time);
    return converted === targetTime;
  });

  if (!match) {
    const available = typedSessions
      .map(
        (s) =>
          `${s.start_time} - ${s.definition?.name_es || s.definition?.name || "Clase"}`
      )
      .join("\n");
    return `No encontre una clase a las ${time} el ${spanishDate(date)}.\n\nClases disponibles ese dia:\n${available || "Ninguna"}`;
  }

  const className = match.definition?.name_es || match.definition?.name || "Clase";

  // Cancel the session
  const { error: cancelError } = await supabase
    .from("tu_class_sessions")
    .update({
      status: "cancelled",
      cancel_reason: reason || "Cancelada por admin via Telegram",
    })
    .eq("id", match.id);

  if (cancelError) {
    console.error("[Telegram] cancel_session error:", cancelError.message);
    return "Error al cancelar la sesion. Intenta de nuevo.";
  }

  // Cancel all confirmed bookings and refund pack credits
  const { data: bookings } = await supabase
    .from("tu_class_bookings")
    .select("id, pack_id")
    .eq("session_id", match.id)
    .eq("status", "confirmed");

  let refundedCount = 0;
  for (const booking of bookings || []) {
    await supabase
      .from("tu_class_bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: "Sesion cancelada por admin",
      })
      .eq("id", booking.id);

    // Refund pack credit
    if (booking.pack_id) {
      const { data: pack } = await supabase
        .from("tu_packs")
        .select("classes_used, status")
        .eq("id", booking.pack_id)
        .single();

      if (pack) {
        await supabase
          .from("tu_packs")
          .update({
            classes_used: Math.max((pack.classes_used || 0) - 1, 0),
            status: pack.status === "exhausted" ? "active" : pack.status,
          })
          .eq("id", booking.pack_id);
        refundedCount++;
      }
    }
  }

  let response = `<b>Sesion cancelada</b>\n\n${className}\n${match.start_time} - ${spanishDate(date)}`;
  if (reason) {
    response += `\nRazon: ${reason}`;
  }
  const bookingCount = (bookings || []).length;
  if (bookingCount > 0) {
    response += `\n\n${bookingCount} reserva(s) cancelada(s)`;
    if (refundedCount > 0) {
      response += `, ${refundedCount} credito(s) reembolsado(s)`;
    }
  }
  return response;
}

async function handleCloseDate(
  supabase: SupabaseClient,
  params: Record<string, string>
): Promise<string> {
  const { date, reason } = params;
  if (!date) {
    return "Necesito la fecha para cerrar. Ej: cerrar el viernes";
  }

  const { data, error } = await supabase
    .from("tu_closed_dates")
    .upsert({ date, reason: reason || null }, { onConflict: "date" })
    .select()
    .single();

  if (error) {
    console.error("[Telegram] close_date error:", error.message);
    return "Error al cerrar la fecha. Intenta de nuevo.";
  }

  // Also cancel all scheduled sessions for that date
  const { data: sessions } = await supabase
    .from("tu_class_sessions")
    .select("id")
    .eq("session_date", date)
    .eq("status", "scheduled");

  let cancelledCount = 0;
  for (const s of sessions || []) {
    await supabase
      .from("tu_class_sessions")
      .update({
        status: "cancelled",
        cancel_reason: reason || "Dia cerrado por admin",
      })
      .eq("id", s.id);

    // Cancel bookings and refund
    const { data: bookings } = await supabase
      .from("tu_class_bookings")
      .select("id, pack_id")
      .eq("session_id", s.id)
      .eq("status", "confirmed");

    for (const booking of bookings || []) {
      await supabase
        .from("tu_class_bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancel_reason: "Dia cerrado",
        })
        .eq("id", booking.id);

      if (booking.pack_id) {
        const { data: pack } = await supabase
          .from("tu_packs")
          .select("classes_used, status")
          .eq("id", booking.pack_id)
          .single();

        if (pack) {
          await supabase
            .from("tu_packs")
            .update({
              classes_used: Math.max((pack.classes_used || 0) - 1, 0),
              status: pack.status === "exhausted" ? "active" : pack.status,
            })
            .eq("id", booking.pack_id);
        }
      }
    }
    cancelledCount++;
  }

  let response = `<b>Dia cerrado</b>\n\n${spanishDate(date)}`;
  if (reason) {
    response += `\nRazon: ${reason}`;
  }
  if (cancelledCount > 0) {
    response += `\n${cancelledCount} sesion(es) cancelada(s) automaticamente.`;
  }
  return response;
}

async function handleOpenDate(
  supabase: SupabaseClient,
  params: Record<string, string>
): Promise<string> {
  const { date } = params;
  if (!date) {
    return "Necesito la fecha para abrir. Ej: abrir el viernes";
  }

  const { error } = await supabase
    .from("tu_closed_dates")
    .delete()
    .eq("date", date);

  if (error) {
    console.error("[Telegram] open_date error:", error.message);
    return "Error al reabrir la fecha. Intenta de nuevo.";
  }

  return `<b>Dia reabierto</b>\n\n${spanishDate(date)}\n\nNota: Si necesitas regenerar las sesiones de ese dia, hazlo desde el panel admin o pideme que genere sesiones.`;
}

async function handleMarkFull(
  supabase: SupabaseClient,
  params: Record<string, string>
): Promise<string> {
  const { date, time } = params;
  if (!date || !time) {
    return "Necesito la fecha y hora. Ej: clase llena las 7:15 hoy";
  }

  const targetTime = time.padStart(5, "0");

  const { data: sessions, error: findError } = await supabase
    .from("tu_class_sessions")
    .select(
      `
      id, session_date, start_time, teacher, capacity, enrolled, status,
      definition:tu_class_definitions (name, name_es)
    `
    )
    .eq("session_date", date)
    .eq("status", "scheduled");

  if (findError) {
    console.error("[Telegram] mark_full find error:", findError.message);
    return "Error al buscar la sesion. Intenta de nuevo.";
  }

  const typedSessions = (sessions || []) as unknown as SessionWithDef[];

  const match = typedSessions.find((s) => {
    const converted = convertTo24h(s.start_time);
    return converted === targetTime || s.start_time.replace(/\s*(AM|PM)/i, "") === targetTime;
  });

  if (!match) {
    return `No encontre una clase a las ${time} el ${spanishDate(date)}.`;
  }

  const className = match.definition?.name_es || match.definition?.name || "Clase";

  const { error } = await supabase
    .from("tu_class_sessions")
    .update({ enrolled: match.capacity })
    .eq("id", match.id);

  if (error) {
    console.error("[Telegram] mark_full error:", error.message);
    return "Error al marcar la clase como llena. Intenta de nuevo.";
  }

  return `<b>Clase marcada como LLENA</b>\n\n${className}\n${match.start_time} - ${spanishDate(date)}\n${match.capacity}/${match.capacity} cupos ocupados`;
}

async function handleCreateEventText(
  supabase: SupabaseClient,
  params: Record<string, string>
): Promise<string> {
  const { title, date, time, price_cop, capacity, description } = params;

  if (!title || !date) {
    return "Necesito al menos el nombre y la fecha del evento. Ej: evento Sound Healing mayo 25 5:30pm $80,000 COP 15 cupos";
  }

  const eventData = {
    title: title,
    title_es: title,
    description: description || null,
    description_es: description || null,
    event_date: date,
    start_time: time || "18:00",
    duration_minutes: 90,
    teacher: "Tata",
    capacity: parseInt(capacity || "15", 10),
    enrolled: 0,
    price_cop: parseInt(String(price_cop || "0").replace(/[^0-9]/g, ""), 10) || 0,
    price_usd: 0,
    location: "TU. Studio",
    is_active: true,
    status: "upcoming" as const,
  };

  const { data, error } = await supabase
    .from("tu_events")
    .insert(eventData)
    .select()
    .single();

  if (error) {
    console.error("[Telegram] create_event error:", error.message);
    return "Error al crear el evento. Intenta de nuevo.";
  }

  const priceStr =
    eventData.price_cop > 0
      ? `$${eventData.price_cop.toLocaleString("es-CO")} COP`
      : "Gratis";

  return (
    `<b>Evento creado</b>\n\n` +
    `<b>${data.title}</b>\n` +
    `${spanishDate(data.event_date)} a las ${data.start_time}\n` +
    `${priceStr}\n` +
    `${eventData.capacity} cupos\n` +
    `${data.location}\n` +
    (data.description ? `\n${data.description}` : "")
  );
}

async function handleCreateEventFromPhoto(
  supabase: SupabaseClient,
  imageBase64: string,
  caption?: string
): Promise<string> {
  const extracted = await extractEventFromImage(imageBase64, caption);
  if (!extracted) {
    return "No pude extraer la informacion del flyer. Intenta enviando los datos como texto. Ej: evento Sound Healing mayo 25 5:30pm $80,000 COP 15 cupos";
  }

  const eventData = {
    title: extracted.title || "Evento TU.",
    title_es: extracted.title_es || extracted.title || "Evento TU.",
    description: extracted.description || null,
    description_es: extracted.description_es || extracted.description || null,
    event_date: extracted.date || getColombiaDateStr(7),
    start_time: extracted.time || "18:00",
    end_time: extracted.end_time || null,
    duration_minutes: 90,
    teacher: extracted.teacher || "Tata",
    capacity: parseInt(extracted.capacity || "15", 10),
    enrolled: 0,
    price_cop: parseInt(String(extracted.price_cop || "0").replace(/[^0-9]/g, ""), 10) || 0,
    price_usd: 0,
    location: "TU. Studio",
    is_active: true,
    status: "upcoming" as const,
  };

  const { data, error } = await supabase
    .from("tu_events")
    .insert(eventData)
    .select()
    .single();

  if (error) {
    console.error("[Telegram] create_event_photo error:", error.message);
    return `Error al crear el evento: ${error.message}`;
  }

  const priceStr =
    eventData.price_cop > 0
      ? `$${eventData.price_cop.toLocaleString("es-CO")} COP`
      : "Gratis";

  return (
    `<b>Evento creado desde flyer</b>\n\n` +
    `<b>${data.title}</b>\n` +
    `${spanishDate(data.event_date)} a las ${data.start_time}\n` +
    `${priceStr}\n` +
    `${eventData.capacity} cupos\n` +
    `${data.location}\n` +
    (data.description ? `\n${data.description}` : "")
  );
}

async function handleCancelEvent(
  supabase: SupabaseClient,
  params: Record<string, string>
): Promise<string> {
  const { title } = params;
  if (!title) {
    return "Necesito el nombre del evento a cancelar. Ej: cancelar evento Sound Healing";
  }

  // Search for the event by title (case insensitive, partial match)
  const { data: events, error: findError } = await supabase
    .from("tu_events")
    .select("id, title, title_es, event_date, start_time, enrolled")
    .eq("is_active", true)
    .neq("status", "cancelled")
    .order("event_date", { ascending: true });

  if (findError) {
    console.error("[Telegram] cancel_event find error:", findError.message);
    return "Error al buscar el evento. Intenta de nuevo.";
  }

  const titleLower = title.toLowerCase();
  const match = (events || []).find(
    (e: { title: string; title_es: string }) =>
      e.title.toLowerCase().includes(titleLower) ||
      e.title_es.toLowerCase().includes(titleLower)
  );

  if (!match) {
    const available = (events || [])
      .map(
        (e: { title: string; event_date: string }) =>
          `- ${e.title} (${spanishDate(e.event_date)})`
      )
      .join("\n");
    return `No encontre un evento con nombre "${title}".\n\nEventos activos:\n${available || "Ninguno"}`;
  }

  const { error } = await supabase
    .from("tu_events")
    .update({ status: "cancelled", is_active: false })
    .eq("id", match.id);

  if (error) {
    console.error("[Telegram] cancel_event error:", error.message);
    return "Error al cancelar el evento. Intenta de nuevo.";
  }

  return (
    `<b>Evento cancelado</b>\n\n` +
    `${match.title}\n` +
    `${spanishDate(match.event_date)} a las ${match.start_time}\n` +
    (match.enrolled > 0 ? `\n${match.enrolled} persona(s) estaban inscritas.` : "")
  );
}

async function handleStudentCount(
  supabase: SupabaseClient
): Promise<string> {
  // Total students
  const { count: totalStudents, error: countError } = await supabase
    .from("tu_students")
    .select("id", { count: "exact", head: true });

  if (countError) {
    console.error("[Telegram] student_count error:", countError.message);
    return "Error al consultar los alumnos. Intenta de nuevo.";
  }

  // Recent signups (last 7 days)
  const weekAgo = getColombiaDate(-7).toISOString();
  const { data: recentStudents, error: recentError } = await supabase
    .from("tu_students")
    .select("full_name, created_at")
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentError) {
    console.error("[Telegram] student_count recent error:", recentError.message);
  }

  // Active packs
  const { count: activePacks } = await supabase
    .from("tu_packs")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  let response = `<b>Alumnos</b>\n\n`;
  response += `Total registrados: <b>${totalStudents || 0}</b>\n`;
  response += `Packs activos: <b>${activePacks || 0}</b>\n`;

  const recent = recentStudents || [];
  if (recent.length > 0) {
    response += `\n<b>Nuevos esta semana (${recent.length}):</b>\n`;
    for (const s of recent) {
      const d = new Date(s.created_at);
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
      response += `  ${s.full_name} (${dateStr})\n`;
    }
  } else {
    response += "\nNo hay nuevos registros esta semana.";
  }

  return response;
}

async function handlePendingPayments(
  supabase: SupabaseClient
): Promise<string> {
  const { data: payments, error } = await supabase
    .from("tu_transactions")
    .select("id, amount, currency, payment_method, status, reference, created_at, student:tu_students(full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {
    console.error("[Telegram] pending_payments error:", error.message);
    return "Error al consultar pagos. Intenta de nuevo.";
  }

  const items = (payments || []) as unknown as Array<{
    id: string; amount: number; currency: string; payment_method: string;
    status: string; reference: string; created_at: string;
    student: { full_name: string } | null;
  }>;

  if (items.length === 0) {
    return "<b>Pagos Pendientes</b>\n\nNo hay pagos pendientes. Todo al dia!";
  }

  const lines = items.map((p) => {
    const amt = p.currency === "COP"
      ? `$${(p.amount / 100).toLocaleString("es-CO")} COP`
      : `$${(p.amount / 100).toFixed(2)} USD`;
    const name = p.student?.full_name || "Desconocido";
    const method = p.payment_method || "N/A";
    const d = new Date(p.created_at);
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
    return `  ${name} - ${amt} (${method}) - ${dateStr}\n  Ref: ${p.reference || "N/A"} | ID: ${p.id.slice(0, 8)}`;
  });

  return `<b>Pagos Pendientes (${items.length})</b>\n\n${lines.join("\n\n")}\n\nPara aprobar, escribe: "aprobar pago [ID]"`;
}

async function handleActivePacks(
  supabase: SupabaseClient
): Promise<string> {
  const { data: packs, error } = await supabase
    .from("tu_packs")
    .select("id, pack_type, total_classes, classes_used, expires_at, status, student:tu_students(full_name)")
    .eq("status", "active")
    .order("expires_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[Telegram] active_packs error:", error.message);
    return "Error al consultar packs. Intenta de nuevo.";
  }

  const items = (packs || []) as unknown as Array<{
    id: string; pack_type: string; total_classes: number; classes_used: number;
    expires_at: string; status: string;
    student: { full_name: string } | null;
  }>;

  if (items.length === 0) {
    return "<b>Packs Activos</b>\n\nNo hay packs activos en este momento.";
  }

  const lines = items.map((p) => {
    const isUnlimited = p.total_classes === -1;
    const remaining = isUnlimited ? Infinity : p.total_classes - (p.classes_used || 0);
    const name = p.student?.full_name || "Sin alumno";
    const expires = p.expires_at ? spanishDate(p.expires_at.split("T")[0]) : "Sin vencimiento";
    const bar = isUnlimited
      ? "\u221E"
      : "\u2588".repeat(Math.min(p.classes_used || 0, p.total_classes)) +
        "\u2591".repeat(Math.max(remaining, 0));
    const usageLabel = isUnlimited
      ? `${p.classes_used || 0} usadas (ilimitado)`
      : `${p.classes_used || 0}/${p.total_classes} usadas (${remaining} restantes)`;
    return `  <b>${name}</b> - ${p.pack_type}\n  ${bar} ${usageLabel}\n  Vence: ${expires}`;
  });

  return `<b>Packs Activos (${items.length})</b>\n\n${lines.join("\n\n")}`;
}

async function handleSearchStudent(
  supabase: SupabaseClient,
  params: Record<string, string>
): Promise<string> {
  const { name } = params;
  if (!name) {
    return "Necesito un nombre para buscar. Ej: buscar Maria";
  }

  const { data: students, error } = await supabase
    .from("tu_students")
    .select("id, full_name, email, phone, created_at")
    .ilike("full_name", `%${name}%`)
    .order("full_name")
    .limit(10);

  if (error) {
    console.error("[Telegram] search_student error:", error.message);
    return "Error al buscar alumno. Intenta de nuevo.";
  }

  if (!students || students.length === 0) {
    return `No encontre alumnos con nombre "${name}".`;
  }

  // For each student, get their active packs and recent bookings
  const lines: string[] = [];
  for (const s of students) {
    const { count: packCount } = await supabase
      .from("tu_packs")
      .select("id", { count: "exact", head: true })
      .eq("student_id", s.id)
      .eq("status", "active");

    const { count: bookingCount } = await supabase
      .from("tu_class_bookings")
      .select("id", { count: "exact", head: true })
      .eq("student_id", s.id)
      .eq("status", "confirmed");

    const d = new Date(s.created_at);
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

    lines.push(
      `<b>${s.full_name}</b>\n` +
      (s.email ? `  Email: ${s.email}\n` : "") +
      (s.phone ? `  Tel: ${s.phone}\n` : "") +
      `  Packs activos: ${packCount || 0} | Reservas: ${bookingCount || 0}\n` +
      `  Registrado: ${dateStr}`
    );
  }

  return `<b>Resultados para "${name}" (${students.length})</b>\n\n${lines.join("\n\n")}`;
}

async function handleRecentLeads(
  supabase: SupabaseClient
): Promise<string> {
  const { data: leads, error } = await supabase
    .from("tu_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[Telegram] recent_leads error:", error.message);
    return "Error al consultar leads. Intenta de nuevo.";
  }

  if (!leads || leads.length === 0) {
    return "<b>Leads Recientes</b>\n\nNo hay leads registrados todavia.";
  }

  const items = leads as Array<{
    name: string | null; phone: string | null; email: string | null;
    source: string; warmth: string; status: string; service_interest: string | null;
    created_at: string;
  }>;

  const lines = items.map((l) => {
    const d = new Date(l.created_at);
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
    const warmthIcon = l.warmth === "hot" ? "HOT" : l.warmth === "warm" ? "WARM" : "COLD";
    return (
      `  <b>${l.name || "Anonimo"}</b> [${warmthIcon}] (${dateStr})\n` +
      (l.phone ? `  Tel: ${l.phone}\n` : "") +
      (l.email ? `  Email: ${l.email}\n` : "") +
      `  Fuente: ${l.source} | Estado: ${l.status}` +
      (l.service_interest ? `\n  Interes: ${l.service_interest}` : "")
    );
  });

  return `<b>Leads Recientes (${items.length})</b>\n\n${lines.join("\n\n")}`;
}

async function handleDashboard(
  supabase: SupabaseClient
): Promise<string> {
  const todayStr = getColombiaDateStr();

  // Students total
  const { count: totalStudents } = await supabase
    .from("tu_students")
    .select("id", { count: "exact", head: true });

  // Active packs
  const { count: activePacks } = await supabase
    .from("tu_packs")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  // Today's sessions
  const { data: todaySessions } = await supabase
    .from("tu_class_sessions")
    .select("id, enrolled, capacity, status")
    .eq("session_date", todayStr);

  const sessions = (todaySessions || []) as Array<{ id: string; enrolled: number; capacity: number; status: string }>;
  const activeSessions = sessions.filter((s) => s.status !== "cancelled");
  const todayEnrolled = activeSessions.reduce((sum, s) => sum + (s.enrolled || 0), 0);
  const todayCapacity = activeSessions.reduce((sum, s) => sum + (s.capacity || 0), 0);

  // Today's bookings
  const activeSessionIds = activeSessions.map((s: { id: string }) => s.id);
  const { count: todayBookings } = await supabase
    .from("tu_class_bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmed")
    .in("session_id", activeSessionIds.length > 0 ? activeSessionIds : ["__none__"]);

  // Pending payments
  const { count: pendingPayments } = await supabase
    .from("tu_transactions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // Recent leads (7 days)
  const weekAgo = getColombiaDate(-7).toISOString();
  const { count: recentLeads } = await supabase
    .from("tu_leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekAgo);

  // Hot leads
  const { count: hotLeads } = await supabase
    .from("tu_leads")
    .select("id", { count: "exact", head: true })
    .eq("warmth", "hot")
    .eq("status", "new");

  // Upcoming events
  const { count: upcomingEvents } = await supabase
    .from("tu_events")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .gte("event_date", todayStr);

  // New students this week
  const { count: newStudents } = await supabase
    .from("tu_students")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekAgo);

  const occupancy = todayCapacity > 0
    ? Math.round((todayEnrolled / todayCapacity) * 100)
    : 0;

  return (
    `<b>RESUMEN — ${spanishDate(todayStr)}</b>\n\n` +
    `<b>Hoy</b>\n` +
    `  Clases: ${activeSessions.length} | Inscritos: ${todayEnrolled}/${todayCapacity} (${occupancy}%)\n\n` +
    `<b>Alumnos</b>\n` +
    `  Total: ${totalStudents || 0} | Nuevos esta semana: ${newStudents || 0}\n` +
    `  Packs activos: ${activePacks || 0}\n\n` +
    `<b>Negocio</b>\n` +
    `  Pagos pendientes: ${pendingPayments || 0}\n` +
    `  Leads esta semana: ${recentLeads || 0}${hotLeads ? ` (${hotLeads} HOT)` : ""}\n` +
    `  Eventos proximos: ${upcomingEvents || 0}\n\n` +
    `Escribe el comando para ver mas detalles.`
  );
}

async function handleBookingsToday(
  supabase: SupabaseClient
): Promise<string> {
  const todayStr = getColombiaDateStr();

  // Get today's sessions with bookings
  const { data: sessions, error: sessError } = await supabase
    .from("tu_class_sessions")
    .select(`
      id, session_date, start_time, teacher, capacity, enrolled, status,
      definition:tu_class_definitions (name, name_es)
    `)
    .eq("session_date", todayStr)
    .neq("status", "cancelled")
    .order("start_time", { ascending: true });

  if (sessError) {
    console.error("[Telegram] bookings_today error:", sessError.message);
    return "Error al consultar reservas. Intenta de nuevo.";
  }

  const typedSessions = (sessions || []) as unknown as SessionWithDef[];

  if (typedSessions.length === 0) {
    return `<b>Reservas de Hoy — ${spanishDate(todayStr)}</b>\n\nNo hay clases programadas para hoy.`;
  }

  const blocks: string[] = [];

  for (const s of typedSessions) {
    const className = s.definition?.name_es || s.definition?.name || "Clase";

    // Get bookings for this session
    const { data: bookings } = await supabase
      .from("tu_class_bookings")
      .select("student:tu_students(full_name, phone)")
      .eq("session_id", s.id)
      .eq("status", "confirmed");

    const students = (bookings || []) as unknown as Array<{
      student: { full_name: string; phone: string | null } | null;
    }>;

    const studentList = students.length > 0
      ? students
          .map((b, i) => `  ${i + 1}. ${b.student?.full_name || "Sin nombre"}`)
          .join("\n")
      : "  Sin reservas";

    const spots = s.capacity - (s.enrolled || 0);
    const spotsText = spots <= 0 ? "LLENA" : `${spots} cupos libres`;

    blocks.push(
      `<b>${s.start_time} — ${className}</b> (${s.teacher})\n` +
      `${s.enrolled || 0}/${s.capacity} — ${spotsText}\n` +
      studentList
    );
  }

  return `<b>Reservas de Hoy — ${spanishDate(todayStr)}</b>\n\n${blocks.join("\n\n")}`;
}

async function handleHealthCheck(): Promise<string> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.tataumana.com").trim();
  const results: string[] = [];
  let passCount = 0;
  let failCount = 0;

  const endpoints = [
    { name: "Homepage", path: "/" },
    { name: "Login", path: "/login" },
    { name: "Schedule API", path: "/api/schedule" },
    { name: "Events API", path: "/api/events" },
    { name: "Chat API", path: "/api/chat" },
    { name: "Admin Auth", path: "/admin" },
  ];

  for (const ep of endpoints) {
    try {
      const start = Date.now();
      const res = await fetch(`${appUrl}${ep.path}`, {
        method: "GET",
        redirect: "manual",
      });
      const ms = Date.now() - start;
      const ok = res.status < 500;
      if (ok) passCount++;
      else failCount++;
      results.push(`  ${ok ? "OK" : "FAIL"} ${ep.name} (${res.status}) ${ms}ms`);
    } catch (err) {
      failCount++;
      results.push(`  FAIL ${ep.name} — ${String(err).slice(0, 50)}`);
    }
  }

  // Check Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const start = Date.now();
      const { error } = await supabase.from("tu_students").select("id", { count: "exact", head: true });
      const ms = Date.now() - start;
      if (!error) {
        passCount++;
        results.push(`  OK Base de datos (${ms}ms)`);
      } else {
        failCount++;
        results.push(`  FAIL Base de datos — ${error.message}`);
      }
    } catch {
      failCount++;
      results.push("  FAIL Base de datos — sin conexion");
    }
  }

  const status = failCount === 0 ? "TODO BIEN" : `${failCount} PROBLEMA(S)`;

  return (
    `<b>ESTADO DEL SITIO — ${status}</b>\n\n` +
    `${passCount} OK / ${failCount} Errores\n\n` +
    results.join("\n")
  );
}

function handleHelp(): string {
  return (
    `<b>TU. Bot — Comandos</b>\n\n` +
    `<b>/hoy</b> — Clases de hoy\n` +
    `<b>/manana</b> — Clases de manana\n` +
    `<b>/clases</b> — Ver todas las clases de la semana con reservas\n` +
    `<b>/semana</b> — Horario de la semana\n` +
    `<b>/reservas</b> — Reservas de hoy con nombres\n` +
    `<b>/resumen</b> — Dashboard general\n\n` +
    `<b>/cancelar</b> clase 9:30 manana — Cancelar sesion\n` +
    `<b>/llena</b> 7:15 hoy — Marcar como llena\n` +
    `<b>/cerrar</b> viernes — Cerrar un dia\n` +
    `<b>/abrir</b> viernes — Reabrir dia cerrado\n\n` +
    `<b>/evento</b> Sound Healing mayo 25 5:30pm $80,000 15 cupos\n` +
    `<b>/cancelar_evento</b> Sound Healing\n` +
    `Enviar foto de flyer — Crear evento desde imagen\n\n` +
    `<b>/alumnos</b> — Conteo y registros recientes\n` +
    `<b>/buscar</b> Maria — Buscar alumno\n` +
    `<b>/packs</b> — Packs activos\n` +
    `<b>/pagos</b> — Pagos pendientes\n` +
    `<b>/leads</b> — Leads recientes\n` +
    `<b>/sitio</b> — Verificar que todo funciona\n\n` +
    `<b>Descuentos:</b>\n` +
    `<b>/descuento</b> WELCOME10 percentage 10 — Crear codigo\n` +
    `<b>/descuento</b> MAYO50K fixed 50000 — Descuento fijo\n` +
    `<b>/descuentos</b> — Ver codigos activos\n` +
    `desactivar descuento WELCOME10 — Desactivar\n\n` +
    `<b>Alumnos:</b>\n` +
    `<b>/alumno</b> Maria Garcia maria@email.com +573001234567 — Crear cuenta\n\n` +
    `<b>Promos Homepage:</b>\n` +
    `Enviar foto con caption <b>/promo</b> — Agregar promo con flyer\n` +
    `<b>/promo</b> list — Ver promos activas en homepage\n` +
    `<b>/promo</b> remove [titulo] — Quitar promo de homepage\n\n` +
    `<b>/ayuda</b> — Este mensaje\n\n` +
    `Tambien puedes escribir en lenguaje natural!`
  );
}

// ---------------------------------------------------------------------------
// Time conversion utility
// ---------------------------------------------------------------------------

function convertTo24h(timeStr: string): string {
  // Handle formats like "9:30 AM", "7:15 PM", "09:30", "19:15"
  const cleaned = timeStr.trim().toUpperCase();
  const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const period = match12[3];
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  }
  // Already 24h format
  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return `${match24[1].padStart(2, "0")}:${match24[2]}`;
  }
  return timeStr;
}

// ---------------------------------------------------------------------------
// Discount handlers
// ---------------------------------------------------------------------------

async function handleCreateDiscount(supabase: SupabaseClient, params: Record<string, string>): Promise<string> {
  const code = (params.code || "").toUpperCase().trim();
  const type = params.type === "fixed" ? "fixed" : "percentage";
  const value = parseFloat(params.value) || 0;
  const maxUses = params.max_uses ? parseInt(params.max_uses) : null;
  const validDays = params.valid_days ? parseInt(params.valid_days) : null;

  if (!code) return "Falta el codigo. Ejemplo: /descuento WELCOME10 percentage 10";
  if (value <= 0) return "El valor debe ser mayor a 0";
  if (type === "percentage" && value > 100) return "El porcentaje no puede ser mayor a 100";

  const validUntil = validDays ? new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString() : null;

  const { error } = await supabase.from("tu_discount_codes").insert({
    code,
    discount_type: type,
    discount_value: value,
    max_uses: maxUses,
    valid_until: validUntil,
    one_time_per_student: false,
    created_by: "telegram",
  });

  if (error) {
    if (error.code === "23505") return `El codigo ${code} ya existe`;
    return `Error: ${error.message}`;
  }

  const discountLabel = type === "percentage" ? `${value}%` : `$${value.toLocaleString()} COP`;
  const usesLabel = maxUses ? `${maxUses} usos` : "Ilimitado";
  const expiryLabel = validDays ? `${validDays} dias` : "Sin expiracion";

  return `✅ Codigo creado!\n\n<b>${code}</b>\nDescuento: ${discountLabel}\nUsos: ${usesLabel}\nVigencia: ${expiryLabel}\n\nCompartelo con tus alumnos para que lo apliquen al comprar packs.`;
}

async function handleListDiscounts(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from("tu_discount_codes")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return `Error: ${error.message}`;
  if (!data || data.length === 0) return "No hay codigos de descuento activos.";

  const lines = data.map((d: Record<string, unknown>) => {
    const type = d.discount_type === "percentage" ? `${d.discount_value}%` : `$${Number(d.discount_value).toLocaleString()} COP`;
    const uses = d.max_uses ? `${d.uses_count}/${d.max_uses}` : `${d.uses_count}/∞`;
    const expiry = d.valid_until ? new Date(d.valid_until as string).toLocaleDateString("es-CO", { month: "short", day: "numeric" }) : "∞";
    return `<b>${d.code}</b> — ${type} — Usos: ${uses} — Hasta: ${expiry}`;
  });

  return `🏷️ <b>Codigos activos (${data.length})</b>\n\n${lines.join("\n")}`;
}

async function handleDeactivateDiscount(supabase: SupabaseClient, params: Record<string, string>): Promise<string> {
  const code = (params.code || "").toUpperCase().trim();
  if (!code) return "Cual codigo quieres desactivar? Ejemplo: desactivar descuento WELCOME10";

  const { data, error } = await supabase
    .from("tu_discount_codes")
    .update({ active: false })
    .eq("code", code)
    .select()
    .single();

  if (error || !data) return `Codigo ${code} no encontrado`;
  return `❌ Codigo <b>${code}</b> desactivado. Ya no se puede usar.`;
}

// ---------------------------------------------------------------------------
// Student account creation handler
// ---------------------------------------------------------------------------

async function handleCreateStudentAccount(supabase: SupabaseClient, params: Record<string, string>): Promise<string> {
  const name = (params.name || "").trim();
  const email = (params.email || "").trim().toLowerCase();
  const phone = (params.phone || "").trim();

  if (!name || !email) {
    return "Necesito nombre y email. Ejemplo:\n\ncrear cuenta para Maria Garcia maria@email.com +573001234567";
  }

  // Validate email format
  if (!email.includes("@") || !email.includes(".")) {
    return `El email "${email}" no parece valido. Revisa e intenta de nuevo.`;
  }

  try {
    // Create student via admin API
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://www.tataumana.com"}/api/admin/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": process.env.TU_ADMIN_KEY || "",
      },
      body: JSON.stringify({
        email,
        full_name: name,
        phone: phone || null,
        create_account: true,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        return `Ya existe un alumno con el email ${email}`;
      }
      return `Error: ${data.error || "No se pudo crear la cuenta"}`;
    }

    const lines = [
      `✅ Cuenta creada para <b>${name}</b>`,
      `Email: ${email}`,
    ];

    if (phone) lines.push(`Tel: ${phone}`);

    if (data.loginLink) {
      lines.push("");
      lines.push("Enlace de acceso (envialo por WhatsApp):");
      lines.push(`<code>${data.loginLink}</code>`);
    } else if (data.accountCreated) {
      lines.push("");
      lines.push("Cuenta creada. El alumno puede acceder con magic link desde tataumana.com/login");
    } else {
      lines.push("");
      lines.push("Perfil creado (sin cuenta de login). Puedes generar un enlace desde /admin/students");
    }

    return lines.join("\n");
  } catch (err) {
    console.error("[telegram/create_student]", err);
    return "Error de conexion al crear la cuenta. Intenta de nuevo.";
  }
}

// ---------------------------------------------------------------------------
// Weekly class roster handler
// ---------------------------------------------------------------------------

async function handleWeekClassRoster(supabase: SupabaseClient): Promise<string> {
  const today = getColombiaDateStr();
  const endDate = getColombiaDateStr(6);

  const { data: sessions, error } = await supabase
    .from("tu_class_sessions")
    .select("id, session_date, start_time, teacher, capacity, enrolled, status, definition:tu_class_definitions(name, name_es)")
    .gte("session_date", today)
    .lte("session_date", endDate)
    .eq("status", "scheduled")
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) return `Error: ${error.message}`;
  if (!sessions || sessions.length === 0) return "No hay clases programadas esta semana.";

  // Group by date
  const byDate: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    const date = s.session_date;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(s);
  }

  const lines: string[] = ["📋 <b>CLASES DE LA SEMANA</b>\n"];

  for (const [date, daySessions] of Object.entries(byDate)) {
    const dateLabel = spanishDate(date);
    lines.push(`\n<b>${dateLabel}</b>`);

    for (const s of daySessions) {
      const def = s.definition as unknown as { name: string; name_es: string } | null;
      const className = def?.name_es || def?.name || "Clase";
      const time = s.start_time.slice(0, 5);
      const enrolled = s.enrolled || 0;
      const capacity = s.capacity || 15;
      const pct = capacity > 0 ? (enrolled / capacity) * 100 : 0;

      // Status indicator
      let indicator = "⚪";
      if (enrolled === 0) indicator = "⚪";
      else if (pct >= 100) indicator = "🔴";
      else if (pct >= 70) indicator = "🟠";
      else if (pct >= 40) indicator = "🟡";
      else indicator = "🟢";

      lines.push(`${indicator} ${time} ${className} — <b>${enrolled}/${capacity}</b> — ${s.teacher}`);
    }
  }

  // Summary
  const totalEnrolled = sessions.reduce((sum, s) => sum + (s.enrolled || 0), 0);
  const totalSessions = sessions.length;
  lines.push(`\n<b>Total:</b> ${totalSessions} clases · ${totalEnrolled} reservas`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main webhook handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    const message = update.message;

    // Ignore non-message updates (edited, channel posts, etc.)
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    // Security: verify chat_id matches TELEGRAM_CHAT_ID
    const allowedChatId = getAllowedChatId();
    if (allowedChatId && String(message.chat.id) !== allowedChatId) {
      console.warn(
        `[Telegram] Unauthorized chat_id: ${message.chat.id} (expected ${allowedChatId})`
      );
      return NextResponse.json({ ok: true });
    }

    // Init Supabase
    const supabase = getSupabase();
    if (!supabase) {
      await sendTelegram("Error: Base de datos no configurada. Contacta a Phil.");
      return NextResponse.json({ ok: true });
    }

    // Handle photo messages
    if (message.photo && message.photo.length > 0) {
      const caption = (message.caption || "").trim();
      const isPromo = caption.toLowerCase().startsWith("/promo");

      await sendTelegram(
        isPromo
          ? "Creando promo para la homepage... Un momento."
          : "Analizando imagen... Un momento.",
      );

      // Get the highest resolution photo
      const largestPhoto = message.photo[message.photo.length - 1];
      const imageBuffer = await downloadTelegramFile(largestPhoto.file_id);

      if (!imageBuffer) {
        await sendTelegram("No pude descargar la imagen. Intenta enviarla de nuevo.");
        return NextResponse.json({ ok: true });
      }

      if (isPromo) {
        // /promo command with photo — add to homepage
        const promoCaption = caption.slice("/promo".length).replace(/^[\s,]*add[\s,]*/i, "").trim();
        const response = await handlePromoAdd(supabase, imageBuffer, promoCaption || undefined);
        await sendTelegram(response);
      } else {
        // Regular photo — generic event creation
        const imageBase64 = imageBuffer.toString("base64");
        const response = await handleCreateEventFromPhoto(
          supabase,
          imageBase64,
          caption,
        );
        await sendTelegram(response);
      }
      return NextResponse.json({ ok: true });
    }

    // Handle text messages
    const rawText = (message.text || message.caption || "").trim();
    if (!rawText) {
      return NextResponse.json({ ok: true });
    }

    // Handle slash commands — map to natural language for intent parser
    const slashMap: Record<string, string> = {
      "/hoy": "que hay hoy",
      "/manana": "clases de manana",
      "/semana": "semana",
      "/clases": "clases de la semana",
      "/reservas": "reservas de hoy",
      "/resumen": "resumen",
      "/alumnos": "alumnos",
      "/packs": "packs activos",
      "/pagos": "pagos pendientes",
      "/leads": "leads recientes",
      "/sitio": "verificar sitio",
      "/ayuda": "ayuda",
      "/help": "ayuda",
      "/start": "ayuda",
      "/descuento": "crear descuento",
      "/descuentos": "ver descuentos activos",
      "/alumno": "crear cuenta para alumno",
      "/cuenta": "crear cuenta para alumno",
    };

    let text = rawText;
    // Check for exact slash command match
    const firstWord = rawText.split(" ")[0].toLowerCase();
    if (slashMap[firstWord]) {
      const rest = rawText.slice(firstWord.length).trim();
      text = slashMap[firstWord] + (rest ? " " + rest : "");
    } else if (firstWord === "/cancelar_evento") {
      text = "cancelar evento " + rawText.slice("/cancelar_evento".length).trim();
    } else if (firstWord === "/cancelar") {
      text = "cancelar clase " + rawText.slice("/cancelar".length).trim();
    } else if (firstWord === "/llena") {
      text = "clase llena " + rawText.slice("/llena".length).trim();
    } else if (firstWord === "/cerrar") {
      text = "cerrar " + rawText.slice("/cerrar".length).trim();
    } else if (firstWord === "/abrir") {
      text = "abrir " + rawText.slice("/abrir".length).trim();
    } else if (firstWord === "/evento") {
      text = "evento " + rawText.slice("/evento".length).trim();
    } else if (firstWord === "/buscar") {
      text = "buscar " + rawText.slice("/buscar".length).trim();
    }

    // Direct command parsing for discount + student commands (bypass Claude for reliability)
    let directResponse: string | null = null;

    if (firstWord === "/descuento" || firstWord === "/descuentos") {
      const parts = rawText.split(/\s+/);
      if (firstWord === "/descuentos") {
        directResponse = await handleListDiscounts(supabase);
      } else if (parts.length >= 2) {
        // Smart parser: /descuento CODE [value] [type] [max N]
        const afterCode = rawText.slice(parts[0].length + parts[1].length + 2).trim().toLowerCase();
        const code = parts[1];

        // Extract max uses
        const maxMatch = afterCode.match(/max\s*(\d+)/i);
        const maxUses = maxMatch ? maxMatch[1] : "";

        // Extract type keyword
        let type = "";
        if (afterCode.includes("percentage") || afterCode.includes("porcentaje") || afterCode.includes("%")) {
          type = "percentage";
        } else if (afterCode.includes("fixed") || afterCode.includes("fijo") || afterCode.includes("cop")) {
          type = "fixed";
        }

        // Extract numeric value
        const numMatch = afterCode.replace(/max\s*\d+/i, "").match(/(\d+(?:\.\d+)?)/);
        let value = numMatch ? numMatch[1] : "";

        // Smart defaults
        if (!value) {
          // No value given: default 10%
          value = "10";
          type = "percentage";
        } else if (!type) {
          // Value given but no type: auto-detect
          type = parseFloat(value) > 100 ? "fixed" : "percentage";
        }

        directResponse = await handleCreateDiscount(supabase, {
          code,
          type,
          value,
          max_uses: maxUses,
        });
      } else {
        directResponse = "Escribe el nombre del codigo.\n\nEjemplos:\n/descuento BIENVENIDA → 10% descuento\n/descuento VIP 20 → 20% descuento\n/descuento MAYO 50000 → $50,000 COP descuento\n/descuento PROMO 15% max 10 → 15% con limite de 10 usos";
      }
    } else if (rawText.toLowerCase().startsWith("desactivar descuento")) {
      const code = rawText.slice("desactivar descuento".length).trim();
      directResponse = await handleDeactivateDiscount(supabase, { code });
    } else if (firstWord === "/alumno" || firstWord === "/cuenta") {
      const parts = rawText.split(/\s+/).slice(1);
      if (parts.length >= 2) {
        // Try to extract: name (can be multi-word), email, optional phone
        const emailIdx = parts.findIndex(p => p.includes("@"));
        if (emailIdx >= 0) {
          const name = parts.slice(0, emailIdx).join(" ");
          const email = parts[emailIdx];
          const phone = parts.slice(emailIdx + 1).join(" ") || "";
          directResponse = await handleCreateStudentAccount(supabase, { name, email, phone });
        } else {
          directResponse = "Necesito nombre y email. Ejemplo:\n/alumno Maria Garcia maria@email.com +573001234567";
        }
      } else {
        directResponse = "Necesito nombre y email. Ejemplo:\n/alumno Maria Garcia maria@email.com +573001234567";
      }
    } else if (firstWord === "/clases" || firstWord === "/semana") {
      directResponse = await handleWeekClassRoster(supabase);
    } else if (firstWord === "/promo" || firstWord === "/promos") {
      const rest = rawText.slice(firstWord.length).trim().toLowerCase();
      if (rest.startsWith("list") || rest.startsWith("ver") || rest === "" || firstWord === "/promos") {
        directResponse = await handlePromoList(supabase);
      } else if (rest.startsWith("remove") || rest.startsWith("quitar") || rest.startsWith("borrar")) {
        const target = rest.replace(/^(remove|quitar|borrar)\s*/, "").trim();
        directResponse = await handlePromoRemove(supabase, target);
      } else {
        directResponse = "Para agregar una promo, envia una <b>foto del flyer</b> con el caption <b>/promo</b>\n\nOtros comandos:\n/promo list — Ver promos activas\n/promo remove [titulo] — Quitar de homepage";
      }
    }

    if (directResponse) {
      await sendTelegram(directResponse);
      return NextResponse.json({ ok: true });
    }

    // Parse intent with Claude (for natural language messages)
    const intent = await parseIntent(text);
    console.log(
      `[Telegram] Intent: ${intent.action}`,
      JSON.stringify(intent.params)
    );

    let response: string;

    switch (intent.action) {
      case "today_schedule":
        response = await handleTodaySchedule(supabase, intent.params);
        break;

      case "week_schedule":
        response = await handleWeekSchedule(supabase);
        break;

      case "cancel_session":
        response = await handleCancelSession(supabase, intent.params);
        break;

      case "close_date":
        response = await handleCloseDate(supabase, intent.params);
        break;

      case "open_date":
        response = await handleOpenDate(supabase, intent.params);
        break;

      case "mark_full":
        response = await handleMarkFull(supabase, intent.params);
        break;

      case "create_event_text":
        response = await handleCreateEventText(supabase, intent.params);
        break;

      case "cancel_event":
        response = await handleCancelEvent(supabase, intent.params);
        break;

      case "student_count":
        response = await handleStudentCount(supabase);
        break;

      case "pending_payments":
        response = await handlePendingPayments(supabase);
        break;

      case "active_packs":
        response = await handleActivePacks(supabase);
        break;

      case "search_student":
        response = await handleSearchStudent(supabase, intent.params);
        break;

      case "recent_leads":
        response = await handleRecentLeads(supabase);
        break;

      case "dashboard":
        response = await handleDashboard(supabase);
        break;

      case "bookings_today":
        response = await handleBookingsToday(supabase);
        break;

      case "health_check":
        response = await handleHealthCheck();
        break;

      case "help":
        response = handleHelp();
        break;

      case "create_discount":
        response = await handleCreateDiscount(supabase, intent.params);
        break;

      case "list_discounts":
        response = await handleListDiscounts(supabase);
        break;

      case "deactivate_discount":
        response = await handleDeactivateDiscount(supabase, intent.params);
        break;

      case "create_student_account":
        response = await handleCreateStudentAccount(supabase, intent.params);
        break;

      case "unknown":
      default:
        response =
          `No entendi tu mensaje. Intenta algo como:\n\n` +
          `"que hay hoy" - Ver clases\n` +
          `"cancelar clase de las 9:30 manana"\n` +
          `"cerrar el viernes"\n` +
          `"ayuda" - Ver todos los comandos`;
        break;
    }

    await sendTelegram(response);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Telegram Webhook] Unhandled error:", err);

    // Always try to respond to Tata even if something broke
    try {
      await sendTelegram(
        "Hubo un error procesando tu mensaje. Intenta de nuevo o contacta a Phil."
      );
    } catch {
      // Silent fail — nothing more we can do
    }

    return NextResponse.json({ ok: true });
  }
}
