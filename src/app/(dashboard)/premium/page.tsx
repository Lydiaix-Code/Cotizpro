import { getProfile } from "@/actions/profile";
import { PageHeader } from "@/components/layout";
import { PremiumCheckoutButtons } from "@/components/premium/PremiumCheckoutButtons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getIsPremium } from "@/lib/premium";
import { Check, Crown } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Premium",
  description: "Passez à Premium pour débloquer toutes les fonctionnalités Cotizpro.",
};

const FEATURES_FREE = [
  "Déclarations de CA illimitées",
  "Calcul automatique des cotisations URSSAF",
  "Simulateur de cotisations (sandbox)",
  "Import CSV de déclarations passées",
  "Tableau de bord & graphiques",
  "Alerte mois non déclaré",
  "Projection fin d'année",
  "Export CSV",
  "Historique année en cours",
];

const FEATURES_PREMIUM = [
  "Tout ce qui est inclus dans Gratuit",
  "Export PDF récapitulatif annuel",
  "Récapitulatif fiscal 2042-C-PRO",
  "Historique toutes les années",
  "Rappels e-mail avant échéances",
  "Multi-activités (jusqu'à 5)",
  "Filtres par activité sur graphiques",
  "Support prioritaire",
];

export default async function PremiumPage() {
  const profile = await getProfile();
  if (!profile) redirect("/dashboard");

  const isPremium = await getIsPremium();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Premium"
        description={
          isPremium
            ? "Votre abonnement Premium est actif. Merci pour votre confiance !"
            : "Débloquez toutes les fonctionnalités pour gérer votre activité sereinement."
        }
      />

      <Separator />

      {/* Bannière abonnement actif */}
      {isPremium && (
        <Card className="border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-base text-yellow-800 dark:text-yellow-200">
                Abonnement Premium actif
              </CardTitle>
            </div>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Vous avez accès à toutes les fonctionnalités. Gérez votre abonnement depuis
              les paramètres.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <Link
              href="/parametres"
              className="inline-flex items-center gap-1.5 rounded-md border border-yellow-400 px-3 py-1.5 text-sm font-medium text-yellow-800 transition-colors hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900"
            >
              Gérer mon abonnement →
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid max-w-3xl gap-6 md:grid-cols-2">
        {/* Plan gratuit */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Gratuit</CardTitle>
            <CardDescription>Pour démarrer et tester l&apos;outil</CardDescription>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              0 €
              <span className="text-muted-foreground text-sm font-normal"> / mois</span>
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <ul className="flex-1 space-y-2.5 text-sm">
              {FEATURES_FREE.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="border-input bg-background text-muted-foreground mt-6 inline-flex cursor-default items-center justify-center rounded-md border px-4 py-2 text-sm font-medium select-none">
              {isPremium ? "Plan de base" : "Votre plan actuel"}
            </div>
          </CardContent>
        </Card>

        {/* Plan premium */}
        <div className="relative pt-4">
          <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2">
            <Badge className="gap-1.5 border-0 bg-yellow-500 px-3 py-1 text-xs text-white hover:bg-yellow-500">
              <Crown className="h-3 w-3" />
              {isPremium ? "Votre plan actuel" : "Recommandé"}
            </Badge>
          </div>
          <Card className="border-primary ring-primary flex flex-col ring-1">
            <CardHeader>
              <CardTitle className="text-base">Premium</CardTitle>
              <CardDescription>Pour les auto-entrepreneurs sérieux</CardDescription>
              <div className="mt-2 space-y-0.5">
                <p className="text-3xl font-bold tracking-tight">
                  39,99 €
                  <span className="text-muted-foreground text-sm font-normal"> / an</span>
                </p>
                <p className="text-muted-foreground text-sm">
                  soit <span className="text-foreground font-medium">3,33 €/mois</span>
                  {" · "}
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    économisez ~20 €/an vs mensuel
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">
                  ou 4,99 €/mois sans engagement
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <ul className="flex-1 space-y-2.5 text-sm">
                {FEATURES_PREMIUM.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="text-primary h-4 w-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isPremium ? (
                  <div className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    <Crown className="h-4 w-4" />
                    Actif
                  </div>
                ) : (
                  <PremiumCheckoutButtons />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-muted-foreground max-w-md text-xs">
        Le paiement est sécurisé via Stripe. Annulation possible à tout moment depuis vos
        paramètres. Aucune donnée bancaire n&apos;est stockée sur nos serveurs.
      </p>
    </div>
  );
}
