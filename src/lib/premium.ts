import { createClient } from "@/lib/supabase/server";

/**
 * Vérifie si l'utilisateur connecté a un abonnement Premium actif.
 * À appeler côté serveur UNIQUEMENT (Server Components, Server Actions, Route Handlers).
 */
export async function getIsPremium(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("abonnements")
    .select("statut, periode_fin")
    .eq("user_id", user.id)
    .single();

  if (!data) return false;
  if (data.statut !== "actif") return false;

  // Vérifie que la période n'est pas expirée (double vérification côté app)
  if (data.periode_fin && new Date(data.periode_fin) < new Date()) return false;

  return true;
}
