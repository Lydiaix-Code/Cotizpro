import type { PushSubscriptionData } from "@/lib/push/server";
import { sendPushNotification } from "@/lib/push/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Regime } from "@/types/database";
import { PLAFONDS_CA } from "@/types/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/push/send
 * Route protégée par CRON_SECRET — appelée par Vercel Cron chaque jour à 9h.
 * Calcule les notifications de chaque utilisateur ayant des push subscriptions
 * et envoie les alertes pertinentes.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const annee = now.getFullYear();
  const moisEnCours = now.getMonth() + 1;
  const moisPrecedent = moisEnCours === 1 ? 12 : moisEnCours - 1;
  const anneeMoisPrecedent = moisEnCours === 1 ? annee - 1 : annee;

  // Récupérer tous les abonnements push actifs avec le profil utilisateur
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth_key");

  if (error || !subscriptions?.length) {
    return NextResponse.json({ sent: 0 });
  }

  // Grouper par user_id
  const byUser = new Map<string, PushSubscriptionData[]>();
  for (const sub of subscriptions) {
    const list = byUser.get(sub.user_id) ?? [];
    list.push({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth_key: sub.auth_key });
    byUser.set(sub.user_id, list);
  }

  let totalSent = 0;
  const staleEndpoints: { user_id: string; endpoint: string }[] = [];

  for (const [userId, subs] of byUser) {
    // Charger profil + déclarations du mois précédent
    const [profileResult, decResult] = await Promise.all([
      supabase.from("profiles").select("regime, acre").eq("user_id", userId).single(),
      supabase
        .from("declarations")
        .select("mois, annee, montant_ca")
        .eq("user_id", userId)
        .eq("annee", annee),
    ]);

    const profile = profileResult.data;
    const declarations = decResult.data ?? [];

    if (!profile) continue;

    const notifications: Array<{ title: string; body: string; url: string }> = [];

    // 1. Mois précédent non déclaré (entre le 1 et le 20)
    if (now.getDate() <= 20) {
      const dejaDeclare = declarations.some(
        (d) => d.mois === moisPrecedent && d.annee === anneeMoisPrecedent
      );
      if (!dejaDeclare) {
        const labelMois = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(
          new Date(anneeMoisPrecedent, moisPrecedent - 1, 1)
        );
        notifications.push({
          title: `CA de ${labelMois} non déclaré`,
          body: "Pensez à déclarer votre CA avant l'échéance URSSAF.",
          url: "/declaration",
        });
      }
    }

    // 2. Plafond CA dépassé ou proche (≥ 80%)
    const caCumule = declarations.reduce((sum, d) => sum + d.montant_ca, 0);
    const plafond = PLAFONDS_CA[profile.regime as Regime];
    if (plafond > 0) {
      const ratio = caCumule / plafond;
      const eur = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      });
      if (ratio >= 1) {
        notifications.push({
          title: "Plafond CA dépassé !",
          body: `Votre CA ${annee} dépasse ${eur.format(plafond)}.`,
          url: "/dashboard",
        });
      } else if (ratio >= 0.8) {
        notifications.push({
          title: `${Math.round(ratio * 100)} % du plafond atteint`,
          body: `Votre CA approche la limite annuelle de ${eur.format(plafond)}.`,
          url: "/dashboard",
        });
      }
    }

    // 3. Rappel déclaration d'impôts (avril–juin)
    if ([4, 5, 6].includes(moisEnCours)) {
      notifications.push({
        title: "Période de déclaration d'impôts",
        body: "Consultez votre récapitulatif fiscal pour remplir votre 2042-C-PRO.",
        url: "/fiscalite",
      });
    }

    if (notifications.length === 0) continue;

    // Envoyer la notification la plus prioritaire à tous les appareils
    const notif = notifications[0];
    for (const sub of subs) {
      const ok = await sendPushNotification(sub, {
        title: notif.title,
        body: notif.body,
        url: notif.url,
      }).catch(() => false);

      if (ok) {
        totalSent++;
      } else {
        staleEndpoints.push({ user_id: userId, endpoint: sub.endpoint });
      }
    }
  }

  // Nettoyer les abonnements expirés
  for (const stale of staleEndpoints) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", stale.user_id)
      .eq("endpoint", stale.endpoint);
  }

  return NextResponse.json({ sent: totalSent, cleaned: staleEndpoints.length });
}
