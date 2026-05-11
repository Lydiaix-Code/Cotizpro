"use server";

import { createClient } from "@/lib/supabase/server";

export interface MFAFactor {
  id: string;
  friendly_name: string;
  status: "unverified" | "verified";
}

// ─── Lister les facteurs TOTP enrôlés ────────────────────────────────────────

export async function getMFAFactors(): Promise<{
  factors: MFAFactor[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { factors: [] };
  return { factors: (data?.totp ?? []) as MFAFactor[] };
}

// ─── Désactiver la 2FA ────────────────────────────────────────────────────────

export async function unenrollMFA(factorId: string): Promise<{ error?: string }> {
  // Validation entrée
  if (
    !factorId ||
    typeof factorId !== "string" ||
    factorId.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(factorId)
  ) {
    return { error: "Identifiant de facteur invalide" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) {
    // Supabase exige AAL2 pour unenroll — message clair à l'utilisateur
    if (
      error.message.toLowerCase().includes("aal2") ||
      error.message.toLowerCase().includes("assurance")
    ) {
      return {
        error:
          "Reconnectez-vous avec votre code 2FA pour pouvoir désactiver cette protection.",
      };
    }
    return { error: "Impossible de désactiver la 2FA. Réessayez." };
  }

  return {};
}
