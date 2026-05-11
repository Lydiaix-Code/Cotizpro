import type { MetadataRoute } from "next";

/**
 * Web App Manifest — Next.js génère automatiquement /manifest.webmanifest
 * Pour une installation PWA complète sur iOS, ajoutez des icones PNG 192×192
 * et 512×512 dans /public/ et mettez à jour le tableau `icons` ci-dessous.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cotizpro — Cotisations URSSAF",
    short_name: "Cotizpro",
    description:
      "Calculez et suivez vos cotisations URSSAF en temps réel. Outil simple et précis pour auto-entrepreneurs français.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0e0f17",
    theme_color: "#0e0f17",
    lang: "fr",
    scope: "/",
    orientation: "portrait-primary",
    categories: ["finance", "productivity", "business"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purpose: "any maskable" as any,
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purpose: "any maskable" as any,
      },
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purpose: "any" as any,
      },
    ],
    screenshots: [
      {
        src: "/screenshots/Tableau_Bord.png",
        sizes: "1280x800",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: "image/png" as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form_factor: "wide" as any,
        label: "Tableau de bord",
      },
    ],
  };
}
