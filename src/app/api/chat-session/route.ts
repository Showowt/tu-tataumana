import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const SessionSchema = z.object({
  session_id: z.string().min(8).max(100),
  messages: z.array(MessageSchema).max(60).default([]),
  extracted: z
    .object({
      name: z.string().max(200).optional(),
      email: z.string().max(200).optional(),
      phone: z.string().max(50).optional(),
      interests: z.array(z.string().max(100)).max(20).optional(),
    })
    .optional(),
});

/**
 * POST /api/chat-session — Save or update a website chat transcript.
 * Called fire-and-forget by ChatBot after every exchange; upserts by session_id.
 * Transcripts are reviewed in Admin > Chats.
 */
export async function POST(request: NextRequest) {
  try {
    if (rateLimit(`chat-session:${clientIp(request)}`, 20, 60_000)) {
      return NextResponse.json({ error: "Demasiadas solicitudes. / Too many requests." }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = SessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid session payload" },
        { status: 400 }
      );
    }
    const { session_id, messages, extracted } = parsed.data;

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ message: "DB not configured" });
    }

    const userMessages = messages.filter((m) => m.role === "user");
    const firstMessage = userMessages[0]?.content || null;
    const lastMessage = userMessages[userMessages.length - 1]?.content || null;

    const leadScore = calculateLeadScore(messages);
    const intent = determineIntent(messages);
    const derived = deriveContact(userMessages.map((m) => m.content));

    // Upsert — create or update the session
    const { data, error } = await supabase
      .from("tu_chat_sessions")
      .upsert(
        {
          session_id,
          messages,
          message_count: messages.length,
          first_message: firstMessage,
          last_message: lastMessage,
          last_activity: new Date().toISOString(),
          extracted_name: extracted?.name || null,
          extracted_email: extracted?.email || derived.email,
          extracted_phone: extracted?.phone || derived.phone,
          extracted_interests: extracted?.interests || null,
          intent,
          lead_score: leadScore,
        },
        { onConflict: "session_id" }
      )
      .select("session_id")
      .single();

    if (error) {
      console.error("[API/chat-session]", error);
      return NextResponse.json(
        { error: "Failed to save session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, lead_score: leadScore, intent });
  } catch (err) {
    console.error("[API/chat-session]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** Pull email / phone out of what the visitor typed (EN + ES conversations). */
function deriveContact(userTexts: string[]): {
  email: string | null;
  phone: string | null;
} {
  const all = userTexts.join(" ");
  const email = all.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] || null;
  // 10+ digits allowing spaces/dashes after an optional +country
  const phoneMatch = all.match(/\+?\d[\d\s().-]{8,}\d/);
  const phone = phoneMatch
    ? phoneMatch[0].replace(/[^\d+]/g, "").length >= 10
      ? phoneMatch[0].trim()
      : null
    : null;
  return { email, phone };
}

/**
 * Score a lead 0-100 based on conversation signals
 */
function calculateLeadScore(
  messages: { role: string; content: string }[]
): number {
  let score = 10; // Base score for opening the chat
  const allText = messages
    .map((m) => m.content.toLowerCase())
    .join(" ");

  // High-intent signals (+15-25 each)
  if (/\b(book(ing)?|reserv\w*|schedule|sign up|register|apart\w*|agend\w*|inscrib\w*|cupo)\b/i.test(allText)) score += 25;
  if (/\b(price|cost|how much|cuanto|cuánto|precio|vale)\b/i.test(allText)) score += 20;
  if (/\b(tomorrow|today|this week|next week|mañana|manana|hoy|esta semana)\b/i.test(allText)) score += 20;
  if (/\b(private|session|one.on.one|personal|privada)\b/i.test(allText)) score += 15;
  if (/\b(retreat|ceremony|cacao|sound healing|reiki|retiro|ceremonia)\b/i.test(allText)) score += 15;

  // Medium-intent signals (+5-10 each)
  if (/\b(visiting|trip|travel|vacation|cartagena|visita|viaje)\b/i.test(allText)) score += 10;
  if (/\b(yoga|class|classes|meditation|clase|clases|meditación)\b/i.test(allText)) score += 10;
  if (/\b(when|what time|schedule|horario|a que hora|a qué hora)\b/i.test(allText)) score += 10;
  if (/\b(whatsapp|phone|contact|email|correo|teléfono|telefono)\b/i.test(allText)) score += 15;

  // Contact info shared (+20)
  if (/[\w.-]+@[\w.-]+\.\w+/.test(allText)) score += 20;
  if (/\+?\d{10,}/.test(allText)) score += 20;

  // Conversation depth (more messages = more engaged)
  const userMsgCount = messages.filter((m) => m.role === "user").length;
  score += Math.min(userMsgCount * 5, 20);

  return Math.min(score, 100);
}

/**
 * Determine visitor intent from conversation
 */
function determineIntent(
  messages: { role: string; content: string }[]
): string {
  const allText = messages
    .map((m) => m.content.toLowerCase())
    .join(" ");

  if (/\b(book(ing)?|reserv\w*|sign up|i want to|quiero|apart\w*|agend\w*|inscrib\w*|nos vemos|see you|i'll come|voy a ir)\b/i.test(allText))
    return "ready_to_book";
  if (/\b(price|cost|how much|schedule|when|class|precio|cuanto|cuánto|horario|clase)\b/i.test(allText))
    return "interested";
  if (/\b(help|problem|issue|question|ayuda|problema)\b/i.test(allText))
    return "needs_help";

  const userMsgCount = messages.filter((m) => m.role === "user").length;
  if (userMsgCount >= 3) return "interested";

  return "browsing";
}
