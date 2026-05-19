"use client";

import { useEffect, useState } from "react";
import { getActivePacks, getPromoPacks, type PackDefinition } from "@/lib/constants/packs";
import PackPaymentModal from "@/components/PackPaymentModal";

interface OwnedPack {
  id: string;
  pack_type: string;
  total_classes: number;
  classes_used: number;
  classes_remaining: number;
  status: string;
  expires_at: string;
  purchased_at: string;
  payment_method: string | null;
}

export default function PacksPage() {
  const [ownedPacks, setOwnedPacks] = useState<OwnedPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<PackDefinition | null>(null);
  const lang = "es";

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/student/packs?status=all");

      // Session expired — force re-login
      if (res.status === 401) {
        window.location.href = "/login?redirect=/portal/packs";
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setOwnedPacks(data.data || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const activePacks = ownedPacks.filter((p) => p.status === "active");
  const pastPacks = ownedPacks.filter((p) => p.status !== "active");

  const catalogPacks = getActivePacks();
  const promoPacks = getPromoPacks();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#B87777] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function formatCOP(amount: number): string {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function PackCard({ pack, owned }: { pack?: PackDefinition; owned?: OwnedPack }) {
    if (owned) {
      const isUnlimited = owned.total_classes === -1;
      const expiresDate = new Date(owned.expires_at);
      const daysLeft = Math.ceil(
        (expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      const isExpired = daysLeft <= 0;

      return (
        <div
          className={`bg-white border p-4 ${
            owned.status === "active"
              ? "border-[#B87777]/20"
              : "border-[#2C2C2C]/5 opacity-50"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#2C2C2C]">
                {owned.pack_type.replace(/_/g, " ")}
              </p>
              <p className="text-xs text-[#2C2C2C]/40 mt-0.5">
                {owned.status === "active" && !isExpired
                  ? `${daysLeft} ${lang === "es" ? "días restantes" : "days left"}`
                  : owned.status === "exhausted"
                    ? lang === "es"
                      ? "Créditos agotados"
                      : "Credits exhausted"
                    : lang === "es"
                      ? "Expirado"
                      : "Expired"}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-2xl text-[#B87777]"
                style={{ fontFamily: "Cormorant Garamond, serif" }}
              >
                {isUnlimited ? "∞" : owned.classes_remaining}
              </p>
              <p className="text-[9px] text-[#2C2C2C]/30 uppercase">
                {lang === "es" ? "restantes" : "remaining"}
              </p>
            </div>
          </div>

          {/* Progress bar for non-unlimited */}
          {!isUnlimited && owned.total_classes > 0 && (
            <div className="mt-3 h-1 bg-[#2C2C2C]/5 overflow-hidden">
              <div
                className="h-full bg-[#B87777] transition-all"
                style={{
                  width: `${Math.max(
                    (owned.classes_remaining / owned.total_classes) * 100,
                    0,
                  )}%`,
                }}
              />
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  function CatalogCard({ pack, isPromo }: { pack: PackDefinition; isPromo?: boolean }) {
    const perClass = pack.totalClasses > 0
      ? Math.round(pack.priceCop / pack.totalClasses)
      : null;

    return (
      <div
        className={`border p-4 ${
          isPromo
            ? "bg-[#C9A96E]/5 border-[#C9A96E]/20"
            : "bg-white border-[#2C2C2C]/5"
        }`}
      >
        {isPromo && (
          <span className="text-[8px] tracking-[0.2em] text-[#C9A96E] uppercase block mb-2">
            {lang === "es" ? "Promoción" : "Promo"}
          </span>
        )}
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-sm font-medium text-[#2C2C2C]">
              {lang === "es" ? pack.name.es : pack.name.en}
            </p>
            <p className="text-xs text-[#2C2C2C]/40 mt-0.5">
              {lang === "es" ? pack.description.es : pack.description.en}
            </p>
          </div>
        </div>
        <div className="flex items-end justify-between mt-3">
          <div>
            <p className="text-lg text-[#2C2C2C]" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              {formatCOP(pack.priceCop)}
            </p>
            <p className="text-[10px] text-[#2C2C2C]/30">
              ${pack.priceUsd} USD
              {perClass && ` · ${formatCOP(perClass)}/${lang === "es" ? "clase" : "class"}`}
            </p>
          </div>
          <button
            onClick={() => setSelectedPack(pack)}
            className="text-[10px] tracking-[0.15em] uppercase px-4 py-1.5 bg-[#2C2C2C] text-white hover:bg-[#B87777] transition-colors"
          >
            {lang === "es" ? "Comprar" : "Buy"}
          </button>
        </div>
        <p className="text-[9px] text-[#2C2C2C]/20 mt-2">
          {pack.expirationDays} {lang === "es" ? "días de validez" : "days validity"}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1
        className="text-xl text-[#2C2C2C]"
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        {lang === "es" ? "Mis Packs" : "My Packs"}
      </h1>

      {/* Active packs */}
      {activePacks.length > 0 && (
        <section>
          <h2 className="text-[10px] tracking-[0.2em] text-[#B87777] uppercase mb-2">
            {lang === "es" ? "Activos" : "Active"}
          </h2>
          <div className="space-y-2">
            {activePacks.map((p) => (
              <PackCard key={p.id} owned={p} />
            ))}
          </div>
        </section>
      )}

      {/* Buy a pack */}
      <section>
        <h2 className="text-[10px] tracking-[0.2em] text-[#C9A96E] uppercase mb-2">
          {lang === "es" ? "Comprar Pack" : "Buy a Pack"}
        </h2>

        {/* Promos first */}
        {promoPacks.length > 0 && (
          <div className="space-y-2 mb-3">
            {promoPacks.map((p) => (
              <CatalogCard key={p.type} pack={p} isPromo />
            ))}
          </div>
        )}

        <div className="space-y-2">
          {catalogPacks.map((p) => (
            <CatalogCard key={p.type} pack={p} />
          ))}
        </div>
      </section>

      {/* Past packs */}
      {pastPacks.length > 0 && (
        <section>
          <h2 className="text-[10px] tracking-[0.2em] text-[#2C2C2C]/30 uppercase mb-2">
            {lang === "es" ? "Historial" : "History"}
          </h2>
          <div className="space-y-2">
            {pastPacks.map((p) => (
              <PackCard key={p.id} owned={p} />
            ))}
          </div>
        </section>
      )}

      {/* Payment Modal */}
      {selectedPack && (
        <PackPaymentModal
          pack={selectedPack}
          onClose={() => setSelectedPack(null)}
          lang={lang}
        />
      )}
    </div>
  );
}
