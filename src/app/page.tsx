import { JsonLd } from "@/components/analytics/JsonLd";
import { AppSlider } from "@/components/shared/AppSlider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Bell,
  Calculator,
  Check,
  ChevronDown,
  Crown,
  FileText,
  LayoutDashboard,
  LineChart,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://Cotizpro.vercel.app";

const FEATURES = [
  {
    icon: Calculator,
    title: "Calcul automatique URSSAF",
    description:
      "Cotisations calculées instantanément selon votre régime BIC ou BNC, avec ACRE et versement libératoire. Toujours à jour avec les taux officiels.",
  },
  {
    icon: TrendingUp,
    title: "Suivi du plafond en temps réel",
    description:
      "Visualisez votre progression vers le plafond annuel (77 700 € BIC services) et évitez les mauvaises surprises au moment de la déclaration.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard clair et intuitif",
    description:
      "CA mensuel, cotisations cumulées, revenu net estimé et prochaine échéance — tout en un coup d'œil sur votre tableau de bord.",
  },
  {
    icon: LineChart,
    title: "Graphiques d'analyse",
    description:
      "Suivez l'évolution de votre activité mois par mois, comparez CA et cotisations, et identifiez vos meilleurs mois.",
  },
  {
    icon: Bell,
    title: "Rappels avant échéances",
    description:
      "Recevez un email de rappel avant chaque date limite de déclaration URSSAF, mensuelle ou trimestrielle. Ne manquez plus jamais une deadline.",
  },
  {
    icon: FileText,
    title: "Récapitulatif fiscal 2042-C-PRO",
    description:
      "Retrouvez automatiquement les cases à reporter sur votre déclaration d'impôts : 5KO, 5KP, 5HQ selon votre régime. Plus besoin de chercher dans la notice officielle.",
  },
  {
    icon: Shield,
    title: "Données sécurisées & privées",
    description:
      "Vos données sont isolées par Row Level Security, stockées en Europe. Aucun tiers n'y accède. Conformité RGPD garantie.",
  },
] as const;

const PRICING_FREE = [
  "Saisie du CA mensuel",
  "Calcul des cotisations URSSAF",
  "Simulateur de cotisations",
  "Import CSV de déclarations passées",
  "Tableau de bord & graphiques",
  "Export CSV",
  "Historique année en cours",
];

const PRICING_PREMIUM = [
  "Tout le plan Gratuit",
  "Export PDF récapitulatif annuel",
  "Récapitulatif fiscal 2042-C-PRO",
  "Historique toutes les années",
  "Alertes email avant échéances",
  "Multi-activités (jusqu'à 5)",
  "Import CSV vers activité secondaire",
  "Filtres par activité sur graphiques",
  "Support prioritaire",
];

const FAQ = [
  {
    q: "Comment sont calculées mes cotisations URSSAF ?",
    a: "Cotizpro applique les taux officiels URSSAF 2026 selon votre régime (BIC marchandises, BIC services, BNC) et votre situation (ACRE première année, versement libératoire de l'impôt). Les calculs sont mis à jour à chaque changement de réglementation.",
  },
  {
    q: "Dois-je encore déclarer sur le site de l'URSSAF ?",
    a: "Oui — Cotizpro est un outil de suivi et de simulation, pas un outil de déclaration officielle. Vous devez toujours déclarer votre CA sur autoentrepreneur.urssaf.fr. Cotizpro vous aide à anticiper et vérifier vos montants.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui. Chaque compte est isolé grâce au Row Level Security (RLS) de Supabase. Vos données financières ne sont jamais accessibles par d'autres utilisateurs ni par des tiers. Elles sont stockées en Europe (région Paris).",
  },
  {
    q: "Qu'est-ce que l'ACRE et comment ça affecte mes cotisations ?",
    a: "L'ACRE (Aide à la Création ou Reprise d'Entreprise) permet une exonération partielle de cotisations pendant la 1ère année. Cotizpro détecte automatiquement votre éligibilité et applique le bon taux réduit.",
  },
  {
    q: "Puis-je utiliser Cotizpro si j'ai plusieurs activités ?",
    a: "Oui avec le plan Premium. Vous pouvez gérer jusqu'à 5 activités avec des régimes différents (ex : BIC marchandises + BNC libéral) et obtenir un récapitulatif consolidé.",
  },
  {
    q: "Comment annuler mon abonnement Premium ?",
    a: "À tout moment depuis Paramètres → Abonnement → Gérer. L'annulation est instantanée et vous conservez l'accès Premium jusqu'à la fin de la période payée. Aucun engagement.",
  },
];

async function getMemberCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    if (!count) return 0;
    // Arrondi à la dizaine inférieure pour ne pas afficher "3 membres"
    return Math.max(0, Math.floor(count / 10) * 10);
  } catch {
    return 0;
  }
}

export default async function LandingPage() {
  const memberCount = await getMemberCount();

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cotizpro",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: APP_URL,
    description:
      "Calculez et suivez vos cotisations URSSAF en temps réel. Outil simple et précis pour auto-entrepreneurs français.",
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
        name: "Gratuit",
      },
      {
        "@type": "Offer",
        price: "4.99",
        priceCurrency: "EUR",
        name: "Premium",
        billingIncrement: "P1M",
      },
    ],
    inLanguage: "fr",
    audience: {
      "@type": "Audience",
      audienceType: "Auto-entrepreneurs français",
    },
  } as const;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  } as const;

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <JsonLd data={softwareSchema} />
      <JsonLd data={faqSchema} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-border bg-background/80 sticky top-0 z-40 flex h-14 items-center justify-between border-b px-6 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="Cotizpro"
            width={28}
            height={28}
            className="rounded-lg"
          />
          <span className="text-sm font-semibold tracking-tight">Cotizpro</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.login}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Se connecter
          </Link>
          <Link href={ROUTES.register} className={cn(buttonVariants({ size: "sm" }))}>
            Essayer gratuitement
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pt-20 pb-0 text-center">
          {/* Gradient background glow */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% -10%, hsl(var(--primary)/0.15), transparent)",
            }}
          />

          <div className="mx-auto max-w-3xl">
            <Badge variant="secondary" className="mb-6 text-xs">
              Pour auto-entrepreneurs français · Gratuit pour commencer
            </Badge>
            <h1 className="text-foreground mb-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Maîtrisez vos cotisations <span className="text-primary">URSSAF</span> sans
              les subir
            </h1>
            <p className="text-muted-foreground mx-auto mb-8 max-w-xl text-base leading-relaxed sm:text-lg">
              Cotizpro calcule vos cotisations automatiquement, suit votre CA en temps
              réel et vous alerte avant chaque échéance. Fini les mauvaises surprises.
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href={ROUTES.register} className={cn(buttonVariants({ size: "lg" }))}>
                Commencer gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href={ROUTES.login}
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              >
                Se connecter
              </Link>
            </div>

            <p className="text-muted-foreground mt-4 text-xs">
              Gratuit · Aucune carte bancaire · Données stockées en Europe
            </p>

            {memberCount >= 10 && (
              <div className="border-border bg-muted/50 mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5">
                <Users className="text-primary h-3.5 w-3.5" />
                <p className="text-muted-foreground text-sm">
                  Rejoint par{" "}
                  <span className="text-foreground font-semibold">
                    {memberCount}+ auto-entrepreneurs
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* ── Screenshots slider ─────────────────────────────────────────── */}
          <div className="mx-auto mt-14 max-w-5xl px-2">
            <AppSlider />
          </div>
        </section>

        {/* ── Séparateur stat ──────────────────────────────────────────────── */}
        <section className="border-border bg-muted/30 mt-12 border-y px-6 py-10">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-6 text-center sm:grid-cols-4">
            {[
              { value: "100%", label: "Gratuit au démarrage" },
              { value: "0 €", label: "Sans CB requise" },
              { value: "RGPD", label: "Données en Europe" },
              { value: "2026", label: "Taux URSSAF à jour" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-primary text-2xl font-bold">{stat.value}</p>
                <p className="text-muted-foreground mt-1 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section className="px-6 py-20" id="fonctionnalites">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                Tout ce qu&apos;il vous faut pour gérer votre activité
              </h2>
              <p className="text-muted-foreground mt-3 text-sm sm:text-base">
                Un outil pensé pour les auto-entrepreneurs — simple, précis, sécurisé.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="border-border bg-card rounded-xl border p-6 transition-shadow hover:shadow-md"
                  >
                    <div className="bg-primary/10 mb-4 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Icon className="text-primary h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-sm font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Comment ça marche ────────────────────────────────────────────── */}
        <section
          className="border-border bg-muted/20 border-t px-6 py-20"
          id="comment-ca-marche"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-foreground mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Opérationnel en 3 minutes
            </h2>
            <p className="text-muted-foreground mb-12 text-sm sm:text-base">
              Pas de configuration complexe. Pas de comptable requis.
            </p>
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Créez votre compte",
                  desc: "Inscription gratuite, aucune carte bancaire. Choisissez votre régime (BIC/BNC) et votre situation (ACRE, versement libératoire).",
                },
                {
                  step: "2",
                  title: "Déclarez votre CA",
                  desc: "Saisissez votre chiffre d'affaires mensuel. Cotizpro calcule immédiatement vos cotisations URSSAF exactes.",
                },
                {
                  step: "3",
                  title: "Suivez en temps réel",
                  desc: "Tableau de bord, graphiques, progression vers le plafond, prochaine échéance — tout est là, mis à jour automatiquement.",
                },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center">
                  <div className="bg-primary text-primary-foreground mb-4 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-sm font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <section className="border-border border-t px-6 py-20" id="tarifs">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                Tarifs simples et transparents
              </h2>
              <p className="text-muted-foreground mt-3 text-sm sm:text-base">
                Commencez gratuitement, passez Premium quand vous en avez besoin. Sans
                engagement.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Gratuit */}
              <div className="border-border bg-card rounded-xl border p-7">
                <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-widest uppercase">
                  Gratuit
                </p>
                <p className="mb-1 text-4xl font-bold">0 €</p>
                <p className="text-muted-foreground mb-7 text-xs">Pour toujours</p>
                <ul className="mb-8 space-y-3">
                  {PRICING_FREE.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm">
                      <Check className="text-primary h-4 w-4 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={ROUTES.register}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-center"
                  )}
                >
                  Commencer gratuitement
                </Link>
              </div>

              {/* Premium */}
              <div className="border-primary bg-card relative rounded-xl border-2 p-7">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1 text-xs">
                  <Crown className="h-3 w-3" /> Recommandé
                </Badge>
                <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-widest uppercase">
                  Premium
                </p>
                <p className="mb-1 text-4xl font-bold">
                  4,99 €
                  <span className="text-muted-foreground text-base font-normal">
                    /mois
                  </span>
                </p>
                <p className="text-muted-foreground mb-7 text-xs">
                  ou 39,99 €/an — économisez 33 %
                </p>
                <ul className="mb-8 space-y-3">
                  {PRICING_PREMIUM.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm">
                      <Check className="text-primary h-4 w-4 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={ROUTES.register}
                  className={cn(buttonVariants(), "w-full justify-center")}
                >
                  Essayer gratuitement
                </Link>
                <p className="text-muted-foreground mt-3 text-center text-xs">
                  Annulation à tout moment
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="border-border bg-muted/20 border-t px-6 py-20" id="faq">
          <div className="mx-auto max-w-2xl">
            <div className="mb-12 text-center">
              <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                Questions fréquentes
              </h2>
              <p className="text-muted-foreground mt-3 text-sm sm:text-base">
                Tout ce que vous devez savoir sur Cotizpro et les cotisations URSSAF.
              </p>
            </div>
            <div className="space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="border-border bg-card group rounded-xl border"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {item.q}
                    </span>
                    <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="text-muted-foreground border-border border-t px-5 py-4 text-sm leading-relaxed">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA final ────────────────────────────────────────────────────── */}
        <section className="border-border border-t px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="bg-primary/10 mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl">
              <FileText className="text-primary h-7 w-7" />
            </div>
            <h2 className="text-foreground mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Prêt à reprendre le contrôle de votre activité ?
            </h2>
            <p className="text-muted-foreground mb-8 text-sm sm:text-base">
              Rejoignez des centaines d&apos;auto-entrepreneurs qui suivent leurs
              cotisations URSSAF sereinement avec Cotizpro.
            </p>
            <Link href={ROUTES.register} className={cn(buttonVariants({ size: "lg" }))}>
              Créer mon compte gratuitement
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <p className="text-muted-foreground mt-4 text-xs">
              Gratuit · Sans carte bancaire · Données en Europe
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-border border-t px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="Cotizpro"
              width={22}
              height={22}
              className="rounded-md"
            />
            <span className="text-sm font-semibold">Cotizpro</span>
          </div>
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} Cotizpro · Outil de suivi URSSAF pour
            auto-entrepreneurs français
          </p>
          <nav className="flex gap-5">
            <Link
              href="/mentions-legales"
              className="text-muted-foreground text-xs underline-offset-4 hover:underline"
            >
              Mentions légales
            </Link>
            <Link
              href="/cgu"
              className="text-muted-foreground text-xs underline-offset-4 hover:underline"
            >
              CGU
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
