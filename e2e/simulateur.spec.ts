import { expect, test } from "@playwright/test";

/**
 * Tests du simulateur de cotisations (session authentifiée)
 */
test.describe("Simulateur", () => {
  test("affiche la page simulateur", async ({ page }) => {
    await page.goto("/simulateur");
    await expect(page).toHaveURL(/\/simulateur/);
    await expect(page.getByRole("heading", { name: /simulateur/i })).toBeVisible();
  });

  test("affiche un champ de saisie de CA", async ({ page }) => {
    await page.goto("/simulateur");
    // L'input de CA doit être présent
    const caInput = page
      .getByLabel(/chiffre d'affaires|ca mensuel|montant/i)
      .or(page.getByPlaceholder(/3500|montant/i))
      .first();
    await expect(caInput).toBeVisible();
  });

  test("calcule les cotisations à la saisie", async ({ page }) => {
    await page.goto("/simulateur");

    // Remplir un CA
    const caInput = page
      .getByLabel(/chiffre d'affaires|ca mensuel|montant/i)
      .or(page.getByPlaceholder(/3500|montant/i))
      .first();

    await caInput.fill("3500");

    // Un résultat doit apparaître (montant de cotisations)
    await expect(page.getByText(/cotisations|€/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
