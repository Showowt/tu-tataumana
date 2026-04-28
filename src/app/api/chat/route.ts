import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TU_SYSTEM_PROMPT } from "@/lib/tu-knowledge";
import { notifyChatConversation } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 },
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
      system: TU_SYSTEM_PROMPT + timeContext,
      messages: messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Notify Tata via Telegram — must await before returning
    // (serverless functions terminate after response is sent)
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.content) {
      try {
        await notifyChatConversation({
          userMessage: lastUserMsg.content,
          botResponse: assistantMessage,
        });
      } catch (e) {
        console.error("[Chat] Telegram notification failed:", e);
      }
    }

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process chat request: ${errorMessage}` },
      { status: 500 },
    );
  }
}
