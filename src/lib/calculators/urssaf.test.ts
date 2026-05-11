import { calculerCotisations, isAcreEligible } from "@/lib/calculators/urssaf";
import { describe, expect, it } from "vitest";

// ─── isAcreEligible ───────────────────────────────────────────────────────────

describe("isAcreEligible", () => {
  it("retourne false si dateDebut est null", () => {
    expect(isAcreEligible(null, 2026, 4)).toBe(false);
  });

  it("retourne false si dateDebut est une chaîne invalide", () => {
    expect(isAcreEligible("not-a-date", 2026, 4)).toBe(false);
  });

  it("est éligible le mois même du début", () => {
    expect(isAcreEligible("2026-04-01", 2026, 4)).toBe(true);
  });

  it("est éligible 11 mois après le début", () => {
    // début jan 2026 → ACRE valide jusqu'à décembre 2026 inclus
    expect(isAcreEligible("2026-01-01", 2026, 12)).toBe(true);
  });

  it("n'est plus éligible 12 mois après le début (janvier suivant)", () => {
    // début jan 2026 → premier mois non éligible = jan 2027
    expect(isAcreEligible("2026-01-01", 2027, 1)).toBe(false);
  });

  it("n'est plus éligible 13 mois après", () => {
    expect(isAcreEligible("2025-01-15", 2026, 2)).toBe(false);
  });

  it("gère correct un début en milieu d'année", () => {
    // début juillet 2025 → éligible jusqu'à juin 2026
    expect(isAcreEligible("2025-07-01", 2026, 6)).toBe(true);
    expect(isAcreEligible("2025-07-01", 2026, 7)).toBe(false);
  });
});

// ─── calculerCotisations ──────────────────────────────────────────────────────

describe("calculerCotisations", () => {
  it("calcule correctement pour BIC services sans ACRE ni versement liberatoire", () => {
    const result = calculerCotisations({
      montant_ca: 5000,
      regime: "bic_services",
      acre: false,
      versement_liberatoire: false,
      annee: 2026,
    });
    expect(result.taux_cotisations).toBe(0.212);
    expect(result.montant_cotisations).toBe(1060);
    expect(result.total_a_payer).toBe(1060);
    expect(result.revenu_net).toBe(3940);
    expect(result.acre_applique).toBe(false);
    expect(result.montant_versement_liberatoire).toBeNull();
  });

  it("calcule correctement pour BIC marchandises sans ACRE", () => {
    const result = calculerCotisations({
      montant_ca: 10000,
      regime: "bic_marchandises",
      acre: false,
      versement_liberatoire: false,
      annee: 2026,
    });
    expect(result.taux_cotisations).toBe(0.123);
    expect(result.montant_cotisations).toBe(1230);
    expect(result.revenu_net).toBe(8770);
  });

  it("calcule correctement pour BNC sans ACRE", () => {
    const result = calculerCotisations({
      montant_ca: 3000,
      regime: "bnc",
      acre: false,
      versement_liberatoire: false,
      annee: 2026,
    });
    expect(result.taux_cotisations).toBe(0.231);
    expect(result.montant_cotisations).toBe(693);
    expect(result.revenu_net).toBe(2307);
  });

  it("applique le taux ACRE pour BIC services", () => {
    const result = calculerCotisations({
      montant_ca: 5000,
      regime: "bic_services",
      acre: true,
      versement_liberatoire: false,
      annee: 2026,
    });
    expect(result.taux_cotisations).toBe(0.106);
    expect(result.montant_cotisations).toBe(530);
    expect(result.acre_applique).toBe(true);
  });

  it("inclut le versement libératoire dans total_a_payer", () => {
    const result = calculerCotisations({
      montant_ca: 5000,
      regime: "bic_services",
      acre: false,
      versement_liberatoire: true,
      annee: 2026,
    });
    // 5000 * 0.212 = 1060 ; 5000 * 0.017 = 85 ; total = 1145
    expect(result.taux_versement_liberatoire).toBe(0.017);
    expect(result.montant_versement_liberatoire).toBe(85);
    expect(result.total_a_payer).toBe(1145);
    expect(result.revenu_net).toBe(3855);
  });

  it("retourne 0 de cotisations pour un CA de 0 €", () => {
    const result = calculerCotisations({
      montant_ca: 0,
      regime: "bic_services",
      acre: false,
      versement_liberatoire: false,
      annee: 2026,
    });
    expect(result.montant_cotisations).toBe(0);
    expect(result.total_a_payer).toBe(0);
    expect(result.revenu_net).toBe(0);
  });

  it("arrondit correctement à 2 décimales", () => {
    // 1333 * 0.212 = 282.596 → 282.60
    const result = calculerCotisations({
      montant_ca: 1333,
      regime: "bic_services",
      acre: false,
      versement_liberatoire: false,
      annee: 2026,
    });
    expect(result.montant_cotisations).toBe(282.6);
  });

  it("utilise le millésime 2026 par défaut (sans annee)", () => {
    const withoutAnnee = calculerCotisations({
      montant_ca: 5000,
      regime: "bic_services",
      acre: false,
      versement_liberatoire: false,
    });
    const with2026 = calculerCotisations({
      montant_ca: 5000,
      regime: "bic_services",
      acre: false,
      versement_liberatoire: false,
      annee: 2026,
    });
    expect(withoutAnnee.taux_cotisations).toBe(with2026.taux_cotisations);
  });
});
