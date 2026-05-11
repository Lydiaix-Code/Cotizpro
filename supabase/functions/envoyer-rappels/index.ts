/**
 * Supabase Edge Function — envoyer-rappels
 * Runtime : Deno (pas de Node.js)
 *
 * Déclenché par pg_cron le 25 de chaque mois à 9h UTC.
 * Envoie un email de rappel via Resend aux utilisateurs qui :
 *  1. Ont activé les notifications email (notifications_email = true)
 *  2. N'ont pas encore déclaré leur CA pour la période en cours
 *
 * Sécurité :
 *  - Validation du header X-Function-Secret (partagé entre pg_cron et la fonction)
 *  - Accès à la BDD via service_role (RLS bypassé — nécessaire pour lire les emails auth)
 *  - Jamais de secrets exposés dans les logs (console.error sans détails sensibles)
 *
 * Variables d'environnement requises (Supabase Dashboard > Edge Functions > Secrets) :
 *  - RESEND_API_KEY        : clé API Resend
 *  - FUNCTION_SECRET       : secret partagé avec pg_cron pour authentifier l'appel
 *  - SUPABASE_URL          : fourni automatiquement par Supabase
 *  - SUPABASE_SERVICE_ROLE_KEY : fourni automatiquement par Supabase
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileRow {
  user_id: string;
  frequence_declaration: "mensuelle" | "trimestrielle";
  notifications_email: boolean;
}

interface DeclarationRow {
  user_id: string;
  mois: number;
  annee: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Retourne les mois du trimestre en cours */
function moisDuTrimestre(mois: number): number[] {
  if (mois <= 3) return [1, 2, 3];
  if (mois <= 6) return [4, 5, 6];
  if (mois <= 9) return [7, 8, 9];
  return [10, 11, 12];
}

/** Envoi d'un email via l'API HTTP Resend */
async function envoyerEmailRappel(
  destinataire: string,
  frequence: "mensuelle" | "trimestrielle",
  resendKey: string
): Promise<void> {
  const sujet =
    frequence === "mensuelle"
      ? "Rappel : déclarez votre CA mensuel sur Cotizpro"
      : "Rappel : déclarez votre CA trimestriel sur Cotizpro";

  const corps =
    frequence === "mensuelle"
      ? `<p>Bonjour,</p>
       <p>La date limite de déclaration de votre chiffre d'affaires mensuel approche.</p>
       <p>Pensez à déclarer votre CA sur <a href="https://app.Cotizpro.fr/declaration">Cotizpro</a> avant la fin du mois.</p>
       <p>— L'équipe Cotizpro</p>`
      : `<p>Bonjour,</p>
       <p>La date limite de déclaration de votre chiffre d'affaires trimestriel approche (fin de trimestre).</p>
       <p>Pensez à déclarer votre CA sur <a href="https://app.Cotizpro.fr/declaration">Cotizpro</a> avant le 31.</p>
       <p>— L'équipe Cotizpro</p>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Cotizpro <onboarding@resend.dev>",
      to: [destinataire],
      subject: sujet,
      html: corps,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    // Tronqué à 200 chars — évite de logger des emails ou données PII de la réponse Resend
    throw new Error(`Resend API error ${response.status}: ${errBody.slice(0, 200)}`);
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── Validation du secret (prévient les appels non autorisés) ───────────────
  const functionSecret = Deno.env.get("FUNCTION_SECRET");
  const incomingSecret = req.headers.get("X-Function-Secret");

  if (!functionSecret || incomingSecret !== functionSecret) {
    return new Response("Non autorisé", { status: 401 });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("[envoyer-rappels] RESEND_API_KEY manquant");
    return new Response("Configuration manquante", { status: 500 });
  }

  // ── Client Supabase service_role (RLS bypassé pour lire auth.users) ────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const now = new Date();
  const annee = now.getFullYear();
  const moisEnCours = now.getMonth() + 1;
  const moisTrimestre = moisDuTrimestre(moisEnCours);

  // ── Récupérer les profils avec notifications activées ─────────────────────
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, frequence_declaration, notifications_email")
    .eq("notifications_email", true);

  if (profilesError || !profiles) {
    console.error("[envoyer-rappels] Erreur lecture profiles");
    return new Response("Erreur BDD", { status: 500 });
  }

  // ── Récupérer les déclarations de l'année en cours (tous les users) ────────
  const { data: declarations, error: declError } = await supabase
    .from("declarations")
    .select("user_id, mois, annee")
    .eq("annee", annee);

  if (declError) {
    console.error("[envoyer-rappels] Erreur lecture declarations");
    return new Response("Erreur BDD", { status: 500 });
  }

  const declsParUser = new Map<string, DeclarationRow[]>();
  for (const d of (declarations ?? []) as DeclarationRow[]) {
    if (!declsParUser.has(d.user_id)) declsParUser.set(d.user_id, []);
    declsParUser.get(d.user_id)!.push(d);
  }

  // ── Filtrer les utilisateurs qui n'ont pas encore déclaré ─────────────────
  const aRappeler: ProfileRow[] = [];

  for (const profile of profiles as ProfileRow[]) {
    const decls = declsParUser.get(profile.user_id) ?? [];

    const aDeclaré =
      profile.frequence_declaration === "mensuelle"
        ? decls.some((d) => d.mois === moisEnCours)
        : moisTrimestre.some((m) => decls.some((d) => d.mois === m));

    if (!aDeclaré) {
      aRappeler.push(profile);
    }
  }

  if (aRappeler.length === 0) {
    return new Response(
      JSON.stringify({ message: "Aucun rappel à envoyer", envois: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Récupérer les emails via l'API admin Auth ──────────────────────────────
  let envoyés = 0;
  let erreurs = 0;

  for (const profile of aRappeler) {
    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        profile.user_id
      );

      if (userError || !userData?.user?.email) {
        erreurs++;
        continue;
      }

      await envoyerEmailRappel(
        userData.user.email,
        profile.frequence_declaration,
        resendKey
      );
      envoyés++;
    } catch {
      // Ne pas exposer le détail d'erreur qui pourrait contenir des PII
      erreurs++;
      console.error("[envoyer-rappels] Erreur envoi pour un utilisateur");
    }
  }

  return new Response(JSON.stringify({ message: "Rappels traités", envoyés, erreurs }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
