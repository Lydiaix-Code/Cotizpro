import webpush from "web-push";

let initialized = false;

function initWebPush() {
  if (initialized) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:contact@cotizpro.fr";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY manquant");
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  initialized = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

/**
 * Envoie une notification push à un abonnement donné.
 * Retourne false si l'abonnement est expiré/invalide (à supprimer).
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<boolean> {
  initWebPush();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth_key,
        },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/dashboard",
        icon: payload.icon ?? "/icon-192.png",
      })
    );
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    // 404 ou 410 = abonnement expiré ou révoqué → à supprimer
    if (status === 404 || status === 410) return false;
    throw err;
  }
}
