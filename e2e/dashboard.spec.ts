import { expect, test } from "@playwright/test";

/**
 * Tests du tableau de bord (session authentifiée requise)
 * Le storageState est chargé depuis playwright/.auth/user.json
 */
test.describe("Tableau de bord", () => {
  test("affiche le dashboard après connexion", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    // Le titre ou le contenu principal doit être visible
    await expect(
      page.getByRole("heading", { name: /tableau de bord|dashboard/i })
    ).toBeVisible();
  });

  test("affiche la navigation latérale", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: /déclarer/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /cotisations/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /historique/i })).toBeVisible();
  });

  test("redirige /dashboard vers /login si non connecté", async ({ browser }) => {
    // Utiliser un contexte sans storageState
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await context.close();
  });
});

test.describe("Graphiques", () => {
  test("affiche la page graphiques", async ({ page }) => {
    await page.goto("/graphiques");
    await expect(page).toHaveURL(/\/graphiques/);
    await expect(page.getByRole("heading", { name: /graphiques/i })).toBeVisible();
  });
});

test.describe("Historique", () => {
  test("affiche la page historique", async ({ page }) => {
    await page.goto("/historique");
    await expect(page).toHaveURL(/\/historique/);
    await expect(page.getByRole("heading", { name: /historique/i })).toBeVisible();
  });
});

test.describe("Nouveautés", () => {
  test("affiche la page changelog", async ({ page }) => {
    await page.goto("/nouveautes");
    await expect(page).toHaveURL(/\/nouveautes/);
    await expect(page.getByRole("heading", { name: /nouveautés/i })).toBeVisible();
    // Vérifie qu'au moins une version est listée
    await expect(page.getByText(/v1\.0/)).toBeVisible();
  });
});
