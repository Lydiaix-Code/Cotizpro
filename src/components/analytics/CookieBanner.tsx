"use client";

import { useEffect, useRef, useState } from "react";

type Consent = "granted" | "denied";

/**
 * Bannière de consentement aux cookies — conforme CNIL / RGPD
 *
 * Règles :
 * - Aucun cookie analytique avant consentement explicite
 * - Le refus est aussi simple que l'acceptation (bouton visible)
 * - Le choix est mémorisé dans localStorage (pas de cookie de consentement lui-même)
 * - Un event DOM notifie GoogleAnalytics du choix sans couplage direct
 */
export function CookieBanner() {
  const initRef = useRef(false);
  // Démarre caché côté SSR, révèle au premier mount client
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    // setState appelé dans un guard ref — exécuté une seule fois, pas de cascade
    const alreadyChosen = Boolean(localStorage.getItem("cookie_consent"));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!alreadyChosen) setVisible(true);
  }, []);

  function dispatch(choice: Consent) {
    localStorage.setItem("cookie_consent", choice);
    window.dispatchEvent(
      new CustomEvent<Consent>("cookie_consent_update", { detail: choice })
    );
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies"
      aria-live="polite"
      className="border-border bg-background/95 fixed right-0 bottom-0 left-0 z-50 border-t px-4 py-4 shadow-lg backdrop-blur-sm sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Nous utilisons Google Analytics pour mesurer l&apos;audience de Cotizpro de
          façon anonyme. Aucune donnée personnelle n&apos;est transmise sans votre accord.{" "}
          <a href="/mentions-legales" className="underline underline-offset-2">
            En savoir plus
          </a>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => dispatch("denied")}
            className="border-border bg-background hover:bg-muted focus-visible:ring-ring rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Refuser
          </button>
          <button
            onClick={() => dispatch("granted")}
            className="focus-visible:ring-ring rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:ring-2 focus-visible:outline-none"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
