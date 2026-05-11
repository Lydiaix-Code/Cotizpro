import { expect, test as setup } from "@playwright/test";
import path from "path";

/**
 * Fichier de setup auth : se connecte une fois et sauvegarde le storageState.
 * Exécuté avant tous les tests qui dépendent du projet "setup".
 *
 * Nécessite les variables d'environnement :
 *   E2E_USER_EMAIL     — email d'un compte de test existant
 *   E2E_USER_PASSWORD  — mot de passe associé
 */

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_USER_EMAIL et E2E_USER_PASSWORD doivent être définis pour les tests E2E"
    );
  }

  await page.goto("/login");

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/mot de passe/i).fill(password);
  await page.getByRole("button", { name: /connexion/i }).click();

  // Attendre la redirection vers le dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Sauvegarder la session
  await page.context().storageState({ path: AUTH_FILE });
});
