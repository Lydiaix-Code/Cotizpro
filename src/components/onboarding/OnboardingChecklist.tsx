"use client";

import { dismissOnboarding } from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, X } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

interface Step {
  label: string;
  done: boolean;
  href?: string;
  cta?: string;
}

interface OnboardingChecklistProps {
  nbDeclarations: number;
  /** État initial lu côté serveur — source de vérité, synchronisé sur tous les appareils */
  initialDismissed: boolean;
  initialGraphiquesVisited: boolean;
}

export function OnboardingChecklist({
  nbDeclarations,
  initialDismissed,
  initialGraphiquesVisited,
}: OnboardingChecklistProps) {
  const [isPending, startTransition] = useTransition();

  // Le composant est invisible si déjà masqué côté serveur.
  // Le Server Component parent ne rendra pas ce composant si dismissed=true.
  if (initialDismissed) return null;

  function dismiss() {
    startTransition(async () => {
      await dismissOnboarding();
      // Sync localStorage comme cache pour éviter un flash au prochain chargement
      try {
        localStorage.setItem("Cotizpro_onboarding_dismissed", "1");
      } catch {
        // silencieux — mode privé ou SSR
      }
    });
  }

  const steps: Step[] = [
    {
      label: "Configurer votre profil",
      done: true,
    },
    {
      label: "Déclarer votre premier CA",
      done: nbDeclarations > 0,
      href: "/declaration",
      cta: "Déclarer maintenant →",
    },
    {
      label: "Découvrir vos graphiques",
      done: initialGraphiquesVisited,
      href: "/graphiques",
      cta: "Voir les graphiques →",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="border-primary/20 relative overflow-hidden">
      {/* Barre de progression */}
      <div className="bg-primary/5 absolute top-0 right-0 left-0 h-1">
        <div
          className="bg-primary h-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <CardHeader className="pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {allDone ? "Félicitations, vous êtes prêt 🎉" : "Démarrage rapide"}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {allDone
                ? "Vous avez complété toutes les étapes de démarrage."
                : `${completedCount} / ${steps.length} étapes complétées`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground h-7 w-7 shrink-0"
            onClick={dismiss}
            disabled={isPending}
            aria-label="Masquer le guide de démarrage"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            {step.done ? (
              <CheckCircle2 className="text-primary h-5 w-5 shrink-0" />
            ) : (
              <Circle className="text-muted-foreground/40 h-5 w-5 shrink-0" />
            )}
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span
                className={`text-sm ${step.done ? "text-muted-foreground line-through" : "text-foreground font-medium"}`}
              >
                {step.label}
              </span>
              {!step.done && step.href && step.cta && (
                <Link
                  href={step.href}
                  className="text-primary shrink-0 text-xs font-medium underline underline-offset-2"
                >
                  {step.cta}
                </Link>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
