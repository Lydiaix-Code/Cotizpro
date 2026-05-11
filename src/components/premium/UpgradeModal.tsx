"use client";

import { PremiumCheckoutButtons } from "@/components/premium/PremiumCheckoutButtons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Crown } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Texte contextuel affiché sous le titre (ex: "Pour exporter en PDF, passez à Premium") */
  reason?: string;
}

const FEATURES_PREMIUM = [
  "Export PDF récapitulatif annuel",
  "Historique toutes les années",
  "Rappels e-mail avant échéances",
  "Multi-activités (jusqu'à 5)",
  "Filtres par activité sur graphiques",
  "Support prioritaire",
];

/**
 * Modale de conversion Premium contextuelle.
 *
 * Affichée quand un utilisateur gratuit tente d'utiliser une feature Premium.
 * Le checkout Stripe est déclenché côté serveur (Server Action) — aucune donnée
 * sensible n'est exposée côté client.
 */
export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
            <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <DialogTitle className="text-center text-lg">
            Fonctionnalité Premium
          </DialogTitle>
          <DialogDescription className="text-center">
            {reason ?? "Passez à Premium pour débloquer cette fonctionnalité."}
          </DialogDescription>
        </DialogHeader>

        <ul className="my-2 space-y-2">
          {FEATURES_PREMIUM.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              {f}
            </li>
          ))}
        </ul>

        <PremiumCheckoutButtons />

        <button
          onClick={onClose}
          className="text-muted-foreground mt-1 w-full text-center text-xs hover:underline"
        >
          Non merci, rester sur le plan gratuit
        </button>
      </DialogContent>
    </Dialog>
  );
}
