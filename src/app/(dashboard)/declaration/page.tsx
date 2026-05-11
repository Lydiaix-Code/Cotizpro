import { getActivites } from "@/actions/activite";
import { getDeclarations } from "@/actions/declaration";
import { getProfile } from "@/actions/profile";
import { DeclarationForm, DeclarationList } from "@/components/declaration";
import { PageHeader } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getIsPremium } from "@/lib/premium";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Déclarer mon CA",
};

export default async function DeclarationPage() {
  const [profile, declarations, activites, isPremium] = await Promise.all([
    getProfile(),
    getDeclarations(),
    getActivites(),
    getIsPremium(),
  ]);

  // Profil obligatoire pour déclarer
  if (!profile) redirect("/dashboard");

  const anneeEnCours = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Déclarer mon CA"
        description="Saisissez votre chiffre d'affaires mensuel. Les cotisations URSSAF sont calculées automatiquement."
      />

      <Separator />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Formulaire — colonne gauche */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nouvelle déclaration</CardTitle>
              <CardDescription>
                Régime actuel :{" "}
                <span className="font-medium">
                  {profile.regime === "bic_marchandises"
                    ? "Vente de marchandises (BIC)"
                    : profile.regime === "bic_services"
                      ? "Prestations de services (BIC)"
                      : "Activité libérale (BNC)"}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeclarationForm activites={activites} isPremium={isPremium} />
            </CardContent>
          </Card>
        </div>

        {/* Liste des déclarations — colonne droite */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Déclarations {anneeEnCours}</CardTitle>
              <CardDescription>
                {declarations.length} déclaration
                {declarations.length > 1 ? "s" : ""} enregistrée
                {declarations.length > 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DeclarationList declarations={declarations} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
