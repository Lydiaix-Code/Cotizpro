import { BackButton } from "@/components/shared/BackButton";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Mentions légales | Cotizpro",
  description: "Mentions légales de l'application Cotizpro.",
};

export default async function MentionsLegalesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const fallback = user ? "/dashboard" : "/";

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mentions légales</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Dernière mise à jour : avril 2026
        </p>
      </div>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Éditeur</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          L&apos;application Cotizpro est éditée à titre personnel. Pour toute question,
          signalement ou prise de contact, vous pouvez écrire à :{" "}
          <a
            href="mailto:contact@cotizpro.fr"
            className="text-primary underline underline-offset-4 hover:no-underline"
          >
            contact@cotizpro.fr
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Hébergement</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          L&apos;application est hébergée sur <strong>Vercel Inc.</strong> (440 N Barranca
          Ave #4133, Covina, CA 91723, USA) et la base de données sur{" "}
          <strong>Supabase Inc.</strong>. Les données sont stockées en Europe (région{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">eu-west-1</code>).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Propriété intellectuelle</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          L&apos;ensemble des contenus de ce site (textes, graphismes, interface) est
          protégé par le droit d&apos;auteur français. Toute reproduction totale ou
          partielle est interdite sans autorisation préalable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Données personnelles & RGPD</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Cotizpro collecte uniquement les données nécessaires au fonctionnement du
          service (adresse e-mail, données d&apos;activité auto-entrepreneur). Ces données
          ne sont en aucun cas revendues à des tiers. Conformément au RGPD, vous disposez
          d&apos;un droit d&apos;accès, de rectification et de suppression de vos données.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Cookies</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Cotizpro utilise uniquement des cookies de session nécessaires à
          l&apos;authentification (Supabase Auth). Aucun cookie de tracking ou
          publicitaire n&apos;est utilisé.
        </p>
      </section>

      <Separator />

      <BackButton label="← Retour" fallback={fallback} />
    </div>
  );
}
