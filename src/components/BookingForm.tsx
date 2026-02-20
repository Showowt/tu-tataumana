"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { YogaClass, Booking } from "@/lib/yoga-classes";

/**
 * Booking Form Schema — Zod validation
 */
const bookingSchema = z.object({
  customerName: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  whatsapp: z.string().min(10, "Valid WhatsApp number required"),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  selectedClass: YogaClass;
  onComplete: (booking: Booking) => void;
  onBack: () => void;
}

interface FormErrors {
  customerName?: string;
  email?: string;
  whatsapp?: string;
  experienceLevel?: string;
}

/**
 * BookingForm — Two-step booking experience
 *
 * Step 1: Collect customer details
 * Step 2: Review class details and policies
 *
 * Design: Welcoming, easy, desirable — not intimidating
 */
export default function BookingForm({
  selectedClass,
  onComplete,
  onBack,
}: BookingFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<BookingFormData>({
    customerName: "",
    email: "",
    whatsapp: "",
    experienceLevel: "beginner",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format time for display (e.g., "07:00" -> "7:00 AM")
  const formatTime = useCallback((time: string): string => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }, []);

  // Format date for display
  const formatDate = useCallback((dateString?: string): string => {
    if (!dateString) return "Today";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  // Get price (default to $95 if not set)
  const classPrice = selectedClass.price ?? 95;

  // Validate step 1 form
  const validateStep1 = useCallback((): boolean => {
    const result = bookingSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormErrors;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [formData]);

  // Handle input changes
  const handleInputChange = useCallback(
    (field: keyof BookingFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors],
  );

  // Navigate to step 2
  const handleContinue = useCallback(() => {
    if (validateStep1()) {
      setStep(2);
    }
  }, [validateStep1]);

  // Handle final submission
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    // Create booking object
    const booking: Booking = {
      id: `booking-${Date.now()}`,
      classId: selectedClass.id,
      customerName: formData.customerName,
      email: formData.email,
      whatsapp: formData.whatsapp,
      experienceLevel: formData.experienceLevel,
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
      status: "pending",
      yogaClass: selectedClass,
    };

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    onComplete(booking);
  }, [formData, selectedClass, onComplete]);

  // Experience level options with friendly labels
  const experienceLevels = [
    {
      value: "beginner",
      label: "Beginner",
      description: "New to yoga or returning after a break",
    },
    {
      value: "intermediate",
      label: "Intermediate",
      description: "Comfortable with basic poses and flows",
    },
    {
      value: "advanced",
      label: "Advanced",
      description: "Experienced practitioner seeking depth",
    },
  ] as const;

  return (
    <div className="animate-fadeIn">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 flex items-center justify-center font-body text-xs transition-all duration-300 ${
              step === 1 ? "bg-rose-deep text-cream" : "bg-gold text-charcoal"
            }`}
          >
            {step > 1 ? (
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
              "1"
            )}
          </div>
          <span
            className={`font-body text-[10px] tracking-[0.1em] ${step >= 1 ? "text-charcoal" : "text-charcoal/30"}`}
          >
            YOUR DETAILS
          </span>
        </div>

        <div className="w-8 h-px bg-charcoal/20" />

        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 flex items-center justify-center font-body text-xs transition-all duration-300 ${
              step === 2
                ? "bg-rose-deep text-cream"
                : "bg-charcoal/10 text-charcoal/40"
            }`}
          >
            2
          </div>
          <span
            className={`font-body text-[10px] tracking-[0.1em] ${step === 2 ? "text-charcoal" : "text-charcoal/30"}`}
          >
            REVIEW & PAY
          </span>
        </div>
      </div>

      {/* Step 1: Your Details */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h3 className="font-display text-2xl text-charcoal mb-2">
              Tell us about yourself
            </h3>
            <p className="font-display text-sm text-charcoal/50">
              So we can prepare the perfect experience for you
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="font-body text-[10px] tracking-[0.1em] text-charcoal/50 block mb-2">
              FULL NAME <span className="text-rose-deep">*</span>
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) =>
                handleInputChange("customerName", e.target.value)
              }
              placeholder="Your name"
              autoComplete="name"
              className={`w-full font-display text-lg border-b-2 py-3 outline-none transition-colors bg-transparent placeholder:text-charcoal/20 ${
                errors.customerName
                  ? "border-rose-deep"
                  : "border-charcoal/20 focus:border-rose-deep hover:border-charcoal/40"
              }`}
            />
            {errors.customerName && (
              <p className="font-body text-xs text-rose-deep mt-2">
                {errors.customerName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="font-body text-[10px] tracking-[0.1em] text-charcoal/50 block mb-2">
              EMAIL <span className="text-rose-deep">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={`w-full font-display text-lg border-b-2 py-3 outline-none transition-colors bg-transparent placeholder:text-charcoal/20 ${
                errors.email
                  ? "border-rose-deep"
                  : "border-charcoal/20 focus:border-rose-deep hover:border-charcoal/40"
              }`}
            />
            {errors.email && (
              <p className="font-body text-xs text-rose-deep mt-2">
                {errors.email}
              </p>
            )}
          </div>

          {/* WhatsApp */}
          <div>
            <label className="font-body text-[10px] tracking-[0.1em] text-charcoal/50 block mb-2">
              WHATSAPP <span className="text-rose-deep">*</span>
            </label>
            <input
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => handleInputChange("whatsapp", e.target.value)}
              placeholder="+57 300 123 4567"
              autoComplete="tel"
              className={`w-full font-display text-lg border-b-2 py-3 outline-none transition-colors bg-transparent placeholder:text-charcoal/20 ${
                errors.whatsapp
                  ? "border-rose-deep"
                  : "border-charcoal/20 focus:border-rose-deep hover:border-charcoal/40"
              }`}
            />
            {errors.whatsapp && (
              <p className="font-body text-xs text-rose-deep mt-2">
                {errors.whatsapp}
              </p>
            )}
            <p className="font-body text-[10px] text-charcoal/40 mt-2">
              We&apos;ll send your confirmation here
            </p>
          </div>

          {/* Experience Level */}
          <div>
            <label className="font-body text-[10px] tracking-[0.1em] text-charcoal/50 block mb-4">
              EXPERIENCE LEVEL <span className="text-rose-deep">*</span>
            </label>
            <div className="space-y-3">
              {experienceLevels.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() =>
                    handleInputChange("experienceLevel", level.value)
                  }
                  className={`w-full flex items-start gap-4 p-4 border transition-all duration-300 text-left ${
                    formData.experienceLevel === level.value
                      ? "border-rose-deep bg-rose-deep/5"
                      : "border-charcoal/10 hover:border-charcoal/30"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      formData.experienceLevel === level.value
                        ? "border-rose-deep"
                        : "border-charcoal/30"
                    }`}
                  >
                    {formData.experienceLevel === level.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-deep" />
                    )}
                  </div>
                  <div>
                    <span className="font-display text-base text-charcoal block">
                      {level.label}
                    </span>
                    <span className="font-body text-xs text-charcoal/50">
                      {level.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="font-body text-[11px] text-charcoal/40 hover:text-charcoal transition-colors py-3 min-h-[44px] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              &larr; Back
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="flex-1 font-body text-[11px] tracking-[0.15em] bg-rose-deep hover:bg-rose-soft text-cream py-4 transition-all min-h-[56px] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review & Pay */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h3 className="font-display text-2xl text-charcoal mb-2">
              Review your booking
            </h3>
            <p className="font-display text-sm text-charcoal/50">
              Almost there — just confirm the details
            </p>
          </div>

          {/* Class Summary */}
          <div className="border border-charcoal/10 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-display text-xl text-charcoal mb-1">
                  {selectedClass.name}
                </h4>
                <p className="font-body text-[10px] tracking-[0.1em] text-charcoal/50">
                  {selectedClass.style.toUpperCase()} &bull;{" "}
                  {selectedClass.duration} MIN
                </p>
              </div>
              <div className="text-right">
                <span className="font-display text-3xl text-gold">
                  ${classPrice}
                </span>
                <span className="font-body text-xs text-charcoal/40 block">
                  USD
                </span>
              </div>
            </div>

            <div className="border-t border-charcoal/10 pt-4 space-y-2">
              <div className="flex items-center gap-3 text-charcoal/70">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-display text-sm">
                  {formatDate(selectedClass.date)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-charcoal/70">
                <svg
                  className="w-4 h-4"
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
                <span className="font-display text-sm">
                  {formatTime(selectedClass.time)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-charcoal/70">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="font-display text-sm">
                  {selectedClass.instructor}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Summary */}
          <div className="bg-charcoal/5 p-4">
            <p className="font-body text-[10px] tracking-[0.1em] text-charcoal/50 mb-2">
              BOOKING FOR
            </p>
            <p className="font-display text-charcoal">
              {formData.customerName}
            </p>
            <p className="font-body text-sm text-charcoal/60">
              {formData.email}
            </p>
          </div>

          {/* Policies Box */}
          <div className="bg-charcoal/5 p-5">
            <p className="font-body text-[10px] tracking-[0.2em] text-charcoal/50 mb-4">
              BOOKING POLICIES
            </p>
            <ul className="space-y-3">
              {[
                "Maximum 8 students per class",
                "Book at least 2 hours in advance",
                "Arrive 10 minutes before class - doors close after start",
                "No refunds for no-shows - class will be charged",
              ].map((policy, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-soft mt-2 flex-shrink-0" />
                  <span className="font-display text-sm text-charcoal/70">
                    {policy}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Price Display */}
          <div className="text-center py-4">
            <p className="font-body text-[10px] tracking-[0.2em] text-charcoal/50 mb-2">
              TOTAL
            </p>
            <p className="font-display text-5xl text-gold">${classPrice}</p>
            <p className="font-body text-xs text-charcoal/40">USD</p>
          </div>

          {/* Navigation */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="font-body text-[11px] text-charcoal/40 hover:text-charcoal transition-colors py-3 min-h-[44px] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              &larr; Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 font-body text-[11px] tracking-[0.15em] bg-rose-deep hover:bg-rose-soft text-cream py-4 transition-all min-h-[56px] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  PROCESSING...
                </>
              ) : (
                "PROCEED TO PAYMENT"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
