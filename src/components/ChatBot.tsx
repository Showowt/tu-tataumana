"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CONVERSATION_STARTERS = [
  "I've never done yoga before",
  "What's sound healing like?",
  "Tell me about retreats",
  "I'm visiting Cartagena soon",
  "How much do sessions cost?",
];

/**
 * TU ChatBot — AI Concierge for Tata Umaña's Wellness Practice
 * Knows everything about the business, services, pricing, and more
 */
export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    setHasInteracted(true);
    const userMessage: Message = { role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
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
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I apologize, I'm having trouble connecting right now. Please try again or reach out via WhatsApp for immediate assistance.",
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

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-24 right-6 z-50
          w-14 h-14
          flex items-center justify-center
          bg-rose-deep hover:bg-rose-soft
          text-cream
          shadow-lg hover:shadow-xl
          transition-all duration-300
          active:scale-95
          focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream
          ${isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"}
        `}
        aria-label="Open chat with TU"
        aria-expanded={isOpen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Chat Window */}
      <div
        className={`
          fixed bottom-6 right-6 z-50
          w-[380px] max-w-[calc(100vw-48px)]
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
            <div className="w-10 h-10 border border-rose-soft/60 flex items-center justify-center">
              <span className="font-body text-sm font-semibold text-rose-soft">
                TU
              </span>
            </div>
            <div>
              <h3 className="font-display text-cream text-lg">TU</h3>
              <p className="font-body text-xs text-rose-soft">
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
                  Welcome. I'm TU, the digital guide for Tata Umaña's wellness
                  practice here in Cartagena.
                </p>
                <p className="font-display text-charcoal/70 text-sm mt-2">
                  How can I help you today?
                </p>
              </div>

              {/* Conversation Starters */}
              <div className="space-y-2">
                <p className="font-body text-xs text-charcoal/50 uppercase tracking-wide">
                  Quick questions
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
                <p
                  className="font-display text-sm leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br />"),
                  }}
                />
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
                  TU is thinking...
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
              placeholder="Ask me anything..."
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
            Powered by TU · Tata Umaña's AI Concierge
          </p>
        </form>
      </div>
    </>
  );
}
