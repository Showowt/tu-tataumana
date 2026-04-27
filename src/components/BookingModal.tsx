"use client";

import { useState, useEffect, useRef } from "react";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedService?: string;
  preselectedDate?: string;
  preselectedTime?: string;
  services: { name: string; price: string; duration: string }[];
}

// Weekly schedule for date-aware class display
const scheduleByDay: Record<number, { time: string; name: string }[]> = {
  1: [
    { time: "9:30 AM", name: "Yoga Conscious" },
    { time: "7:15 PM", name: "Yoga Conscious" },
  ],
  2: [
    { time: "9:30 AM", name: "Back Care Yoga" },
    { time: "7:15 PM", name: "Hip Opener · Hatha" },
  ],
  3: [
    { time: "9:30 AM", name: "Yoga Conscious" },
    { time: "10:45 AM", name: "Pilates" },
    { time: "7:15 PM", name: "Open Flow" },
  ],
  4: [
    { time: "9:30 AM", name: "Yoga Intro · Power Up" },
    { time: "5:30 PM", name: "Sound Healing" },
    { time: "7:15 PM", name: "Hip Opener" },
  ],
  5: [
    { time: "10:00 AM", name: "Power Yoga · Postura" },
    { time: "7:00 PM", name: "Open Flow" },
  ],
  6: [
    { time: "11:00 AM", name: "Sun Salutation" },
    { time: "6:00 PM", name: "Inner Journey · Meditation" },
  ],
  0: [
    { time: "9:00 AM", name: "Just Hatha Flow" },
    { time: "10:30 AM", name: "Inner Journey · Meditation" },
  ],
};

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getClassesForDate(dateStr: string) {
  if (!dateStr) return [];
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  return scheduleByDay[day] || [];
}

function formatDateDisplay(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  const dayName = dayNames[d.getDay()];
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const date = d.getDate();
  return `${dayName}, ${month} ${date}`;
}

export default function BookingModal({
  isOpen,
  onClose,
  preselectedService,
  preselectedDate,
  preselectedTime,
  services,
}: BookingModalProps) {
  const [service, setService] = useState(preselectedService || "");
  const [selectedTime, setSelectedTime] = useState(preselectedTime || "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(preselectedDate || "");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const modalRef = useRef<HTMLDivElement>(null);

  const availableClasses = getClassesForDate(date);
  const isClassBooking = !!preselectedTime || availableClasses.length > 0;

  // Update when preselected values change
  useEffect(() => {
    if (preselectedService) setService(preselectedService);
    if (preselectedDate) setDate(preselectedDate);
    if (preselectedTime) setSelectedTime(preselectedTime);
  }, [preselectedService, preselectedDate, preselectedTime]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        if (status === "sent") {
          setName("");
          setPhone("");
          setEmail("");
          setDate("");
          setMessage("");
          setService("");
          setSelectedTime("");
          setStatus("idle");
        }
      }, 300);
    }
  }, [isOpen, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    const bookingService = selectedTime
      ? `${service} @ ${selectedTime}`
      : service;

    try {
      await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          service: bookingService,
          preferred_date: date,
          message,
        }),
      });
    } catch {
      // Fallback to WhatsApp even if API fails
    }

    setStatus("sent");

    const text = encodeURIComponent(
      `Hi Tata! I'd like to book:\n\nClass: ${bookingService}\nDate: ${date ? formatDateDisplay(date) : "Flexible"}\nName: ${name}\n${message ? `Note: ${message}` : ""}`
    );
    window.open(`https://wa.me/573001234567?text=${text}`, "_blank");
  };

  const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0 }}
        onClick={onClose}
      />

      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-cream rounded-t-3xl md:rounded-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-500"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "translateY(0)" : "translateY(40px)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center text-charcoal/30 hover:text-charcoal transition-colors z-10"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="p-8 md:p-10">
          {status === "sent" ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#25D366]/10 flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-[#25D366]"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-3xl text-charcoal mb-2">
                You&apos;re In
              </h3>
              <p className="font-[family-name:var(--font-body)] text-charcoal/50 max-w-xs mx-auto">
                Your spot is reserved. Tata will confirm via WhatsApp within 24
                hours.
              </p>
              <button
                onClick={onClose}
                className="mt-8 font-[family-name:var(--font-body)] text-sm tracking-widest text-charcoal/40 hover:text-charcoal transition-colors"
              >
                CLOSE
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h3 className="font-[family-name:var(--font-display)] text-3xl text-charcoal">
                  {preselectedTime ? "Confirm Your Class" : "Book a Session"}
                </h3>
                <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-2">
                  Takes 30 seconds. Tata confirms within 24 hours.
                </p>
              </div>

              {/* Pre-selected class info card */}
              {preselectedTime && preselectedDate && (
                <div className="bg-white rounded-2xl p-5 mb-6 border border-rose/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-[family-name:var(--font-display)] text-xl text-charcoal">
                        {service}
                      </p>
                      <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-1">
                        {formatDateDisplay(date)} &middot; {selectedTime}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-rose/[0.06] flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-rose"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Service/class selector — only show if NOT pre-selected from schedule */}
                {!preselectedTime && (
                  <>
                    {/* Date picker first — so classes appear */}
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setService("");
                        setSelectedTime("");
                      }}
                      min={getTomorrow()}
                      className="w-full px-5 py-4 rounded-2xl border border-charcoal/8 bg-white font-[family-name:var(--font-body)] text-charcoal focus:border-rose/30 focus:outline-none transition-colors"
                    />

                    {/* Show available classes for selected date */}
                    {date && availableClasses.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 tracking-wider pl-1">
                          {formatDateDisplay(date).toUpperCase()} — CLASSES
                        </p>
                        {availableClasses.map((cls, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setService(cls.name);
                              setSelectedTime(cls.time);
                            }}
                            className={`w-full text-left px-5 py-3.5 rounded-2xl border transition-all duration-200 ${
                              service === cls.name &&
                              selectedTime === cls.time
                                ? "border-rose/30 bg-rose/[0.04]"
                                : "border-charcoal/5 bg-white hover:border-charcoal/10"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 tabular-nums w-[72px]">
                                  {cls.time}
                                </span>
                                <span className="font-[family-name:var(--font-display)] text-base text-charcoal">
                                  {cls.name}
                                </span>
                              </div>
                              {service === cls.name &&
                                selectedTime === cls.time && (
                                  <div className="w-5 h-5 rounded-full bg-rose/20 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-rose" />
                                  </div>
                                )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Fallback: service dropdown if no date or private sessions */}
                    {(!date || availableClasses.length === 0) && (
                      <div className="relative">
                        <select
                          value={service}
                          onChange={(e) => setService(e.target.value)}
                          required
                          className="w-full px-5 py-4 rounded-2xl border border-charcoal/8 bg-white font-[family-name:var(--font-body)] text-charcoal appearance-none cursor-pointer focus:border-rose/30 focus:outline-none transition-colors"
                        >
                          <option value="" disabled>
                            Choose your experience
                          </option>
                          {services.map((s) => (
                            <option key={s.name} value={s.name}>
                              {s.name} — {s.price}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30 pointer-events-none"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Also show private session option when classes are visible */}
                    {date && availableClasses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTime("");
                          setService("");
                        }}
                        className="w-full text-center font-[family-name:var(--font-body)] text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors py-2"
                      >
                        Or book a private session instead
                      </button>
                    )}
                  </>
                )}

                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-5 py-4 rounded-2xl border border-charcoal/8 bg-white font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/25 focus:border-rose/30 focus:outline-none transition-colors"
                />

                <input
                  type="tel"
                  placeholder="WhatsApp number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-5 py-4 rounded-2xl border border-charcoal/8 bg-white font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/25 focus:border-rose/30 focus:outline-none transition-colors"
                />

                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border border-charcoal/8 bg-white font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/25 focus:border-rose/30 focus:outline-none transition-colors"
                />

                <textarea
                  placeholder="Anything Tata should know? (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  className="w-full px-5 py-4 rounded-2xl border border-charcoal/8 bg-white font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/25 focus:border-rose/30 focus:outline-none transition-colors resize-none"
                />

                <button
                  type="submit"
                  disabled={status === "sending" || !service}
                  className="w-full py-4 rounded-2xl bg-charcoal text-white font-[family-name:var(--font-body)] text-sm tracking-[0.2em] hover:bg-rose transition-colors duration-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === "sending" ? "SENDING..." : "BOOK NOW"}
                </button>

                <p className="text-center font-[family-name:var(--font-body)] text-xs text-charcoal/30 pt-1">
                  Sends booking request + opens WhatsApp chat with Tata
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
