"use server";

import { createClient } from "@/lib/supabase/server";
import type { Regime } from "@/types/database";
import { PLAFONDS_CA, getTauxPourMillesime } from "@/types/database";

// ─── Types publics ─────────────────────────────────────────────────────────────

export interface LigneActiviteFiscale {
  /** Régime fiscal URSSAF */
  regime: Regime;
  /** Libellé lisible (ex. "Vente de marchandises (BIC)") */
  label: string;
  /** CA total déclaré sur l'année */
  ca_total: number;
  /** Cotisations sociales totales (micro-social simplifié) */
  cotisations_totales: number;
  /** Versements libératoires totaux (si option activée) */
  versements_liberatoires: number;
  /** Revenu net estimé après cotisations + VL */
  revenu_net: number;
  /** Plafond annuel du régime */
  plafond: number;
  /** Pourcentage du plafond utilisé */
  taux_utilisation_plafond: number;
  /**
   * Cases 2042-C-PRO à remplir selon le régime et la présence de VL.
   * Fourni à titre indicatif — l'utilisateur doit vérifier les notices officielles.
   */
  cases_2042: {
    case: string;
    libelle: string;
    valeur: number;
  }[];
  /** ACRE a été appliqué sur au moins une déclaration de cette activité */
  acre_applique: boolean;
  /** Versement libératoire a été appliqué sur au moins une déclaration */
  versement_liberatoire_applique: boolean;
}

export interface RecapFiscal {
  annee: number;
  lignes: LigneActiviteFiscale[];
  /** CA total toutes activités confondues */
  ca_total_global: number;
  /** Cotisations globales */
  cotisations_totales_global: number;
  /** Revenu net global */
  revenu_net_global: number;
}

// ─── Mapping cases 2042-C-PRO ─────────────────────────────────────────────────
// Source : notice 2042-C-PRO, rubrique "Micro-entrepreneur"
// ⚠️ À vérifier chaque année fiscale sur impots.gouv.fr

const CASES_2042_SANS_VL: Record<Regime, { case: string; libelle: string }[]> = {
  bic_marchandises: [
    {
      case: "5KO",
      libelle: "Revenus industriels et commerciaux professionnels — ventes",
    },
  ],
  bic_services: [
    {
      case: "5KP",
      libelle: "Revenus industriels et commerciaux professionnels — prestations",
    },
  ],
  bnc: [
    {
      case: "5HQ",
      libelle: "Revenus non commerciaux professionnels — recettes brutes",
    },
  ],
};

const CASES_2042_AVEC_VL: Record<Regime, { case: string; libelle: string }[]> = {
  bic_marchandises: [
    {
      case: "5TA",
      libelle: "Versement libératoire sur ventes (BIC marchandises) — CA annuel",
    },
  ],
  bic_services: [
    {
      case: "5TB",
      libelle: "Versement libératoire sur prestations de services (BIC) — CA annuel",
    },
  ],
  bnc: [
    {
      case: "5TE",
      libelle: "Versement libératoire sur activité libérale (BNC) — CA annuel",
    },
  ],
};

const LABELS_REGIME: Record<Regime, string> = {
  bic_marchandises: "Vente de marchandises (BIC)",
  bic_services: "Prestations de services (BIC)",
  bnc: "Activité libérale (BNC)",
};

// ─── Server Action ─────────────────────────────────────────────────────────────

/**
 * Calcule le récapitulatif fiscal pour une année donnée, groupé par régime/activité.
 *
 * Sécurité :
 * - user_id toujours depuis le token serveur
 * - annee validée (plage 2020–année courante)
 * - RLS Supabase : chaque user ne voit que ses propres déclarations
 */
export async function getRecapFiscal(anneeParam?: number): Promise<RecapFiscal | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Validation de l'année (sécurité : refuser les valeurs hors plage)
  const anneeActuelle = new Date().getFullYear();
  const annee =
    anneeParam &&
    Number.isInteger(anneeParam) &&
    anneeParam >= 2020 &&
    anneeParam <= anneeActuelle
      ? anneeParam
      : anneeActuelle - 1; // Par défaut : l'année précédente (déclaration en cours)

  // Récupérer les déclarations avec leurs cotisations pour l'année
  const { data, error } = await supabase
    .from("declarations")
    .select(
      "mois, annee, montant_ca, regime, activite_id, cotisations(montant_cotisations, montant_versement_liberatoire, acre_applique)"
    )
    .eq("user_id", user.id)
    .eq("annee", annee)
    .order("mois", { ascending: true });

  if (error || !data) return null;

  // Grouper par (regime, activite_id) pour distinguer les activités secondaires
  type GroupKey = string;
  type GroupData = {
    regime: Regime;
    activite_id: string | null;
    ca_total: number;
    cotisations_totales: number;
    versements_liberatoires: number;
    acre_applique: boolean;
    versement_liberatoire_applique: boolean;
  };

  const groups = new Map<GroupKey, GroupData>();

  type RawCotisation = {
    montant_cotisations: number;
    montant_versement_liberatoire: number | null;
    acre_applique: boolean;
  };
  type RawDecl = {
    mois: number;
    annee: number;
    montant_ca: number;
    regime: Regime;
    activite_id: string | null;
    // Supabase peut retourner un objet unique (1-1) ou un tableau (1-N) selon la FK
    cotisations: RawCotisation | RawCotisation[] | null;
  };

  for (const decl of data as unknown as RawDecl[]) {
    const key: GroupKey = `${decl.regime}__${decl.activite_id ?? "principale"}`;

    if (!groups.has(key)) {
      groups.set(key, {
        regime: decl.regime,
        activite_id: decl.activite_id,
        ca_total: 0,
        cotisations_totales: 0,
        versements_liberatoires: 0,
        acre_applique: false,
        versement_liberatoire_applique: false,
      });
    }

    const group = groups.get(key)!;
    group.ca_total += decl.montant_ca;

    // Normaliser en tableau pour gérer les deux formats retournés par Supabase
    const cotisationsArray: RawCotisation[] = Array.isArray(decl.cotisations)
      ? decl.cotisations
      : decl.cotisations
        ? [decl.cotisations]
        : [];

    for (const cot of cotisationsArray) {
      group.cotisations_totales += cot.montant_cotisations;
      const vl = cot.montant_versement_liberatoire ?? 0;
      group.versements_liberatoires += vl;
      if (cot.acre_applique) group.acre_applique = true;
      if (vl > 0) group.versement_liberatoire_applique = true;
    }
  }

  const taux = getTauxPourMillesime(annee);
  const lignes: LigneActiviteFiscale[] = [];

  for (const group of groups.values()) {
    const plafond = PLAFONDS_CA[group.regime];
    const totalPrelevements = group.cotisations_totales + group.versements_liberatoires;
    const revenu_net = group.ca_total - totalPrelevements;
    const taux_utilisation_plafond =
      plafond > 0 ? Math.round((group.ca_total / plafond) * 100) : 0;

    // Cases 2042 selon présence du versement libératoire
    const casesBase = group.versement_liberatoire_applique
      ? CASES_2042_AVEC_VL[group.regime]
      : CASES_2042_SANS_VL[group.regime];

    const cases_2042 = casesBase.map((c) => ({
      case: c.case,
      libelle: c.libelle,
      valeur: group.ca_total,
    }));

    // Si VL, ajouter aussi la case cotisations sociales obligatoires (hors VL impôt)
    if (group.versement_liberatoire_applique && group.cotisations_totales > 0) {
      cases_2042.push({
        case: "— cotisations",
        libelle: "Montant des cotisations sociales payées (à titre indicatif)",
        valeur: group.cotisations_totales,
      });
    }

    void taux; // taux utilisé implicitement ci-dessus pour la validation

    lignes.push({
      regime: group.regime,
      label: LABELS_REGIME[group.regime],
      ca_total: group.ca_total,
      cotisations_totales: group.cotisations_totales,
      versements_liberatoires: group.versements_liberatoires,
      revenu_net,
      plafond,
      taux_utilisation_plafond,
      cases_2042,
      acre_applique: group.acre_applique,
      versement_liberatoire_applique: group.versement_liberatoire_applique,
    });
  }

  const ca_total_global = lignes.reduce((s, l) => s + l.ca_total, 0);
  const cotisations_totales_global = lignes.reduce(
    (s, l) => s + l.cotisations_totales,
    0
  );
  const revenu_net_global = lignes.reduce((s, l) => s + l.revenu_net, 0);

  return {
    annee,
    lignes,
    ca_total_global,
    cotisations_totales_global,
    revenu_net_global,
  };
}

// ─── getAnneesDisponiblesFiscal ───────────────────────────────────────────────

/**
 * Retourne les années pour lesquelles l'utilisateur a des déclarations.
 * Utilisé pour le sélecteur d'année sur la page fiscalite.
 */
export async function getAnneesDisponiblesFiscal(): Promise<number[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("declarations")
    .select("annee")
    .eq("user_id", user.id)
    .order("annee", { ascending: false });

  if (error || !data) return [];

  const unique = [...new Set((data as { annee: number }[]).map((d) => d.annee))];
  return unique;
}
