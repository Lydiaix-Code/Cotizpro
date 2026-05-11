"use client";

import { useEffect, useState } from "react";

/**
 * Convertit une clé VAPID publique base64 en Uint8Array
 * tel qu'attendu par PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const uint8 = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    uint8[i] = rawData.charCodeAt(i);
  }
  return uint8;
}

/**
 * Gère l'abonnement / désabonnement aux notifications push PWA.
 * - Au montage : tente de récupérer un abonnement existant et le synchronise
 * - Bouton visible uniquement si l'API Push est disponible ET le SW enregistré
 */
export function PushNotificationManager() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!vapidKey;

  const [permission, setPermission] = useState<NotificationPermission>(() =>
    isSupported ? Notification.permission : "default"
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    // Vérifier si déjà abonné
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    );
  }, [isSupported]);

  async function subscribe() {
    if (!vapidKey) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON();
      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth_key: json.keys?.auth ?? "",
        }),
      });

      setSubscribed(true);
    } catch {
      // Permission refusée ou erreur SW — silencieux
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }

  if (!isSupported || permission === "denied") return null;

  return (
    <div className="border-border bg-muted/40 flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Notifications push</p>
        <p className="text-muted-foreground text-xs">
          {subscribed
            ? "Vous recevrez des alertes même hors de l'app."
            : "Recevez les alertes URSSAF sur cet appareil."}
        </p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={subscribed ? unsubscribe : subscribe}
        className={
          subscribed
            ? "shrink-0 rounded-md border border-red-300 bg-transparent px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            : "shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        }
      >
        {loading ? "…" : subscribed ? "Désactiver" : "Activer"}
      </button>
    </div>
  );
}
