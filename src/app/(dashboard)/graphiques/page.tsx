import { getActivites } from "@/actions/activite";
import { getChartData } from "@/actions/declaration";
import { getProfile } from "@/actions/profile";
import { ChartCA, ChartPlafond, ChartRepartition } from "@/components/charts";
import { PageHeader } from "@/components/layout";
import { MarkGraphiquesVisited } from "@/components/onboarding";
import { ActiviteSelector } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getIsPremium } from "@/lib/premium";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Graphiques",
};

interface PageProps {
  searchParams: Promise<{ activite?: string }>;
}

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default async function GraphiquesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Filtre activité : validé côté serveur dans getChartData (UUID + ownership)
  const activiteParam = params.activite?.trim() || undefined;

  const [profile, activites, data, isPremium] = await Promise.all([
    getProfile(),
    getActivites(),
    getChartData(undefined, activiteParam),
    getIsPremium(),
  ]);

  if (!profile) redirect("/dashboard");

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Graphiques"
          description="Visualisez l'évolution de votre activité"
        />
        <p className="text-muted-foreground text-sm">
          Impossible de charger les données. Réessayez.
        </p>
      </div>
    );
  }

  const activitesActives = activites.filter((a) => a.actif);
  const selectedActivite =
    isPremium && activiteParam && activiteParam !== "principale"
      ? (activitesActives.find((a) => a.id === activiteParam) ?? null)
      : null;

  const { ca_total, net_total, cotisations_total } = data.repartition;
  const tauxCharges = ca_total > 0 ? (cotisations_total / ca_total) * 100 : 0;
  const pctPlafond = ca_total > 0 ? (ca_total / data.plafond) * 100 : 0;

  return (
    <div className="space-y-8">
      <MarkGraphiquesVisited />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Graphiques"
          description={`Analyse de votre activité — ${data.annee}${
            selectedActivite
              ? ` · ${selectedActivite.nom}`
              : activiteParam === "principale"
                ? " · Activité principale"
                : ""
          }`}
        />
        {isPremium && activitesActives.length > 0 && (
          <div className="shrink-0">
            <ActiviteSelector
              activites={activitesActives}
              activiteActive={activiteParam ?? ""}
              showPrincipale
            />
          </div>
        )}
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            CA total
          </p>
          <p className="mt-1.5 text-xl font-black tabular-nums">{EUR.format(ca_total)}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            Revenu net
          </p>
          <p className="mt-1.5 text-xl font-black text-[#10b981] tabular-nums">
            {EUR.format(net_total)}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            Cotisations
          </p>
          <p className="mt-1.5 text-xl font-black text-[#f59e0b] tabular-nums">
            {EUR.format(cotisations_total)}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            Taux de charges
          </p>
          <p
            className={`mt-1.5 text-xl font-black tabular-nums ${tauxCharges > 25 ? "text-[#ef4444]" : "text-foreground"}`}
          >
            {tauxCharges.toFixed(1)} %
          </p>
        </div>
      </div>

      <Separator />

      {/* CA mensuel */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <BarChart3 className="text-primary h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Performance mensuelle</CardTitle>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Revenu net + cotisations = CA · moyenne mensuelle en pointillé
              </p>
            </div>
            <div className="text-muted-foreground ml-auto flex items-center justify-end gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-[#10b981]" /> Net
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-[#f59e0b]" />{" "}
                Cotisations
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartCA points={data.points} pointsN1={data.pointsN1} />
        </CardContent>
      </Card>

      {/* Plafond */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <TrendingUp className="text-primary h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Jauge du plafond légal</CardTitle>
              <p className="text-muted-foreground mt-0.5 text-sm">
                CA cumulé vs plafond auto-entrepreneur · {pctPlafond.toFixed(1)} % atteint
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartPlafond points={data.points} plafond={data.plafond} />
        </CardContent>
      </Card>

      {/* Répartition */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <PieChart className="text-primary h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Analyse financière</CardTitle>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Répartition du CA · score de rentabilité
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartRepartition repartition={data.repartition} points={data.points} />
        </CardContent>
      </Card>
    </div>
  );
}
