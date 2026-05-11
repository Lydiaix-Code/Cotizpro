/**
 * Service Worker — Cotizpro PWA
 *
 * Stratégie :
 * - Install  : précache les assets statiques critiques
 * - Activate : supprime les anciens caches
 * - Fetch    : cache-first pour images/fonts, network-first pour le reste
 *              Fallback offline sur la page /offline si le réseau est indisponible
 * - Push     : affiche les notifications reçues du serveur (Web Push / VAPID)
 * - NotificationClick : ouvre l'URL cible de la notification
 */

const CACHE_VERSION = "v1";
const CACHE_STATIC = `Cotizpro-static-${CACHE_VERSION}`;

/** Assets précachés à l'installation */
const PRECACHE_URLS = ["/icon-192.png", "/icon-512.png", "/logo.svg", "/offline"];

/** Extensions d'assets statiques servis en cache-first */
const STATIC_EXT_RE = /\.(png|svg|ico|webp|woff2?|ttf|otf)$/i;

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) =>
        cache.addAll(
          PRECACHE_URLS.map(
            (url) => new Request(url, { credentials: "same-origin" })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_STATIC).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ne traiter que les GET same-origin
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Ne pas intercepter : routes API, routes auth, _next/webpack-hmr
  const skip =
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/_next/webpack-hmr");
  if (skip) return;

  // Assets statiques → cache-first
  if (STATIC_EXT_RE.test(url.pathname) || url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_STATIC).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Pages HTML → network-first, fallback /offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Mettre en cache les pages HTML réussies
        if (response.ok && request.headers.get("accept")?.includes("text/html")) {
          const clone = response.clone();
          caches.open(CACHE_STATIC).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) => cached ?? caches.match("/offline")
        )
      )
  );
});

// ── Push ─────────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Cotizpro", body: event.data.text(), url: "/dashboard" };
  }

  const { title = "Cotizpro", body = "", icon = "/icon-192.png", url = "/dashboard" } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: "/icon-192.png",
      data: { url },
      vibrate: [200, 100, 200],
    })
  );
});

// ── NotificationClick ────────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si un onglet est déjà ouvert → le focus et navigue
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // Sinon ouvre un nouvel onglet
        return clients.openWindow(url);
      })
  );
});
