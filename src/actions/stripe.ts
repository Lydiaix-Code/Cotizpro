"use server";

import { APP_CONFIG, STRIPE_CONFIG } from "@/config";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Crée une session Stripe Checkout pour l'abonnement Premium.
 * Redirige automatiquement vers l'URL Stripe en cas de succès.
 */
export async function createCheckoutSession(
  priceId: string
): Promise<{ error?: string }> {
  // Validation — n'accepter que les price IDs connus (protection whitelist)
  const allowedPriceIds = [
    STRIPE_CONFIG.priceIdMensuel,
    STRIPE_CONFIG.priceIdAnnuel,
  ].filter(Boolean);

  if (!priceId || !allowedPriceIds.includes(priceId)) {
    return { error: "Offre invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: "Non authentifié." };

  // Récupère le customer Stripe existant (si déjà abonné par le passé)
  const { data: abonnement } = await supabase
    .from("abonnements")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  let sessionUrl: string;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(abonnement?.stripe_customer_id
        ? { customer: abonnement.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_CONFIG.url}/premium?success=1`,
      cancel_url: `${APP_CONFIG.url}/premium`,
      // user_id stocké dans les métadonnées pour le webhook
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
    });

    if (!session.url) return { error: "Impossible de créer la session de paiement." };
    sessionUrl = session.url;
  } catch {
    return { error: "Erreur lors de la création de la session Stripe." };
  }

  // redirect() doit être appelé en dehors du try/catch
  redirect(sessionUrl);
}

/**
 * Crée une session Stripe Billing Portal pour gérer l'abonnement.
 * Redirige vers le portail Stripe pour annulation / mise à jour CB.
 */
export async function createPortalSession(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: "Non authentifié." };

  const { data: abonnement } = await supabase
    .from("abonnements")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!abonnement?.stripe_customer_id) {
    return { error: "Aucun abonnement trouvé." };
  }

  let portalUrl: string;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: abonnement.stripe_customer_id,
      return_url: `${APP_CONFIG.url}/parametres`,
    });
    portalUrl = session.url;
  } catch {
    return { error: "Erreur lors de la création du portail de gestion." };
  }

  redirect(portalUrl);
}
