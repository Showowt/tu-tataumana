import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * POST /api/chat-session — Save or update a chat session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, messages, extracted } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ message: "DB not configured" });
    }

    const messageCount = messages?.length || 0;
    const userMessages = (messages || []).filter(
      (m: { role: string }) => m.role === "user"
    );
    const firstMessage = userMessages[0]?.content || null;
    const lastMessage = userMessages[userMessages.length - 1]?.content || null;

    // Calculate lead score based on conversation signals
    const leadScore = calculateLeadScore(messages || []);
    const intent = determineIntent(messages || []);

    // Upsert — create or update the session
    const { data, error } = await supabase
      .from("tu_chat_sessions")
      .upsert(
        {
          session_id,
          messages: messages || [],
          message_count: messageCount,
          first_message: firstMessage,
          last_message: lastMessage,
          last_activity: new Date().toISOString(),
          extracted_name: extracted?.name || null,
          extracted_email: extracted?.email || null,
          extracted_phone: extracted?.phone || null,
          extracted_interests: extracted?.interests || null,
          intent,
          lead_score: leadScore,
        },
        { onConflict: "session_id" }
      )
      .select()
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
  if (/\b(book|reserv|schedule|sign up|register)\b/i.test(allText)) score += 25;
  if (/\b(price|cost|how much|cuanto|precio)\b/i.test(allText)) score += 20;
  if (/\b(tomorrow|today|this week|next week|mañana|hoy)\b/i.test(allText)) score += 20;
  if (/\b(private|session|one.on.one|personal)\b/i.test(allText)) score += 15;
  if (/\b(retreat|ceremony|cacao|sound healing|reiki)\b/i.test(allText)) score += 15;

  // Medium-intent signals (+5-10 each)
  if (/\b(visiting|trip|travel|vacation|cartagena)\b/i.test(allText)) score += 10;
  if (/\b(yoga|class|classes|meditation)\b/i.test(allText)) score += 10;
  if (/\b(when|what time|schedule|horario)\b/i.test(allText)) score += 10;
  if (/\b(whatsapp|phone|contact|email|correo)\b/i.test(allText)) score += 15;

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

  if (/\b(book|reserv|sign up|i want to|quiero)\b/i.test(allText))
    return "ready_to_book";
  if (/\b(price|cost|how much|schedule|when|class)\b/i.test(allText))
    return "interested";
  if (/\b(help|problem|issue|question)\b/i.test(allText))
    return "needs_help";

  const userMsgCount = messages.filter((m) => m.role === "user").length;
  if (userMsgCount >= 3) return "interested";

  return "browsing";
}
