"use client";

import { upsertProfile, type ProfileActionResult } from "@/actions/profile";
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
import {
  LABELS_REGIME,
  type FrequenceDeclaration,
  type Profile,
  type Regime,
} from "@/types/database";
import { Crown } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

interface ProfileFormProps {
  initialData?: Profile | null;
  submitLabel?: string;
  isPremium?: boolean;
}

/**
 * Checkbox entièrement pilotée par useState React.
 * Le visuel ne dépend PAS du pseudo-sélecteur CSS :checked — Safari
 * désactive ce sélecteur pour les contrôles de formulaire dans les
 * fenêtres en arrière-plan, ce qui causait leur disparition visuelle.
 */
function CustomCheckbox({
  id,
  name,
  defaultChecked,
}: {
  id?: string;
  name: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <span className="relative mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center">
      {/* Input réel sr-only — porte la valeur pour le FormData */}
      <input
        id={id}
        type="checkbox"
        name={name}
        value="true"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="sr-only"
        tabIndex={-1}
      />
      {/* Boîte visuelle pilotée par state — toujours correcte fenêtre active ou non */}
      <span
        aria-hidden
        className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
          checked ? "border-primary bg-primary" : "border-input bg-background"
        }`}
      >
        {checked && (
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="white"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
            aria-hidden
          >
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </span>
    </span>
  );
}

const INITIAL_STATE: ProfileActionResult = { success: false };

export function ProfileForm({
  initialData,
  submitLabel = "Enregistrer",
  isPremium = false,
}: ProfileFormProps) {
  const [state, action, isPending] = useActionState(upsertProfile, INITIAL_STATE);

  const [regime, setRegime] = useState<Regime>(initialData?.regime ?? "bic_services");
  const [frequence, setFrequence] = useState<FrequenceDeclaration>(
    initialData?.frequence_declaration ?? "mensuelle"
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="regime" value={regime} />
      <input type="hidden" name="frequence_declaration" value={frequence} />

      {state.error && (
        <Alert variant="destructive">
          <p className="text-sm">{state.error}</p>
        </Alert>
      )}

      {/* Régime fiscal */}
      <div className="space-y-2">
        <Label htmlFor="regime">Régime fiscal *</Label>
        <Select value={regime} onValueChange={(v) => setRegime(v as Regime)}>
          <SelectTrigger id="regime" className="w-full">
            <SelectValue placeholder="Choisissez votre régime" />
          </SelectTrigger>
          <SelectContent sideOffset={4}>
            {(Object.keys(LABELS_REGIME) as Regime[]).map((r) => (
              <SelectItem key={r} value={r}>
                {LABELS_REGIME[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Détermine vos taux de cotisations URSSAF.
        </p>
      </div>

      {/* Date de début d'activité */}
      <div className="space-y-2">
        <Label htmlFor="date_debut_activite">Date de début d&apos;activité *</Label>
        <Input
          id="date_debut_activite"
          name="date_debut_activite"
          type="date"
          required
          max={new Date().toISOString().split("T")[0]}
          defaultValue={initialData?.date_debut_activite?.split("T")[0] ?? ""}
        />
        <p className="text-muted-foreground text-xs">
          Utilisée pour calculer votre éligibilité à l&apos;ACRE.
        </p>
      </div>

      {/* Fréquence de déclaration */}
      <div className="space-y-2">
        <Label htmlFor="frequence">Fréquence de déclaration *</Label>
        <Select
          value={frequence}
          onValueChange={(v) => setFrequence(v as FrequenceDeclaration)}
        >
          <SelectTrigger id="frequence" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mensuelle">Mensuelle</SelectItem>
            <SelectItem value="trimestrielle">Trimestrielle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Options */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">Options</legend>

        {/* ACRE */}
        <label
          htmlFor="acre"
          className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors"
        >
          <CustomCheckbox
            id="acre"
            name="acre"
            defaultChecked={initialData?.acre ?? false}
          />
          <div>
            <p className="text-sm font-medium">Bénéficier de l&apos;ACRE</p>
            <p className="text-muted-foreground text-xs">
              Exonération partielle de cotisations la première année (taux réduit de 50%).
            </p>
          </div>
        </label>

        {/* Versement libératoire */}
        <label
          htmlFor="versement_lib"
          className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors"
        >
          <CustomCheckbox
            id="versement_lib"
            name="versement_liberatoire"
            defaultChecked={initialData?.versement_liberatoire ?? false}
          />
          <div>
            <p className="text-sm font-medium">Versement libératoire de l&apos;impôt</p>
            <p className="text-muted-foreground text-xs">
              Payer l&apos;impôt sur le revenu en même temps que les cotisations (taux
              fixe sur le CA).
            </p>
          </div>
        </label>

        {/* Notifications email — Premium uniquement */}
        {isPremium ? (
          <label
            htmlFor="notifications_email"
            className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors"
          >
            <CustomCheckbox
              id="notifications_email"
              name="notifications_email"
              defaultChecked={initialData?.notifications_email ?? false}
            />
            <div>
              <p className="text-sm font-medium">Rappels par email</p>
              <p className="text-muted-foreground text-xs">
                Recevoir un email le 25 de chaque mois pour vous rappeler de déclarer
                votre CA.
              </p>
            </div>
          </label>
        ) : (
          <Link
            href="/premium"
            className="hover:bg-muted/50 flex items-start gap-3 rounded-lg border border-dashed p-4 transition-colors"
          >
            <span
              aria-hidden
              className="border-input bg-background mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border opacity-40"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium">Rappels par email</p>
                <Crown className="h-3.5 w-3.5 text-yellow-500" />
              </div>
              <p className="text-muted-foreground text-xs">
                Recevoir un email le 25 de chaque mois pour vous rappeler de déclarer
                votre CA.
              </p>
              <p className="mt-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                Fonctionnalité réservée aux abonnés Premium →
              </p>
            </div>
          </Link>
        )}
      </fieldset>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Enregistrement…" : submitLabel}
      </Button>
    </form>
  );
}
