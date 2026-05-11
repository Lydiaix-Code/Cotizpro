import { expect, test } from "@playwright/test";

/**
 * Tests de la page Import CSV (session authentifiée)
 */
test.describe("Import CSV", () => {
  test("affiche la page d'import", async ({ page }) => {
    await page.goto("/import");
    await expect(page).toHaveURL(/\/import/);
    await expect(page.getByRole("heading", { name: /import/i })).toBeVisible();
  });

  test("affiche le format CSV attendu", async ({ page }) => {
    await page.goto("/import");
    await expect(page.getByText(/format csv attendu/i)).toBeVisible();
    await expect(page.getByText(/annee,mois,montant_ca/i)).toBeVisible();
  });

  test("affiche un input de fichier CSV", async ({ page }) => {
    await page.goto("/import");
    const fileLabel = page.getByText(/choisir un fichier/i).first();
    await expect(fileLabel).toBeVisible();
  });

  test("affiche une prévisualisation après sélection de fichier", async ({ page }) => {
    await page.goto("/import");

    // Créer un fichier CSV en mémoire et l'injecter
    const csvContent = "annee,mois,montant_ca\n2024,1,3500\n2024,2,4200";
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });

    // La prévisualisation doit apparaître
    await expect(
      page.getByText(/prévisualisation|aperçu/i).or(page.getByText(/2 ligne/i))
    ).toBeVisible({ timeout: 5_000 });
  });
});
