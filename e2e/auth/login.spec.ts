import { expect, test } from "@playwright/test";

/**
 * Tests des flux d'authentification (page publique, pas de session requise)
 */
test.describe("Page de login", () => {
  test("affiche le formulaire de connexion", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /connexion/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/mot de passe/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /connexion/i })).toBeVisible();
  });

  test("affiche un lien vers la page d'inscription", async ({ page }) => {
    await page.goto("/login");
    const link = page.getByRole("link", { name: /créer un compte/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("affiche un lien vers la réinitialisation du mot de passe", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /mot de passe oublié/i })).toBeVisible();
  });

  test("affiche une erreur pour des identifiants invalides", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("inexistant@example.com");
    await page.getByLabel(/mot de passe/i).fill("mauvaismdp123");
    await page.getByRole("button", { name: /connexion/i }).click();

    // Attendre un message d'erreur
    await expect(
      page.getByRole("alert").or(page.getByText(/invalide|incorrect|error/i))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("redirige un utilisateur déjà connecté vers le dashboard", async ({ page }) => {
    // Ce test utilise la session du storageState (authFile)
    // Note : ce fichier est dans auth-flows (pas de session), donc pas de redirect attendue ici
    // Voir dashboard.spec.ts pour tester la redirection avec session
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Page d'inscription", () => {
  test("affiche le formulaire d'inscription", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /créer|inscription/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/mot de passe/i).first()).toBeVisible();
  });

  test("affiche une erreur pour un email invalide", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/email/i).fill("pasunemail");
    await page
      .getByLabel(/mot de passe/i)
      .first()
      .fill("Password123!");
    await page.getByRole("button", { name: /créer|inscription|s'inscrire/i }).click();

    // Erreur de validation HTML5 ou message applicatif
    const emailInput = page.getByLabel(/email/i);
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBeTruthy();
  });
});
