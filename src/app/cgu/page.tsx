import { BackButton } from "@/components/shared/BackButton";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Conditions Générales d'Utilisation | Cotizpro",
  description: "Conditions générales d'utilisation de l'application Cotizpro.",
};

export default async function CguPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const fallback = user ? "/dashboard" : "/";

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Dernière mise à jour : avril 2026
        </p>
      </div>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Objet</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Les présentes CGU régissent l&apos;utilisation de l&apos;application{" "}
          <strong>Cotizpro</strong>, outil de calcul et de suivi des cotisations URSSAF
          pour les auto-entrepreneurs français. En accédant au service, vous acceptez
          pleinement ces conditions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. Description du service</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Cotizpro est un outil d&apos;aide à la gestion pour auto-entrepreneurs. Il
          permet de déclarer votre chiffre d&apos;affaires mensuel et d&apos;obtenir une
          estimation de vos cotisations URSSAF. Les calculs sont fournis à titre indicatif
          et ne se substituent pas à l&apos;avis d&apos;un expert-comptable ou aux
          déclarations officielles sur le site de l&apos;URSSAF.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. Inscription et accès</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          L&apos;accès au service requiert la création d&apos;un compte avec une adresse
          e-mail valide. Vous êtes responsable de la confidentialité de vos identifiants.
          Tout accès non autorisé à votre compte doit être signalé immédiatement.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. Données personnelles</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Vos données (e-mail, données d&apos;activité) sont traitées conformément au
          RGPD. Elles sont stockées de manière sécurisée et ne sont jamais transmises à
          des tiers à des fins commerciales. Vous pouvez demander la suppression de votre
          compte et de toutes vos données à tout moment.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. Responsabilité</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Cotizpro ne peut être tenu responsable d&apos;erreurs de calcul, d&apos;une
          interruption de service, ou d&apos;un préjudice financier résultant de
          l&apos;utilisation de l&apos;application. Les taux de cotisation affichés sont
          basés sur la réglementation en vigueur au moment du développement et peuvent ne
          pas refléter les dernières évolutions législatives.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">6. Résiliation</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Vous pouvez résilier votre compte à tout moment depuis les paramètres de
          l&apos;application. L&apos;éditeur se réserve le droit de suspendre un compte en
          cas d&apos;utilisation abusive.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">7. Droit applicable</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Les présentes CGU sont soumises au droit français. En cas de litige, les
          tribunaux compétents seront ceux du ressort du siège de l&apos;éditeur.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">8. Contact</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Pour toute question, retour, signalement de bug ou demande de suppression de
          compte, contactez-nous par email :{" "}
          <a
            href="mailto:contact@cotizpro.fr"
            className="text-primary underline underline-offset-4 hover:no-underline"
          >
            contact@cotizpro.fr
          </a>
          . Nous nous engageons à répondre dans un délai de 72 heures.
        </p>
      </section>

      <Separator />

      <BackButton label="← Retour" fallback={fallback} />
    </div>
  );
}
