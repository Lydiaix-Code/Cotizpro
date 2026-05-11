import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration Playwright pour les tests E2E
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  /* Timeout par test */
  timeout: 30_000,
  /* Timeout pour les assertions expect() */
  expect: { timeout: 10_000 },
  /* Pas de parallélisme en CI pour la fiabilité */
  fullyParallel: true,
  /* Arrêter au premier échec en CI */
  forbidOnly: !!process.env.CI,
  /* Pas de retry en local, 2 en CI */
  retries: process.env.CI ? 2 : 0,
  /* Workers */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter */
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    /* URL de base (serveur local de développement) */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    /* Captures d'écran et traces en cas d'échec */
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    /* Locale française */
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },

  projects: [
    /* Setup : stockage de session (auth) */
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    /* Tests Chrome desktop avec session authentifiée */
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    /* Tests d'authentification (pas besoin de session) */
    {
      name: "auth-flows",
      testMatch: /.*\/auth\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
