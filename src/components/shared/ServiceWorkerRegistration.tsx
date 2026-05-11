"use client";

import { useEffect } from "react";

/**
 * Enregistre le Service Worker PWA côté client.
 * Ne rend rien — uniquement un effet au montage.
 * Le SW est servi depuis /sw.js (public/sw.js).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Silencieux — ne pas crasher si le SW ne peut pas s'enregistrer
      });
    }
  }, []);

  return null;
}
