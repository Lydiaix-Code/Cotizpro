import { getDeclarations } from "@/actions/declaration";
import { getProfile } from "@/actions/profile";
import { PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { calculerCaCumule, calculerPourcentagePlafond } from "@/lib/calculators/urssaf";
import {
  LABELS_REGIME,
  PLAFONDS_CA,
  TAUX_COTISATIONS,
  TAUX_COTISATIONS_ACRE,
} from "@/types/database";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Mes cotisations",
};

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const MOIS_LABELS = [
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

export default async function CotisationsPage() {
  const [profile, declarations] = await Promise.all([getProfile(), getDeclarations()]);

  if (!profile) redirect("/dashboard");

  const annee = new Date().getFullYear();
  const caCumule = calculerCaCumule(declarations, annee);
  const pourcentagePlafond = calculerPourcentagePlafond(caCumule, profile.regime);
  const plafond = PLAFONDS_CA[profile.regime];
  const tauxActuel = profile.acre
    ? TAUX_COTISATIONS_ACRE[profile.regime]
    : TAUX_COTISATIONS[profile.regime];

  // Total cotisations de l'année
  const totalCotisations = declarations.reduce((sum, d) => {
    const c = d.cotisations?.[0];
    return sum + (c?.montant_cotisations ?? 0) + (c?.montant_versement_liberatoire ?? 0);
  }, 0);

  // Couleur barre de progression selon le seuil
  const barColor =
    pourcentagePlafond >= 100
      ? "bg-red-500"
      : pourcentagePlafond >= 90
        ? "bg-amber-500"
        : pourcentagePlafond >= 80
          ? "bg-amber-400"
          : "bg-emerald-500";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes cotisations"
        description="Récapitulatif de vos cotisations URSSAF pour l'année en cours."
      />

      <Separator />

      {/* Cartes stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CA total {annee}</CardDescription>
            <CardTitle className="text-xl tabular-nums">{EUR.format(caCumule)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cotisations versées</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {EUR.format(totalCotisations)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenu net estimé</CardDescription>
            <CardTitle className="text-xl text-emerald-600 tabular-nums dark:text-emerald-400">
              {EUR.format(caCumule - totalCotisations)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taux appliqué</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {(tauxActuel * 100).toFixed(1)}%
              {profile.acre && (
                <Badge variant="secondary" className="ml-2 text-xs font-normal">
                  ACRE
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Barre de progression plafond */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Plafond CA annuel</CardTitle>
              <CardDescription>{LABELS_REGIME[profile.regime]}</CardDescription>
            </div>
            <span
              className={`text-sm font-semibold tabular-nums ${
                pourcentagePlafond >= 100
                  ? "text-red-600 dark:text-red-400"
                  : pourcentagePlafond >= 80
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {pourcentagePlafond}%
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="bg-secondary h-2.5 w-full overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(pourcentagePlafond, 100)}%` }}
            />
          </div>
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>{EUR.format(caCumule)}</span>
            <span>Plafond : {EUR.format(plafond)}</span>
          </div>
          {pourcentagePlafond >= 80 && pourcentagePlafond < 100 && (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              ⚠️ Vous approchez du plafond CA autorisé pour votre régime.
            </p>
          )}
          {pourcentagePlafond >= 100 && (
            <p className="text-destructive text-xs font-medium">
              🚨 Plafond CA dépassé — consultez un expert-comptable.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {declarations.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Aucune déclaration pour {annee}</CardTitle>
            <CardDescription>
              Déclarez votre premier chiffre d&apos;affaires pour voir vos cotisations
              détaillées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/declaration" className="text-primary text-sm hover:underline">
              Déclarer un CA →
            </a>
          </CardContent>
        </Card>
      )}

      {/* Détail par mois */}
      {declarations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détail mensuel {annee}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {declarations.map((d) => {
                const c = d.cotisations?.[0];
                const total =
                  (c?.montant_cotisations ?? 0) + (c?.montant_versement_liberatoire ?? 0);
                const net = d.montant_ca - total;

                return (
                  <div key={d.id} className="grid grid-cols-4 gap-2 px-4 py-3 text-sm">
                    <span className="font-medium">{MOIS_LABELS[d.mois - 1]}</span>
                    <span className="text-right tabular-nums">
                      {EUR.format(d.montant_ca)}
                    </span>
                    <span className="text-right text-amber-600 tabular-nums dark:text-amber-400">
                      -{EUR.format(total)}
                    </span>
                    <span className="text-right text-emerald-600 tabular-nums dark:text-emerald-400">
                      {EUR.format(net)}
                    </span>
                  </div>
                );
              })}
              {/* En-tête colonnes */}
              <div className="bg-muted/50 text-muted-foreground grid grid-cols-4 gap-2 px-4 py-2 text-xs">
                <span>Mois</span>
                <span className="text-right">CA</span>
                <span className="text-right">Cotisations</span>
                <span className="text-right">Net</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
