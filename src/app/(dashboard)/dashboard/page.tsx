import { getActivites } from "@/actions/activite";
import { getDashboardStats } from "@/actions/declaration";
import { getOnboardingState } from "@/actions/onboarding";
import { getProfile } from "@/actions/profile";
import { OnboardingChecklist } from "@/components/onboarding";
import { PremiumBanner } from "@/components/premium/PremiumBanner";
import { ProfileForm } from "@/components/profile";
import { ActiviteSelector } from "@/components/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { isAcreEligible } from "@/lib/calculators/urssaf";
import { getIsPremium } from "@/lib/premium";
import {
  LABELS_REGIME,
  PLAFONDS_CA,
  TAUX_COTISATIONS,
  TAUX_COTISATIONS_ACRE,
} from "@/types/database";
import { AlertTriangle, Calendar, ClipboardList, Info, TrendingUp } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Tableau de bord",
};

interface PageProps {
  searchParams: Promise<{ activite?: string }>;
}

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const NOMS_MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function prochaineEcheance(frequence: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  if (frequence === "mensuelle") {
    // Dernier jour du mois en cours
    return fmt(new Date(year, month, 0));
  }

  // Trimestrielle : 31 jan, 30 avr, 31 jul, 31 oct
  const deadlines = [
    new Date(year, 0, 31),
    new Date(year, 3, 30),
    new Date(year, 6, 31),
    new Date(year, 9, 31),
  ];
  for (const d of deadlines) {
    if (d >= now) return fmt(d);
  }
  return fmt(new Date(year + 1, 0, 31));
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Filtre activité depuis l'URL — validé côté serveur dans getDashboardStats
  const activiteParam = params.activite?.trim() || undefined;

  const [profile, activites, stats, isPremium, onboardingState] = await Promise.all([
    getProfile(),
    getActivites(),
    getDashboardStats(activiteParam),
    getIsPremium(),
    getOnboardingState(),
  ]);

  // Pas de profil → onboarding
  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <ClipboardList className="text-primary h-6 w-6" />
            </div>
            <CardTitle>Bienvenue sur Cotizpro 👋</CardTitle>
            <CardDescription>
              Configurez votre profil auto-entrepreneur pour commencer à calculer vos
              cotisations URSSAF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm submitLabel="Commencer →" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Régime et taux effectifs : si une activité est sélectionnée, on utilise ses paramètres.
  // Sécurité : l'activité vient de getActivites() côté serveur (ownership validé);
  // on cherche simplement dans la liste déjà filtrée — pas de requête coté client.
  // Les activités secondaires sont réservées aux membres Premium.
  // Si l'abonnement a expiré, on ignore le filtre d'activité secondaire.
  const selectedActivite =
    isPremium && activiteParam && activiteParam !== "principale"
      ? (activites.find((a) => a.id === activiteParam) ?? null)
      : null;

  const effectiveRegime = selectedActivite?.regime ?? profile.regime;
  const acreActif =
    (selectedActivite?.acre ?? profile.acre) &&
    isAcreEligible(
      selectedActivite?.date_debut ?? profile.date_debut_activite,
      stats.annee,
      stats.mois_en_cours
    );
  // Avertissement si l'utilisateur a coché ACRE mais qu'il n'est plus applicable
  const acreExpiree = (selectedActivite?.acre ?? profile.acre) && !acreActif;

  const plafond = PLAFONDS_CA[effectiveRegime];
  const tauxEffectif = acreActif
    ? TAUX_COTISATIONS_ACRE[effectiveRegime]
    : TAUX_COTISATIONS[effectiveRegime];
  const ratioPlafond = plafond > 0 ? stats.ca_cumule_ytd / plafond : 0;
  const echeance = prochaineEcheance(profile.frequence_declaration ?? "mensuelle");
  const nomMoisEnCours = NOMS_MOIS[stats.mois_en_cours - 1];
  const nomMoisPrecedent = NOMS_MOIS[stats.mois_en_cours - 2] ?? "";

  const activitesActives = activites.filter((a) => a.actif);

  // ── Projection fin d'année ────────────────────────────────────────────────
  const moisRestants = 12 - stats.mois_en_cours;
  const projectionAnnuelle =
    stats.ca_moyen_mensuel !== null && stats.nb_declarations > 1
      ? Math.round(stats.ca_cumule_ytd + stats.ca_moyen_mensuel * moisRestants)
      : null;
  const margeAvantPlafond = Math.max(plafond - stats.ca_cumule_ytd, 0);
  const moisAvantPlafond =
    stats.ca_moyen_mensuel !== null && stats.ca_moyen_mensuel > 0 && margeAvantPlafond > 0
      ? Math.floor(margeAvantPlafond / stats.ca_moyen_mensuel)
      : null;

  // Libellé du trimestre en cours
  const NOM_TRIMESTRES = ["T1", "T2", "T3", "T4"];
  const nomTrimestre = NOM_TRIMESTRES[stats.num_trimestre - 1];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            {stats.annee} · {LABELS_REGIME[effectiveRegime]}
            {acreActif && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                ACRE
              </span>
            )}
            {selectedActivite && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                {selectedActivite.nom}
              </span>
            )}
            {activiteParam === "principale" && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Activité principale
              </span>
            )}
          </p>
        </div>
        {isPremium && activitesActives.length > 0 && (
          <ActiviteSelector
            activites={activitesActives}
            activiteActive={activiteParam ?? ""}
            showPrincipale
          />
        )}
      </div>

      {/* Alerte ACRE expirée */}
      {acreExpiree && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>L&apos;ACRE n&apos;est plus applicable</AlertTitle>
          <AlertDescription>
            Les 12 premiers mois d&apos;exonération ACRE sont écoulés. Vos cotisations
            sont désormais calculées au taux normal. Pensez à désactiver l&apos;ACRE dans
            vos{" "}
            <Link href="/parametres" className="font-medium underline underline-offset-2">
              paramètres
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      {/* Alerte mois précédent non déclaré */}
      {stats.mois_precedent_manquant && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>CA {nomMoisPrecedent} non déclaré</AlertTitle>
          <AlertDescription>
            Vous n&apos;avez pas encore déclaré votre CA de {nomMoisPrecedent}.{" "}
            <Link
              href="/declaration"
              className="font-medium underline underline-offset-2"
            >
              Déclarer maintenant →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Alerte plafond ≥ 80 % */}
      {ratioPlafond >= 0.8 && (
        <Alert variant={ratioPlafond >= 1 ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {ratioPlafond >= 1 ? "Plafond CA dépassé !" : "Vous approchez du plafond"}
          </AlertTitle>
          <AlertDescription>
            {ratioPlafond >= 1
              ? `Votre CA cumulé (${EUR.format(stats.ca_cumule_ytd)}) dépasse le plafond autorisé (${EUR.format(plafond)}). Consultez un expert-comptable.`
              : `${Math.round(ratioPlafond * 100)} % de votre plafond annuel utilisé (${EUR.format(plafond)}).`}
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* Onboarding — visible tant que l'utilisateur n'a pas de déclarations */}
      {stats.nb_declarations <= 2 && !onboardingState.dismissed && (
        <OnboardingChecklist
          nbDeclarations={stats.nb_declarations}
          initialDismissed={onboardingState.dismissed}
          initialGraphiquesVisited={onboardingState.graphiquesVisited}
        />
      )}

      {/* Bannière de conversion Premium — affichée uniquement aux membres gratuits */}
      {/* isPremium vérifié côté serveur, jamais côté client */}
      {!isPremium && <PremiumBanner />}

      {/* 4 KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* CA du mois en cours */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CA {nomMoisEnCours}</CardDescription>
            <CardTitle className="text-2xl">
              {stats.ca_mois_en_cours !== null ? (
                EUR.format(stats.ca_mois_en_cours)
              ) : (
                <span className="text-muted-foreground text-sm font-normal">
                  Non déclaré
                </span>
              )}
            </CardTitle>
          </CardHeader>
          {stats.ca_mois_en_cours === null && (
            <CardContent className="pt-0">
              <Link href="/declaration" className="text-primary text-xs hover:underline">
                Déclarer maintenant →
              </Link>
            </CardContent>
          )}
        </Card>

        {/* CA cumulé YTD */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CA cumulé {stats.annee}</CardDescription>
            <CardTitle className="text-2xl">{EUR.format(stats.ca_cumule_ytd)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-xs">
              {stats.nb_declarations} déclaration{stats.nb_declarations !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Cotisations URSSAF YTD */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cotisations URSSAF {stats.annee}</CardDescription>
            <CardTitle className="text-2xl">
              {EUR.format(stats.cotisations_ytd)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-xs">
              Taux : {(tauxEffectif * 100).toFixed(1)} %{acreActif ? " (ACRE)" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Revenu net YTD */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenu net {stats.annee}</CardDescription>
            <CardTitle
              className={
                "text-2xl " +
                (stats.revenu_net_ytd < 0 ? "text-red-600" : "text-emerald-600")
              }
            >
              {EUR.format(stats.revenu_net_ytd)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-xs">Après cotisations URSSAF</p>
          </CardContent>
        </Card>
      </div>

      {/* Jauge vers le plafond */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Progression vers le plafond</CardTitle>
              <CardDescription>
                {EUR.format(stats.ca_cumule_ytd)} / {EUR.format(plafond)}
              </CardDescription>
            </div>
            <span
              className={
                "text-sm font-semibold tabular-nums " +
                (ratioPlafond >= 1
                  ? "text-red-600"
                  : ratioPlafond >= 0.8
                    ? "text-amber-600"
                    : "text-emerald-600")
              }
            >
              {Math.min(Math.round(ratioPlafond * 100), 100)} %
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={
                "h-full rounded-full transition-all " +
                (ratioPlafond >= 1
                  ? "bg-red-500"
                  : ratioPlafond >= 0.8
                    ? "bg-amber-400"
                    : "bg-emerald-500")
              }
              style={{ width: `${Math.min(ratioPlafond * 100, 100)}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            Reste disponible : {EUR.format(Math.max(plafond - stats.ca_cumule_ytd, 0))}
          </p>
        </CardContent>
      </Card>

      {/* Infos pratiques */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Prochaine échéance (
              {(profile.frequence_declaration ?? "mensuelle") === "mensuelle"
                ? "mensuelle"
                : "trimestrielle"}
              )
            </CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="text-primary h-4 w-4 shrink-0" />
              {echeance}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Marge avant plafond</CardDescription>
            <CardTitle className="text-base">
              {EUR.format(Math.max(plafond - stats.ca_cumule_ytd, 0))}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-xs">
              Plafond annuel : {EUR.format(plafond)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Carte trimestre en cours */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {nomTrimestre} {stats.annee} — Trimestre en cours
              </CardTitle>
              <CardDescription>
                Mois {(stats.num_trimestre - 1) * 3 + 1} à {stats.num_trimestre * 3}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">CA déclaré</p>
              <p className="mt-0.5 font-semibold">
                {EUR.format(stats.ca_trimestre_en_cours)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Cotisations</p>
              <p className="mt-0.5 font-semibold text-amber-600">
                {EUR.format(stats.cotisations_trimestre_en_cours)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Net estimé</p>
              <p className="mt-0.5 font-semibold text-emerald-600">
                {EUR.format(
                  stats.ca_trimestre_en_cours - stats.cotisations_trimestre_en_cours
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projection fin d'année */}
      {projectionAnnuelle !== null && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-primary h-4 w-4" />
              <CardTitle className="text-base">Projection fin d&apos;année</CardTitle>
            </div>
            <CardDescription>
              Basée sur votre CA moyen de{" "}
              {EUR.format(Math.round(stats.ca_moyen_mensuel ?? 0))}
              /mois ({stats.nb_declarations} mois déclarés)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-xs">CA projeté {stats.annee}</p>
                <p className="mt-0.5 font-semibold">{EUR.format(projectionAnnuelle)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Ratio plafond projeté</p>
                <p
                  className={
                    "mt-0.5 font-semibold " +
                    (projectionAnnuelle >= plafond
                      ? "text-red-600"
                      : projectionAnnuelle >= plafond * 0.8
                        ? "text-amber-600"
                        : "text-emerald-600")
                  }
                >
                  {Math.round((projectionAnnuelle / plafond) * 100)} %
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {moisAvantPlafond === 0
                    ? "Plafond déjà atteint"
                    : moisAvantPlafond !== null
                      ? "Plafond dans"
                      : "Marge restante"}
                </p>
                <p className="mt-0.5 font-semibold">
                  {moisAvantPlafond === 0
                    ? "—"
                    : moisAvantPlafond !== null
                      ? `~${moisAvantPlafond} mois`
                      : EUR.format(margeAvantPlafond)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
