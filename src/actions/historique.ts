"use server";

import { getIsPremium } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";
import type { Regime } from "@/types/database";
import { LABELS_REGIME, PLAFONDS_CA } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MoisDetail {
  mois: number;
  label_mois: string;
  montant_ca: number;
  cotisations: number;
  versement_liberatoire: number;
  total_charges: number;
  revenu_net: number;
  taux_applique: number;
  acre_applique: boolean;
  /** null = activité principale (profiles.regime) */
  activite_id: string | null;
  activite_nom: string | null;
}

export interface HistoriqueAnnee {
  annee: number;
  regime: Regime;
  label_regime: string;
  mois: MoisDetail[];
  totaux: {
    ca: number;
    cotisations: number;
    versement_liberatoire: number;
    total_charges: number;
    revenu_net: number;
  };
  plafond: number;
  pourcentage_plafond: number;
}

const NOMS_MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

// ─── Helpers privés ──────────────────────────────────────────────────────────

function isValidUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { user: null, supabase };
  return { user, supabase };
}

// ─── Validation de l'année (sécurité — jamais faire confiance au client) ──────

function validerAnnee(annee: unknown): number | null {
  const n = typeof annee === "number" ? annee : parseInt(String(annee), 10);
  const anneeActuelle = new Date().getFullYear();
  if (isNaN(n) || n < 2000 || n > anneeActuelle) return null;
  return n;
}

// ─── getAnneesDisponibles ─────────────────────────────────────────────────────

/**
 * Retourne la liste des années pour lesquelles l'utilisateur a au moins
 * une déclaration, triées de la plus récente à la plus ancienne.
 */
export async function getAnneesDisponibles(): Promise<number[]> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("declarations")
    .select("annee")
    .eq("user_id", user.id)
    .order("annee", { ascending: false });

  if (error || !data) return [];

  // Dédoublonner — on ne peut pas faire un DISTINCT via le client Supabase
  const annees = [...new Set(data.map((d) => d.annee))];
  return annees;
}

// ─── getHistoriqueAnnee ───────────────────────────────────────────────────────

/**
 * Retourne le récapitulatif complet d'une année : détail mois par mois + totaux.
 * Sécurité :
 *  - user_id toujours depuis le token serveur
 *  - l'année est validée côté serveur (bornes 2000 → année actuelle)
 *  - activiteIdRaw validé : UUID format + ownership query (jamais faire confiance au client)
 *  - le regime/plafond vient du profil OU de l'activité côté serveur, jamais du client
 *
 * @param activiteIdRaw  undefined = toutes les activités
 *                       "principale" = déclarations sans activité (activite_id IS NULL)
 *                       UUID = déclarations de cette activité (après vérif ownership)
 */
export async function getHistoriqueAnnee(
  anneeRaw: unknown,
  activiteIdRaw?: string
): Promise<HistoriqueAnnee | null> {
  const annee = validerAnnee(anneeRaw);
  if (!annee) return null;

  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return null;

  // Récupérer le profil pour le régime (source de vérité serveur)
  const { data: profile } = await supabase
    .from("profiles")
    .select("regime")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;

  // ── Validation sécurisée du filtre activite ───────────────────────────────
  // « principale » = filtre sur activite_id IS NULL
  // UUID valide  = vérif ownership stricte avant d'utiliser la valeur
  type ActiviteFilter =
    | { type: "all" }
    | { type: "principale" }
    | { type: "activite"; id: string; regime: Regime; nom: string };

  let activiteFilter: ActiviteFilter = { type: "all" };

  if (activiteIdRaw && activiteIdRaw.trim() !== "") {
    if (activiteIdRaw === "principale") {
      activiteFilter = { type: "principale" };
    } else if (isValidUUID(activiteIdRaw)) {
      // Les activités secondaires sont réservées aux membres Premium.
      const isPremium = await getIsPremium();
      if (isPremium) {
        // Vérifier ownership + récupérer infos régime côté serveur (jamais du client)
        const { data: act } = await supabase
          .from("activites")
          .select("id, regime, nom")
          .eq("id", activiteIdRaw)
          .eq("user_id", user.id)
          .single();
        if (!act) return null; // UUID inconnu ou pas au bon utilisateur → refus silencieux
        activiteFilter = {
          type: "activite",
          id: act.id,
          regime: act.regime as Regime,
          nom: act.nom,
        };
      }
      // Si pas premium → activiteFilter reste "all" (toutes activités agrégées)
    }
    // UUID malformé → retomber sur "all" (comportement sûr)
  }

  // Régime et plafond effectifs selon le filtre
  const effectiveRegime: Regime =
    activiteFilter.type === "activite"
      ? activiteFilter.regime
      : (profile.regime as Regime);

  type DeclRow = {
    mois: number;
    montant_ca: number;
    activite_id: string | null;
    activites: { nom: string } | null;
    cotisations: Array<{
      montant_cotisations: number;
      montant_versement_liberatoire: number | null;
      taux_applique: number;
      acre_applique: boolean;
    }>;
  };

  let query = supabase
    .from("declarations")
    .select(
      "mois, montant_ca, activite_id, activites(nom), cotisations(montant_cotisations, montant_versement_liberatoire, taux_applique, acre_applique)"
    )
    .eq("user_id", user.id)
    .eq("annee", annee);

  // Appliquer le filtre activité (valeur déjà vérifiée côté serveur)
  if (activiteFilter.type === "principale") {
    query = query.is("activite_id", null);
  } else if (activiteFilter.type === "activite") {
    query = query.eq("activite_id", activiteFilter.id);
  }

  const { data, error } = await query.order("mois", { ascending: true });

  if (error) return null;

  const decls = (data ?? []) as unknown as DeclRow[];

  // Construire le détail par mois
  const moisDetails: MoisDetail[] = decls.map((d) => {
    const c = d.cotisations[0];
    const cotisations = c?.montant_cotisations ?? 0;
    const versement_liberatoire = c?.montant_versement_liberatoire ?? 0;
    const total_charges = cotisations + versement_liberatoire;
    return {
      mois: d.mois,
      label_mois: NOMS_MOIS[d.mois - 1],
      montant_ca: d.montant_ca,
      cotisations,
      versement_liberatoire,
      total_charges,
      revenu_net: d.montant_ca - total_charges,
      taux_applique: c?.taux_applique ?? 0,
      acre_applique: c?.acre_applique ?? false,
      activite_id: d.activite_id,
      activite_nom: d.activites?.nom ?? null,
    };
  });

  // Totaux annuels
  const totaux = moisDetails.reduce(
    (acc, m) => ({
      ca: acc.ca + m.montant_ca,
      cotisations: acc.cotisations + m.cotisations,
      versement_liberatoire: acc.versement_liberatoire + m.versement_liberatoire,
      total_charges: acc.total_charges + m.total_charges,
      revenu_net: acc.revenu_net + m.revenu_net,
    }),
    { ca: 0, cotisations: 0, versement_liberatoire: 0, total_charges: 0, revenu_net: 0 }
  );

  const plafond = PLAFONDS_CA[effectiveRegime];
  const pourcentage_plafond =
    plafond > 0 ? Math.min(Math.round((totaux.ca / plafond) * 100), 100) : 0;

  return {
    annee,
    regime: effectiveRegime,
    label_regime: LABELS_REGIME[effectiveRegime],
    mois: moisDetails,
    totaux,
    plafond,
    pourcentage_plafond,
  };
}
