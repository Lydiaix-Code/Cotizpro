"use client";

import type { SimulateurResult } from "@/actions/simulateur";
import { simulerCotisations } from "@/actions/simulateur";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { calculerCotisations } from "@/lib/calculators/urssaf";
import { cn } from "@/lib/utils";
import { LABELS_REGIME, PLAFONDS_CA } from "@/types/database";
import { useActionState, useState } from "react";

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const PCT = (n: number) => `${(n * 100).toFixed(1)} %`;

const ANNEE_COURANTE = new Date().getFullYear();
const MOIS_COURANT = new Date().getMonth() + 1;

const NOMS_MOIS = [
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
];

const INITIAL_STATE: SimulateurResult = { success: false };

export function SimulateurForm() {
  const [state, action, isPending] = useActionState(simulerCotisations, INITIAL_STATE);

  // Champs contrôlés pour affichage conditionnel
  const [acre, setAcre] = useState(false);
  const [montantCa, setMontantCa] = useState("");
  const [selectedAnnee, setSelectedAnnee] = useState(ANNEE_COURANTE);

  return (
    <div className="space-y-6">
      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paramètres de simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-5">
            {/* Régime */}
            <div className="space-y-1.5">
              <Label htmlFor="regime">Régime fiscal</Label>
              <Select name="regime" defaultValue="bic_services" required>
                <SelectTrigger id="regime">
                  <SelectValue placeholder="Choisir un régime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bic_marchandises">
                    Vente de marchandises (BIC)
                  </SelectItem>
                  <SelectItem value="bic_services">
                    Prestations de services (BIC)
                  </SelectItem>
                  <SelectItem value="bnc">Activité libérale (BNC)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CA mensuel */}
            <div className="space-y-1.5">
              <Label htmlFor="montant_ca">CA mensuel (€)</Label>
              <Input
                id="montant_ca"
                name="montant_ca"
                type="number"
                inputMode="decimal"
                min="0"
                max="1000000"
                step="0.01"
                placeholder="ex : 3 500"
                value={montantCa}
                onChange={(e) => setMontantCa(e.target.value)}
                required
              />
            </div>

            {/* Mois / Année */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mois">Mois</Label>
                <Select name="mois" defaultValue={String(MOIS_COURANT)}>
                  <SelectTrigger id="mois">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOMS_MOIS.map((nom, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="annee">Année</Label>
                <Select
                  name="annee"
                  defaultValue={String(ANNEE_COURANTE)}
                  onValueChange={(v) => setSelectedAnnee(Number(v))}
                >
                  <SelectTrigger id="annee">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[ANNEE_COURANTE - 1, ANNEE_COURANTE, ANNEE_COURANTE + 1].map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ACRE */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="acre_check"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-indigo-600"
                checked={acre}
                onChange={(e) => setAcre(e.target.checked)}
              />
              <input type="hidden" name="acre" value={acre ? "true" : "false"} />
              <div className="space-y-0.5">
                <Label htmlFor="acre_check" className="cursor-pointer font-medium">
                  ACRE (exonération 1ère année)
                </Label>
                <p className="text-muted-foreground text-xs">
                  Taux réduit de 50 % pendant les 12 premiers mois
                </p>
              </div>
            </div>

            {/* Date début (visible uniquement si ACRE coché) */}
            {acre && (
              <div className="space-y-1.5 pl-7">
                <Label htmlFor="date_debut_activite" className="text-sm">
                  Date de début d&apos;activité
                  <span className="text-muted-foreground ml-1 font-normal">
                    (pour vérif. éligibilité)
                  </span>
                </Label>
                <Input
                  id="date_debut_activite"
                  name="date_debut_activite"
                  type="date"
                  className="max-w-xs"
                />
              </div>
            )}
            {!acre && <input type="hidden" name="date_debut_activite" value="" />}

            {/* Versement libératoire */}
            <ToggleField
              name="versement_liberatoire"
              label="Versement libératoire de l'impôt (option)"
              description="Inclut l'impôt sur le revenu dans le calcul"
            />

            {/* Erreur */}
            {state.success === false && state.error && (
              <p className="text-destructive text-sm">{state.error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Calcul en cours…" : "Simuler"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Résultats */}
      {state.success && state.data && (
        <ResultatsSimulateur
          data={state.data}
          montantCa={parseFloat(montantCa) || 0}
          annee={selectedAnnee}
        />
      )}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function ToggleField({
  name,
  label,
  description,
}: {
  name: string;
  label: string;
  description: string;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        id={name}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-indigo-600"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <div className="space-y-0.5">
        <Label htmlFor={name} className="cursor-pointer font-medium">
          {label}
        </Label>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  );
}

function ResultatsSimulateur({
  data,
  annee,
}: {
  data: NonNullable<SimulateurResult["data"]>;
  montantCa: number;
  annee: number;
}) {
  const tauxChargesTotal =
    data.montant_ca > 0 ? (data.total_a_payer / data.montant_ca) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Résultats du mois */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Résultats pour ce mois</CardTitle>
            <div className="flex gap-2">
              <Badge variant="secondary">{LABELS_REGIME[data.regime]}</Badge>
              {data.acre_applique && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  ACRE
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatLine label="CA déclaré" value={EUR.format(data.montant_ca)} />
            <StatLine
              label="Cotisations URSSAF"
              value={EUR.format(data.montant_cotisations)}
              sub={PCT(data.taux_cotisations)}
              colorClass="text-amber-600"
            />
            {data.montant_versement_liberatoire !== null && (
              <StatLine
                label="Versement libératoire"
                value={EUR.format(data.montant_versement_liberatoire)}
                sub={PCT(data.taux_versement_liberatoire ?? 0)}
                colorClass="text-amber-600"
              />
            )}
            <StatLine
              label="Total charges"
              value={EUR.format(data.total_a_payer)}
              sub={`${tauxChargesTotal.toFixed(1)} % du CA`}
              colorClass="text-amber-700"
            />
            <StatLine
              label="Revenu net"
              value={EUR.format(data.revenu_net)}
              colorClass="text-emerald-600"
            />
          </div>

          <Separator />

          {/* Jauge rapport plafond */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Ce mois représente {data.ratio_plafond_mensuel.toFixed(1)} % du plafond
                annuel
              </span>
              <span className="font-medium">{EUR.format(PLAFONDS_CA[data.regime])}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={
                  "h-full rounded-full transition-all " +
                  (data.ratio_plafond_mensuel >= 100
                    ? "bg-red-500"
                    : data.ratio_plafond_mensuel >= 8
                      ? "bg-amber-400"
                      : "bg-emerald-500")
                }
                style={{ width: `${Math.min(data.ratio_plafond_mensuel, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projection × 12 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Projection annuelle (si revenus constants)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatLine label="CA annuel" value={EUR.format(data.ca_annualise)} />
            <StatLine
              label="Charges annuelles"
              value={EUR.format(data.cotisations_annualisees)}
              colorClass="text-amber-600"
            />
            <StatLine
              label="Net annuel estimé"
              value={EUR.format(data.net_annualise)}
              colorClass="text-emerald-600"
            />
            <StatLine
              label="Ratio plafond annuel"
              value={`${Math.round((data.ca_annualise / data.plafond) * 100)} %`}
              colorClass={
                data.ca_annualise >= data.plafond
                  ? "text-red-600"
                  : data.ca_annualise >= data.plafond * 0.8
                    ? "text-amber-600"
                    : "text-emerald-600"
              }
            />
          </div>
          <p className="text-muted-foreground mt-4 text-xs">
            Plafond annuel ({LABELS_REGIME[data.regime]}) : {EUR.format(data.plafond)}
          </p>
        </CardContent>
      </Card>

      {/* Comparaison inter-régimes */}
      <ComparaisonRegimes
        montant_ca={data.montant_ca}
        acre_applique={data.acre_applique}
        versement_liberatoire={data.taux_versement_liberatoire !== null}
        annee={annee}
        regimeActif={data.regime}
      />
    </div>
  );
}

function StatLine({
  label,
  value,
  sub,
  colorClass = "",
}: {
  label: string;
  value: string;
  sub?: string;
  colorClass?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`mt-0.5 font-semibold ${colorClass}`}>{value}</p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
    </div>
  );
}

// ─── Comparaison inter-régimes ────────────────────────────────────────────────

const ALL_REGIMES = ["bic_marchandises", "bic_services", "bnc"] as const;

function ComparaisonRegimes({
  montant_ca,
  acre_applique,
  versement_liberatoire,
  annee,
  regimeActif,
}: {
  montant_ca: number;
  acre_applique: boolean;
  versement_liberatoire: boolean;
  annee: number;
  regimeActif: string;
}) {
  const resultats = ALL_REGIMES.map((regime) => ({
    regime,
    ...calculerCotisations({
      montant_ca,
      regime,
      acre: acre_applique,
      versement_liberatoire,
      annee,
    }),
  }));

  // Meilleur régime = revenu net le plus élevé
  const maxNet = Math.max(...resultats.map((r) => r.revenu_net));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Comparaison des 3 régimes</CardTitle>
        <p className="text-muted-foreground text-xs">
          Pour un CA de {EUR.format(montant_ca)}
          {acre_applique ? " avec ACRE" : ""}
          {versement_liberatoire ? " + versement libératoire" : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {resultats.map((r) => {
          const isActif = r.regime === regimeActif;
          const isBest = r.revenu_net === maxNet;
          const tauxTotal = montant_ca > 0 ? (r.total_a_payer / montant_ca) * 100 : 0;
          return (
            <div
              key={r.regime}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                isActif
                  ? "border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"
                  : "border-border"
              )}
            >
              {/* Régime */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">{LABELS_REGIME[r.regime]}</span>
                  {isActif && (
                    <Badge className="bg-indigo-100 text-[10px] text-indigo-700 hover:bg-indigo-100">
                      Votre régime
                    </Badge>
                  )}
                  {isBest && !isActif && (
                    <Badge className="bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">
                      Meilleur net
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Plafond {EUR.format(PLAFONDS_CA[r.regime])}/an · {tauxTotal.toFixed(1)}{" "}
                  % de charges
                </p>
              </div>

              {/* Charges */}
              <div className="text-right">
                <p className="text-sm text-amber-600">−{EUR.format(r.total_a_payer)}</p>
                <p className="text-muted-foreground text-xs">charges</p>
              </div>

              {/* Net */}
              <div className="w-28 text-right">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isBest ? "text-emerald-600" : "text-foreground"
                  )}
                >
                  {EUR.format(r.revenu_net)}
                </p>
                <p className="text-muted-foreground text-xs">net</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
