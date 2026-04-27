"use client";

import { useState, useEffect, useCallback } from "react";

interface ClosedDate {
  date: string;
  reason: string | null;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchClosedDates = useCallback(async () => {
    const res = await fetch("/api/admin/closed-dates");
    const json = await res.json();
    setClosedDates(json.data || []);
  }, []);

  useEffect(() => {
    if (authenticated) fetchClosedDates();
  }, [authenticated, fetchClosedDates]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey.trim()) setAuthenticated(true);
  };

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

  const getToday = () => new Date().toISOString().split("T")[0];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
              Schedule management for Tata
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
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-charcoal">
            Schedule Manager
          </h1>
          <p className="font-[family-name:var(--font-body)] text-sm text-charcoal/40 mt-2">
            Close days when you&apos;re traveling or unavailable. Closed dates will be blocked on the website — students cannot book classes on those days.
          </p>
        </div>

        {/* Close a new date */}
        <div className="bg-white rounded-2xl border border-charcoal/5 p-6 mb-8">
          <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40 mb-4">
            CLOSE A DATE
          </p>
          <div className="space-y-3">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={getToday()}
              className="w-full px-5 py-4 rounded-2xl border border-charcoal/8 bg-cream font-[family-name:var(--font-body)] text-charcoal focus:border-rose/30 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Reason (optional) — e.g. Traveling, Holiday"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-charcoal/8 bg-cream font-[family-name:var(--font-body)] text-charcoal placeholder:text-charcoal/25 focus:border-rose/30 focus:outline-none"
            />
            <button
              onClick={closeDate}
              disabled={!newDate || loading}
              className="w-full py-4 rounded-2xl bg-rose text-white font-[family-name:var(--font-body)] text-sm tracking-[0.2em] hover:bg-charcoal transition-colors disabled:opacity-40"
            >
              {loading ? "SAVING..." : "CLOSE THIS DATE"}
            </button>
          </div>
        </div>

        {/* Currently closed dates */}
        <div>
          <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.2em] text-charcoal/40 mb-4">
            CLOSED DATES ({closedDates.length})
          </p>
          {closedDates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-charcoal/5 p-8 text-center">
              <p className="font-[family-name:var(--font-body)] text-charcoal/30">
                No dates are currently closed. All classes are open for booking.
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
                    className="px-5 py-2.5 rounded-full border border-charcoal/10 font-[family-name:var(--font-body)] text-xs tracking-[0.15em] text-charcoal/50 hover:border-charcoal/30 hover:text-charcoal transition-all"
                  >
                    REOPEN
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
