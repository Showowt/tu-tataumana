"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const TULogoAlive = dynamic(() => import("@/components/TULogoAlive"), {
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

const TATA_WHATSAPP = "+19174538307";

const CONVERSATION_STARTERS = [
  "I've never done yoga before",
  "What's sound healing like?",
  "Tell me about retreats",
  "I'm visiting Cartagena soon",
  "How much do sessions cost?",
];

/**
 * YOU ChatBot — AI Concierge for Tata Umaña's Wellness Practice
 * "YOU" = TU = Tata Umaña — the guide is YOU, speaking to YOU
 */
export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
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

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

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
          content: `I apologize, I'm having trouble connecting right now. Please reach out to Tata directly via WhatsApp for immediate assistance: +1 (917) 453-8307`,
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
          "
          aria-label="Chat with YOU - your wellness guide"
        >
          <TULogoAlive
            size={56}
            variant="rose"
            showText={false}
            interactive={false}
          />
        </button>
      </div>

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
            <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
              <TULogoAlive
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
                  Welcome. I'm here to guide you through Tata Umaña's wellness
                  practice in Cartagena.
                </p>
                <p className="font-display text-charcoal/70 text-sm mt-2">
                  Ask me anything — I'm here for{" "}
                  <span className="text-rose-deep font-medium">you</span>.
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

              {/* WhatsApp Option */}
              <div className="pt-2 border-t border-charcoal/10">
                <button
                  onClick={openWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-body text-sm transition-colors min-h-[48px]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Or message Tata directly
                </button>
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
