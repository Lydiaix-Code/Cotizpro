import { ROUTES } from "@/config";
import { createClient } from "@/lib/supabase/server";
import type { Regime } from "@/types/database";
import { PLAFONDS_CA } from "@/types/database";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type NotificationSeverity = "info" | "warning" | "danger";

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  severity: NotificationSeverity;
  href?: string;
}

// ─── Seuils ────────────────────────────────────────────────────────────────────

const SEUIL_PLAFOND_WARNING = 0.8; // 80%
const SEUIL_PLAFOND_DANGER = 1.0; // 100%
const JOURS_AVANT_EXPIRATION_ACRE = 30;

// ─── getAppNotifications ───────────────────────────────────────────────────────

/**
 * Calcule les notifications in-app à partir des données existantes.
 * Purement dérivé, aucune table "notifications" en base — pas de migration requise.
 *
 * Sécurité :
 * - user_id depuis le token serveur uniquement
 * - RLS Supabase garantit l'isolation des données
 * - Toutes les comparaisons se font côté serveur
 */
export async function getAppNotifications(isPremium = false): Promise<AppNotification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const now = new Date();
  const annee = now.getFullYear();
  const moisEnCours = now.getMonth() + 1;
  const moisPrecedent = moisEnCours === 1 ? 12 : moisEnCours - 1;
  const anneeMoisPrecedent = moisEnCours === 1 ? annee - 1 : annee;

  const notifications: AppNotification[] = [];

  // ── Charger le profil et les déclarations en parallèle ───────────────────
  const [profileResult, declarationsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("regime, acre, date_debut_activite")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("declarations")
      .select("mois, annee, montant_ca")
      .eq("user_id", user.id)
      .eq("annee", annee)
      .order("mois", { ascending: false }),
  ]);

  const profile = profileResult.data;
  const declarations = (declarationsResult.data ?? []) as Array<{
    mois: number;
    annee: number;
    montant_ca: number;
  }>;

  if (!profile) return notifications;

  // ─── 1. Mois précédent non déclaré ────────────────────────────────────────
  // Seulement si on est entre le 1er et le 20 du mois (rappel pertinent)
  if (now.getDate() <= 20) {
    const dejaDeclare = declarations.some(
      (d) => d.mois === moisPrecedent && d.annee === anneeMoisPrecedent
    );
    if (!dejaDeclare) {
      const labelMois = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(
        new Date(anneeMoisPrecedent, moisPrecedent - 1, 1)
      );
      notifications.push({
        id: "mois_non_declare",
        title: `CA de ${labelMois} non déclaré`,
        description:
          "Pensez à déclarer votre chiffre d'affaires avant l'échéance URSSAF.",
        severity: "warning",
        href: ROUTES.declaration,
      });
    }
  }

  // ─── 2. Approche du plafond CA annuel ─────────────────────────────────────
  const caCumule = declarations.reduce((sum, d) => sum + d.montant_ca, 0);
  const plafond = PLAFONDS_CA[profile.regime as Regime];

  if (plafond > 0) {
    const ratio = caCumule / plafond;

    if (ratio >= SEUIL_PLAFOND_DANGER) {
      notifications.push({
        id: "plafond_depasse",
        title: "Plafond CA dépassé !",
        description: `Votre CA ${annee} dépasse le plafond de ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(plafond)}.`,
        severity: "danger",
        href: ROUTES.dashboard,
      });
    } else if (ratio >= SEUIL_PLAFOND_WARNING) {
      const pct = Math.round(ratio * 100);
      notifications.push({
        id: "plafond_proche",
        title: `${pct}% du plafond atteint`,
        description: `Votre CA approche la limite annuelle de ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(plafond)}.`,
        severity: ratio >= 0.9 ? "danger" : "warning",
        href: ROUTES.dashboard,
      });
    }
  }

  // ─── 3. Expiration ACRE imminente ─────────────────────────────────────────
  if (profile.acre && profile.date_debut_activite) {
    const dateDebut = new Date(profile.date_debut_activite);
    const dateFinAcre = new Date(dateDebut);
    dateFinAcre.setFullYear(dateFinAcre.getFullYear() + 1);

    const diffMs = dateFinAcre.getTime() - now.getTime();
    const diffJours = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffJours > 0 && diffJours <= JOURS_AVANT_EXPIRATION_ACRE) {
      notifications.push({
        id: "acre_expiration",
        title: `ACRE expire dans ${diffJours} jour${diffJours > 1 ? "s" : ""}`,
        description:
          "Vos cotisations passeront au taux plein dès la fin de l'exonération ACRE.",
        severity: "info",
        href: ROUTES.parametres,
      });
    }
  }

  // ─── 4. Rappel déclaration d'impôts (avril–juin) ─────────────────────────
  const moisDeclarationImpots = [4, 5, 6]; // avril, mai, juin
  if (moisDeclarationImpots.includes(moisEnCours)) {
    notifications.push({
      id: "declaration_impots",
      title: "Période de déclaration d'impôts",
      description: "Consultez votre récapitulatif fiscal pour remplir votre 2042-C-PRO.",
      severity: "info",
      href: isPremium ? ROUTES.fiscalite : ROUTES.premium,
    });
  }

  return notifications;
}
