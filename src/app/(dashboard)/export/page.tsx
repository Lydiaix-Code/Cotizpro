import { getAnneesDisponibles } from "@/actions/historique";
import { getProfile } from "@/actions/profile";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getIsPremium } from "@/lib/premium";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Export",
};

export default async function ExportPage() {
  const profile = await getProfile();
  if (!profile) redirect("/dashboard");

  const [annees, isPremium] = await Promise.all([getAnneesDisponibles(), getIsPremium()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export"
        description="Téléchargez vos données pour votre comptable ou déclaration fiscale"
      />

      {annees.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Aucune donnée à exporter</CardTitle>
            <CardDescription>
              Déclarez votre premier CA pour pouvoir exporter vos données.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/declaration" className="text-primary text-sm hover:underline">
              Déclarer un CA →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {annees.map((annee) => (
            <Card key={annee}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Année {annee}</CardTitle>
                <CardDescription>
                  Récapitulatif complet : CA, cotisations URSSAF, revenu net
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {/* Export CSV — gratuit */}
                <Link
                  href={`/api/export/csv?annee=${annee}`}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors"
                >
                  ↓ Télécharger CSV
                </Link>

                {/* Export PDF — Premium uniquement, caché pour les non-premium */}
                {isPremium && (
                  <Link
                    href={`/api/export/pdf?annee=${annee}`}
                    className="border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
                  >
                    ↓ Télécharger PDF
                  </Link>
                )}

                {/* Lien vers l'historique de l'année */}
                <Link
                  href={`/historique?annee=${annee}`}
                  className="border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors"
                >
                  Voir le détail →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Le fichier CSV est compatible avec Excel, LibreOffice et Google Sheets. Il
        contient le détail mensuel de votre CA, vos cotisations URSSAF et votre revenu
        net.
        {!isPremium && (
          <>
            {" "}
            L&apos;export PDF est disponible avec l&apos;abonnement{" "}
            <Link
              href="/premium"
              className="text-yellow-600 hover:underline dark:text-yellow-400"
            >
              Premium
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
