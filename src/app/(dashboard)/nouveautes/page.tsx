import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type NouveauteType = "feature" | "improvement" | "fix" | "security";

interface Release {
  version: string;
  date: string;
  items: {
    type: NouveauteType;
    title: string;
    description: string;
  }[];
}

// ─── Badge config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NouveauteType, { label: string; bg: string }> = {
  feature: { label: "Nouveau", bg: "#2563eb" },
  improvement: { label: "Amélioration", bg: "#059669" },
  fix: { label: "Correction", bg: "#d97706" },
  security: { label: "Sécurité", bg: "#7c3aed" },
};

// ─── Changelog ────────────────────────────────────────────────────────────────

const RELEASES: Release[] = [
  {
    version: "1.0.5",
    date: "Avril 2026",
    items: [
      {
        type: "feature",
        title: "Comparaison des 3 régimes dans le simulateur",
        description:
          "Après chaque simulation, un tableau compare automatiquement les 3 régimes fiscaux (BIC marchandises, BIC services, BNC) pour le même CA. Le meilleur revenu net est mis en évidence pour vous aider à choisir ou valider votre régime.",
      },
      {
        type: "improvement",
        title: "PWA — support offline amélioré",
        description:
          "Un Service Worker est désormais actif pour assurer un meilleur support hors ligne : les assets statiques sont mis en cache et une page dédiée s'affiche si vous perdez la connexion.",
      },
      {
        type: "improvement",
        title: "Navigation adaptée au plan",
        description:
          "Le menu \"Fiscal 2042-C\" est désormais masqué pour les comptes Gratuit et réapparaît automatiquement dès l'activation d'un abonnement Premium.",
      },
      {
        type: "feature",
        title: "Notifications push PWA",
        description:
          "Recevez des alertes URSSAF directement sur votre appareil, même lorsque l'application est fermée : mois non déclaré, plafond CA proche, période de déclaration d'impôts. L'activation se fait dans les Paramètres.",
      },
      {
        type: "fix",
        title: "Badge notifications remis à zéro à l'ouverture",
        description:
          "Le compteur de la cloche de notifications disparaît dès l'ouverture du panneau. Il réapparaît uniquement si de nouvelles alertes se déclenchent.",
      },
      {
        type: "fix",
        title: 'Lien "Déclaration d\'impôts" adapté au plan',
        description:
          "La notification de période de déclaration d'impôts redirige désormais vers la page Premium pour les membres Gratuit, au lieu d'afficher une page bloquée.",
      },
    ],
  },
  {
    version: "1.0.4",
    date: "Avril 2026",
    items: [
      {
        type: "feature",
        title: "Récapitulatif fiscal 2042-C-PRO",
        description:
          "Retrouvez automatiquement les cases à reporter sur votre déclaration d'impôts : 5KO, 5KP ou 5HQ selon votre régime, 5TA/5TB/5TE si vous avez opté pour le versement libératoire. Groupé par activité. Fonctionnalité réservée aux membres Premium.",
      },
      {
        type: "feature",
        title: "Notifications in-app",
        description:
          "Une cloche dans la barre latérale signale les alertes importantes : mois non déclaré, plafond CA proche (80 %, 90 %, dépassement), ACRE expirant dans 30 jours, période de déclaration d'impôts ouverte.",
      },
      {
        type: "improvement",
        title: "Empty state actionnable sur les déclarations",
        description:
          "Quand aucune déclaration n'est saisie, un bouton direct « Déclarer mon CA » apparaît dans le tableau pour guider l'utilisateur immédiatement.",
      },
      {
        type: "improvement",
        title: "Suppression optimiste des déclarations",
        description:
          "La suppression d'une déclaration s'affiche instantanément sans attendre la réponse serveur, grâce au hook useOptimistic de React 19.",
      },
      {
        type: "improvement",
        title: "Offre annuelle Premium mise en avant",
        description:
          "L'abonnement annuel (39,99 €/an) est maintenant affiché en premier avec un badge « Économisez 20 € » pour rendre l'avantage immédiatement visible.",
      },
      {
        type: "improvement",
        title: "Navigation mobile redessinée",
        description:
          "Le drawer mobile est plus large (288 px), les cibles tactiles sont agrandies, et les éléments secondaires (Notifications, Premium, Paramètres, Déconnexion) sont regroupés dans une section fixe en bas — séparée de la navigation principale qui devient scrollable.",
      },
      {
        type: "fix",
        title: "Checklist démarrage rapide cross-device",
        description:
          "L'état de la checklist (guide masqué, étape « Graphiques » complétée) est maintenant persisté dans les métadonnées Supabase de l'utilisateur. Fermer le guide sur mobile le ferme également sur desktop, et inversement.",
      },
      {
        type: "feature",
        title: "Simulateur de cotisations",
        description:
          "Testez différents scénarios de CA sans affecter vos vraies déclarations. Visualisez l'impact de l'ACRE et du versement libératoire en temps réel.",
      },
      {
        type: "feature",
        title: "Import CSV multi-activités",
        description:
          "Importez des déclarations passées depuis un fichier CSV. Les membres Premium peuvent associer l'import à une activité secondaire spécifique.",
      },
      {
        type: "feature",
        title: "Application installable (PWA)",
        description:
          "Cotizpro est désormais installable sur votre téléphone et votre ordinateur pour un accès rapide depuis l'écran d'accueil.",
      },
      {
        type: "improvement",
        title: "Graphique CA N-1",
        description:
          "Le graphique de chiffre d'affaires affiche maintenant une courbe de l'année précédente pour comparer votre progression.",
      },
      {
        type: "security",
        title: "Protection des activités secondaires",
        description:
          "Les activités secondaires sont désormais masquées sur toutes les pages (déclarations, graphiques, historique, CSV) pour les utilisateurs sans abonnement Premium actif.",
      },
    ],
  },
  {
    version: "1.0.3",
    date: "Mars 2026",
    items: [
      {
        type: "security",
        title: "Protection des activités secondaires",
        description:
          "Les activités secondaires sont masquées sur toutes les pages (déclarations, graphiques, historique, CSV) pour les utilisateurs sans abonnement Premium actif.",
      },
      {
        type: "feature",
        title: "Logo SVG éclair",
        description:
          "Nouveau logo SVG éclair sur le favicon, les headers de l'application, les emails et la landing page.",
      },
      {
        type: "fix",
        title: "Corrections UI — dialogs d'activités",
        description:
          "Correction du chevauchement des Select dans les dialogs d'activités (z-index, position popper, scrollable). Bouton fermeture de la bannière Premium repositionné correctement.",
      },
    ],
  },
  {
    version: "1.0.2",
    date: "Mars 2026",
    items: [
      {
        type: "feature",
        title: "Support multi-activités",
        description:
          "Gérez plusieurs activités avec des régimes et taux distincts. Chaque activité peut avoir son propre régime (BIC/BNC/BISA), paramètre ACRE et versement libératoire. Fonctionnalité réservée aux membres Premium.",
      },
      {
        type: "feature",
        title: "Double authentification (MFA)",
        description:
          "Sécurisez votre compte avec un code TOTP (Google Authenticator, Authy…) ou des codes de secours à usage unique.",
      },
      {
        type: "feature",
        title: "Rappels email URSSAF automatiques",
        description:
          "Une tâche planifiée (pg_cron + Supabase Edge Function) envoie un email de rappel le 25 de chaque mois si vous n'avez pas encore déclaré votre CA.",
      },
      {
        type: "feature",
        title: "Compteur de membres en direct",
        description:
          "La page d'accueil affiche le nombre d'utilisateurs inscrits en temps réel pour renforcer la confiance.",
      },
      {
        type: "improvement",
        title: "Projection fin d'année",
        description:
          "Le tableau de bord indique le CA prévisionnel à fin décembre basé sur votre rythme mensuel actuel.",
      },
      {
        type: "improvement",
        title: "Logo SVG éclair",
        description:
          "Nouveau logo SVG éclair sur le favicon, les headers de l'application, les emails et la landing page.",
      },
      {
        type: "improvement",
        title: "SEO — pages légales et sitemap",
        description:
          "Pages CGU et mentions légales accessibles sans connexion et indexables. Sitemap.xml et robots.txt configurés pour les moteurs de recherche.",
      },
    ],
  },
  {
    version: "1.0.1",
    date: "Février 2026",
    items: [
      {
        type: "feature",
        title: "Analytics GA4 + bannière CNIL",
        description:
          "Suivi des visites via Google Analytics 4 avec bannière de consentement conforme au RGPD/CNIL.",
      },
      {
        type: "feature",
        title: "Email d'onboarding automatique",
        description:
          "Un email de bienvenue est envoyé à chaque nouvel inscrit avec les premières étapes pour configurer son profil.",
      },
      {
        type: "feature",
        title: "Export CSV",
        description:
          "Exportez l'ensemble de vos déclarations et cotisations au format CSV pour votre comptabilité.",
      },
      {
        type: "feature",
        title: "Historique annuel",
        description:
          "Consultez et filtrez toutes vos déclarations par année avec un résumé des totaux CA et cotisations.",
      },
      {
        type: "fix",
        title: "Calcul ACRE corrigé",
        description:
          "Correction du calcul du taux ACRE sur la période d'exonération. Les cotisations sont maintenant précises selon votre date de début d'activité.",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "Janvier 2026",
    items: [
      {
        type: "feature",
        title: "Lancement de Cotizpro 🚀",
        description:
          "Saisie mensuelle du CA, calcul automatique des cotisations URSSAF (BIC, BNC, BISA), tableau de bord avec graphiques de suivi, alerte mois non déclaré. Disponible gratuitement.",
      },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChangelogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Changelog"
        description="Les dernières fonctionnalités et améliorations de Cotizpro."
      />

      <div className="max-w-2xl space-y-8">
        {RELEASES.map((release) => (
          <section key={release.version} className="space-y-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-base font-semibold">v{release.version}</h2>
              <span className="text-muted-foreground text-sm">{release.date}</span>
            </div>

            <Card>
              <CardContent className="divide-border divide-y p-0">
                {release.items.map((item, idx) => {
                  const config = TYPE_CONFIG[item.type];
                  return (
                    <div key={idx} className="flex gap-4 px-5 py-4">
                      <div className="mt-0.5 w-28 shrink-0">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] leading-tight font-semibold whitespace-nowrap text-white"
                          )}
                          style={{ backgroundColor: config.bg }}
                        >
                          {config.label}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
