// src/proxy.ts — Next.js proxy (auth + security)
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ── Nonce & CSP ──────────────────────────────────────────────────────────────

/**
 * Génère un nonce cryptographiquement aléatoire (16 octets, base64).
 * Utilise l'API Web Crypto disponible en Edge runtime — jamais Math.random().
 */
function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // btoa(String.fromCharCode(...bytes)) — safe pour 16 octets (pas de dépassement de pile)
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Construit l'en-tête Content-Security-Policy avec le nonce du cycle de requête.
 *
 * Changements vs ancienne version statique :
 * - 'unsafe-inline' retiré de script-src → remplacé par 'nonce-{nonce}'
 * - 'unsafe-eval'   retiré (non nécessaire en production Next.js App Router)
 * - Le nonce est généré à chaque requête : impossible à prédire ou réutiliser
 */
function buildCSP(nonce: string): string {
  // React (Turbopack) nécessite eval() en développement pour les devtools.
  // En production, eval() est banni pour la sécurité maximale.
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    [
      "script-src",
      "'self'",
      `'nonce-${nonce}'`,
      // Requis par React/Turbopack en dev uniquement (jamais en production)
      isDev ? "'unsafe-eval'" : "",
      // Domaines tiers autorisés (chargement de scripts externes)
      "https://js.stripe.com",
      "https://challenges.cloudflare.com",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
    ]
      .filter(Boolean)
      .join(" "),
    // Tailwind injecte des styles inline — 'unsafe-inline' limité au CSS, pas aux scripts
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://challenges.cloudflare.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://region1.google-analytics.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
    // Anti-clickjacking via CSP (complète X-Frame-Options pour les navigateurs modernes)
    "frame-ancestors 'none'",
    // Bloque Flash, Java, plugins embarqués
    "object-src 'none'",
    // Empêche l'injection de <base href="https://attacker.com">
    "base-uri 'self'",
  ].join("; ");
}

// Routes accessibles sans authentification
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/reset-password",
  "/sitemap.xml",
  "/robots.txt",
  "/cgu",
  "/mentions-legales",
  "/auth/callback",
];
// Routes réservées aux utilisateurs non connectés
const AUTH_ROUTES = ["/login", "/register", "/reset-password"];
// Route de challenge 2FA — accessible aux utilisateurs connectés à AAL1
const MFA_ROUTE = "/mfa";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isMFARoute = pathname === MFA_ROUTE;

  // Génère un nonce unique par requête (16 octets aléatoires, base64)
  const nonce = generateNonce();
  const csp = buildCSP(nonce);

  // En-têtes de requête modifiés : x-nonce permet aux Server Components de lire
  // le nonce via headers() pour l'appliquer aux scripts inline (anti-FOUC, GA…)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si Supabase n'est pas configuré, laisser passer les routes publiques
  // et bloquer les routes protégées avec une redirection vers login
  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("http")) {
    if (!isPublicRoute && !isMFARoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Crée le client Supabase côté serveur avec gestion des cookies
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Préserver x-nonce dans les headers lors du renouvellement du token
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Récupère la session (rafraîchit le token si expiré)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Utilisateur non connecté tentant d'accéder à une route protégée
  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Utilisateur connecté : vérifier le niveau d'assurance MFA (AAL)
  if (user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    const needsMFAChallenge = aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2";

    if (needsMFAChallenge && !isMFARoute) {
      // L'utilisateur a la 2FA activée mais ne l'a pas encore validée cette session
      return NextResponse.redirect(new URL(MFA_ROUTE, request.url));
    }

    if (!needsMFAChallenge && isMFARoute) {
      // Déjà au bon niveau ou pas de 2FA — pas besoin de la page de challenge
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Utilisateur connecté tentant d'accéder aux pages auth
  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  // Injecte le CSP (avec nonce) sur la réponse finale — pages HTML uniquement
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Ignore les fichiers statiques, routes Next.js internes,
    // et le webhook Stripe (appelé par Stripe sans cookie d'auth)
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
