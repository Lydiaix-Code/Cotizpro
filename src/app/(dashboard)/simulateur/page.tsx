import { PageHeader } from "@/components/layout/PageHeader";
import { SimulateurForm } from "@/components/simulateur";

export const metadata = {
  title: "Simulateur URSSAF",
};

export default function SimulateurPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulateur URSSAF"
        description="Estimez vos cotisations et votre revenu net sans enregistrer de déclaration."
      />
      <div className="max-w-2xl">
        <SimulateurForm />
      </div>
    </div>
  );
}
