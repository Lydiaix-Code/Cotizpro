"use client";

import { createCheckoutSession } from "@/actions/stripe";
import { STRIPE_CONFIG } from "@/config";
import { Crown, Loader2 } from "lucide-react";
import { useState } from "react";

export function PremiumCheckoutButtons() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleCheckout(priceId: string) {
    setLoadingId(priceId);
    const result = await createCheckoutSession(priceId);
    if (result?.error) {
      alert(result.error);
      setLoadingId(null);
    }
  }

  const mensuelId = STRIPE_CONFIG.priceIdMensuel;
  const annuelId = STRIPE_CONFIG.priceIdAnnuel;

  // Économie = 4,99 × 12 − 39,99 ≈ 20 €
  const economieAnnuelle = Math.round(
    STRIPE_CONFIG.prixMensuel * 12 - STRIPE_CONFIG.prixAnnuel
  );

  if (!mensuelId && !annuelId) {
    return <p className="text-muted-foreground text-sm">Paiement bientôt disponible.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Annuel en premier — plan recommandé */}
      {annuelId && (
        <div className="relative">
          <button
            onClick={() => handleCheckout(annuelId)}
            disabled={loadingId !== null}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingId === annuelId ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crown className="h-4 w-4 text-yellow-300" />
            )}
            S&apos;abonner — 39,99&nbsp;€/an
          </button>
          {economieAnnuelle > 0 && (
            <span className="absolute -top-2.5 right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              Économisez {economieAnnuelle}&nbsp;€
            </span>
          )}
        </div>
      )}
      {/* Mensuel en secondaire */}
      {mensuelId && (
        <button
          onClick={() => handleCheckout(mensuelId)}
          disabled={loadingId !== null}
          className="border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingId === mensuelId ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Crown className="h-4 w-4 text-yellow-400" />
          )}
          S&apos;abonner — 4,99&nbsp;€/mois
        </button>
      )}
    </div>
  );
}
