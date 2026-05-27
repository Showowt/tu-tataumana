import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { TU_SYSTEM_PROMPT, buildSystemPrompt } from "@/lib/tu-knowledge";
import { generateScheduleText } from "@/lib/schedule-text-generator";
import { notifyChatConversation } from "@/lib/telegram";

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 15;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Message validation — only allow user/assistant roles, cap content length
const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Too many requests." },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "JSON inválido. Invalid JSON body." },
        { status: 400 },
      );
    }
    const validationResult = ChatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Formato de mensaje inválido. Invalid message format." },
        { status: 400 },
      );
    }

    const { messages } = validationResult.data;

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error("[chat] ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { error: "Servicio no disponible. Service unavailable." },
        { status: 503 },
      );
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Inject current date/time so the bot knows what day it is
    // Colombia is UTC-5 (no daylight saving)
    const now = new Date();
    const colombiaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[colombiaTime.getDay()];
    const hours = colombiaTime.getHours();
    const minutes = colombiaTime.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    const dateStr = colombiaTime.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const timeContext = `\n\n═══ CURRENT DATE & TIME (Colombia Time) ═══\nToday is ${dayName}, ${dateStr}. The current time is ${hour12}:${minutes} ${ampm} Colombia Time (UTC-5).\nUse this to answer questions about "today's classes", "next class", "what's happening tomorrow", etc. Always reference the WEEKLY CLASS SCHEDULE above with this date/time to give accurate, specific answers.\n═══════════════════════════════════════════\n`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: await (async () => {
        try {
          const { scheduleBlock, teachersBlock } = await generateScheduleText();
          return buildSystemPrompt(scheduleBlock, teachersBlock) + timeContext;
        } catch {
          return TU_SYSTEM_PROMPT + timeContext;
        }
      })(),
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No se recibió respuesta. Empty AI response." },
        { status: 500 },
      );
    }

    const assistantMessage = textBlock.text;

    // Notify Tata via Telegram
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.content) {
      try {
        await notifyChatConversation({
          userMessage: lastUserMsg.content,
          botResponse: assistantMessage,
        });
      } catch (e) {
        console.error("[chat] Telegram notification failed:", e);
      }
    }

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("[chat]", error);
    return NextResponse.json(
      { error: "No se pudo procesar tu mensaje. Could not process your message." },
      { status: 500 },
    );
  }
}
