"use client";

import { useState, useEffect, useCallback } from "react";

interface ClosedDate {
  date: string;
  reason: string | null;
}

interface Pass {
  id: number;
  phone: string;
  name: string | null;
  pass_type: string;
  total_classes: number;
  classes_used: number;
  classes_remaining: number | string;
  is_unlimited: boolean;
  status: string;
  expires_at: string | null;
  payment_confirmed: boolean;
  payment_method: string | null;
  created_at: string;
}

interface Booking {
  id: number;
  name: string;
  phone: string;
  service: string;
  preferred_date: string | null;
  class_time: string | null;
  status: string;
  created_at: string;
}

const PASS_TYPES = [
  { value: "MAYO MES MAMÁ", label: "Mayo Mes Mamá", classes: 4, price: "$160,000" },
  { value: "JUST FLOW PACK", label: "Just Flow Pack", classes: 6, price: "$295,000" },
  { value: "TU HEALING PACK", label: "TU Healing Pack", classes: 8, price: "$420,000" },
  { value: "TU EQUILIBRIUM", label: "TU Equilibrium", classes: 12, price: "$630,000" },
  { value: "TU LIFE PACK", label: "TU Life Pack (Unlimited)", classes: -1, price: "$1,050,000" },
];

type Tab = "passes" | "bookings" | "schedule";

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("passes");

  // Schedule state
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");

  // Pass state
  const [passes, setPasses] = useState<Pass[]>([]);
  const [newPassPhone, setNewPassPhone] = useState("");
  const [newPassName, setNewPassName] = useState("");
  const [newPassType, setNewPassType] = useState("");
  const [newPassPayment, setNewPassPayment] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupResult, setLookupResult] = useState<Pass[] | null>(null);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchClosedDates = useCallback(async () => {
    const res = await fetch("/api/admin/closed-dates");
    const json = await res.json();
    setClosedDates(json.data || []);
  }, []);

  const fetchBookings = useCallback(async () => {
    const res = await fetch("/api/bookings");
    const json = await res.json();
    setBookings(json.data || []);
  }, []);

  const fetchAllPasses = useCallback(async () => {
    // Fetch passes for all known phones from recent bookings
    const bookRes = await fetch("/api/bookings");
    const bookJson = await bookRes.json();
    const phones = new Set<string>();
    (bookJson.data || []).forEach((b: Booking) => {
      if (b.phone) phones.add(b.phone.replace(/[\s\-\+]/g, ""));
    });

    const allPasses: Pass[] = [];
    for (const phone of phones) {
      try {
        const res = await fetch(`/api/passes?phone=${encodeURIComponent(phone)}`);
        const json = await res.json();
        if (json.passes) {
          allPasses.push(
            ...json.passes.map((p: Pass) => ({ ...p, phone }))
          );
        }
      } catch {
        // skip
      }
    }
    setPasses(allPasses);
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchClosedDates();
      fetchBookings();
      fetchAllPasses();
    }
  }, [authenticated, fetchClosedDates, fetchBookings, fetchAllPasses]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  // Schedule actions
  const closeDate = async () => {
    if (!newDate) return;
    setLoading(true);
    await fetch("/api/admin/closed-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate, reason: reason || null, adminKey }),
    });
    setNewDate("");
    setReason("");
    await fetchClosedDates();
    setLoading(false);
  };

  const reopenDate = async (date: string) => {
    setLoading(true);
    await fetch("/api/admin/closed-dates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, adminKey }),
    });
    await fetchClosedDates();
    setLoading(false);
  };

  // Pass actions
  const createPass = async () => {
    if (!newPassPhone || !newPassType) return;
    setLoading(true);
    try {
      const res = await fetch("/api/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: newPassPhone,
          name: newPassName || null,
          pass_type: newPassType,
          payment_method: newPassPayment || null,
        }),
      });
      const json = await res.json();
      if (json.pass) {
        showMessage(`Pass created for ${newPassPhone}`);
        setNewPassPhone("");
        setNewPassName("");
        setNewPassType("");
        setNewPassPayment("");
        await fetchAllPasses();
      } else {
        showMessage(`Error: ${json.error}`);
      }
    } catch {
      showMessage("Failed to create pass");
    }
    setLoading(false);
  };

  const lookupPass = async () => {
    if (!lookupPhone) return;
    setLoading(true);
    try {
      const normalized = lookupPhone.replace(/[\s\-\+]/g, "");
      const res = await fetch(`/api/passes?phone=${encodeURIComponent(normalized)}`);
      const json = await res.json();
      setLookupResult(json.passes || []);
    } catch {
      setLookupResult([]);
    }
    setLoading(false);
  };

  const getToday = () => new Date().toISOString().split("T")[0];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey.trim()) setAuthenticated(true);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl text-charcoal mb-2">
              TU. Admin
            </h1>
            <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40">
              Management dashboard for Tata
            </p>
          </div>
          <input
            type="password"
            placeholder="Admin key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            required
            className="w-full px-5 py-4 rounded-2xl border border-charcoal/8 bg-white font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/25 focus:border-rose/30 focus:outline-none"
          />
          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-charcoal text-white font-[family-name:var(--font-body)] text-sm tracking-[0.2em] hover:bg-rose transition-colors"
          >
            ENTER
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-charcoal">
            TU. Admin Dashboard
          </h1>
          <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-1">
            Manage passes, bookings, and schedule
          </p>
        </div>

        {/* Success message */}
        {message && (
          <div className="mb-6 p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20">
            <p className="font-[family-name:var(--font-body)] text-sm text-[#25D366]">{message}</p>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1 mb-8 bg-charcoal/5 rounded-2xl p-1">
          {([
            { key: "passes" as Tab, label: "Class Passes" },
            { key: "bookings" as Tab, label: "Bookings" },
            { key: "schedule" as Tab, label: "Schedule" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 rounded-xl font-[family-name:var(--font-body)] text-sm tracking-[0.1em] transition-all ${
                activeTab === tab.key
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-charcoal/40 hover:text-charcoal/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ━━━ PASSES TAB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "passes" && (
          <div className="space-y-8">
            {/* Create new pass */}
            <div className="bg-white rounded-2xl border border-charcoal/5 p-6">
              <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-gold mb-4">
                CREATE NEW PASS
              </p>
              <div className="space-y-3">
                <input
                  type="tel"
                  placeholder="Client WhatsApp number (e.g. 573185083035)"
                  value={newPassPhone}
                  onChange={(e) => setNewPassPhone(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl border border-charcoal/8 bg-cream font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/25 focus:border-rose/30 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Client name"
                  value={newPassName}
                  onChange={(e) => setNewPassName(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl border border-charcoal/8 bg-cream font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/25 focus:border-rose/30 focus:outline-none"
                />
                <select
                  value={newPassType}
                  onChange={(e) => setNewPassType(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl border border-charcoal/8 bg-cream font-[family-name:var(--font-body)] text-charcoal appearance-none cursor-pointer focus:border-rose/30 focus:outline-none"
                >
                  <option value="">Select pass type</option>
                  {PASS_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label} — {pt.classes === -1 ? "Unlimited" : `${pt.classes} classes`} — {pt.price} COP
                    </option>
                  ))}
                </select>
                <select
                  value={newPassPayment}
                  onChange={(e) => setNewPassPayment(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl border border-charcoal/8 bg-cream font-[family-name:var(--font-body)] text-charcoal appearance-none cursor-pointer focus:border-rose/30 focus:outline-none"
                >
                  <option value="">Payment method (optional)</option>
                  <option value="wompi">Wompi (Card)</option>
                  <option value="nequi">Nequi</option>
                  <option value="bancolombia">Bancolombia</option>
                  <option value="zelle">Zelle / PayPal</option>
                  <option value="cash">Cash</option>
                </select>
                <button
                  onClick={createPass}
                  disabled={!newPassPhone || !newPassType || loading}
                  className="w-full py-3.5 rounded-xl bg-gold text-charcoal font-[family-name:var(--font-body)] text-sm tracking-[0.15em] hover:bg-charcoal hover:text-white transition-colors disabled:opacity-40"
                >
                  {loading ? "CREATING..." : "CREATE PASS"}
                </button>
              </div>
            </div>

            {/* Lookup pass by phone */}
            <div className="bg-white rounded-2xl border border-charcoal/5 p-6">
              <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40 mb-4">
                CHECK CLIENT BALANCE
              </p>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Client phone number"
                  value={lookupPhone}
                  onChange={(e) => setLookupPhone(e.target.value)}
                  className="flex-1 px-5 py-3.5 rounded-xl border border-charcoal/8 bg-cream font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/25 focus:border-rose/30 focus:outline-none"
                />
                <button
                  onClick={lookupPass}
                  disabled={!lookupPhone || loading}
                  className="px-6 py-3.5 rounded-xl bg-charcoal text-white font-[family-name:var(--font-body)] text-sm tracking-[0.1em] hover:bg-rose transition-colors disabled:opacity-40"
                >
                  CHECK
                </button>
              </div>
              {lookupResult !== null && (
                <div className="mt-4">
                  {lookupResult.length === 0 ? (
                    <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 p-4 bg-cream rounded-xl text-center">
                      No active passes found for this number
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {lookupResult.map((p) => (
                        <div key={p.id} className="p-4 bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl">
                          <div className="flex items-center justify-between">
                            <p className="font-[family-name:var(--font-body)] text-sm text-charcoal font-medium">
                              {p.pass_type}
                            </p>
                            <span className={`px-3 py-1 rounded-full text-xs font-[family-name:var(--font-body)] ${
                              p.is_unlimited
                                ? "bg-gold/20 text-gold"
                                : Number(p.classes_remaining) > 0
                                  ? "bg-[#25D366]/20 text-[#25D366]"
                                  : "bg-rose/20 text-rose"
                            }`}>
                              {p.is_unlimited ? "Unlimited" : `${p.classes_remaining} remaining`}
                            </span>
                          </div>
                          <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-1">
                            Used: {p.classes_used} / {p.is_unlimited ? "∞" : p.total_classes}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Active passes list */}
            <div>
              <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40 mb-4">
                ALL ACTIVE PASSES ({passes.length})
              </p>
              {passes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-charcoal/5 p-8 text-center">
                  <p className="font-[family-name:var(--font-body)] text-charcoal/30">
                    No active passes yet. Create one above.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {passes.map((pass) => (
                    <div
                      key={pass.id}
                      className="bg-white rounded-2xl border border-charcoal/5 p-5 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                          {pass.name || pass.phone}
                        </p>
                        <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/40 mt-0.5">
                          {pass.pass_type} · {pass.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-[family-name:var(--font-body)] ${
                          pass.is_unlimited
                            ? "bg-gold/20 text-gold"
                            : Number(pass.classes_remaining) > 0
                              ? "bg-[#25D366]/20 text-[#25D366]"
                              : "bg-rose/20 text-rose"
                        }`}>
                          {pass.is_unlimited ? "Unlimited" : `${pass.classes_remaining} left`}
                        </span>
                        <p className="font-[family-name:var(--font-body)] text-[10px] text-charcoal/25 mt-1">
                          {pass.classes_used} used
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ━━━ BOOKINGS TAB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "bookings" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40">
                RECENT BOOKINGS ({bookings.length})
              </p>
              <button
                onClick={fetchBookings}
                className="font-[family-name:var(--font-body)] text-xs text-rose hover:text-charcoal transition-colors"
              >
                REFRESH
              </button>
            </div>
            {bookings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-charcoal/5 p-8 text-center">
                <p className="font-[family-name:var(--font-body)] text-charcoal/30">
                  No bookings yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-white rounded-2xl border border-charcoal/5 p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                          {booking.name}
                        </p>
                        <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/50 mt-0.5">
                          {booking.service}
                        </p>
                        <p className="font-[family-name:var(--font-body)] text-xs text-charcoal/30 mt-1">
                          {booking.phone}
                          {booking.preferred_date && ` · ${formatDate(booking.preferred_date)}`}
                          {booking.class_time && ` · ${booking.class_time}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-[family-name:var(--font-body)]">
                          {booking.status}
                        </span>
                        <p className="font-[family-name:var(--font-body)] text-[10px] text-charcoal/25 mt-2">
                          {formatDateTime(booking.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ━━━ SCHEDULE TAB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "schedule" && (
          <div className="space-y-8">
            {/* Close a new date */}
            <div className="bg-white rounded-2xl border border-charcoal/5 p-6">
              <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40 mb-4">
                CLOSE A DATE
              </p>
              <div className="space-y-3">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={getToday()}
                  className="w-full px-5 py-3.5 rounded-xl border border-charcoal/8 bg-cream font-[family-name:var(--font-body)] text-charcoal focus:border-rose/30 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl border border-charcoal/8 bg-cream font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/25 focus:border-rose/30 focus:outline-none"
                />
                <button
                  onClick={closeDate}
                  disabled={!newDate || loading}
                  className="w-full py-3.5 rounded-xl bg-rose text-white font-[family-name:var(--font-body)] text-sm tracking-[0.15em] hover:bg-charcoal transition-colors disabled:opacity-40"
                >
                  {loading ? "SAVING..." : "CLOSE THIS DATE"}
                </button>
              </div>
            </div>

            {/* Closed dates */}
            <div>
              <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40 mb-4">
                CLOSED DATES ({closedDates.length})
              </p>
              {closedDates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-charcoal/5 p-8 text-center">
                  <p className="font-[family-name:var(--font-body)] text-charcoal/30">
                    No dates closed. All classes are open.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {closedDates.map((cd) => (
                    <div
                      key={cd.date}
                      className="bg-white rounded-2xl border border-rose/10 p-5 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-[family-name:var(--font-display)] text-lg text-charcoal">
                          {formatDate(cd.date)}
                        </p>
                        {cd.reason && (
                          <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-0.5">
                            {cd.reason}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => reopenDate(cd.date)}
                        disabled={loading}
                        className="px-5 py-2 rounded-full border border-charcoal/10 font-[family-name:var(--font-body)] text-xs tracking-[0.1em] text-charcoal/50 hover:border-charcoal/30 transition-all"
                      >
                        REOPEN
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Back to site */}
        <div className="mt-12 text-center">
          <a
            href="/"
            className="font-[family-name:var(--font-body)] text-sm text-charcoal/30 hover:text-charcoal transition-colors"
          >
            &larr; Back to website
          </a>
        </div>
      </div>
    </div>
  );
}
