"use server";

import { calculerCotisations, isAcreEligible } from "@/lib/calculators/urssaf";
import type { Regime } from "@/types/database";
import { PLAFONDS_CA } from "@/types/database";
import { z } from "zod";

// ─── Schéma de validation ────────────────────────────────────────────────────

const simulateurSchema = z.object({
  regime: z.enum(["bic_marchandises", "bic_services", "bnc"] as const, {
    error: "Choisissez un régime fiscal",
  }),
  montant_ca: z
    .number()
    .min(0, "Le CA ne peut pas être négatif")
    .max(1_000_000, "Montant trop élevé"),
  annee: z.number().int().min(2000, "Année invalide").max(2100, "Année invalide"),
  mois: z.number().int().min(1, "Mois invalide").max(12, "Mois invalide"),
  acre: z.boolean().default(false),
  versement_liberatoire: z.boolean().default(false),
  date_debut_activite: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format invalide")
    .optional()
    .or(z.literal("")),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimulateurResult {
  success: boolean;
  error?: string;
  data?: {
    regime: Regime;
    montant_ca: number;
    taux_cotisations: number;
    montant_cotisations: number;
    taux_versement_liberatoire: number | null;
    montant_versement_liberatoire: number | null;
    total_a_payer: number;
    revenu_net: number;
    acre_applique: boolean;
    // Projection mensuelle × 12
    ca_annualise: number;
    cotisations_annualisees: number;
    net_annualise: number;
    // Rapport au plafond CA annuel
    plafond: number;
    ratio_plafond_mensuel: number;
    marge_plafond_mensuel: number;
  };
}

// ─── Action ──────────────────────────────────────────────────────────────────

/**
 * Simule le calcul de cotisations URSSAF sans aucune sauvegarde en base.
 * Aucune authentification requise — calcul purement mathématique sur des taux publics.
 * Input validé strictement via Zod pour éviter tout débordement.
 */
export async function simulerCotisations(
  _prevState: SimulateurResult,
  formData: FormData
): Promise<SimulateurResult> {
  const raw = {
    regime: formData.get("regime"),
    montant_ca: parseFloat(formData.get("montant_ca") as string),
    annee: parseInt(formData.get("annee") as string, 10),
    mois: parseInt(formData.get("mois") as string, 10),
    acre: formData.get("acre") === "true",
    versement_liberatoire: formData.get("versement_liberatoire") === "true",
    date_debut_activite: (formData.get("date_debut_activite") as string) ?? "",
  };

  const parsed = simulateurSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Données invalides.";
    return { success: false, error: msg };
  }

  const {
    regime,
    montant_ca,
    annee,
    mois,
    acre,
    versement_liberatoire,
    date_debut_activite,
  } = parsed.data;

  // Vérification éligibilité ACRE si date fournie
  const acreEffectif =
    acre && date_debut_activite ? isAcreEligible(date_debut_activite, annee, mois) : acre;

  const resultat = calculerCotisations({
    montant_ca,
    regime,
    acre: acreEffectif,
    versement_liberatoire,
    annee,
  });

  const plafond = PLAFONDS_CA[regime];

  return {
    success: true,
    data: {
      regime,
      montant_ca,
      taux_cotisations: resultat.taux_cotisations,
      montant_cotisations: resultat.montant_cotisations,
      taux_versement_liberatoire: resultat.taux_versement_liberatoire,
      montant_versement_liberatoire: resultat.montant_versement_liberatoire,
      total_a_payer: resultat.total_a_payer,
      revenu_net: resultat.revenu_net,
      acre_applique: resultat.acre_applique,
      ca_annualise: Math.round(montant_ca * 12),
      cotisations_annualisees: Math.round(resultat.total_a_payer * 12),
      net_annualise: Math.round(resultat.revenu_net * 12),
      plafond,
      ratio_plafond_mensuel: plafond > 0 ? (montant_ca / plafond) * 100 : 0,
      marge_plafond_mensuel: Math.max(plafond - montant_ca, 0),
    },
  };
}
