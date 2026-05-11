import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer doit rester dans Node.js (pas Edge, pas Turbopack)
  serverExternalPackages: ["@react-pdf/renderer"],

  // Performance
  compress: true,
  poweredByHeader: false, // Cache le header X-Powered-By pour la sécurité

  // Sécurité : HTTP Security Headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Content-Security-Policy est défini dynamiquement dans src/proxy.ts
          // avec un nonce par requête — ne pas le définir ici (écraserait le nonce).
        ],
      },
    ];
  },

  // Optimisation images
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
