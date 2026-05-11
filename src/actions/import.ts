"use server";

import { calculerCotisations, isAcreEligible } from "@/lib/calculators/urssaf";
import { getIsPremium } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";
import type { Regime } from "@/types/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImportResult = {
  success: boolean;
  error?: string;
  inserted?: number;
  skipped?: number;
  rowErrors?: string[];
};

// ─── Validation ───────────────────────────────────────────────────────────────

const CSV_MAX_BYTES = 10_000; // ~333 lignes × 30 chars, largement suffisant
const ROWS_MAX = 50;

/** Schéma Zod pour une ligne CSV parsée */
const csvRowSchema = z.object({
  annee: z.coerce
    .number()
    .int()
    .min(2000, "Année invalide (min 2000)")
    .max(2100, "Année invalide (max 2100)"),
  mois: z.coerce
    .number()
    .int()
    .min(1, "Mois invalide (1-12)")
    .max(12, "Mois invalide (1-12)"),
  montant_ca: z.coerce
    .number()
    .min(0, "CA ne peut pas être négatif")
    .max(1_000_000, "CA trop élevé"),
});

// ─── Parsing CSV ──────────────────────────────────────────────────────────────

type ParsedRow = { annee: number; mois: number; montant_ca: number };
type ParseError = { ligne: number; message: string };

/**
 * Parse le contenu CSV (string) en lignes validées.
 * Formats acceptés :
 *  - Séparateur : virgule ou point-virgule
 *  - En-tête optionnelle (première ligne non numérique ignorée)
 *  - Colonnes : annee, mois, montant_ca (dans cet ordre)
 * Retourne les lignes valides et les erreurs par ligne (ne jamais planter).
 */
function parseCSV(raw: string): { rows: ParsedRow[]; errors: ParseError[] } {
  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];

  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let dataLineIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Détecter le séparateur (virgule ou point-virgule)
    const sep = line.includes(";") ? ";" : ",";
    const parts = line.split(sep).map((p) => p.trim().replace(/^["']|["']$/g, ""));

    if (parts.length < 3) {
      // Ligne d'en-tête ou ligne vide — ignorer (seulement pour la 1ère ligne)
      if (i === 0) continue;
      errors.push({
        ligne: i + 1,
        message: "Données insuffisantes (3 colonnes requises)",
      });
      continue;
    }

    dataLineIndex++;
    const result = csvRowSchema.safeParse({
      annee: parts[0],
      mois: parts[1],
      montant_ca: parts[2],
    });

    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? "Données invalides";
      errors.push({ ligne: i + 1, message: msg });
      continue;
    }

    rows.push(result.data);

    if (dataLineIndex >= ROWS_MAX) break;
  }

  return { rows, errors };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Valide un UUID v4 — jamais faire confiance au client pour les IDs */
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

// ─── importDeclarations ─────────────────────────────────────────────────────────

/**
 * Importe des déclarations depuis un fichier CSV.
 *
 * Sécurité :
 *  - user_id toujours depuis le token serveur
 *  - regime/acre/versement_liberatoire depuis le profil OU l'activité (côté serveur)
 *  - activite_id : UUID validé + ownership vérifié en base + gate Premium
 *  - Taille CSV limitée à 10 ko, rows max 50
 *  - Mois futurs refusés
 *  - Doublons ignorés silencieusement (code 23505)
 *  - Tout le parsing et la validation sont côté serveur
 */
export async function importDeclarations(
  _prevState: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Session expirée. Reconnectez-vous." };
  }

  // Récupérer le contenu CSV depuis FormData
  const csvRaw = formData.get("csv_content");
  if (!csvRaw || typeof csvRaw !== "string") {
    return { success: false, error: "Fichier CSV manquant ou invalide." };
  }

  // Limite de taille
  if (csvRaw.length > CSV_MAX_BYTES) {
    return {
      success: false,
      error: `Fichier trop volumineux. Maximum ${ROWS_MAX} lignes par import.`,
    };
  }

  // ── Activité optionnelle (Premium uniquement) ─────────────────────────────
  const activiteIdRaw = formData.get("activite_id");
  let activiteId: string | null = null;
  let activiteProfile: {
    regime: string;
    acre: boolean;
    versement_liberatoire: boolean;
    date_debut: string | null;
  } | null = null;

  if (activiteIdRaw && typeof activiteIdRaw === "string" && activiteIdRaw.trim() !== "") {
    const isPremium = await getIsPremium();
    if (!isPremium) {
      return {
        success: false,
        error: "Les activités secondaires sont réservées aux membres Premium.",
      };
    }
    // Valider UUID + ownership + actif en base (jamais faire confiance au client)
    if (!isValidUUID(activiteIdRaw.trim())) {
      return { success: false, error: "Identifiant d'activité invalide." };
    }
    const { data: act, error: actError } = await supabase
      .from("activites")
      .select("id, regime, acre, versement_liberatoire, date_debut")
      .eq("id", activiteIdRaw.trim())
      .eq("user_id", user.id)
      .eq("actif", true)
      .single();

    if (actError || !act) {
      return { success: false, error: "Activité introuvable ou accès refusé." };
    }
    activiteId = act.id;
    activiteProfile = {
      regime: act.regime,
      acre: act.acre,
      versement_liberatoire: act.versement_liberatoire,
      date_debut: act.date_debut,
    };
  }

  // Parser le CSV
  const { rows, errors: parseErrors } = parseCSV(csvRaw);

  if (rows.length === 0) {
    const rowErrors = parseErrors.map((e) => `Ligne ${e.ligne} : ${e.message}`);
    return {
      success: false,
      error: "Aucune ligne valide trouvée dans le fichier CSV.",
      rowErrors,
    };
  }

  // Récupérer le profil utilisateur côté serveur (JAMAIS depuis le client)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("regime, acre, versement_liberatoire, date_debut_activite")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      error: "Profil introuvable. Configurez votre profil d'abord.",
    };
  }

  // Profil effectif : activité secondaire si fournie, sinon profil principal
  const effectiveRegime = (activiteProfile?.regime ?? profile.regime) as Regime;
  const effectiveAcre = activiteProfile?.acre ?? profile.acre ?? false;
  const effectiveVL =
    activiteProfile?.versement_liberatoire ?? profile.versement_liberatoire ?? false;
  const effectiveDebut = activiteProfile?.date_debut ?? profile.date_debut_activite;

  // Valider les mois futurs côté serveur
  const now = new Date();
  const rowErrors: string[] = parseErrors.map((e) => `Ligne ${e.ligne} : ${e.message}`);
  const validRows: ParsedRow[] = [];

  for (const row of rows) {
    const isFuture =
      row.annee > now.getFullYear() ||
      (row.annee === now.getFullYear() && row.mois > now.getMonth() + 1);
    if (isFuture) {
      rowErrors.push(
        `${row.annee}/${String(row.mois).padStart(2, "0")} : mois futur refusé`
      );
      continue;
    }
    validRows.push(row);
  }

  if (validRows.length === 0) {
    return {
      success: false,
      error: "Aucune ligne importable (mois futurs exclus).",
      rowErrors,
    };
  }

  // Insérer chaque ligne (déclaration + cotisations)
  let inserted = 0;
  let skipped = 0;

  for (const row of validRows) {
    const { annee, mois, montant_ca } = row;

    const acreEffectif = effectiveAcre && isAcreEligible(effectiveDebut, annee, mois);

    // Insérer la déclaration
    const { data: declaration, error: insertError } = await supabase
      .from("declarations")
      .insert({
        user_id: user.id,
        mois,
        annee,
        montant_ca,
        regime: effectiveRegime,
        ...(activiteId ? { activite_id: activiteId } : {}),
      })
      .select("id")
      .single();

    if (insertError) {
      // Code 23505 = UNIQUE violation (doublon mois/année/activité)
      if (insertError.code === "23505") {
        skipped++;
        continue;
      }
      rowErrors.push(
        `${annee}/${String(mois).padStart(2, "0")} : erreur insertion (${insertError.code})`
      );
      continue;
    }

    // Calculer et sauvegarder les cotisations (avec le profil effectif)
    const resultat = calculerCotisations({
      montant_ca,
      regime: effectiveRegime,
      acre: acreEffectif,
      versement_liberatoire: effectiveVL,
      annee,
    });

    await supabase.from("cotisations").insert({
      declaration_id: declaration.id,
      user_id: user.id,
      montant_cotisations: resultat.montant_cotisations,
      montant_versement_liberatoire: resultat.montant_versement_liberatoire,
      taux_applique: resultat.taux_cotisations,
      acre_applique: resultat.acre_applique,
      periode: `${annee}-${String(mois).padStart(2, "0")}`,
    });

    inserted++;
  }

  revalidatePath("/dashboard");
  revalidatePath("/declaration");
  revalidatePath("/cotisations");
  revalidatePath("/historique");

  return {
    success: true,
    inserted,
    skipped,
    rowErrors: rowErrors.length > 0 ? rowErrors : undefined,
  };
}
