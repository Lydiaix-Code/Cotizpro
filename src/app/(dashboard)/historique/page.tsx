import { getActivites } from "@/actions/activite";
import { getAnneesDisponibles, getHistoriqueAnnee } from "@/actions/historique";
import { getProfile } from "@/actions/profile";
import { AnneeSelector, HistoriqueTable } from "@/components/historique";
import { PageHeader } from "@/components/layout";
import { ActiviteSelector } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getIsPremium } from "@/lib/premium";
import { Crown } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Historique",
};

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

interface PageProps {
  searchParams: Promise<{ annee?: string; activite?: string }>;
}

export default async function HistoriquePage({ searchParams }: PageProps) {
  const profile = await getProfile();
  if (!profile) redirect("/dashboard");

  const [annees, params, isPremium, activites] = await Promise.all([
    getAnneesDisponibles(),
    searchParams,
    getIsPremium(),
    getActivites(),
  ]);

  const anneeActuelle = new Date().getFullYear();

  // Gratuit : uniquement l'année en cours
  const anneesAccessibles = isPremium
    ? annees
    : annees.filter((a) => a === anneeActuelle);

  // Valider l'année depuis les searchParams (sécurité : validation côté serveur)
  const anneeParam = params.annee ? parseInt(params.annee, 10) : NaN;
  const anneeActive =
    !isNaN(anneeParam) && anneeParam >= 2000 && anneeParam <= anneeActuelle
      ? anneeParam
      : (anneesAccessibles[0] ?? anneeActuelle);

  // Si l'année demandée est hors de portée (free user essaie d'accéder à une autre année)
  const anneeBloquee =
    !isPremium && anneeParam && anneeParam !== anneeActuelle ? anneeParam : null;

  // Filtre activité depuis searchParams — passé tel quel, validé côté serveur dans getHistoriqueAnnee
  const activiteParam = params.activite?.trim() || undefined;

  const data = await getHistoriqueAnnee(
    anneeBloquee ? anneeActuelle : anneeActive,
    activiteParam
  );

  // Filtre activité affiché : valeur normalized pour le sélecteur
  // Filtre activité secondaire réservé aux membres Premium
  const activiteActive = isPremium ? (activiteParam ?? "") : "";
  const activitesActives = activites.filter((a) => a.actif);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Historique"
          description="Récapitulatif annuel de votre activité"
        />
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {isPremium && activitesActives.length > 0 && (
            <ActiviteSelector
              activites={activitesActives}
              activiteActive={activiteActive}
              showPrincipale
            />
          )}
          <AnneeSelector annees={anneesAccessibles} anneeActive={anneeActive} />
          {data && (
            <Link
              href={`/api/export/csv?annee=${anneeActive}`}
              className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm shadow-sm transition-colors"
            >
              ↓ Export CSV
            </Link>
          )}
        </div>
      </div>

      {/* Bannière multi-années pour les utilisateurs non premium */}
      {!isPremium && annees.length > 1 && (
        <Card className="border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Historique multi-années — Premium
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-yellow-700 dark:text-yellow-300">
              Vous avez des déclarations sur plusieurs années. Passez Premium pour accéder
              à l&apos;historique complet.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <Link
              href="/premium"
              className="inline-flex items-center gap-1.5 rounded-md bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-yellow-600"
            >
              <Crown className="h-3 w-3" />
              Passer Premium
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Pas encore de déclarations */}
      {annees.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Aucune déclaration</CardTitle>
            <CardDescription>
              Commencez par déclarer votre premier chiffre d&apos;affaires.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/declaration" className="text-primary text-sm hover:underline">
              Déclarer un CA →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Résumé de l'année */}
      {data && (
        <>
          {/* Cartes résumé */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>CA total {data.annee}</CardDescription>
                <CardTitle className="text-xl tabular-nums">
                  {EUR.format(data.totaux.ca)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Cotisations URSSAF</CardDescription>
                <CardTitle className="text-xl text-amber-700 tabular-nums">
                  {EUR.format(data.totaux.cotisations)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total charges</CardDescription>
                <CardTitle className="text-xl text-red-600 tabular-nums">
                  {EUR.format(data.totaux.total_charges)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Revenu net</CardDescription>
                <CardTitle
                  className={
                    "text-xl tabular-nums " +
                    (data.totaux.revenu_net >= 0 ? "text-emerald-600" : "text-red-600")
                  }
                >
                  {EUR.format(data.totaux.revenu_net)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Infos régime + plafond */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <Badge variant="secondary">{data.label_regime}</Badge>
            <span>·</span>
            <span>Plafond CA : {EUR.format(data.plafond)}</span>
            <span>·</span>
            <span
              className={
                data.pourcentage_plafond >= 100
                  ? "font-semibold text-red-600"
                  : data.pourcentage_plafond >= 80
                    ? "font-semibold text-amber-600"
                    : "text-emerald-600"
              }
            >
              {data.pourcentage_plafond} % du plafond utilisé
            </span>
            <span>·</span>
            <span>
              {data.mois.length} déclaration{data.mois.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table de détail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détail mensuel</CardTitle>
              <CardDescription>
                CA, cotisations URSSAF et revenu net mois par mois pour {data.annee}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HistoriqueTable data={data} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
