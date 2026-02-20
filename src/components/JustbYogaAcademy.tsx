"use client";

import { useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

type BookingStep = "calendar" | "classes" | "form" | "payment" | "confirmation";

interface YogaClass {
  id: string;
  name: string;
  nameEs: string;
  time: string;
  duration: string;
  instructor: string;
  level: "All Levels" | "Beginner" | "Intermediate" | "Advanced";
  levelEs: string;
  spots: number;
  price: number;
  description: string;
  descriptionEs: string;
}

interface BookingData {
  selectedDate: Date | null;
  selectedClass: YogaClass | null;
  fullName: string;
  email: string;
  whatsapp: string;
  notes: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE YOGA CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CLASSES: YogaClass[] = [
  {
    id: "morning-flow",
    name: "Morning Vinyasa Flow",
    nameEs: "Flujo Vinyasa Matutino",
    time: "07:00 AM",
    duration: "75 min",
    instructor: "Tata",
    level: "All Levels",
    levelEs: "Todos los Niveles",
    spots: 8,
    price: 120000,
    description: "Start your day with breath-synchronized movement",
    descriptionEs:
      "Comienza tu día con movimiento sincronizado con la respiración",
  },
  {
    id: "gentle-restore",
    name: "Gentle Restore",
    nameEs: "Restauración Suave",
    time: "09:30 AM",
    duration: "60 min",
    instructor: "Tata",
    level: "Beginner",
    levelEs: "Principiante",
    spots: 10,
    price: 100000,
    description: "Slow, nurturing practice with extended holds",
    descriptionEs: "Práctica lenta y nutritiva con posturas prolongadas",
  },
  {
    id: "power-yoga",
    name: "Power Yoga",
    nameEs: "Yoga de Poder",
    time: "12:00 PM",
    duration: "60 min",
    instructor: "Tata",
    level: "Intermediate",
    levelEs: "Intermedio",
    spots: 6,
    price: 130000,
    description: "Dynamic, strength-building practice",
    descriptionEs: "Práctica dinámica para fortalecer el cuerpo",
  },
  {
    id: "sunset-yin",
    name: "Sunset Yin",
    nameEs: "Yin al Atardecer",
    time: "05:30 PM",
    duration: "90 min",
    instructor: "Tata",
    level: "All Levels",
    levelEs: "Todos los Niveles",
    spots: 12,
    price: 110000,
    description: "Deep stretching and meditation as the sun sets",
    descriptionEs: "Estiramiento profundo y meditación al atardecer",
  },
  {
    id: "kundalini",
    name: "Kundalini Awakening",
    nameEs: "Despertar Kundalini",
    time: "07:00 PM",
    duration: "90 min",
    instructor: "Tata",
    level: "Advanced",
    levelEs: "Avanzado",
    spots: 8,
    price: 150000,
    description: "Energy work, breathwork, and kriyas",
    descriptionEs: "Trabajo energético, pranayama y kriyas",
  },
];

const STEP_LABELS = {
  calendar: { en: "Date", es: "Fecha" },
  classes: { en: "Class", es: "Clase" },
  form: { en: "Details", es: "Datos" },
  payment: { en: "Payment", es: "Pago" },
  confirmation: { en: "Done", es: "Listo" },
};

const STEPS_ORDER: BookingStep[] = [
  "calendar",
  "classes",
  "form",
  "payment",
  "confirmation",
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

const formatDateEs = (date: Date): string => {
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface CalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

function YogaBookingCalendar({ selectedDate, onSelectDate }: CalendarProps) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const monthName = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const monthNameEs = today.toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  const isDateSelectable = (day: number): boolean => {
    return day >= today.getDate();
  };

  const isDateSelected = (day: number): boolean => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  };

  return (
    <div className="animate-fadeIn">
      <div className="text-center mb-8">
        <h3 className="font-display text-xl md:text-2xl text-charcoal mb-2">
          Choose Your Practice Day
        </h3>
        <p className="font-body text-sm text-charcoal/50">
          Elige el día de tu práctica
        </p>
      </div>

      <div className="bg-cream-warm/50 p-6 md:p-8 mb-6">
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="font-display text-lg text-charcoal capitalize">
            {monthName}
          </span>
          <span className="font-body text-xs text-charcoal/40 capitalize">
            {monthNameEs}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-4">
          {dayLabels.map((day, i) => (
            <span
              key={i}
              className="font-body text-[10px] text-charcoal/40 text-center py-2"
            >
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {/* Empty cells for days before the 1st */}
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Calendar days */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const selectable = isDateSelectable(day);
            const selected = isDateSelected(day);
            const isToday = day === today.getDate();

            return (
              <button
                key={day}
                onClick={() => {
                  if (selectable) {
                    onSelectDate(new Date(currentYear, currentMonth, day));
                  }
                }}
                disabled={!selectable}
                className={`aspect-square font-body text-sm flex items-center justify-center transition-all min-h-[44px] ${
                  !selectable
                    ? "text-charcoal/20 cursor-not-allowed"
                    : selected
                      ? "bg-rose-deep text-cream"
                      : isToday
                        ? "bg-gold/20 text-charcoal hover:bg-gold/30"
                        : "text-charcoal hover:bg-charcoal/5 active:bg-charcoal/10"
                }`}
                aria-label={`Select ${monthName} ${day}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="text-center">
          <p className="font-display text-lg text-rose-deep">
            {formatDate(selectedDate)}
          </p>
          <p className="font-body text-xs text-charcoal/40 capitalize">
            {formatDateEs(selectedDate)}
          </p>
        </div>
      )}
    </div>
  );
}

interface ClassSelectorProps {
  classes: YogaClass[];
  selectedClass: YogaClass | null;
  selectedDate: Date;
  onSelectClass: (yogaClass: YogaClass) => void;
  onBack: () => void;
}

function ClassSelector({
  classes,
  selectedClass,
  selectedDate,
  onSelectClass,
  onBack,
}: ClassSelectorProps) {
  return (
    <div className="animate-fadeIn">
      <div className="text-center mb-8">
        <h3 className="font-display text-xl md:text-2xl text-charcoal mb-2">
          Select Your Class
        </h3>
        <p className="font-body text-sm text-charcoal/50">
          {formatDate(selectedDate)}
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {classes.map((yogaClass) => (
          <button
            key={yogaClass.id}
            onClick={() => onSelectClass(yogaClass)}
            className={`w-full p-4 md:p-5 border transition-all duration-300 text-left group min-h-[88px] active:scale-[0.99] ${
              selectedClass?.id === yogaClass.id
                ? "border-rose-deep bg-rose-soft/10"
                : "border-charcoal/10 hover:border-rose-soft hover:bg-rose-soft/5"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-display text-base md:text-lg text-charcoal">
                    {yogaClass.name}
                  </span>
                  <span
                    className={`font-body text-[9px] tracking-[0.1em] px-2 py-1 ${
                      yogaClass.level === "Beginner"
                        ? "bg-chakra-heart/10 text-chakra-heart"
                        : yogaClass.level === "Intermediate"
                          ? "bg-chakra-solar/10 text-chakra-solar"
                          : yogaClass.level === "Advanced"
                            ? "bg-chakra-root/10 text-chakra-root"
                            : "bg-charcoal/5 text-charcoal/60"
                    }`}
                  >
                    {yogaClass.level.toUpperCase()}
                  </span>
                </div>
                <p className="font-body text-xs text-charcoal/50 mb-2">
                  {yogaClass.nameEs}
                </p>
                <div className="flex items-center gap-4 font-body text-[10px] text-charcoal/60">
                  <span>{yogaClass.time}</span>
                  <span className="text-charcoal/30">|</span>
                  <span>{yogaClass.duration}</span>
                  <span className="text-charcoal/30">|</span>
                  <span>{yogaClass.spots} spots available</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="font-display text-lg text-gold">
                  {formatPrice(yogaClass.price)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="font-body text-[11px] text-charcoal/40 hover:text-charcoal transition-colors py-3 min-h-[44px]"
      >
        ← Change date
      </button>
    </div>
  );
}

interface BookingFormProps {
  bookingData: BookingData;
  onUpdateData: (data: Partial<BookingData>) => void;
  onSubmit: () => void;
  onBack: () => void;
}

function BookingForm({
  bookingData,
  onUpdateData,
  onSubmit,
  onBack,
}: BookingFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="animate-fadeIn">
      <div className="text-center mb-8">
        <h3 className="font-display text-xl md:text-2xl text-charcoal mb-2">
          Your Details
        </h3>
        <p className="font-body text-sm text-charcoal/50">
          Tus datos de contacto
        </p>
      </div>

      {/* Booking Summary */}
      <div className="bg-cream-warm/50 p-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-base text-charcoal">
              {bookingData.selectedClass?.name}
            </p>
            <p className="font-body text-xs text-charcoal/50">
              {bookingData.selectedDate && formatDate(bookingData.selectedDate)}{" "}
              • {bookingData.selectedClass?.time}
            </p>
          </div>
          <span className="font-display text-lg text-gold">
            {bookingData.selectedClass &&
              formatPrice(bookingData.selectedClass.price)}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {[
          {
            field: "fullName",
            label: "Full Name",
            labelEs: "Nombre Completo",
            type: "text",
            placeholder: "",
            required: true,
          },
          {
            field: "email",
            label: "Email",
            labelEs: "Correo Electrónico",
            type: "email",
            placeholder: "you@example.com",
            required: true,
          },
          {
            field: "whatsapp",
            label: "WhatsApp",
            labelEs: "WhatsApp",
            type: "tel",
            placeholder: "+57 300 123 4567",
            required: true,
          },
          {
            field: "notes",
            label: "Notes (optional)",
            labelEs: "Notas (opcional)",
            type: "text",
            placeholder: "Any injuries or special requests?",
            required: false,
          },
        ].map(({ field, label, labelEs, type, placeholder, required }) => (
          <div key={field} className="mb-5">
            <label className="font-body text-[10px] tracking-[0.1em] text-charcoal/50 block mb-2">
              {label.toUpperCase()}
              {required && <span className="text-rose-deep ml-1">*</span>}
              <span className="text-charcoal/30 ml-2 normal-case">
                {labelEs}
              </span>
            </label>
            <input
              type={type}
              required={required}
              placeholder={placeholder}
              value={(bookingData[field as keyof BookingData] as string) || ""}
              onChange={(e) => onUpdateData({ [field]: e.target.value })}
              className="w-full font-display text-base md:text-lg border-b-2 border-charcoal/20 py-4 outline-none focus:border-rose-deep hover:border-charcoal/40 transition-colors bg-transparent placeholder:text-charcoal/20"
              autoComplete={
                field === "email"
                  ? "email"
                  : field === "fullName"
                    ? "name"
                    : field === "whatsapp"
                      ? "tel"
                      : "off"
              }
            />
          </div>
        ))}

        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={onBack}
            className="font-body text-[11px] text-charcoal/40 hover:text-charcoal transition-colors py-3 min-h-[44px]"
          >
            ← Back
          </button>
          <button
            type="submit"
            className="flex-1 font-body text-[11px] tracking-[0.15em] bg-rose-deep hover:bg-rose-soft text-cream py-4 transition-all min-h-[56px] active:scale-[0.98]"
          >
            CONTINUE TO PAYMENT
          </button>
        </div>
      </form>
    </div>
  );
}

interface PaymentCheckoutProps {
  bookingData: BookingData;
  onComplete: () => void;
  onBack: () => void;
}

function PaymentCheckout({
  bookingData,
  onComplete,
  onBack,
}: PaymentCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = () => {
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      onComplete();
    }, 2000);
  };

  return (
    <div className="animate-fadeIn">
      <div className="text-center mb-8">
        <h3 className="font-display text-xl md:text-2xl text-charcoal mb-2">
          Complete Your Booking
        </h3>
        <p className="font-body text-sm text-charcoal/50">
          Completa tu reserva
        </p>
      </div>

      {/* Booking Summary */}
      <div className="bg-cream-warm/50 p-6 mb-8">
        <h4 className="font-body text-[10px] tracking-[0.1em] text-charcoal/50 mb-4">
          BOOKING SUMMARY
        </h4>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="font-body text-sm text-charcoal/70">Class</span>
            <span className="font-display text-sm text-charcoal">
              {bookingData.selectedClass?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-body text-sm text-charcoal/70">Date</span>
            <span className="font-display text-sm text-charcoal">
              {bookingData.selectedDate && formatDate(bookingData.selectedDate)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-body text-sm text-charcoal/70">Time</span>
            <span className="font-display text-sm text-charcoal">
              {bookingData.selectedClass?.time}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-body text-sm text-charcoal/70">Duration</span>
            <span className="font-display text-sm text-charcoal">
              {bookingData.selectedClass?.duration}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-body text-sm text-charcoal/70">Student</span>
            <span className="font-display text-sm text-charcoal">
              {bookingData.fullName}
            </span>
          </div>
        </div>

        <div className="border-t border-charcoal/10 pt-4">
          <div className="flex justify-between items-center">
            <span className="font-body text-xs tracking-[0.1em] text-charcoal/50">
              TOTAL
            </span>
            <span className="font-display text-2xl text-gold">
              {bookingData.selectedClass &&
                formatPrice(bookingData.selectedClass.price)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mb-8">
        <h4 className="font-body text-[10px] tracking-[0.1em] text-charcoal/50 mb-4">
          PAYMENT METHOD
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <button className="p-4 border border-rose-deep bg-rose-soft/10 text-center transition-all">
            <span className="font-body text-xs text-charcoal">Credit Card</span>
          </button>
          <button className="p-4 border border-charcoal/10 hover:border-charcoal/30 text-center transition-all">
            <span className="font-body text-xs text-charcoal/70">
              Bank Transfer
            </span>
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="font-body text-[11px] text-charcoal/40 hover:text-charcoal transition-colors py-3 min-h-[44px]"
          disabled={isProcessing}
        >
          ← Back
        </button>
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="flex-1 font-body text-[11px] tracking-[0.15em] bg-gold hover:bg-gold-light text-charcoal py-4 transition-all min-h-[56px] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              PROCESSING...
            </span>
          ) : (
            "PAY NOW"
          )}
        </button>
      </div>

      {/* Security Note */}
      <p className="font-body text-[9px] text-charcoal/40 text-center mt-6">
        Secure payment powered by Wompi. Your data is encrypted and protected.
      </p>
    </div>
  );
}

interface ConfirmationProps {
  bookingData: BookingData;
  onBookAnother: () => void;
}

function BookingConfirmation({
  bookingData,
  onBookAnother,
}: ConfirmationProps) {
  const bookingRef = `TU-${Date.now().toString(36).toUpperCase()}`;

  return (
    <div className="text-center py-8 animate-fadeIn">
      <div className="w-20 h-20 bg-gold/10 flex items-center justify-center mx-auto mb-8">
        <svg
          className="w-10 h-10 text-gold"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h3 className="font-display text-3xl text-charcoal mb-2">
        Booking Confirmed
      </h3>
      <p className="font-display text-charcoal/50 mb-8">
        Tu reserva está confirmada
      </p>

      {/* Booking Details */}
      <div className="bg-cream-warm/50 p-6 mb-8 text-left max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-4">
          <span className="font-body text-[9px] tracking-[0.1em] text-charcoal/50">
            CONFIRMATION
          </span>
          <span className="font-body text-sm text-gold font-medium">
            {bookingRef}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-display text-charcoal">
            {bookingData.selectedClass?.name}
          </p>
          <p className="font-body text-charcoal/60">
            {bookingData.selectedDate && formatDate(bookingData.selectedDate)}
          </p>
          <p className="font-body text-charcoal/60">
            {bookingData.selectedClass?.time} •{" "}
            {bookingData.selectedClass?.duration}
          </p>
        </div>
      </div>

      <p className="font-body text-sm text-charcoal/60 mb-6 max-w-sm mx-auto">
        A confirmation has been sent to{" "}
        <span className="text-charcoal">{bookingData.email}</span> and{" "}
        <span className="text-charcoal">{bookingData.whatsapp}</span>
      </p>

      <p className="font-display text-2xl text-rose-deep italic mb-8">
        Namaste
      </p>

      <button
        onClick={onBookAnother}
        className="font-body text-[10px] tracking-[0.1em] text-charcoal/40 border border-charcoal/20 px-6 py-3 min-h-[44px] hover:border-charcoal hover:text-charcoal transition-all active:scale-[0.98]"
      >
        BOOK ANOTHER CLASS
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function JustbYogaAcademy() {
  const [bookingStep, setBookingStep] = useState<BookingStep>("calendar");
  const [bookingData, setBookingData] = useState<BookingData>({
    selectedDate: null,
    selectedClass: null,
    fullName: "",
    email: "",
    whatsapp: "",
    notes: "",
  });

  const updateBookingData = useCallback((data: Partial<BookingData>) => {
    setBookingData((prev) => ({ ...prev, ...data }));
  }, []);

  const handleDateSelect = useCallback(
    (date: Date) => {
      updateBookingData({ selectedDate: date });
      setBookingStep("classes");
    },
    [updateBookingData],
  );

  const handleClassSelect = useCallback(
    (yogaClass: YogaClass) => {
      updateBookingData({ selectedClass: yogaClass });
      setBookingStep("form");
    },
    [updateBookingData],
  );

  const handleFormSubmit = useCallback(() => {
    setBookingStep("payment");
  }, []);

  const handlePaymentComplete = useCallback(() => {
    setBookingStep("confirmation");
  }, []);

  const handleBookAnother = useCallback(() => {
    setBookingData({
      selectedDate: null,
      selectedClass: null,
      fullName: "",
      email: "",
      whatsapp: "",
      notes: "",
    });
    setBookingStep("calendar");
  }, []);

  const currentStepIndex = STEPS_ORDER.indexOf(bookingStep);

  return (
    <section
      id="academy"
      className="py-20 md:py-32 lg:py-40 px-4 md:px-6 bg-cream relative overflow-hidden"
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 sacred-dots opacity-30 pointer-events-none" />

      <div className="max-w-4xl mx-auto relative">
        {/* Section Header */}
        <div className="flex items-center justify-center gap-4 mb-10 md:mb-16">
          <span className="font-body text-[10px] tracking-[0.3em] text-rose-deep">
            07
          </span>
          <div className="w-12 h-px bg-rose-deep/30" />
          <span className="font-body text-[10px] tracking-[0.3em] text-rose-deep">
            JUSTBYOGA BY TUISYOU
          </span>
        </div>

        {/* Title */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-light mb-4">
            JustbYoga Academy
          </h2>
          <p className="font-display text-lg md:text-xl text-charcoal/50 italic">
            Your Daily Practice Awaits
          </p>
          <p className="font-body text-sm text-charcoal/40 mt-2">
            Tu práctica diaria te espera
          </p>
        </div>

        {/* Academy Intro */}
        <div className="max-w-2xl mx-auto text-center mb-12 md:mb-16">
          <p className="font-display text-base md:text-lg text-charcoal/70 leading-relaxed mb-4">
            Welcome to our daily yoga sanctuary. From sunrise flows to sunset
            yin, find the practice that resonates with your body and soul. Each
            class is an invitation to reconnect, restore, and transform.
          </p>
          <p className="font-body text-sm text-charcoal/50 leading-relaxed">
            Bienvenido a nuestro santuario de yoga diario. Desde flujos al
            amanecer hasta yin al atardecer, encuentra la práctica que resuena
            con tu cuerpo y alma.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-1 md:gap-2 mb-10 md:mb-16 overflow-x-auto">
          {STEPS_ORDER.map((step, i) => (
            <div
              key={step}
              className="flex items-center gap-1 md:gap-2 flex-shrink-0"
            >
              <div
                className={`flex items-center justify-center w-10 h-10 md:w-8 md:h-8 font-body text-xs transition-all duration-300 ${
                  i < currentStepIndex
                    ? "bg-gold text-charcoal"
                    : i === currentStepIndex
                      ? "bg-rose-deep text-cream"
                      : "bg-charcoal/10 text-charcoal/40"
                }`}
              >
                {i < currentStepIndex ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`font-body text-[9px] md:text-[10px] tracking-[0.1em] hidden sm:block ${
                  i <= currentStepIndex ? "text-charcoal" : "text-charcoal/30"
                }`}
              >
                {STEP_LABELS[step].en.toUpperCase()}
              </span>
              {i < STEPS_ORDER.length - 1 && (
                <div
                  className={`w-4 md:w-12 h-px mx-1 md:mx-2 transition-colors ${
                    i < currentStepIndex ? "bg-gold" : "bg-charcoal/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Booking Container */}
        <div className="bg-white border border-charcoal/5 p-5 md:p-8 lg:p-12 max-w-2xl mx-auto">
          {bookingStep === "calendar" && (
            <YogaBookingCalendar
              selectedDate={bookingData.selectedDate}
              onSelectDate={handleDateSelect}
            />
          )}

          {bookingStep === "classes" && bookingData.selectedDate && (
            <ClassSelector
              classes={SAMPLE_CLASSES}
              selectedClass={bookingData.selectedClass}
              selectedDate={bookingData.selectedDate}
              onSelectClass={handleClassSelect}
              onBack={() => setBookingStep("calendar")}
            />
          )}

          {bookingStep === "form" && (
            <BookingForm
              bookingData={bookingData}
              onUpdateData={updateBookingData}
              onSubmit={handleFormSubmit}
              onBack={() => setBookingStep("classes")}
            />
          )}

          {bookingStep === "payment" && (
            <PaymentCheckout
              bookingData={bookingData}
              onComplete={handlePaymentComplete}
              onBack={() => setBookingStep("form")}
            />
          )}

          {bookingStep === "confirmation" && (
            <BookingConfirmation
              bookingData={bookingData}
              onBookAnother={handleBookAnother}
            />
          )}
        </div>

        {/* Booking Policies */}
        <div className="max-w-2xl mx-auto mt-12 md:mt-16">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 text-center">
            <div>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-rose-soft/10">
                <svg
                  className="w-6 h-6 text-rose-deep"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className="font-display text-sm text-charcoal mb-2">
                Arrive Early
              </h4>
              <p className="font-body text-xs text-charcoal/50">
                Please arrive 10 minutes before class to settle in
              </p>
            </div>

            <div>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-rose-soft/10">
                <svg
                  className="w-6 h-6 text-rose-deep"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <h4 className="font-display text-sm text-charcoal mb-2">
                Free Cancellation
              </h4>
              <p className="font-body text-xs text-charcoal/50">
                Cancel up to 24 hours before for a full refund
              </p>
            </div>

            <div>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-rose-soft/10">
                <svg
                  className="w-6 h-6 text-rose-deep"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <h4 className="font-display text-sm text-charcoal mb-2">
                Mats Provided
              </h4>
              <p className="font-body text-xs text-charcoal/50">
                All equipment included, just bring yourself
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
