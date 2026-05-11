"use client";

import { createCheckoutSession } from "@/actions/stripe";
import { STRIPE_CONFIG } from "@/config";
import { Crown, Loader2, X } from "lucide-react";
import { useState } from "react";

/**
 * Bannière de conversion Premium — affichée dans le dashboard pour les
 * utilisateurs gratuits.
 *
 * - Fermable (stocke le state en mémoire, réapparaît au prochain chargement)
 * - Déclenche le checkout Stripe via Server Action (sécurisé côté serveur)
 * - S'affiche uniquement si passé en prop isPremium=false (vérification serveur)
 */
export function PremiumBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    const priceId = STRIPE_CONFIG.priceIdMensuel ?? STRIPE_CONFIG.priceIdAnnuel;
    if (!priceId) return;
    setLoading(true);
    const result = await createCheckoutSession(priceId);
    if (result?.error) {
      setLoading(false);
    }
    // En cas de succès, redirect() dans la Server Action redirige automatiquement
  }

  if (dismissed) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-800 dark:bg-indigo-950/40">
      <div className="flex items-start gap-3">
        <Crown className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
        <div>
          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
            Exportez votre récapitulatif annuel en PDF
          </p>
          <p className="text-muted-foreground text-xs">
            PDF annuel, historique multi-années, rappels e-mail, multi-activités — à
            partir de 4,99&nbsp;€/mois.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Crown className="h-4 w-4 text-yellow-300" />
          )}
          Passer à Premium
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fermer la bannière"
          className="rounded-md p-1 text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-900 dark:hover:text-indigo-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
