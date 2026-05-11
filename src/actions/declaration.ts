"use server";

import { calculerCotisations, isAcreEligible } from "@/lib/calculators/urssaf";
import { getIsPremium } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";
import { declarationSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export type DeclarationActionResult = {
  success: boolean;
  error?: string;
};

// ─── Helpers privés ───────────────────────────────────────────────────────────

/** Récupère l'utilisateur authentifié ou lance une erreur typée. */
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { user: null, supabase };
  return { user, supabase };
}

/**
 * Vérifie que la déclaration id appartient bien à user_id.
 * Principe de sécurité : ne jamais faire confiance au client pour l'ownership.
 */
async function verifierOwnership(declarationId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("declarations")
    .select("id")
    .eq("id", declarationId)
    .eq("user_id", userId)
    .single();
  return !error && !!data;
}

/**
 * Vérifie que l'activite_id fourni appartient bien à userId et est actif.
 * Retourne le profil de l'activité (regime, acre, versement_liberatoire) si valide.
 * Retourne null si invalide ou non trouvé (ne jamais faire confiance au client).
 */
async function verifierActivite(
  activiteId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  if (!isValidUUID(activiteId)) return null;
  const { data, error } = await supabase
    .from("activites")
    .select("id, regime, acre, versement_liberatoire, date_debut")
    .eq("id", activiteId)
    .eq("user_id", userId)
    .eq("actif", true)
    .single();
  if (error || !data) return null;
  return data;
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

// ─── createDeclaration ────────────────────────────────────────────────────────

/**
 * Crée une déclaration CA + calcule et sauvegarde les cotisations.
 * Sécurité :
 *  - user_id toujours depuis le token serveur
 *  - regime toujours depuis le profil OU l'activité côté serveur (jamais depuis formData)
 *  - activite_id vérifié : ownership + actif avant usage
 *  - doublon détecté via UNIQUE constraint Supabase (mois+annee+user_id+activite_id)
 */
export async function createDeclaration(
  _prevState: DeclarationActionResult,
  formData: FormData
): Promise<DeclarationActionResult> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Session expirée. Reconnectez-vous." };

  // Validation Zod
  const raw = {
    mois: parseInt(formData.get("mois") as string, 10),
    annee: parseInt(formData.get("annee") as string, 10),
    montant_ca: parseFloat(formData.get("montant_ca") as string),
  };

  const parsed = declarationSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Données invalides.";
    return { success: false, error: msg };
  }

  const { mois, annee, montant_ca } = parsed.data;

  // Bloquer une déclaration dans le futur
  const now = new Date();
  const isInFuture =
    annee > now.getFullYear() ||
    (annee === now.getFullYear() && mois > now.getMonth() + 1);
  if (isInFuture) {
    return { success: false, error: "Impossible de déclarer un mois futur." };
  }

  // activite_id optionnel — si fourni, vérification ownership stricte côté serveur
  const activiteIdRaw = formData.get("activite_id");
  let activiteId: string | null = null;
  let activiteProfile: {
    regime: string;
    acre: boolean;
    versement_liberatoire: boolean;
    date_debut_activite: string | null;
  } | null = null;

  if (activiteIdRaw && typeof activiteIdRaw === "string" && activiteIdRaw.trim() !== "") {
    // Les activités secondaires sont réservées aux membres Premium.
    const isPremium = await getIsPremium();
    if (!isPremium) {
      return {
        success: false,
        error: "Les activités secondaires sont réservées aux membres Premium.",
      };
    }
    const activite = await verifierActivite(activiteIdRaw.trim(), user.id, supabase);
    if (!activite) {
      return { success: false, error: "Activité invalide ou accès refusé." };
    }
    activiteId = activite.id;
    activiteProfile = {
      regime: activite.regime,
      acre: activite.acre,
      versement_liberatoire: activite.versement_liberatoire,
      date_debut_activite: activite.date_debut,
    };
  }

  // Récupérer le profil depuis le serveur — le regime ne vient JAMAIS du client
  // Si une activité est sélectionnée, ses paramètres priment sur le profil principal
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

  const effectiveProfile = activiteProfile ?? profile;

  // ACRE : applicable seulement les 12 premiers mois depuis le début d'activité
  const acreEffectif =
    (effectiveProfile.acre ?? false) &&
    isAcreEligible(effectiveProfile.date_debut_activite, annee, mois);

  // Insérer la déclaration
  const { data: declaration, error: insertError } = await supabase
    .from("declarations")
    .insert({
      user_id: user.id,
      mois,
      annee,
      montant_ca,
      regime: effectiveProfile.regime as import("@/types/database").Regime,
      ...(activiteId ? { activite_id: activiteId } : {}),
    })
    .select("id")
    .single();

  if (insertError) {
    // Code 23505 = UNIQUE violation (doublon mois/année)
    if (insertError.code === "23505") {
      return {
        success: false,
        error: `CA déjà déclaré pour ${mois}/${annee}${activiteId ? " sur cette activité" : ""}.`,
      };
    }
    console.error("[createDeclaration]", insertError.code, insertError.message);
    return { success: false, error: "Erreur lors de la sauvegarde. Réessayez." };
  }

  // Calculer et sauvegarder les cotisations (transaction implicite)
  const resultat = calculerCotisations({
    montant_ca,
    regime: effectiveProfile.regime as import("@/types/database").Regime,
    acre: acreEffectif,
    versement_liberatoire: effectiveProfile.versement_liberatoire ?? false,
    annee,
  });

  const periode = `${annee}-${String(mois).padStart(2, "0")}`;

  await supabase.from("cotisations").insert({
    declaration_id: declaration.id,
    user_id: user.id,
    montant_cotisations: resultat.montant_cotisations,
    montant_versement_liberatoire: resultat.montant_versement_liberatoire,
    taux_applique: resultat.taux_cotisations,
    acre_applique: resultat.acre_applique,
    periode,
  });

  revalidatePath("/dashboard");
  revalidatePath("/declaration");
  revalidatePath("/cotisations");

  return { success: true };
}

// ─── updateDeclaration ────────────────────────────────────────────────────────

export async function updateDeclaration(
  declarationId: string,
  _prevState: DeclarationActionResult,
  formData: FormData
): Promise<DeclarationActionResult> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Session expirée. Reconnectez-vous." };

  // Vérification ownership — sécurité critique
  const isOwner = await verifierOwnership(declarationId, user.id);
  if (!isOwner) return { success: false, error: "Accès refusé." };

  const raw = {
    mois: parseInt(formData.get("mois") as string, 10),
    annee: parseInt(formData.get("annee") as string, 10),
    montant_ca: parseFloat(formData.get("montant_ca") as string),
  };

  const parsed = declarationSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Données invalides.";
    return { success: false, error: msg };
  }

  const { mois, annee, montant_ca } = parsed.data;

  // activite_id optionnel — vérification ownership si fourni
  const activiteIdRaw = formData.get("activite_id");
  let activiteProfile: {
    regime: string;
    acre: boolean;
    versement_liberatoire: boolean;
    date_debut_activite: string | null;
  } | null = null;
  let activiteId: string | null = null;

  if (activiteIdRaw && typeof activiteIdRaw === "string" && activiteIdRaw.trim() !== "") {
    // Les activités secondaires sont réservées aux membres Premium.
    const isPremium = await getIsPremium();
    if (!isPremium) {
      return {
        success: false,
        error: "Les activités secondaires sont réservées aux membres Premium.",
      };
    }
    const activite = await verifierActivite(activiteIdRaw.trim(), user.id, supabase);
    if (!activite) return { success: false, error: "Activité invalide ou accès refusé." };
    activiteId = activite.id;
    activiteProfile = {
      regime: activite.regime,
      acre: activite.acre,
      versement_liberatoire: activite.versement_liberatoire,
      date_debut_activite: activite.date_debut,
    };
  }

  // Récupérer le profil serveur
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("regime, acre, versement_liberatoire, date_debut_activite")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "Profil introuvable." };
  }

  const effectiveProfile = activiteProfile ?? profile;

  // ACRE : applicable seulement les 12 premiers mois depuis le début d'activité
  const acreEffectif =
    (effectiveProfile.acre ?? false) &&
    isAcreEligible(effectiveProfile.date_debut_activite, annee, mois);

  // UPDATE déclaration
  const { error: updateError } = await supabase
    .from("declarations")
    .update({
      mois,
      annee,
      montant_ca,
      regime: effectiveProfile.regime as import("@/types/database").Regime,
      activite_id: activiteId,
    })
    .eq("id", declarationId)
    .eq("user_id", user.id); // Double vérification ownership au niveau SQL

  if (updateError) {
    if (updateError.code === "23505") {
      return { success: false, error: `CA déjà déclaré pour ${mois}/${annee}.` };
    }
    return { success: false, error: "Erreur lors de la mise à jour." };
  }

  // Recalculer les cotisations
  const resultat = calculerCotisations({
    montant_ca,
    regime: effectiveProfile.regime as import("@/types/database").Regime,
    acre: acreEffectif,
    versement_liberatoire: effectiveProfile.versement_liberatoire ?? false,
    annee,
  });

  const periode = `${annee}-${String(mois).padStart(2, "0")}`;

  await supabase
    .from("cotisations")
    .update({
      montant_cotisations: resultat.montant_cotisations,
      montant_versement_liberatoire: resultat.montant_versement_liberatoire,
      taux_applique: resultat.taux_cotisations,
      acre_applique: resultat.acre_applique,
    })
    .eq("declaration_id", declarationId)
    .eq("user_id", user.id);

  // Si cotisation n'existait pas (edge case), on l'insère
  const { data: existing } = await supabase
    .from("cotisations")
    .select("id")
    .eq("declaration_id", declarationId)
    .single();

  if (!existing) {
    await supabase.from("cotisations").insert({
      declaration_id: declarationId,
      user_id: user.id,
      montant_cotisations: resultat.montant_cotisations,
      montant_versement_liberatoire: resultat.montant_versement_liberatoire,
      taux_applique: resultat.taux_cotisations,
      acre_applique: resultat.acre_applique,
      periode,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/declaration");
  revalidatePath("/cotisations");

  return { success: true };
}

// ─── deleteDeclaration ────────────────────────────────────────────────────────

export async function deleteDeclaration(
  declarationId: string
): Promise<DeclarationActionResult> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Session expirée. Reconnectez-vous." };

  // Vérification ownership
  const isOwner = await verifierOwnership(declarationId, user.id);
  if (!isOwner) return { success: false, error: "Accès refusé." };

  // La suppression cascade sur cotisations (FK ON DELETE CASCADE en SQL)
  const { error } = await supabase
    .from("declarations")
    .delete()
    .eq("id", declarationId)
    .eq("user_id", user.id); // Double vérification

  if (error) {
    return { success: false, error: "Erreur lors de la suppression." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/declaration");
  revalidatePath("/cotisations");

  return { success: true };
}

// ─── Types retour ─────────────────────────────────────────────────────────────

export interface DeclarationAvecCotisations {
  id: string;
  user_id: string;
  mois: number;
  annee: number;
  montant_ca: number;
  regime: string;
  activite_id: string | null;
  created_at: string;
  updated_at: string;
  cotisations: Array<{
    id: string;
    montant_cotisations: number;
    montant_versement_liberatoire: number | null;
    taux_applique: number;
    acre_applique: boolean;
    periode: string;
  }>;
}

// ─── getDeclarations ──────────────────────────────────────────────────────────

export async function getDeclarations(
  annee?: number
): Promise<DeclarationAvecCotisations[]> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return [];

  const targetAnnee = annee ?? new Date().getFullYear();

  const { data, error } = await supabase
    .from("declarations")
    .select("*, cotisations(*)")
    .eq("user_id", user.id)
    .eq("annee", targetAnnee)
    .order("mois", { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as DeclarationAvecCotisations[];
}

// ─── getDashboardStats ────────────────────────────────────────────────────────

export interface DashboardStats {
  annee: number;
  mois_en_cours: number;
  ca_mois_en_cours: number | null;
  ca_cumule_ytd: number;
  cotisations_ytd: number;
  revenu_net_ytd: number;
  nb_declarations: number;
  /** Vrai si le mois précédent (dans l'année en cours) n'a pas encore été déclaré */
  mois_precedent_manquant: boolean;
  /** CA total déclaré dans le trimestre en cours */
  ca_trimestre_en_cours: number;
  /** Cotisations totales du trimestre en cours */
  cotisations_trimestre_en_cours: number;
  /** Numéro du trimestre en cours (1-4) */
  num_trimestre: number;
  /** CA moyen par mois déclaré (null si aucune déclaration) */
  ca_moyen_mensuel: number | null;
}

type DeclStatRow = {
  mois: number;
  montant_ca: number;
  cotisations: Array<{
    montant_cotisations: number;
    montant_versement_liberatoire: number | null;
  }>;
};

export async function getDashboardStats(activiteIdRaw?: string): Promise<DashboardStats> {
  const { user, supabase } = await getAuthenticatedUser();
  const now = new Date();
  const annee = now.getFullYear();
  const moisEnCours = now.getMonth() + 1;
  const num_trimestre = Math.ceil(moisEnCours / 3);

  const empty: DashboardStats = {
    annee,
    mois_en_cours: moisEnCours,
    ca_mois_en_cours: null,
    ca_cumule_ytd: 0,
    cotisations_ytd: 0,
    revenu_net_ytd: 0,
    nb_declarations: 0,
    mois_precedent_manquant: false,
    ca_trimestre_en_cours: 0,
    cotisations_trimestre_en_cours: 0,
    num_trimestre,
    ca_moyen_mensuel: null,
  };

  if (!user) return empty;

  // ── Validation sécurisée du filtre activité ──────────────────────────────
  // Jamais faire confiance au param client sans recouper en base
  type StatsFilter =
    | { type: "all" }
    | { type: "principale" }
    | { type: "activite"; id: string };
  let statsFilter: StatsFilter = { type: "all" };

  if (activiteIdRaw && activiteIdRaw.trim() !== "") {
    if (activiteIdRaw === "principale") {
      statsFilter = { type: "principale" };
    } else if (isValidUUID(activiteIdRaw)) {
      // Les activités secondaires sont une fonctionnalité Premium uniquement.
      // Vérifier le statut premium côté serveur avant d'appliquer le filtre.
      const isPremium = await getIsPremium();
      if (isPremium) {
        // Vérifier ownership strict côté serveur
        const { data: act } = await supabase
          .from("activites")
          .select("id")
          .eq("id", activiteIdRaw)
          .eq("user_id", user.id)
          .single();
        if (act) statsFilter = { type: "activite", id: act.id };
        // Si non trouvé ou pas propriétaire → statsFilter reste "all" (sûr)
      }
      // Si pas premium → statsFilter reste "all" (toutes activités agrégées)
    }
  }

  let query = supabase
    .from("declarations")
    .select(
      "mois, montant_ca, cotisations(montant_cotisations, montant_versement_liberatoire)"
    )
    .eq("user_id", user.id)
    .eq("annee", annee);

  if (statsFilter.type === "principale") {
    query = query.is("activite_id", null);
  } else if (statsFilter.type === "activite") {
    query = query.eq("activite_id", statsFilter.id);
  }

  const { data, error } = await query;

  if (error || !data) return empty;

  const decls = data as unknown as DeclStatRow[];

  const mois_trim_debut = (num_trimestre - 1) * 3 + 1;
  const mois_trim_fin = num_trimestre * 3;

  let ca_cumule_ytd = 0;
  let ca_mois_en_cours: number | null = null;
  let cotisations_ytd = 0;
  let ca_trimestre_en_cours = 0;
  let cotisations_trimestre_en_cours = 0;
  const moisDeclaresSet = new Set<number>();

  for (const decl of decls) {
    ca_cumule_ytd += decl.montant_ca;
    moisDeclaresSet.add(decl.mois);
    const cotis = decl.cotisations[0];
    if (cotis) {
      cotisations_ytd +=
        cotis.montant_cotisations + (cotis.montant_versement_liberatoire ?? 0);
    }
    if (decl.mois === moisEnCours) {
      ca_mois_en_cours = decl.montant_ca;
    }
    if (decl.mois >= mois_trim_debut && decl.mois <= mois_trim_fin) {
      ca_trimestre_en_cours += decl.montant_ca;
      const cotisTrim = decl.cotisations[0];
      if (cotisTrim) {
        cotisations_trimestre_en_cours +=
          cotisTrim.montant_cotisations + (cotisTrim.montant_versement_liberatoire ?? 0);
      }
    }
  }

  // Mois précédent manquant — uniquement si on est au moins en février
  const mois_precedent_manquant =
    moisEnCours > 1 && !moisDeclaresSet.has(moisEnCours - 1);

  // CA moyen par mois déclaré (null si aucune déclaration)
  const ca_moyen_mensuel = decls.length > 0 ? ca_cumule_ytd / decls.length : null;

  return {
    annee,
    mois_en_cours: moisEnCours,
    ca_mois_en_cours,
    ca_cumule_ytd,
    cotisations_ytd,
    revenu_net_ytd: ca_cumule_ytd - cotisations_ytd,
    nb_declarations: decls.length,
    mois_precedent_manquant,
    ca_trimestre_en_cours,
    cotisations_trimestre_en_cours,
    num_trimestre,
    ca_moyen_mensuel,
  };
}

// ─── getChartData ─────────────────────────────────────────────────────────────

/**
 * Données pour les graphiques Premium.
 * Toutes les données sont agrégées côté serveur — le client ne reçoit
 * que des chiffres anonymisés, jamais les IDs ou user_id bruts.
 */

export interface MoisChartPoint {
  mois: string; // "Jan", "Fév", etc.
  mois_num: number; // 1-12 pour tri
  ca: number;
  cotisations: number;
  net: number;
}

export interface ChartData {
  annee: number;
  plafond: number;
  points: MoisChartPoint[];
  pointsN1: MoisChartPoint[];
  repartition: {
    ca_total: number;
    cotisations_total: number;
    net_total: number;
  };
}

const MOIS_COURTS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jul",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

export async function getChartData(
  annee?: number,
  activiteIdRaw?: string
): Promise<ChartData | null> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return null;

  const targetAnnee = annee ?? new Date().getFullYear();

  // Récupérer le profil (source de vérité pour le régime principal)
  const { data: profile } = await supabase
    .from("profiles")
    .select("regime")
    .eq("user_id", user.id)
    .single();

  // ── Validation sécurisée du filtre activité ───────────────────────────────
  // UUID validé + ownership re-vérifié en base — jamais faire confiance au client
  type ChartFilter =
    | { type: "all" }
    | { type: "principale" }
    | { type: "activite"; id: string; regime: string };

  let chartFilter: ChartFilter = { type: "all" };

  if (activiteIdRaw && activiteIdRaw.trim() !== "") {
    if (activiteIdRaw === "principale") {
      chartFilter = { type: "principale" };
    } else if (isValidUUID(activiteIdRaw)) {
      // Les activités secondaires sont réservées aux membres Premium.
      const isPremium = await getIsPremium();
      if (isPremium) {
        const { data: act } = await supabase
          .from("activites")
          .select("id, regime")
          .eq("id", activiteIdRaw)
          .eq("user_id", user.id)
          .single();
        if (!act) return null; // inconnu ou pas propriétaire → refus
        chartFilter = { type: "activite", id: act.id, regime: act.regime };
      }
      // Si pas premium → chartFilter reste "all" (toutes activités agrégées)
    }
    // UUID malformé → fallback "all" (comportement sûr)
  }

  // Récupérer les déclarations de l'année avec leurs cotisations
  let query = supabase
    .from("declarations")
    .select(
      "mois, montant_ca, cotisations(montant_cotisations, montant_versement_liberatoire)"
    )
    .eq("user_id", user.id)
    .eq("annee", targetAnnee);

  if (chartFilter.type === "principale") {
    query = query.is("activite_id", null);
  } else if (chartFilter.type === "activite") {
    query = query.eq("activite_id", chartFilter.id);
  }

  const { data, error } = await query.order("mois", { ascending: true });

  if (error || !data) return null;

  const decls = data as unknown as DeclStatRow[];

  // Construire les 12 points mensuels (mois sans déclaration = 0)
  const pointsMap = new Map<number, MoisChartPoint>();
  for (let m = 1; m <= 12; m++) {
    pointsMap.set(m, {
      mois: MOIS_COURTS[m - 1],
      mois_num: m,
      ca: 0,
      cotisations: 0,
      net: 0,
    });
  }

  let ca_total = 0;
  let cotisations_total = 0;

  for (const decl of decls) {
    const cotis = decl.cotisations[0];
    const cotisations = cotis
      ? cotis.montant_cotisations + (cotis.montant_versement_liberatoire ?? 0)
      : 0;
    const net = decl.montant_ca - cotisations;

    pointsMap.set(decl.mois, {
      mois: MOIS_COURTS[decl.mois - 1],
      mois_num: decl.mois,
      ca: decl.montant_ca,
      cotisations,
      net,
    });

    ca_total += decl.montant_ca;
    cotisations_total += cotisations;
  }

  // Régime et plafond effectifs selon le filtre (serveur, jamais client)
  const { PLAFONDS_CA } = await import("@/types/database");
  const effectiveRegime =
    chartFilter.type === "activite"
      ? (chartFilter.regime as import("@/types/database").Regime)
      : ((profile?.regime as import("@/types/database").Regime) ?? "bic_services");

  const plafond = PLAFONDS_CA[effectiveRegime] ?? 77700;

  // ── Données N-1 (année précédente, même filtre) ───────────────────────────
  let queryN1 = supabase
    .from("declarations")
    .select(
      "mois, montant_ca, cotisations(montant_cotisations, montant_versement_liberatoire)"
    )
    .eq("user_id", user.id)
    .eq("annee", targetAnnee - 1);

  if (chartFilter.type === "principale") {
    queryN1 = queryN1.is("activite_id", null);
  } else if (chartFilter.type === "activite") {
    queryN1 = queryN1.eq("activite_id", chartFilter.id);
  }

  const { data: dataN1 } = await queryN1.order("mois", { ascending: true });

  const pointsN1Map = new Map<number, MoisChartPoint>();
  for (let m = 1; m <= 12; m++) {
    pointsN1Map.set(m, {
      mois: MOIS_COURTS[m - 1],
      mois_num: m,
      ca: 0,
      cotisations: 0,
      net: 0,
    });
  }

  if (dataN1) {
    for (const decl of dataN1 as unknown as DeclStatRow[]) {
      const cotis = decl.cotisations[0];
      const cotisations = cotis
        ? cotis.montant_cotisations + (cotis.montant_versement_liberatoire ?? 0)
        : 0;
      pointsN1Map.set(decl.mois, {
        mois: MOIS_COURTS[decl.mois - 1],
        mois_num: decl.mois,
        ca: decl.montant_ca,
        cotisations,
        net: decl.montant_ca - cotisations,
      });
    }
  }

  return {
    annee: targetAnnee,
    plafond,
    points: Array.from(pointsMap.values()),
    pointsN1: Array.from(pointsN1Map.values()),
    repartition: {
      ca_total,
      cotisations_total,
      net_total: ca_total - cotisations_total,
    },
  };
}
