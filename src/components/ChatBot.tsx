"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const TULogoAliveNew = dynamic(() => import("@/components/TULogoAliveNew"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <span className="font-body text-sm font-semibold text-rose-soft">TU</span>
    </div>
  ),
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

const TATA_WHATSAPP = "+573185083035";

const CONVERSATION_STARTERS = [
  "I've never done yoga before",
  "What's sound healing like?",
  "I'm visiting Cartagena soon!",
  "I'd love to book a class",
  "How much do sessions cost?",
];

// Generate a unique session ID per browser session
function getSessionId(): string {
  const key = "tu_chat_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

// Extract contact info from conversation text
function extractContactInfo(messages: Message[]) {
  const allUserText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  const emailMatch = allUserText.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = allUserText.match(/\+?\d[\d\s()-]{8,}/);
  const namePatterns = [
    /(?:my name is|i'm|i am|me llamo|soy)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:name(?:'s| is)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];
  let name: string | undefined;
  for (const p of namePatterns) {
    const m = allUserText.match(p);
    if (m) { name = m[1]; break; }
  }

  // Detect interests from keywords
  const interests: string[] = [];
  const interestMap: Record<string, string> = {
    yoga: "Yoga",
    "sound healing": "Sound Healing",
    reiki: "Reiki",
    meditation: "Meditation",
    retreat: "Retreat",
    ceremony: "Ceremony",
    cacao: "Cacao Ceremony",
    kundalini: "Kundalini",
    pilates: "Pilates",
    "private session": "Private Session",
    "energy": "Energy Work",
  };
  const lower = allUserText.toLowerCase();
  for (const [keyword, label] of Object.entries(interestMap)) {
    if (lower.includes(keyword)) interests.push(label);
  }

  return {
    name,
    email: emailMatch?.[0],
    phone: phoneMatch?.[0]?.replace(/\s/g, ""),
    interests: interests.length > 0 ? interests : undefined,
  };
}

/**
 * YOU ChatBot — AI Concierge for Tata Umaña's Wellness Practice
 * With lead intelligence: tracks every conversation, scores leads, captures contact info
 */
export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize session ID on mount (client only)
  useEffect(() => {
    sessionIdRef.current = getSessionId();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Show hint after 5 seconds to invite engagement
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setShowHint(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Hide hint when chat opens
  useEffect(() => {
    if (isOpen) setShowHint(false);
  }, [isOpen]);

  // Save chat session to DB (debounced)
  const saveChatSession = useCallback(
    (currentMessages: Message[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (currentMessages.length === 0 || !sessionIdRef.current) return;
        const extracted = extractContactInfo(currentMessages);
        fetch("/api/chat-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            messages: currentMessages,
            extracted,
          }),
        }).catch(() => {});
      }, 2000);
    },
    []
  );

  // Save on chat close or page unload (capture abandoned conversations)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (messages.length > 0 && sessionIdRef.current) {
        const extracted = extractContactInfo(messages);
        navigator.sendBeacon(
          "/api/chat-session",
          new Blob(
            [
              JSON.stringify({
                session_id: sessionIdRef.current,
                messages,
                extracted,
              }),
            ],
            { type: "application/json" }
          )
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
      };
      const allMessages = [...updatedMessages, assistantMessage];
      setMessages(allMessages);

      // Save session after each exchange
      saveChatSession(allMessages);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I apologize, I'm having trouble connecting right now. Please reach out to Tata directly via WhatsApp for immediate assistance: +57 318 508 3035`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleStarterClick = (starter: string) => {
    sendMessage(starter);
  };

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${TATA_WHATSAPP}?text=Hi%20Tata%2C%20I%27m%20interested%20in%20your%20wellness%20services`,
      "_blank",
    );
  };

  return (
    <>
      {/* Chat Toggle Button - Living Logo */}
      <div
        className={`
          fixed bottom-24 right-6 z-50
          transition-all duration-500
          ${isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"}
        `}
      >
        {/* Attention-grabbing pulse ring */}
        <div className="absolute inset-0 -m-2">
          <div className="w-[72px] h-[72px] rounded-full bg-rose-soft/20 animate-ping" />
        </div>

        {/* Hint tooltip */}
        <div
          className={`
            absolute bottom-full right-0 mb-3
            bg-charcoal text-cream
            px-4 py-2.5
            font-body text-sm
            whitespace-nowrap
            transition-all duration-300
            ${showHint ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}
          `}
        >
          <span className="text-rose-soft font-semibold">I'm here</span> to help
          you
          {/* Arrow */}
          <div className="absolute top-full right-6 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-charcoal" />
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="
            relative
            w-16 h-16
            flex items-center justify-center
            bg-charcoal hover:bg-charcoal/90
            shadow-lg hover:shadow-xl
            transition-all duration-300
            active:scale-95
            focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream
            overflow-hidden
            cursor-pointer
          "
          aria-label="Chat with YOU - your wellness guide"
        >
          <div className="pointer-events-none">
            <TULogoAliveNew
              size={56}
              variant="rose"
              showText={false}
              interactive={false}
            />
          </div>
        </button>
      </div>

      {/* Chat Window */}
      <div
        className={`
          fixed bottom-6 right-6 z-50
          w-[380px] max-w-[calc(100%-48px)]
          bg-cream
          shadow-2xl
          flex flex-col
          transition-all duration-300 origin-bottom-right
          ${isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"}
        `}
        style={{ height: "min(600px, calc(100vh - 120px))" }}
      >
        {/* Header */}
        <div className="bg-charcoal px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
              <TULogoAliveNew
                size={52}
                variant="rose"
                showText={false}
                interactive={false}
              />
            </div>
            <div>
              <h3 className="font-display text-cream text-xl tracking-wide">
                YOU
              </h3>
              <p className="font-body text-xs text-rose-soft/80">
                Your wellness guide
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-cream/60 hover:text-cream transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
            aria-label="Close chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="bg-charcoal/5 p-4">
                <p className="font-display text-charcoal leading-relaxed">
                  Hello!! Welcome!
                </p>
                <p className="font-display text-charcoal/70 text-sm mt-3">
                  I'm Tata — I'd love to help you find what you're looking for. What brings you here today?
                </p>
              </div>

              {/* Conversation Starters */}
              <div className="space-y-2">
                <p className="font-body text-xs text-charcoal/50 uppercase tracking-wide">
                  What brings you here?
                </p>
                <div className="flex flex-wrap gap-2">
                  {CONVERSATION_STARTERS.map((starter, i) => (
                    <button
                      key={i}
                      onClick={() => handleStarterClick(starter)}
                      className="font-body text-xs text-rose-deep border border-rose-soft/30 px-3 py-2.5 min-h-[44px] hover:bg-rose-soft/10 active:bg-rose-soft/20 transition-colors text-left focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Message History */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`
                  max-w-[85%] p-3
                  ${
                    msg.role === "user"
                      ? "bg-rose-deep text-cream"
                      : "bg-charcoal/5 text-charcoal"
                  }
                `}
              >
                <p className="font-display text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content.split(/(\*\*.*?\*\*)/).map((part, j) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={j}>{part.slice(2, -2)}</strong>
                    ) : (
                      <span key={j}>{part}</span>
                    )
                  )}
                </p>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-charcoal/5 p-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <span
                    className="w-2 h-2 bg-rose-soft animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-rose-soft animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-rose-soft animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
                <span className="font-body text-xs text-charcoal/50">
                  thinking...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-charcoal/10 p-4"
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What's on your mind?"
              disabled={isLoading}
              className="
                flex-1
                font-display text-sm
                border border-charcoal/10
                px-4 py-3
                outline-none
                focus:border-rose-soft
                transition-colors
                disabled:opacity-50
                bg-white
              "
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="
                bg-rose-deep hover:bg-rose-soft
                text-cream
                px-4 py-3
                min-w-[48px] min-h-[48px]
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-95
                focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2
              "
              aria-label="Send message"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="font-body text-[10px] text-charcoal/40 mt-2 text-center">
            YOU · Powered by Tata Umaña
          </p>
        </form>
      </div>
    </>
  );
}
