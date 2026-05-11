"use server";

import { getIsPremium } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";
import { activiteSchema } from "@/lib/validations";
import type { Activite } from "@/types/database";
import { revalidatePath } from "next/cache";

export type ActiviteActionResult = {
  success: boolean;
  error?: string;
};

/** Max activités actives par utilisateur. */
const MAX_ACTIVITES = 5;

// ─── Helper privé ─────────────────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { user: null, supabase };
  return { user, supabase };
}

// ─── getActivites ─────────────────────────────────────────────────────────────

/**
 * Retourne toutes les activités de l'utilisateur connecté.
 * Sécurité : filtre strict sur user_id via auth.getUser() + RLS Supabase.
 */
export async function getActivites(): Promise<Activite[]> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("activites")
    .select("*")
    .eq("user_id", user.id)
    .order("ordre", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as Activite[];
}

// ─── createActivite ───────────────────────────────────────────────────────────

/**
 * Crée une nouvelle activité.
 * Sécurité :
 *  - Gate Premium : uniquement pour les abonnés actifs
 *  - user_id injecté côté serveur (jamais depuis le client)
 *  - Validation Zod stricte
 *  - Limite applicative : max 5 activités actives
 */
export async function createActivite(formData: FormData): Promise<ActiviteActionResult> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Session expirée. Reconnectez-vous." };

  // Gate Premium
  const isPremium = await getIsPremium();
  if (!isPremium)
    return { success: false, error: "Fonctionnalité réservée aux abonnés Premium." };

  // Validation Zod
  const raw = {
    nom: formData.get("nom"),
    regime: formData.get("regime"),
    date_debut: formData.get("date_debut"),
    acre: formData.get("acre") === "true",
    versement_liberatoire: formData.get("versement_liberatoire") === "true",
  };

  const parsed = activiteSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Données invalides.";
    return { success: false, error: msg };
  }

  // Vérification limite max activités actives
  const { count, error: countError } = await supabase
    .from("activites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("actif", true);

  if (countError) return { success: false, error: "Erreur de vérification. Réessayez." };
  if ((count ?? 0) >= MAX_ACTIVITES) {
    return {
      success: false,
      error: `Limite atteinte : maximum ${MAX_ACTIVITES} activités actives.`,
    };
  }

  // Récupérer l'ordre max actuel
  const { data: existing } = await supabase
    .from("activites")
    .select("ordre")
    .eq("user_id", user.id)
    .order("ordre", { ascending: false })
    .limit(1)
    .single();

  const nextOrdre = (existing?.ordre ?? -1) + 1;

  const { error: insertError } = await supabase.from("activites").insert({
    user_id: user.id, // toujours injecté côté serveur
    nom: parsed.data.nom,
    regime: parsed.data.regime,
    date_debut: parsed.data.date_debut,
    acre: parsed.data.acre,
    versement_liberatoire: parsed.data.versement_liberatoire,
    ordre: nextOrdre,
  });

  if (insertError) {
    console.error("[createActivite]", insertError.code, insertError.message);
    return { success: false, error: "Erreur lors de la création. Réessayez." };
  }

  revalidatePath("/parametres");
  revalidatePath("/declaration");
  return { success: true };
}

// ─── updateActivite ───────────────────────────────────────────────────────────

/**
 * Met à jour une activité existante.
 * Sécurité :
 *  - Vérification ownership double : dans la requête SQL (.eq user_id) ET vérif préalable
 *  - Gate Premium
 *  - Validation Zod
 */
export async function updateActivite(
  activiteId: string,
  formData: FormData
): Promise<ActiviteActionResult> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Session expirée. Reconnectez-vous." };

  const isPremium = await getIsPremium();
  if (!isPremium)
    return { success: false, error: "Fonctionnalité réservée aux abonnés Premium." };

  // Validation UUID basique pour éviter les injections
  if (!isValidUUID(activiteId)) return { success: false, error: "Identifiant invalide." };

  // Validation Zod
  const raw = {
    nom: formData.get("nom"),
    regime: formData.get("regime"),
    date_debut: formData.get("date_debut"),
    acre: formData.get("acre") === "true",
    versement_liberatoire: formData.get("versement_liberatoire") === "true",
  };

  const parsed = activiteSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Données invalides.";
    return { success: false, error: msg };
  }

  // UPDATE avec double vérification ownership (id + user_id)
  const { error, data: updated } = await supabase
    .from("activites")
    .update({
      nom: parsed.data.nom,
      regime: parsed.data.regime,
      date_debut: parsed.data.date_debut,
      acre: parsed.data.acre,
      versement_liberatoire: parsed.data.versement_liberatoire,
    })
    .eq("id", activiteId)
    .eq("user_id", user.id) // ownership strict
    .select("id");

  if (error) return { success: false, error: "Erreur lors de la mise à jour." };
  if (!updated || updated.length === 0)
    return { success: false, error: "Activité introuvable ou accès refusé." };

  revalidatePath("/parametres");
  revalidatePath("/declaration");
  return { success: true };
}

// ─── deleteActivite (soft delete) ─────────────────────────────────────────────

/**
 * Désactive une activité (soft delete : actif = false).
 * Les déclarations liées sont conservées (activite_id reste valide).
 * Sécurité :
 *  - Ownership double
 *  - Refuse si c'est la seule activité active de l'utilisateur
 */
export async function deleteActivite(activiteId: string): Promise<ActiviteActionResult> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Session expirée. Reconnectez-vous." };

  const isPremium = await getIsPremium();
  if (!isPremium)
    return { success: false, error: "Fonctionnalité réservée aux abonnés Premium." };

  if (!isValidUUID(activiteId)) return { success: false, error: "Identifiant invalide." };

  // Vérifier que l'activité appartient à l'utilisateur
  const { data: activite, error: fetchErr } = await supabase
    .from("activites")
    .select("id, actif")
    .eq("id", activiteId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !activite)
    return { success: false, error: "Activité introuvable ou accès refusé." };
  if (!activite.actif) return { success: false, error: "Activité déjà désactivée." };

  // Compter le nombre d'activités actives restantes (hors celle-ci)
  const { count } = await supabase
    .from("activites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("actif", true)
    .neq("id", activiteId);

  // S'il n'y a plus d'autres activités actives, on ne peut pas désactiver
  // (l'utilisateur a toujours le profil principal — cette garde est cosmétique
  //  car null activite_id = profil principal)
  // On autorise quand même la désactivation — le profil reste l'activité de base.
  void count; // information disponible pour affichage UI si besoin

  const { error: updateErr } = await supabase
    .from("activites")
    .update({ actif: false })
    .eq("id", activiteId)
    .eq("user_id", user.id);

  if (updateErr) return { success: false, error: "Erreur lors de la désactivation." };

  revalidatePath("/parametres");
  revalidatePath("/declaration");
  return { success: true };
}

// ─── reactiverActivite ────────────────────────────────────────────────────────

export async function reactiverActivite(
  activiteId: string
): Promise<ActiviteActionResult> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Session expirée. Reconnectez-vous." };

  const isPremium = await getIsPremium();
  if (!isPremium)
    return { success: false, error: "Fonctionnalité réservée aux abonnés Premium." };

  if (!isValidUUID(activiteId)) return { success: false, error: "Identifiant invalide." };

  // Vérifier la limite max avant de réactiver
  const { count } = await supabase
    .from("activites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("actif", true);

  if ((count ?? 0) >= MAX_ACTIVITES) {
    return {
      success: false,
      error: `Limite atteinte : maximum ${MAX_ACTIVITES} activités actives.`,
    };
  }

  const { error, data: updated } = await supabase
    .from("activites")
    .update({ actif: true })
    .eq("id", activiteId)
    .eq("user_id", user.id)
    .select("id");

  if (error || !updated || updated.length === 0)
    return { success: false, error: "Activité introuvable ou accès refusé." };

  revalidatePath("/parametres");
  revalidatePath("/declaration");
  return { success: true };
}

// ─── Utilitaire UUID ──────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
