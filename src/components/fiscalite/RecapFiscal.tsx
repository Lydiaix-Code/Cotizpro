"use client";

import type { RecapFiscal as RecapFiscalType } from "@/actions/fiscalite";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, ExternalLink, Info } from "lucide-react";

interface RecapFiscalProps {
  recap: RecapFiscalType;
}

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export function RecapFiscal({ recap }: RecapFiscalProps) {
  if (recap.lignes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="bg-muted rounded-full p-3">
            <Info className="text-muted-foreground h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Aucune déclaration pour {recap.annee}</p>
            <p className="text-muted-foreground text-xs">
              Saisissez votre CA pour générer votre récapitulatif fiscal.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bandeau avertissement */}
      <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Ce récapitulatif est fourni à titre indicatif à partir de vos déclarations
          Cotizpro. Vérifiez les cases sur la notice officielle{" "}
          <a
            href="https://www.impots.gouv.fr/sites/default/files/formulaires/2042-c-pro/2025/2042-c-pro_3303.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
          >
            2042-C-PRO <ExternalLink className="h-3 w-3" />
          </a>{" "}
          avant de soumettre votre déclaration d&apos;impôts.
        </p>
      </div>

      {/* KPI globaux */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              CA total {recap.annee}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {EUR.format(recap.ca_total_global)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Cotisations payées
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-600 tabular-nums dark:text-amber-400">
              {EUR.format(recap.cotisations_totales_global)}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Revenu net estimé
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
              {EUR.format(recap.revenu_net_global)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Détail par activité/régime */}
      {recap.lignes.map((ligne, idx) => (
        <Card key={`${ligne.regime}-${idx}`}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{ligne.label}</CardTitle>
              {ligne.acre_applique && (
                <Badge variant="secondary" className="text-xs">
                  ACRE
                </Badge>
              )}
              {ligne.versement_liberatoire_applique && (
                <Badge
                  variant="outline"
                  className="border-indigo-300 bg-indigo-50 text-xs text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                >
                  Vers. libératoire
                </Badge>
              )}
            </div>
            <CardDescription>
              {ligne.taux_utilisation_plafond}% du plafond utilisé (
              {EUR.format(ligne.plafond)})
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Tableau récapitulatif comptable */}
            <div className="divide-y rounded-lg border text-sm">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-muted-foreground">
                  Chiffre d&apos;affaires brut
                </span>
                <span className="font-medium tabular-nums">
                  {EUR.format(ligne.ca_total)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-muted-foreground">
                  Cotisations sociales (micro-social)
                </span>
                <span className="font-medium text-amber-600 tabular-nums dark:text-amber-400">
                  − {EUR.format(ligne.cotisations_totales)}
                </span>
              </div>
              {ligne.versements_liberatoires > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">
                    Versement libératoire de l&apos;impôt
                  </span>
                  <span className="font-medium text-amber-600 tabular-nums dark:text-amber-400">
                    − {EUR.format(ligne.versements_liberatoires)}
                  </span>
                </div>
              )}
              <div className="bg-muted/30 flex items-center justify-between px-4 py-2.5">
                <span className="font-semibold">Revenu net estimé</span>
                <span className="font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                  {EUR.format(ligne.revenu_net)}
                </span>
              </div>
            </div>

            <Separator />

            {/* Cases 2042-C-PRO */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-indigo-500" />
                <p className="text-sm font-medium">Cases à reporter sur la 2042-C-PRO</p>
              </div>
              <div className="space-y-2">
                {ligne.cases_2042.map((c) => (
                  <div
                    key={c.case}
                    className="bg-muted/50 flex items-center justify-between gap-4 rounded-md px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                        {c.case}
                      </span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {c.libelle}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {EUR.format(c.valeur)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Récap tableau global si plusieurs activités */}
      {recap.lignes.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Récapitulatif global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border text-sm">
              {/* Header */}
              <div className="text-muted-foreground bg-muted/30 grid grid-cols-4 gap-2 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase">
                <span className="col-span-1">Activité</span>
                <span className="text-right">CA</span>
                <span className="text-right">Cotisations</span>
                <span className="text-right">Net</span>
              </div>
              {recap.lignes.map((ligne, idx) => (
                <div
                  key={`global-${ligne.regime}-${idx}`}
                  className="grid grid-cols-4 gap-2 border-b px-4 py-2.5 last:border-0"
                >
                  <span className="col-span-1 truncate">{ligne.label}</span>
                  <span className="text-right tabular-nums">
                    {EUR.format(ligne.ca_total)}
                  </span>
                  <span className="text-right text-amber-600 tabular-nums dark:text-amber-400">
                    {EUR.format(ligne.cotisations_totales)}
                  </span>
                  <span className="text-right font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
                    {EUR.format(ligne.revenu_net)}
                  </span>
                </div>
              ))}
              {/* Total */}
              <div className="bg-muted/30 grid grid-cols-4 gap-2 border-t-2 px-4 py-2.5 font-semibold">
                <span className="col-span-1">Total</span>
                <span className="text-right tabular-nums">
                  {EUR.format(recap.ca_total_global)}
                </span>
                <span className="text-right text-amber-600 tabular-nums dark:text-amber-400">
                  {EUR.format(recap.cotisations_totales_global)}
                </span>
                <span className="text-right text-emerald-600 tabular-nums dark:text-emerald-400">
                  {EUR.format(recap.revenu_net_global)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lien vers les impôts */}
      <p className="text-muted-foreground text-xs">
        Déclaration en ligne :{" "}
        <a
          href="https://www.impots.gouv.fr/mon-espace/particulier"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 underline underline-offset-2"
        >
          impots.gouv.fr — Mon espace particulier <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  );
}
