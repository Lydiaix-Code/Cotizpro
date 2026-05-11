import { getActivites } from "@/actions/activite";
import { ImportForm } from "@/components/import";
import { PageHeader } from "@/components/layout";
import { getIsPremium } from "@/lib/premium";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Import CSV",
};

export default async function ImportPage() {
  const [activites, isPremium] = await Promise.all([getActivites(), getIsPremium()]);
  const activitesActives = activites.filter((a) => a.actif);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import CSV"
        description="Importez vos déclarations passées depuis un fichier CSV."
      />
      <div className="max-w-2xl">
        <ImportForm activites={activitesActives} isPremium={isPremium} />
      </div>
    </div>
  );
}
