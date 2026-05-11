import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";
import type { StatutAbonnement } from "@/types/database";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

// ── Constantes ──────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Validation UUID v4 — bloque tout user_id malformé venant des métadonnées Stripe
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

// Mapping statuts Stripe → notre enum statut_abonnement
function mapStatut(status: Stripe.Subscription["status"]): StatutAbonnement {
  switch (status) {
    case "active":
    case "trialing":
      return "actif";
    case "canceled":
      return "annule";
    case "incomplete_expired":
      return "expire";
    default:
      return "inactif";
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Crée ou met à jour l'enregistrement abonnement pour un utilisateur.
 * data.user_id doit venir des métadonnées Stripe (jamais du client).
 */
async function upsertAbonnement(
  userId: string,
  customerId: string,
  subscriptionId: string,
  statut: StatutAbonnement,
  periodeFin: Date | null
) {
  const supabase = createServiceClient();

  await supabase.from("abonnements").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      statut,
      periode_fin: periodeFin?.toISOString() ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

// Compatibilité avec les nouvelles versions de l'API Stripe
// où current_period_end peut ne pas être typé selon la version
function getPeriodEnd(sub: Stripe.Subscription): Date | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ts = (sub as any).current_period_end as number | undefined;
  return ts ? new Date(ts * 1000) : null;
}

// ── Handler principal ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET manquant");
    return new NextResponse("Configuration serveur manquante", { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return new NextResponse("Signature manquante", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch {
    return new NextResponse("Signature invalide", { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Nouveau checkout complété ──────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.user_id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!userId || !customerId || !subscriptionId || !isValidUUID(userId)) {
          console.error(
            "checkout.session.completed : métadonnées manquantes ou user_id invalide",
            session.id
          );
          break;
        }

        // Récupérer les détails de l'abonnement
        const sub = (await stripe.subscriptions.retrieve(
          subscriptionId
        )) as unknown as Stripe.Subscription;

        await upsertAbonnement(
          userId,
          customerId,
          subscriptionId,
          mapStatut(sub.status),
          getPeriodEnd(sub)
        );
        break;
      }

      // ── Abonnement mis à jour (renouvellement, changement de statut) ───────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        if (!userId || !isValidUUID(userId)) {
          console.error(
            "customer.subscription.updated : user_id manquant ou invalide",
            sub.id
          );
          break;
        }

        await upsertAbonnement(
          userId,
          customerId,
          sub.id,
          mapStatut(sub.status),
          getPeriodEnd(sub)
        );
        break;
      }

      // ── Abonnement résilié ────────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        if (!userId || !isValidUUID(userId)) {
          console.error(
            "customer.subscription.deleted : user_id manquant ou invalide",
            sub.id
          );
          break;
        }

        await upsertAbonnement(userId, customerId, sub.id, "annule", getPeriodEnd(sub));
        break;
      }

      default:
        // Ignorer les événements non gérés
        break;
    }
  } catch (err) {
    console.error("Erreur traitement webhook Stripe :", err);
    return new NextResponse("Erreur interne", { status: 500 });
  }

  return new NextResponse(null, { status: 200 });
}
