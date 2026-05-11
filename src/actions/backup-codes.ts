"use server";

import { createClient } from "@/lib/supabase/server";
import { createHash, randomBytes } from "crypto";

const CODE_COUNT = 8;

/** Génère 16 chars hex aléatoires (64 bits d'entropie) */
function generateRaw(): string {
  return randomBytes(8).toString("hex");
}

/** Hash SHA-256 d'un code normalisé (minuscules, sans tirets/espaces) */
function hashCode(code: string): string {
  return createHash("sha256")
    .update(code.toLowerCase().replace(/[-\s]/g, ""))
    .digest("hex");
}

/** Formate le code brut en XXXX-XXXX-XXXX-XXXX */
function formatCode(raw: string): string {
  const u = raw.toUpperCase();
  return `${u.slice(0, 4)}-${u.slice(4, 8)}-${u.slice(8, 12)}-${u.slice(12, 16)}`;
}

/**
 * Génère 8 nouveaux codes de secours (remplace les anciens).
 * Retourne les codes en clair — à afficher UNE SEULE FOIS.
 */
export async function generateBackupCodes(): Promise<{
  codes?: string[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: "Non authentifié." };

  const raws = Array.from({ length: CODE_COUNT }, generateRaw);
  const rows = raws.map((raw) => ({
    user_id: user.id,
    code_hash: hashCode(raw),
  }));

  // Supprime les anciens codes puis insère les nouveaux
  await supabase.from("backup_codes").delete().eq("user_id", user.id);
  const { error: insertError } = await supabase.from("backup_codes").insert(rows);

  if (insertError) return { error: "Impossible de générer les codes. Réessayez." };

  return { codes: raws.map(formatCode) };
}

/**
 * Retourne le nombre de codes restants (non utilisés) et le total.
 */
export async function getBackupCodesStatus(): Promise<{
  remaining: number;
  total: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { remaining: 0, total: 0 };

  const { data, error } = await supabase
    .from("backup_codes")
    .select("used_at")
    .eq("user_id", user.id);

  if (error || !data) return { remaining: 0, total: 0 };

  return {
    total: data.length,
    remaining: data.filter((r) => !r.used_at).length,
  };
}

/**
 * Régénère 8 nouveaux codes (alias de generateBackupCodes).
 */
export async function regenerateBackupCodes(): Promise<{
  codes?: string[];
  error?: string;
}> {
  return generateBackupCodes();
}

/**
 * Vérifie un code de secours puis désactive la 2FA (supprime le facteur TOTP).
 * Redirige vers /parametres en cas de succès.
 * Le facteur TOTP est supprimé via l'Admin API (service role) pour contourner
 * l'exigence AAL2 et permettre l'accès au dashboard.
 */
export async function verifyAndUnenrollWithBackupCode(
  rawInput: string,
  factorId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: "Non authentifié." };

  // Validation du format (16 chars hex) après normalisation
  const normalized = rawInput.toLowerCase().replace(/[-\s]/g, "");
  if (!/^[0-9a-f]{16}$/.test(normalized)) {
    return { error: "Format invalide. Exemple : ABCD-EFGH-1234-5678." };
  }

  // Validation de l'UUID du facteur
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(factorId)) {
    return { error: "Identifiant de facteur invalide." };
  }

  // Recherche du code dans la base (non utilisé, appartenant à l'utilisateur)
  const hash = hashCode(normalized);
  const { data: codeRow } = await supabase
    .from("backup_codes")
    .select("id")
    .eq("user_id", user.id)
    .eq("code_hash", hash)
    .is("used_at", null)
    .limit(1)
    .single();

  if (!codeRow) {
    return { error: "Code de secours invalide ou déjà utilisé." };
  }

  // Suppression du facteur TOTP via l'Admin REST API (service role)
  // Cela retire l'exigence AAL2 et permet l'accès au dashboard
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const deleteRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${user.id}/factors/${factorId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    }
  );

  if (!deleteRes.ok) {
    return {
      error:
        "Impossible de désactiver la 2FA pour l'instant. Réessayez dans quelques instants.",
    };
  }

  // Code validé et facteur supprimé — on nettoie tous les codes de secours
  await supabase.from("backup_codes").delete().eq("user_id", user.id);

  return {};
}
