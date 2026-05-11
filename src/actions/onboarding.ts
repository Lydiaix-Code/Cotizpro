"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OnboardingState {
  dismissed: boolean;
  graphiquesVisited: boolean;
}

// ─── getOnboardingState ──────────────────────────────────────────────────────

/**
 * Lit l'état d'onboarding depuis les métadonnées de l'utilisateur Supabase.
 * Aucune table supplémentaire — stocké dans auth.users.raw_user_meta_data.
 */
export async function getOnboardingState(): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { dismissed: false, graphiquesVisited: false };

  const meta = user.user_metadata ?? {};
  return {
    dismissed: meta.onboarding_dismissed === true,
    graphiquesVisited: meta.graphiques_visited === true,
  };
}

// ─── dismissOnboarding ───────────────────────────────────────────────────────

/**
 * Marque le guide d'onboarding comme masqué pour cet utilisateur.
 * Stocké dans les métadonnées utilisateur — persisté sur tous les appareils.
 */
export async function dismissOnboarding(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.auth.updateUser({
    data: { onboarding_dismissed: true },
  });
}

// ─── markGraphiquesVisited ───────────────────────────────────────────────────

/**
 * Marque la page graphiques comme visitée.
 * Stocké dans les métadonnées utilisateur — persisté sur tous les appareils.
 */
export async function markGraphiquesVisitedAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.auth.updateUser({
    data: { graphiques_visited: true },
  });
}
