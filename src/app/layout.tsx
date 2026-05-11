import { CookieBanner } from "@/components/analytics/CookieBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { ServiceWorkerRegistration } from "@/components/shared";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://Cotizpro.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: "Cotizpro",
  title: {
    default: "Cotizpro — Cotisations URSSAF pour auto-entrepreneurs",
    template: "%s | Cotizpro",
  },
  description:
    "Calculez et suivez vos cotisations URSSAF en temps réel. Outil simple et précis pour auto-entrepreneurs français.",
  keywords: [
    "URSSAF",
    "auto-entrepreneur",
    "cotisations",
    "chiffre d'affaires",
    "micro-entreprise",
  ],
  authors: [{ name: "Cotizpro" }],
  robots: { index: true, follow: true },
  icons: {
    icon: "/logo.svg",
    shortcut: "/icon-192.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    type: "website",
    url: APP_URL,
    locale: "fr_FR",
    title: "Cotizpro — Cotisations URSSAF pour auto-entrepreneurs",
    description: "Calculez et suivez vos cotisations URSSAF en temps réel.",
    siteName: "Cotizpro",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cotizpro — Cotisations URSSAF pour auto-entrepreneurs",
    description: "Calculez et suivez vos cotisations URSSAF en temps réel.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f17" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Lit le nonce injecté par le middleware (proxy.ts) sur la requête entrante.
  // Permet d'appliquer le nonce aux scripts inline sans 'unsafe-inline' dans le CSP.
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html
      lang="fr"
      className={`${inter.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-FOUC: apply theme before first paint — nonce requis par le CSP */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-background min-h-full font-sans antialiased">
        {children}
        <Toaster position="bottom-right" richColors />
        <CookieBanner />
        <GoogleAnalytics nonce={nonce} />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
