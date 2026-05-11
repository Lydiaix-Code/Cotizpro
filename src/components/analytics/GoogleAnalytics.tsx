"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// Validation stricte du format GA Measurement ID (G-XXXXXXXXXX)
// Empêche toute valeur inattendue (env var malformée) d'être injectée dans le script
const GA_MEASUREMENT_ID_REGEX = /^G-[A-Z0-9]{1,20}$/;
const GA_ID_RAW = process.env.NEXT_PUBLIC_GA_ID;
const GA_ID = GA_ID_RAW && GA_MEASUREMENT_ID_REGEX.test(GA_ID_RAW) ? GA_ID_RAW : null;

/**
 * Charge GA4 uniquement :
 * - En production (NEXT_PUBLIC_GA_ID défini et valide)
 * - Après consentement explicite de l'utilisateur (CNIL)
 * - Côté client uniquement
 *
 * Sécurité :
 * - Aucun cookie avant consentement
 * - IP anonymisée via la config GA4 (côté dashboard)
 * - nonce requis par le CSP (propagé depuis le middleware via layout.tsx)
 * - GA_ID validé par regex avant interpolation dans le script
 */
export function GoogleAnalytics({ nonce }: { nonce?: string }) {
  const initRef = useRef(false);
  const [granted, setGranted] = useState(false);

  // Lecture initiale du localStorage (hors render — dans l'effet)
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      const stored = localStorage.getItem("cookie_consent");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "granted") setGranted(true);
    }
  }, []);

  // Écoute les mises à jour de consentement sans setState dans l'effet
  useEffect(() => {
    function onConsent(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      // setState appelé depuis un event handler natif — pas dans le corps de l'effet
      setGranted(detail === "granted");
    }
    window.addEventListener("cookie_consent_update", onConsent);
    return () => window.removeEventListener("cookie_consent_update", onConsent);
  }, []);

  if (!GA_ID || !granted) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="ga4-init" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure',
            send_page_view: true
          });
        `}
      </Script>
    </>
  );
}
