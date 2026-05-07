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
  0: [ // Sunday
    { time: "9:00 AM", name: "Just Hatha Flow" },
    { time: "10:30 AM", name: "Meditación Viaje Interior" },
  ],
  1: [ // Monday
    { time: "9:30 AM", name: "Stress Release" },
    { time: "11:00 AM", name: "Sculpt Your Body" },
    { time: "7:15 PM", name: "Open Flow" },
  ],
  2: [ // Tuesday
    { time: "9:30 AM", name: "Yoga for the Back" },
    { time: "5:30 PM", name: "Meditación Viaje Interior" },
    { time: "7:15 PM", name: "Hip Opening · Hatha" },
  ],
  3: [ // Wednesday
    { time: "9:30 AM", name: "Yogalates" },
    { time: "10:45 AM", name: "Pilates Flow" },
    { time: "7:15 PM", name: "Open Flow" },
  ],
  4: [ // Thursday
    { time: "9:30 AM", name: "Yoga Intro" },
    { time: "5:30 PM", name: "Sound Healing" },
    { time: "7:15 PM", name: "Hip Opening" },
  ],
  5: [ // Friday
    { time: "10:00 AM", name: "Power Yoga" },
    { time: "7:00 PM", name: "Open Flow" },
  ],
  6: [ // Saturday
    { time: "11:00 AM", name: "Sun Salutation" },
    { time: "6:00 PM", name: "Meditación Viaje Interior" },
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

/**
 * Parse class time string like "9:30 AM" or "7:15 PM" into 24h hours/minutes
 */
function parseClassTime(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hours: 0, minutes: 0 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

/**
 * Check if a class can be booked (must be at least 2 hours from now)
 * Uses Colombia timezone (UTC-5, no DST)
 */
function isClassBookable(dateStr: string, timeStr: string): boolean {
  const now = new Date();
  // Convert to Colombia time
  const colombiaNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));

  // Parse the class date and time
  const classDate = new Date(dateStr + "T12:00:00");
  const { hours, minutes } = parseClassTime(timeStr);

  // Build the full class datetime in Colombia time
  const classDateTime = new Date(classDate);
  classDateTime.setHours(hours, minutes, 0, 0);

  // If class is on a future day (not today), always bookable
  const todayStr = colombiaNow.toISOString().split("T")[0];
  const classDateStr = classDate.toISOString().split("T")[0];
  if (classDateStr > todayStr) return true;

  // If class is today, check 2-hour window
  if (classDateStr === todayStr) {
    const colombiaHours = colombiaNow.getHours();
    const colombiaMinutes = colombiaNow.getMinutes();
    const nowMinutes = colombiaHours * 60 + colombiaMinutes;
    const classMinutes = hours * 60 + minutes;
    const diffMinutes = classMinutes - nowMinutes;
    return diffMinutes >= 120; // Must be at least 2 hours away
  }

  // Past date — not bookable
  return false;
}

function getClassesForDate(dateStr: string) {
  if (!dateStr) return [];
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const classes = scheduleByDay[day] || [];

  // Filter out classes within the 2-hour booking window
  return classes.filter((cls) => isClassBookable(dateStr, cls.time));
}

function formatDateDisplay(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  const dayName = dayNames[d.getDay()];
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const date = d.getDate();
  return `${dayName}, ${month} ${date}`;
}

/**
 * Find the next available class after a given date.
 * Looks up to 14 days ahead, prefers the same class name if possible.
 */
function getNextAvailableClass(
  bookedDateStr: string,
  bookedClassName: string,
): { date: string; dateDisplay: string; time: string; name: string } | null {
  const bookedDate = new Date(bookedDateStr + "T12:00:00");

  // First pass: find the next occurrence of the SAME class
  for (let offset = 1; offset <= 14; offset++) {
    const nextDate = new Date(bookedDate);
    nextDate.setDate(nextDate.getDate() + offset);
    const dateStr = nextDate.toISOString().split("T")[0];
    const dayClasses = getClassesForDate(dateStr);
    const sameClass = dayClasses.find((c) => c.name === bookedClassName);
    if (sameClass) {
      return {
        date: dateStr,
        dateDisplay: formatDateDisplay(dateStr),
        time: sameClass.time,
        name: sameClass.name,
      };
    }
  }

  // Second pass: find ANY available class
  for (let offset = 1; offset <= 14; offset++) {
    const nextDate = new Date(bookedDate);
    nextDate.setDate(nextDate.getDate() + offset);
    const dateStr = nextDate.toISOString().split("T")[0];
    const dayClasses = getClassesForDate(dateStr);
    if (dayClasses.length > 0) {
      return {
        date: dateStr,
        dateDisplay: formatDateDisplay(dateStr),
        time: dayClasses[0].time,
        name: dayClasses[0].name,
      };
    }
  }

  return null;
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
  const [activePass, setActivePass] = useState<{ pass_type: string; classes_remaining: number | string; is_unlimited: boolean } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens with new preselected values
  useEffect(() => {
    if (isOpen) {
      setService(preselectedService || "");
      setSelectedTime(preselectedTime || "");
      setDate(preselectedDate || "");
      setStep("form");
      setRulesAccepted(false);
      setSelectedPayment(null);
      setSubmitting(false);
    }
  }, [isOpen, preselectedService, preselectedDate, preselectedTime]);

  const availableClasses = getClassesForDate(date);
  const isDateClosed = date && closedDates.includes(date);

  const bookingService = selectedTime
    ? `${service} @ ${selectedTime}`
    : service;

  // Check for active class pass when phone number changes (debounced)
  useEffect(() => {
    if (phone.length < 10) { setActivePass(null); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const normalized = phone.replace(/[\s\-\+]/g, "");
      fetch(`/api/passes?phone=${encodeURIComponent(normalized)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          if (data.passes && data.passes.length > 0) {
            const pass = data.passes[0];
            setActivePass({
              pass_type: pass.pass_type,
              classes_remaining: pass.classes_remaining,
              is_unlimited: pass.is_unlimited,
            });
          } else {
            setActivePass(null);
          }
        })
        .catch((err) => { if (err.name !== "AbortError") setActivePass(null); });
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [phone]);

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

  const getToday = () => {
    // Use Colombia timezone for date minimum
    const now = new Date();
    const colombia = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
    return colombia.toISOString().split("T")[0];
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

              {/* Pre-selected class info card — BIG DATE so they can't miss it */}
              {preselectedTime && preselectedDate && (
                <div className="mb-6 space-y-3">
                  {/* Prominent date banner */}
                  <div className="bg-gold/10 border-2 border-gold/30 rounded-2xl p-5 text-center">
                    <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.3em] text-gold/70 mb-1">
                      YOUR CLASS DATE
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-2xl text-charcoal">
                      {formatDateDisplay(date)}
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-lg text-rose mt-1">
                      {service} &middot; {selectedTime}
                    </p>
                  </div>

                  {/* Alert: this is NOT today */}
                  {(() => {
                    const now = new Date();
                    const colombiaNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
                    const todayStr = colombiaNow.toISOString().split("T")[0];
                    if (date && date !== todayStr) {
                      return (
                        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3">
                          <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                          </svg>
                          <div>
                            <p className="font-[family-name:var(--font-body)] text-sm text-amber-800 font-medium">
                              This class is NOT today
                            </p>
                            <p className="font-[family-name:var(--font-body)] text-xs text-amber-600 mt-0.5">
                              You are booking for <strong>{formatDateDisplay(date)}</strong>. Please confirm this is the correct date before proceeding.
                            </p>
                            <p className="font-[family-name:var(--font-body)] text-xs text-amber-500 mt-1">
                              Esta clase NO es hoy. Estás reservando para el <strong>{formatDateDisplay(date)}</strong>.
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
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
                      min={getToday()}
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
                      <>
                        {/* If a promo/pack is preselected (not in services list), show it locked */}
                        {service && !services.some((s) => s.name === service) ? (
                          <div className="w-full px-5 py-4 rounded-2xl border-2 border-gold/30 bg-gold/[0.05]">
                            <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                              {service}
                            </p>
                            <p className="font-[family-name:var(--font-body)] text-xs text-gold/70 mt-1">
                              {service.includes("Mamá") ? "$160,000 COP · 4 classes" :
                               service.includes("WALK-IN") ? "$80,000 COP" :
                               service.includes("2x1") ? "$80,000 COP · Bring a friend" :
                               service.includes("MARTES") ? "$45,000 COP · Tuesdays" :
                               service.includes("VIERNES") ? "$45,000 COP · Fridays" :
                               service.includes("JUST FLOW") ? "$295,000 COP · 6 classes" :
                               service.includes("HEALING") ? "$420,000 COP · 8 classes" :
                               service.includes("EQUILIBRIUM") ? "$630,000 COP · 12 classes" :
                               service.includes("LIFE") ? "$1,050,000 COP · Unlimited" :
                               "Special promotion"}
                            </p>
                          </div>
                        ) : (
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
                      </>
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

                {/* Active pass indicator */}
                {activePass && (
                  <div className="rounded-2xl border-2 border-[#25D366]/30 bg-[#25D366]/[0.05] p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-[#25D366]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-[family-name:var(--font-body)] text-sm text-charcoal font-medium">
                        {activePass.pass_type}
                      </p>
                      <p className="font-[family-name:var(--font-body)] text-xs text-[#25D366]">
                        {activePass.is_unlimited
                          ? "Unlimited classes · Pass active"
                          : `${activePass.classes_remaining} classes remaining`}
                      </p>
                    </div>
                  </div>
                )}

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
                  {submitting ? "SAVING..." : date ? `CONTINUE TO PAYMENT · ${formatDateDisplay(date)}` : "CONTINUE TO PAYMENT"}
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
                    <p className="font-[family-name:var(--font-body)] text-[10px] text-rose/60 mt-0.5">
                      +4% processing fee applies / +4% comisión de procesamiento
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
              {selectedPayment === "wompi" && (
                <div className="rounded-2xl border border-gold/20 bg-gold/[0.03] p-5 mb-4">
                  <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/70 leading-relaxed">
                    Your card payment through Wompi confirms your spot. If the checkout didn&apos;t open,{" "}
                    <a
                      href="https://checkout.wompi.co/l/h3WPfP"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-rose font-medium underline underline-offset-2 hover:text-charcoal transition-colors"
                    >
                      click here to pay now
                    </a>.
                  </p>
                  <p className="font-[family-name:var(--font-body)] text-[10px] text-charcoal/40 mt-2">
                    +4% processing fee applies / +4% comisión de procesamiento
                  </p>
                </div>
              )}

              {selectedPayment === "nequi" && (
                <div className="rounded-2xl border border-gold/20 bg-gold/[0.03] p-5 mb-4">
                  <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-gold/70 font-medium mb-3">NEXT STEP</p>
                  <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/70 mb-3">Open your Nequi app and send payment to:</p>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="font-mono text-xl text-charcoal font-medium">3185083035</p>
                    <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-1">Include your name: {name}</p>
                  </div>
                </div>
              )}

              {selectedPayment === "bancolombia" && (
                <div className="rounded-2xl border border-gold/20 bg-gold/[0.03] p-5 mb-4">
                  <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-gold/70 font-medium mb-3">NEXT STEP</p>
                  <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/70 mb-3">Transfer via Bancolombia app:</p>
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
                <div className="rounded-2xl border border-gold/20 bg-gold/[0.03] p-5 mb-4">
                  <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-gold/70 font-medium mb-3">NEXT STEP</p>
                  <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/70 mb-3">Send via Zelle or PayPal to:</p>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="font-mono text-xl text-charcoal font-medium">+1 917 453 8307</p>
                    <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-1">Include your name: {name}</p>
                  </div>
                </div>
              )}

              {!selectedPayment && (
                <div className="rounded-2xl border border-charcoal/8 bg-white p-5 mb-4">
                  <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/70 leading-relaxed">
                    Pay in cash (COP or USD) when you arrive at Casa Carolina. Arrive 10 minutes early for your class.
                  </p>
                </div>
              )}

              {/* WhatsApp Confirmation — ALWAYS shown for ALL payment methods */}
              <div className="rounded-2xl border-2 border-[#25D366]/30 bg-[#25D366]/[0.04] p-5 mb-5">
                <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.2em] text-[#25D366]/70 font-medium mb-3">
                  CONFIRM YOUR BOOKING
                </p>
                <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/60 leading-relaxed mb-4">
                  {selectedPayment === "wompi"
                    ? "Send Tata a message to confirm your booking and get class details:"
                    : "Send your payment receipt and confirm your booking:"}
                </p>
                <a
                  href={`https://wa.me/573185083035?text=${encodeURIComponent(
                    selectedPayment === "wompi"
                      ? `Hola Tata! Acabo de reservar y pagar con tarjeta para ${bookingService}${date ? ` el ${formatDateDisplay(date)}` : ""}${selectedTime ? ` a las ${selectedTime}` : ""}. Mi nombre es ${name}. Quedo atenta a la confirmación!\n\nHi Tata! I just booked and paid by card for ${bookingService}${date ? ` on ${formatDateDisplay(date)}` : ""}${selectedTime ? ` at ${selectedTime}` : ""}. My name is ${name}. Looking forward to confirmation!`
                      : `Hola Tata! Reservé ${bookingService}${date ? ` el ${formatDateDisplay(date)}` : ""}${selectedTime ? ` a las ${selectedTime}` : ""}. Mi nombre es ${name}. ${!selectedPayment ? "Pagaré en efectivo al llegar." : "Ya envié el pago, adjunto comprobante."}\n\nHi Tata! I booked ${bookingService}${date ? ` on ${formatDateDisplay(date)}` : ""}${selectedTime ? ` at ${selectedTime}` : ""}. My name is ${name}. ${!selectedPayment ? "I'll pay cash on arrival." : "Payment sent, receipt attached."}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#25D366] text-white font-[family-name:var(--font-body)] text-sm tracking-[0.15em] hover:bg-[#20bd5a] transition-colors btn-tactile"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 0 1-4.29-1.243L4 20l1.243-3.71A8 8 0 1 1 12 20z"/>
                  </svg>
                  CONFIRM VIA WHATSAPP
                </a>
                <p className="font-[family-name:var(--font-body)] text-[10px] text-charcoal/30 text-center mt-3">
                  Tata will personally confirm your spot within minutes
                </p>
              </div>

              {/* ━━━ NEXT AVAILABLE CLASS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
              {(() => {
                const nextClass = date && service
                  ? getNextAvailableClass(date, service.split(" @ ")[0])
                  : null;
                if (!nextClass) return null;
                return (
                  <div className="rounded-2xl border-2 border-rose/20 bg-rose/[0.03] p-5 mb-5">
                    <p className="font-[family-name:var(--font-body)] text-[10px] tracking-[0.25em] text-rose/60 font-medium mb-3">
                      KEEP YOUR PRACTICE GOING
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/60 mb-4">
                      Your next class is ready — lock in your spot now!
                    </p>
                    <div className="bg-white rounded-xl p-4 mb-4">
                      <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                        {nextClass.dateDisplay}
                      </p>
                      <p className="font-[family-name:var(--font-body)] text-sm text-rose mt-0.5">
                        {nextClass.name} &middot; {nextClass.time}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDate(nextClass.date);
                        setService(nextClass.name);
                        setSelectedTime(nextClass.time);
                        setRulesAccepted(false);
                        setSelectedPayment(null);
                        setSubmitting(false);
                        setStep("form");
                      }}
                      className="w-full py-4 rounded-2xl bg-rose text-white font-[family-name:var(--font-body)] text-sm tracking-[0.2em] hover:bg-charcoal transition-colors duration-500 flex items-center justify-center gap-3"
                    >
                      BOOK NEXT CLASS
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </div>
                );
              })()}

              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl border border-charcoal/10 text-charcoal/50 font-[family-name:var(--font-body)] text-sm tracking-[0.2em] hover:bg-charcoal hover:text-white transition-colors duration-500"
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
