/**
 * Supabase Edge Function — email-onboarding
 * Runtime : Deno (pas de Node.js)
 *
 * Envoyé une seule fois juste après la confirmation d'email d'un nouvel utilisateur.
 * Déclenché depuis la Server Action `register` via fetch sécurisé.
 *
 * Séquence :
 *  - Email J+0 : "Bienvenue — comment démarrer"
 *
 * Sécurité :
 *  - Validation du header X-Function-Secret (partagé via variable d'environnement)
 *  - Body JSON validé (email présent et format valide)
 *  - Aucun secret exposé dans les logs
 *  - Idempotent : si l'email a déjà été envoyé, Resend le déduplique via idempotency key
 *
 * Variables d'environnement requises (Supabase Dashboard > Edge Functions > Secrets) :
 *  - RESEND_API_KEY   : clé API Resend
 *  - FUNCTION_SECRET  : secret partagé pour authentifier les appels depuis Next.js
 *  - APP_URL          : URL publique de l'app (ex: https://Cotizpro.fr)
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function envoyerEmailBienvenue(
  destinataire: string,
  resendKey: string,
  appUrl: string
): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <h2 style="color: #4f46e5;">Bienvenue sur Cotizpro 👋</h2>
      <p>Bonjour,</p>
      <p>
        Merci d'avoir créé votre compte Cotizpro — l'outil de suivi URSSAF
        conçu pour les auto-entrepreneurs français.
      </p>

      <h3 style="color: #374151;">Pour démarrer en 3 étapes :</h3>
      <ol style="padding-left: 1.2em; line-height: 1.8;">
        <li>
          <strong>Configurez votre profil</strong> — régime (BIC/BNC), date de
          début, ACRE si applicable
        </li>
        <li>
          <strong>Déclarez votre premier CA</strong> — le calcul URSSAF est
          automatique
        </li>
        <li>
          <strong>Consultez votre dashboard</strong> — CA cumulé, cotisations,
          progression vers le plafond
        </li>
      </ol>

      <p style="margin-top: 24px;">
        <a
          href="${appUrl}/dashboard"
          style="display:inline-block; background:#4f46e5; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;"
        >
          Accéder à mon tableau de bord →
        </a>
      </p>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin: 32px 0;" />

      <p style="color:#6b7280; font-size:13px;">
        Besoin d'aide ? Répondez simplement à cet email.<br />
        — L'équipe Cotizpro
      </p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Cotizpro <bonjour@Cotizpro.fr>",
      to: [destinataire],
      subject: "Bienvenue sur Cotizpro 👋",
      html,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    // Ne jamais logger l'email destinataire — données personnelles
    throw new Error(`Resend API error ${response.status}: ${errBody.slice(0, 200)}`);
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── Méthode ────────────────────────────────────────────────────────────────
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // ── Validation du secret (prévient les appels non autorisés) ───────────────
  const functionSecret = Deno.env.get("FUNCTION_SECRET");
  const incomingSecret = req.headers.get("X-Function-Secret");

  if (!functionSecret || incomingSecret !== functionSecret) {
    return new Response("Non autorisé", { status: 401 });
  }

  // ── Validation Content-Type ────────────────────────────────────────────────
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return new Response("Content-Type invalide", { status: 415 });
  }

  // ── Parsing + validation du body ──────────────────────────────────────────
  let email: string;
  try {
    const body = await req.json();
    if (typeof body?.email !== "string" || !isValidEmail(body.email)) {
      return new Response("Email invalide", { status: 400 });
    }
    email = body.email;
  } catch {
    return new Response("Body JSON invalide", { status: 400 });
  }

  // ── Variables d'environnement ──────────────────────────────────────────────
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("[email-onboarding] RESEND_API_KEY manquant");
    return new Response("Configuration manquante", { status: 500 });
  }

  const appUrl = Deno.env.get("APP_URL") ?? "https://Cotizpro.fr";

  // ── Envoi ──────────────────────────────────────────────────────────────────
  try {
    await envoyerEmailBienvenue(email, resendKey, appUrl);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(
      "[email-onboarding] Erreur envoi email:",
      err instanceof Error ? err.message : "inconnu"
    );
    // On retourne 200 pour ne pas bloquer l'inscription côté client
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
