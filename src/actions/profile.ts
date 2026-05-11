"use server";

import { getIsPremium } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export type ProfileActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Crée ou met à jour le profil de l'utilisateur connecté.
 * - Validation Zod côté serveur
 * - user_id forcé depuis la session (jamais depuis le client)
 * - Compatible useActionState
 */
export async function upsertProfile(
  _prevState: ProfileActionResult,
  formData: FormData
): Promise<ProfileActionResult> {
  const supabase = await createClient();

  // Vérification session — user_id toujours issu du token, jamais du client
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Session expirée, veuillez vous reconnecter." };
  }

  // Validation Zod
  const raw = {
    regime: formData.get("regime"),
    date_debut_activite: formData.get("date_debut_activite"),
    acre: formData.get("acre") === "true",
    versement_liberatoire: formData.get("versement_liberatoire") === "true",
    notifications_email: formData.get("notifications_email") === "true",
    frequence_declaration: formData.get("frequence_declaration"),
  };

  const parsed = profileSchema.safeParse(raw);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
    return { success: false, error: firstError };
  }

  const { data } = parsed;

  // Sécurité : les rappels email sont réservés aux Premium
  const isPremium = await getIsPremium();
  if (!isPremium && data.notifications_email) {
    data.notifications_email = false;
  }

  // Vérifier que la date n'est pas dans le futur
  const dateDebut = new Date(data.date_debut_activite);
  if (dateDebut > new Date()) {
    return { success: false, error: "La date de début ne peut pas être dans le futur." };
  }

  // Upsert — ON CONFLICT sur user_id met à jour
  const { error: dbError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id, // Toujours issu du token serveur
      regime: data.regime,
      date_debut_activite: data.date_debut_activite,
      acre: data.acre,
      versement_liberatoire: data.versement_liberatoire,
      notifications_email: data.notifications_email,
      frequence_declaration: data.frequence_declaration,
    },
    { onConflict: "user_id" }
  );

  if (dbError) {
    console.error("[upsertProfile]", dbError.code, dbError.message);
    return { success: false, error: "Erreur lors de la sauvegarde. Réessayez." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/parametres");

  return { success: true };
}

/**
 * Récupère le profil de l'utilisateur connecté.
 * Retourne null si aucun profil (onboarding nécessaire).
 */
export async function getProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) return null;

  return data;
}
