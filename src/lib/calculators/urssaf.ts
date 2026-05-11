import type { Regime, ResultatCalcul } from "@/types/database";
import { PLAFONDS_CA, getTauxPourMillesime } from "@/types/database";

/**
 * Calcule les cotisations URSSAF et le revenu net pour une déclaration.
 * Utilise les taux du millésime de la déclaration (paramètre optionnel `annee`).
 */
export function calculerCotisations(params: {
  montant_ca: number;
  regime: Regime;
  acre: boolean;
  versement_liberatoire: boolean;
  annee?: number;
}): ResultatCalcul {
  const { montant_ca, regime, acre, versement_liberatoire, annee } = params;

  const taux = getTauxPourMillesime(annee ?? new Date().getFullYear());

  const taux_cotisations = acre ? taux.acre[regime] : taux.normal[regime];

  const montant_cotisations = arrondir(montant_ca * taux_cotisations);

  let taux_versement_liberatoire: number | null = null;
  let montant_versement_liberatoire: number | null = null;

  if (versement_liberatoire) {
    taux_versement_liberatoire = taux.versementLiberatoire[regime];
    montant_versement_liberatoire = arrondir(montant_ca * taux_versement_liberatoire);
  }

  const total_a_payer = arrondir(
    montant_cotisations + (montant_versement_liberatoire ?? 0)
  );

  const revenu_net = arrondir(montant_ca - total_a_payer);

  return {
    montant_ca,
    taux_cotisations,
    montant_cotisations,
    taux_versement_liberatoire,
    montant_versement_liberatoire,
    total_a_payer,
    revenu_net,
    acre_applique: acre,
  };
}

/**
 * Détermine si l'ACRE est encore applicable pour une période de déclaration.
 * L'ACRE s'applique pendant les 12 premiers mois calendaires depuis le début d'activité.
 *
 * Ne prend pas en compte le flag `profile.acre` — vérifier ce flag en amont.
 *
 * @param dateDebutActivite  Date de début d'activité (YYYY-MM-DD ou ISO)
 * @param anneeDeclaration   Année de la période déclarée
 * @param moisDeclaration    Mois de la période déclarée (1-12)
 */
export function isAcreEligible(
  dateDebutActivite: string | null | undefined,
  anneeDeclaration: number,
  moisDeclaration: number
): boolean {
  if (!dateDebutActivite) return false;
  const debut = new Date(dateDebutActivite);
  if (isNaN(debut.getTime())) return false;

  // Premier jour du mois déclaré
  const debutDeclaration = new Date(anneeDeclaration, moisDeclaration - 1, 1);

  // L'ACRE expire le 1er jour du 13ème mois après le début d'activité
  const finAcre = new Date(debut.getFullYear(), debut.getMonth() + 12, 1);

  return debutDeclaration < finAcre;
}

/**
 * Calcule le CA cumulé sur l'année en cours
 */
export function calculerCaCumule(
  declarations: Array<{ montant_ca: number; annee: number }>,
  annee: number
): number {
  return arrondir(
    declarations
      .filter((d) => d.annee === annee)
      .reduce((sum, d) => sum + d.montant_ca, 0)
  );
}

/**
 * Calcule le pourcentage du plafond CA atteint
 */
export function calculerPourcentagePlafond(ca_cumule: number, regime: Regime): number {
  const plafond = PLAFONDS_CA[regime];
  return Math.min(Math.round((ca_cumule / plafond) * 100), 100);
}

/**
 * Vérifie si le CA dépasse le plafond
 */
export function depassePlafond(ca_cumule: number, regime: Regime): boolean {
  return ca_cumule > PLAFONDS_CA[regime];
}

/**
 * Arrondit à 2 décimales
 */
function arrondir(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

/**
 * Formate un montant en euros (ex: 1 234,56 €)
 */
export function formaterEuros(montant: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(montant);
}

/**
 * Formate un pourcentage (ex: 21,2 %)
 */
export function formaterPourcentage(taux: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(taux);
}
