/**
 * Types TypeScript pour l'application Cotizpro
 *
 * - `Database` : généré automatiquement depuis Supabase (database.gen.ts)
 *   → à régénérer avec : npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.gen.ts
 * - Constantes métier URSSAF : définies ici
 */

// ─── Réexport du type Database généré ────────────────────────────────────────

export type { Database } from "./database.gen";

// ─── Types dérivés des enums Supabase ────────────────────────────────────────

import type { Database as DB } from "./database.gen";

export type Regime = DB["public"]["Enums"]["regime_fiscal"];
export type FrequenceDeclaration = DB["public"]["Enums"]["frequence_declaration"];
export type StatutAbonnement = DB["public"]["Enums"]["statut_abonnement"];

// ─── Types de lignes dérivés des tables ──────────────────────────────────────

export type Profile = DB["public"]["Tables"]["profiles"]["Row"];
export type Declaration = DB["public"]["Tables"]["declarations"]["Row"];
export type Cotisation = DB["public"]["Tables"]["cotisations"]["Row"];
export type Abonnement = DB["public"]["Tables"]["abonnements"]["Row"];
export type Activite = DB["public"]["Tables"]["activites"]["Row"];

// ─── Taux de cotisations URSSAF (MICRO-SOCIAL) ───────────────────────────────
// ⚠️  Source officielle : https://www.urssaf.fr/portail/home/auto-entrepreneur
// ⚠️  À VÉRIFIER et mettre à jour dans TAUX_PAR_MILLESIME chaque 1er janvier.
// Dernière vérification : janvier 2026.

export type TauxMillesime = {
  normal: Record<Regime, number>;
  acre: Record<Regime, number>;
  versementLiberatoire: Record<Regime, number>;
};

/**
 * Table des taux URSSAF par millésime (année calendaire).
 * Ajouter une entrée ici chaque 1er janvier après vérification sur urssaf.fr.
 */
const TAUX_PAR_MILLESIME: Record<number, TauxMillesime> = {
  2024: {
    normal: { bic_marchandises: 0.123, bic_services: 0.212, bnc: 0.231 },
    acre: { bic_marchandises: 0.0615, bic_services: 0.106, bnc: 0.1155 },
    versementLiberatoire: { bic_marchandises: 0.01, bic_services: 0.017, bnc: 0.022 },
  },
  2025: {
    normal: { bic_marchandises: 0.123, bic_services: 0.212, bnc: 0.231 },
    acre: { bic_marchandises: 0.0615, bic_services: 0.106, bnc: 0.1155 },
    versementLiberatoire: { bic_marchandises: 0.01, bic_services: 0.017, bnc: 0.022 },
  },
  2026: {
    normal: { bic_marchandises: 0.123, bic_services: 0.212, bnc: 0.231 },
    acre: { bic_marchandises: 0.0615, bic_services: 0.106, bnc: 0.1155 },
    versementLiberatoire: { bic_marchandises: 0.01, bic_services: 0.017, bnc: 0.022 },
  },
};

const MILLESIME_MIN = 2024;
const MILLESIME_MAX = 2026;

/**
 * Retourne les taux URSSAF applicables pour un millésime donné.
 * Utilise le millésime le plus proche si l'année n'est pas dans la table.
 */
export function getTauxPourMillesime(annee: number): TauxMillesime {
  const clamped = Math.min(Math.max(annee, MILLESIME_MIN), MILLESIME_MAX);
  return TAUX_PAR_MILLESIME[clamped];
}

// Aliases rétrocompatibles — pointent toujours sur le millésime courant (2026)
export const TAUX_COTISATIONS: Record<Regime, number> =
  TAUX_PAR_MILLESIME[MILLESIME_MAX].normal;
export const TAUX_COTISATIONS_ACRE: Record<Regime, number> =
  TAUX_PAR_MILLESIME[MILLESIME_MAX].acre;
export const TAUX_VERSEMENT_LIBERATOIRE: Record<Regime, number> =
  TAUX_PAR_MILLESIME[MILLESIME_MAX].versementLiberatoire;

// ─── Plafonds CA annuels ──────────────────────────────────────────────────────

export const PLAFONDS_CA: Record<Regime, number> = {
  bic_marchandises: 188700,
  bic_services: 77700,
  bnc: 77700,
} as const;

export const LABELS_REGIME: Record<Regime, string> = {
  bic_marchandises: "Vente de marchandises (BIC)",
  bic_services: "Prestations de services (BIC)",
  bnc: "Activité libérale (BNC)",
} as const;

// ─── Résultat calcul cotisations ──────────────────────────────────────────────

export interface ResultatCalcul {
  montant_ca: number;
  taux_cotisations: number;
  montant_cotisations: number;
  taux_versement_liberatoire: number | null;
  montant_versement_liberatoire: number | null;
  total_a_payer: number;
  revenu_net: number;
  acre_applique: boolean;
}
