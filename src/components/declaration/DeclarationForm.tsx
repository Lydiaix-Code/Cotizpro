"use client";

import { createDeclaration, type DeclarationActionResult } from "@/actions/declaration";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Activite } from "@/types/database";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

const MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

const INITIAL_STATE: DeclarationActionResult = { success: false };

const LABELS_REGIME: Record<string, string> = {
  bic_marchandises: "Vente de marchandises (BIC) — 12,3 %",
  bic_services: "Prestations de services (BIC) — 21,2 %",
  bnc: "Activité libérale (BNC) — 23,1 %",
};

/** Génère les années disponibles (année de création - aujourd'hui) */
function getAnnees(): number[] {
  const current = new Date().getFullYear();
  const annees: number[] = [];
  for (let y = current; y >= current - 5; y--) annees.push(y);
  return annees;
}

/** Mois passés ou courant (pas de futur) */
function getMoisDisponibles(annee: number): number[] {
  const now = new Date();
  const maxMois = annee < now.getFullYear() ? 12 : now.getMonth() + 1;
  return Array.from({ length: maxMois }, (_, i) => i + 1);
}

export function DeclarationForm({
  activites = [],
  isPremium = false,
}: {
  activites?: Activite[];
  isPremium?: boolean;
}) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(createDeclaration, INITIAL_STATE);

  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth() + 1);
  // Activité sélectionnée : "" = activité principale (profil)
  const [activiteId, setActiviteId] = useState<string>("");

  const activeActivites = activites.filter((a) => a.actif);
  // Le sélecteur n'apparaît que si l'utilisateur est premium ET a des activités secondaires
  const showActiviteSelector = isPremium && activeActivites.length > 0;

  const moisDisponibles = getMoisDisponibles(annee);

  // Si mois sélectionné n'est plus valide après changement année
  const moisEffectif = moisDisponibles.includes(mois) ? mois : (moisDisponibles[0] ?? 1);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle className="h-10 w-10 text-emerald-500" />
        <p className="font-medium">Déclaration enregistrée</p>
        <p className="text-muted-foreground text-sm">
          Vos cotisations ont été calculées automatiquement.
        </p>
        <Button variant="outline" onClick={() => router.refresh()} className="mt-2">
          Nouvelle déclaration
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {/* Champs cachés pour les valeurs contrôlées */}
      <input type="hidden" name="mois" value={moisEffectif} />
      <input type="hidden" name="annee" value={annee} />
      {/* activite_id : vide = activité principale du profil */}
      <input type="hidden" name="activite_id" value={activiteId} />

      {state.error && (
        <Alert variant="destructive">
          <p className="text-sm">{state.error}</p>
        </Alert>
      )}

      {/* Sélecteur d'activité (affiché si ≥ 1 activité secondaire) */}
      {showActiviteSelector && (
        <div className="space-y-2">
          <Label htmlFor="activite-select">Activité</Label>
          <Select value={activiteId} onValueChange={(v) => setActiviteId(v ?? "")}>
            <SelectTrigger id="activite-select">
              <SelectValue placeholder="Activité principale (profil)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Activité principale (profil)</SelectItem>
              {activeActivites.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nom} — {LABELS_REGIME[a.regime] ?? a.regime}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Année */}
      <div className="space-y-2">
        <Label htmlFor="annee-select">Année</Label>
        <Select
          value={String(annee)}
          onValueChange={(v) => setAnnee(parseInt(v ?? "0", 10))}
        >
          <SelectTrigger id="annee-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getAnnees().map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mois */}
      <div className="space-y-2">
        <Label htmlFor="mois-select">Mois</Label>
        <Select
          value={String(moisEffectif)}
          onValueChange={(v) => setMois(parseInt(v ?? "1", 10))}
        >
          <SelectTrigger id="mois-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {moisDisponibles.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {MOIS[m - 1]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* CA du mois */}
      <div className="space-y-2">
        <Label htmlFor="montant_ca">Chiffre d&apos;affaires (€) *</Label>
        <div className="relative">
          <Input
            id="montant_ca"
            name="montant_ca"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            max="1000000"
            required
            placeholder="0.00"
            className="pr-8"
          />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
            €
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          CA HT encaissé sur la période. Les cotisations seront calculées automatiquement.
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Enregistrement…" : "Déclarer mon CA"}
      </Button>
    </form>
  );
}
