"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedService?: string;
  preselectedDate?: string;
  preselectedTime?: string;
  services: { name: string; nameEs?: string; price: string; duration: string }[];
}

type Step = "form" | "payment" | "confirmed";
type PaymentMethod = "wompi" | "nequi" | "bancolombia" | "zelle" | null;

const BOOKING_RULES = [
  "Reserve your spot at least 2 hours in advance",
  "Arrive 10 minutes early (especially first class)",
  "Cancel 24 hours ahead for full refund",
  "Mats and props provided — just bring water",
];

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
  const [step, setStep] = useState<Step>("form");
  const [service, setService] = useState(preselectedService || "");
  const [selectedTime, setSelectedTime] = useState(preselectedTime || "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(preselectedDate || "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const availableClasses = getClassesForDate(date);
  const isDateClosed = date && closedDates.includes(date);

  const bookingService = selectedTime
    ? `${service} @ ${selectedTime}`
    : service;

  const fetchClosedDates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/closed-dates");
      const json = await res.json();
      setClosedDates((json.data || []).map((d: { date: string }) => d.date));
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchClosedDates();
  }, [fetchClosedDates]);

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

  // Capture abandoned bookings + reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // If they had any data filled but didn't complete, capture as abandoned lead
      const hasData = name || phone || email || service;
      const didNotComplete = step !== "confirmed";
      if (hasData && didNotComplete) {
        const bookingStep =
          step === "payment" ? "payment_selected" :
          (name && phone) ? "form_filled" : "form_started";
        fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "booking_abandoned",
            name: name || undefined,
            email: email || undefined,
            phone: phone || undefined,
            service_interest: bookingService || service || undefined,
            preferred_date: date || undefined,
            booking_step: "abandoned",
            payment_method: selectedPayment || undefined,
            warmth: (name && phone) ? "hot" : "warm",
          }),
        }).catch(() => {});
      }

      setTimeout(() => {
        setName("");
        setPhone("");
        setEmail("");
        setDate("");
        setMessage("");
        setService("");
        setSelectedTime("");
        setStep("form");
        setSubmitting(false);
        setRulesAccepted(false);
        setSelectedPayment(null);
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Scroll to top when step changes
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rulesAccepted) return;
    setSubmitting(true);

    try {
      const bookRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          service: bookingService,
          preferred_date: date,
          message,
          class_time: selectedTime || undefined,
          class_name: service || undefined,
        }),
      });
      const bookData = await bookRes.json();
      if (bookData.error && bookRes.status === 409) {
        alert(bookData.error);
        setSubmitting(false);
        return;
      }
    } catch {
      // Continue to payment even if API fails
    }

    // Also capture as a lead (completed booking)
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "booking_completed",
        name,
        email: email || undefined,
        phone,
        service_interest: bookingService || service,
        preferred_date: date || undefined,
        booking_step: "form_filled",
        warmth: "hot",
      }),
    }).catch(() => {});

    setSubmitting(false);
    setStep("payment");
  };

  const handlePaymentSelect = (method: PaymentMethod) => {
    setSelectedPayment(method);
    if (method === "wompi") {
      window.open("https://checkout.wompi.co/l/h3WPfP", "_blank", "noopener,noreferrer");
    }
    setStep("confirmed");
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
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8 md:p-10">
          {/* ━━━ STEP INDICATOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {(["form", "payment", "confirmed"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    background: step === s
                      ? "rgba(184,119,119,0.8)"
                      : i < ["form", "payment", "confirmed"].indexOf(step)
                        ? "rgba(184,119,119,0.4)"
                        : "rgba(44,44,44,0.12)",
                    width: step === s ? 24 : 8,
                  }}
                />
                {i < 2 && <div className="w-8 h-px bg-charcoal/8" />}
              </div>
            ))}
          </div>

          {/* ━━━ STEP 1: BOOKING FORM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {step === "form" && (
            <>
              <div className="text-center mb-8">
                <h3 className="font-[family-name:var(--font-display)] text-3xl text-charcoal">
                  {preselectedTime ? "Confirm Your Class" : "Book a Session"}
                </h3>
                <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-2">
                  Your info + select your class
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
                      <svg className="w-5 h-5 text-rose" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!preselectedTime && (
                  <>
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

                    {isDateClosed && (
                      <div className="rounded-2xl border border-rose/20 bg-rose/[0.04] p-4 flex items-start gap-3">
                        <svg className="w-5 h-5 text-rose mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                        <div>
                          <p className="font-[family-name:var(--font-body)] text-sm text-rose font-medium">
                            No classes on this date
                          </p>
                          <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-0.5">
                            Tata is unavailable on {formatDateDisplay(date)}. Please choose a different date.
                          </p>
                        </div>
                      </div>
                    )}

                    {date && !isDateClosed && availableClasses.length > 0 && (
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
                              service === cls.name && selectedTime === cls.time
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
                              {service === cls.name && selectedTime === cls.time && (
                                <div className="w-5 h-5 rounded-full bg-rose/20 flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-rose" />
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {(!date || isDateClosed || availableClasses.length === 0) && !isDateClosed && (
                      <div className="relative">
                        <select
                          value={service}
                          onChange={(e) => setService(e.target.value)}
                          required
                          className="w-full px-5 py-4 rounded-2xl border border-charcoal/8 bg-white font-[family-name:var(--font-body)] text-charcoal appearance-none cursor-pointer focus:border-rose/30 focus:outline-none transition-colors"
                        >
                          <option value="" disabled>Choose your experience</option>
                          {services.map((s) => (
                            <option key={s.name} value={s.name}>
                              {s.name} — {s.price}
                            </option>
                          ))}
                        </select>
                        <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    )}

                    {date && !isDateClosed && availableClasses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setSelectedTime(""); setService(""); }}
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

                {/* Booking Rules */}
                <div className="rounded-2xl border-2 border-gold/30 bg-gold/[0.04] p-5">
                  <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.25em] text-gold font-medium mb-3">
                    BOOKING RULES
                  </p>
                  <div className="space-y-2 mb-4">
                    {BOOKING_RULES.map((rule) => (
                      <div key={rule} className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                        </svg>
                        <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/60 leading-snug">{rule}</p>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={rulesAccepted}
                        onChange={(e) => setRulesAccepted(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 rounded-md border-2 border-charcoal/15 bg-white peer-checked:border-gold peer-checked:bg-gold transition-all duration-200 flex items-center justify-center">
                        {rulesAccepted && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/70 leading-snug group-hover:text-charcoal transition-colors">
                      I have read and agree to the booking rules
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !service || !rulesAccepted || !!isDateClosed}
                  className="w-full py-4 rounded-2xl bg-charcoal text-white font-[family-name:var(--font-body)] text-sm tracking-[0.2em] hover:bg-rose transition-colors duration-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {submitting ? "SAVING..." : "CONTINUE TO PAYMENT"}
                  {!submitting && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  )}
                </button>

                {!rulesAccepted && service && (
                  <p className="text-center font-[family-name:var(--font-body)] text-xs text-rose/60 pt-0.5">
                    Please accept the booking rules to continue
                  </p>
                )}
              </form>
            </>
          )}

          {/* ━━━ STEP 2: PAYMENT SELECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {step === "payment" && (
            <div className="py-2">
              {/* Booking summary */}
              <div className="bg-white rounded-2xl p-5 mb-6 border border-rose/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                      {bookingService}
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-0.5">
                      {date ? formatDateDisplay(date) : "Flexible"} &middot; {name}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#25D366]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="text-center mb-6">
                <h3 className="font-[family-name:var(--font-display)] text-2xl text-charcoal mb-1">
                  Select Payment Method
                </h3>
                <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40">
                  Choose how you&apos;d like to pay
                </p>
              </div>

              <div className="space-y-3">
                {/* Wompi - Card Payment */}
                <button
                  onClick={() => handlePaymentSelect("wompi")}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gold/25 bg-white hover:border-gold/50 hover:shadow-md transition-all group text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-gold/15 flex items-center justify-center shrink-0 group-hover:bg-gold/25 transition-colors">
                    <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-[family-name:var(--font-body)] text-sm text-charcoal font-medium">
                      Credit / Debit Card
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[11px] text-charcoal/40">
                      Visa, Mastercard, Amex — instant confirmation
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-charcoal/20 group-hover:text-gold transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>

                {/* Nequi */}
                <button
                  onClick={() => handlePaymentSelect("nequi")}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-charcoal/8 bg-white hover:border-[#E6007E]/30 hover:shadow-md transition-all group text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-[#E6007E]/10 flex items-center justify-center shrink-0">
                    <span className="font-[family-name:var(--font-body)] text-xs font-bold text-[#E6007E]">N</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-[family-name:var(--font-body)] text-sm text-charcoal font-medium">
                      Nequi
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[11px] text-charcoal/40">
                      Send to <span className="font-mono">3185083035</span>
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-charcoal/20 group-hover:text-[#E6007E] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>

                {/* Bancolombia */}
                <button
                  onClick={() => handlePaymentSelect("bancolombia")}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-charcoal/8 bg-white hover:border-[#FDDA24]/50 hover:shadow-md transition-all group text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-[#FDDA24]/15 flex items-center justify-center shrink-0">
                    <span className="font-[family-name:var(--font-body)] text-xs font-bold text-[#0033A0]">B</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-[family-name:var(--font-body)] text-sm text-charcoal font-medium">
                      Bancolombia
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[11px] text-charcoal/40">
                      Ahorros: <span className="font-mono">207-859047-00</span>
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-charcoal/20 group-hover:text-[#0033A0] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>

                {/* Zelle / PayPal */}
                <button
                  onClick={() => handlePaymentSelect("zelle")}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-charcoal/8 bg-white hover:border-[#6C3EC1]/30 hover:shadow-md transition-all group text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-[#6C3EC1]/10 flex items-center justify-center shrink-0">
                    <span className="font-[family-name:var(--font-body)] text-xs font-bold text-[#6C3EC1]">Z</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-[family-name:var(--font-body)] text-sm text-charcoal font-medium">
                      Zelle / PayPal
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[11px] text-charcoal/40">
                      Send to <span className="font-mono">+1 917 453 8307</span>
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-charcoal/20 group-hover:text-[#6C3EC1] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>

                {/* Cash */}
                <button
                  onClick={() => {
                    setSelectedPayment(null);
                    setStep("confirmed");
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-charcoal/8 bg-white hover:border-charcoal/20 hover:shadow-md transition-all group text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-charcoal/[0.06] flex items-center justify-center shrink-0">
                    <span className="font-[family-name:var(--font-body)] text-xs font-bold text-charcoal/50">$</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-[family-name:var(--font-body)] text-sm text-charcoal font-medium">
                      Cash (in person)
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[11px] text-charcoal/40">
                      COP or USD — pay when you arrive
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-charcoal/20 group-hover:text-charcoal/50 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>

              {/* Back button */}
              <button
                onClick={() => setStep("form")}
                className="w-full mt-4 py-3 font-[family-name:var(--font-body)] text-xs text-charcoal/30 hover:text-charcoal/50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Back to booking details
              </button>
            </div>
          )}

          {/* ━━━ STEP 3: CONFIRMATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {step === "confirmed" && (
            <div className="py-4">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-[#25D366]/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[#25D366]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl text-charcoal mb-1">
                  {selectedPayment === "wompi" ? "You're Booked!" : "Almost There!"}
                </h3>
              </div>

              {/* Booking summary */}
              <div className="rounded-2xl border border-charcoal/8 bg-white p-5 mb-5">
                <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.25em] text-charcoal/40 font-medium mb-3">
                  YOUR BOOKING
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/50">Class</span>
                    <span className="font-[family-name:var(--font-body)] text-sm text-charcoal font-medium">{bookingService}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/50">Date</span>
                    <span className="font-[family-name:var(--font-body)] text-sm text-charcoal font-medium">{date ? formatDateDisplay(date) : "Flexible"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/50">Name</span>
                    <span className="font-[family-name:var(--font-body)] text-sm text-charcoal font-medium">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-[family-name:var(--font-body)] text-sm text-charcoal/50">Payment</span>
                    <span className="font-[family-name:var(--font-body)] text-sm text-charcoal font-medium">
                      {selectedPayment === "wompi" ? "Card (Wompi)" :
                       selectedPayment === "nequi" ? "Nequi" :
                       selectedPayment === "bancolombia" ? "Bancolombia" :
                       selectedPayment === "zelle" ? "Zelle / PayPal" :
                       "Cash (in person)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment-specific instructions */}
              {selectedPayment === "wompi" ? (
                <div className="rounded-2xl border border-[#25D366]/20 bg-[#25D366]/[0.04] p-5 mb-5">
                  <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/70 leading-relaxed">
                    Your card payment through Wompi confirms your spot instantly. If the checkout didn&apos;t open,{" "}
                    <a
                      href="https://checkout.wompi.co/l/h3WPfP"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-rose font-medium underline underline-offset-2 hover:text-charcoal transition-colors"
                    >
                      click here to pay now
                    </a>.
                  </p>
                </div>
              ) : selectedPayment ? (
                <div className="rounded-2xl border border-gold/20 bg-gold/[0.03] p-5 mb-5">
                  <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-gold/70 font-medium mb-3">
                    NEXT STEP
                  </p>

                  {selectedPayment === "nequi" && (
                    <div className="space-y-3">
                      <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/70 leading-relaxed">
                        Open your Nequi app and send payment to:
                      </p>
                      <div className="bg-white rounded-xl p-4 text-center">
                        <p className="font-mono text-xl text-charcoal font-medium">3185083035</p>
                        <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-1">Include your name: {name}</p>
                      </div>
                    </div>
                  )}

                  {selectedPayment === "bancolombia" && (
                    <div className="space-y-3">
                      <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/70 leading-relaxed">
                        Transfer via Bancolombia app:
                      </p>
                      <div className="bg-white rounded-xl p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="font-[family-name:var(--font-body)] text-xs text-charcoal/40">Type</span>
                          <span className="font-[family-name:var(--font-body)] text-sm text-charcoal">Cuenta de Ahorros</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-[family-name:var(--font-body)] text-xs text-charcoal/40">Account</span>
                          <span className="font-mono text-sm text-charcoal font-medium">207-859047-00</span>
                        </div>
                        <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 pt-1">Include your name as reference</p>
                      </div>
                    </div>
                  )}

                  {selectedPayment === "zelle" && (
                    <div className="space-y-3">
                      <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/70 leading-relaxed">
                        Send via Zelle or PayPal to:
                      </p>
                      <div className="bg-white rounded-xl p-4 text-center">
                        <p className="font-mono text-xl text-charcoal font-medium">+1 917 453 8307</p>
                        <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-1">Include your name: {name}</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gold/10">
                    <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/50 leading-relaxed">
                      After paying, send your receipt via WhatsApp to confirm:
                    </p>
                    <a
                      href={`https://wa.me/573185083035?text=${encodeURIComponent(`Hi Tata! I just paid for ${bookingService}${date ? ` on ${formatDateDisplay(date)}` : ""}. My name is ${name}. Sending receipt now!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-[#25D366] text-white font-[family-name:var(--font-body)] text-sm tracking-[0.1em] hover:bg-[#20bd5a] transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 0 1-4.29-1.243L4 20l1.243-3.71A8 8 0 1 1 12 20z"/>
                      </svg>
                      SEND RECEIPT VIA WHATSAPP
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-charcoal/8 bg-white p-5 mb-5">
                  <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/70 leading-relaxed">
                    Pay in cash (COP or USD) when you arrive at Casa Carolina. Arrive 10 minutes early for your class.
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-charcoal text-white font-[family-name:var(--font-body)] text-sm tracking-[0.2em] hover:bg-rose transition-colors duration-500"
              >
                DONE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
