import { getAnneesDisponiblesFiscal, getRecapFiscal } from "@/actions/fiscalite";
import { getProfile } from "@/actions/profile";
import { RecapFiscal } from "@/components/fiscalite";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getIsPremium } from "@/lib/premium";
import { cn } from "@/lib/utils";
import { Crown, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Récapitulatif fiscal",
  description:
    "Retrouvez les montants à reporter sur votre déclaration d'impôts 2042-C-PRO.",
};

interface PageProps {
  searchParams: Promise<{ annee?: string }>;
}

export default async function FiscalitePage({ searchParams }: PageProps) {
  const profile = await getProfile();
  if (!profile) redirect("/dashboard");

  const [annees, params, isPremium] = await Promise.all([
    getAnneesDisponiblesFiscal(),
    searchParams,
    getIsPremium(),
  ]);

  if (!isPremium) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
            title="Récapitulatif fiscal"
            description="Montants à reporter sur votre déclaration d'impôts 2042-C-PRO."
          />
        </div>
        <Separator />
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="rounded-full bg-yellow-100 p-4 dark:bg-yellow-950">
              <Crown className="h-7 w-7 text-yellow-500" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">Fonctionnalité Premium</p>
              <p className="text-muted-foreground max-w-sm text-sm">
                Le récapitulatif fiscal 2042-C-PRO est disponible avec l&apos;abonnement
                Premium. Accédez aux cases exactes à reporter sur votre déclaration
                d&apos;impôts.
              </p>
            </div>
            <Link
              href="/premium"
              className="mt-2 inline-flex items-center gap-2 rounded-md bg-yellow-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-yellow-600"
            >
              <Crown className="h-4 w-4" />
              Passer à Premium
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const anneeActuelle = new Date().getFullYear();

  // Validation de l'année depuis les searchParams (côté serveur)
  const anneeParam = params.annee ? parseInt(params.annee, 10) : NaN;
  const anneeActive =
    !isNaN(anneeParam) && anneeParam >= 2020 && anneeParam <= anneeActuelle
      ? anneeParam
      : (annees[0] ?? anneeActuelle - 1);

  const recap = await getRecapFiscal(anneeActive);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Récapitulatif fiscal"
          description="Montants à reporter sur votre déclaration d'impôts 2042-C-PRO."
        />
      </div>

      <Separator />

      {/* Sélecteur d'année */}
      {annees.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {annees.map((a) => (
            <Link
              key={a}
              href={`/fiscalite?annee=${a}`}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                a === anneeActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {a}
            </Link>
          ))}
        </div>
      )}

      {/* Aucune déclaration du tout */}
      {annees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="bg-muted rounded-full p-3">
              <FileText className="text-muted-foreground h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Aucune déclaration trouvée</p>
              <p className="text-muted-foreground text-xs">
                Commencez par saisir votre chiffre d&apos;affaires mensuel.
              </p>
            </div>
            <Link
              href="/declaration"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              Déclarer mon CA
            </Link>
          </CardContent>
        </Card>
      ) : recap ? (
        <RecapFiscal recap={recap} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Impossible de charger le récapitulatif. Réessayez.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
