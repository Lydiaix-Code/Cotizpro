import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://Cotizpro.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/mentions-legales", "/cgu"],
        // Bloquer toutes les pages authentifiées
        disallow: [
          "/dashboard",
          "/declaration",
          "/cotisations",
          "/graphiques",
          "/historique",
          "/export",
          "/parametres",
          "/premium",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
