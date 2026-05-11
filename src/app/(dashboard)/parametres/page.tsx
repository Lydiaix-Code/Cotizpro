import { getActivites } from "@/actions/activite";
import { getMFAFactors } from "@/actions/mfa";
import { getProfile } from "@/actions/profile";
import { ActivitesSection } from "@/components/activites";
import { PageHeader } from "@/components/layout";
import { ManageSubscriptionButton } from "@/components/premium/ManageSubscriptionButton";
import { ProfileForm } from "@/components/profile";
import { MFASection } from "@/components/settings/MFASection";
import { PushNotificationManager } from "@/components/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getIsPremium } from "@/lib/premium";
import { Crown } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Paramètres",
};

export default async function ParametresPage() {
  const [profile, { factors }, isPremium, activites] = await Promise.all([
    getProfile(),
    getMFAFactors(),
    getIsPremium(),
    getActivites(),
  ]);

  // Si pas de profil, l'utilisateur doit d'abord faire l'onboarding
  if (!profile) {
    redirect("/dashboard");
  }

  const verifiedFactor = factors.find((f) => f.status === "verified");

  const dateDebut = new Date(profile.date_debut_activite).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Gérez votre profil auto-entrepreneur."
      />

      <Separator />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulaire */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profil auto-entrepreneur</CardTitle>
              <CardDescription>
                Ces informations sont utilisées pour calculer vos cotisations URSSAF.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                initialData={profile}
                submitLabel="Mettre à jour"
                isPremium={isPremium}
              />
            </CardContent>
          </Card>

          {/* Activités secondaires */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Activités secondaires</CardTitle>
                {!isPremium && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
              </div>
              <CardDescription>
                Gérez plusieurs activités avec des régimes fiscaux différents.
                L&apos;activité principale reste celle définie dans votre profil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivitesSection activites={activites} isPremium={isPremium} />
            </CardContent>
          </Card>

          {/* Sécurité du compte */}
          <MFASection factorId={verifiedFactor?.id} />

          {/* Notifications push PWA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>
                Recevez des alertes URSSAF directement sur cet appareil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PushNotificationManager />
            </CardContent>
          </Card>
        </div>

        {/* Infos en lecture seule */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Membre depuis</CardDescription>
              <CardTitle className="text-sm font-medium">{dateDebut}</CardTitle>
            </CardHeader>
          </Card>

          {/* Abonnement */}
          {isPremium ? (
            <Card className="border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Abonnement Premium
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-yellow-700 dark:text-yellow-300">
                  Toutes les fonctionnalités sont débloquées.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <ManageSubscriptionButton />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <CardTitle className="text-sm font-medium">Plan Gratuit</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Passez Premium pour débloquer l&apos;export PDF, l&apos;historique
                  multi-années, les rappels e-mail, le multi-activités et le support
                  prioritaire.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <Link
                  href="/premium"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  <Crown className="h-3 w-3 text-yellow-300" />
                  Passer Premium
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">
                ⚠️ Changement de régime
              </CardTitle>
              <CardDescription className="text-xs text-amber-700 dark:text-amber-300">
                Modifier votre régime en cours d&apos;année recalculera toutes vos
                cotisations précédentes. Assurez-vous que ce changement est correct.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
