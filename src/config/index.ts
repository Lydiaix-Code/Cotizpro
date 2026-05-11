/**
 * Configuration centrale de l'application
 * Toutes les constantes métier et de configuration ici
 */

export const APP_CONFIG = {
  name: "Cotizpro",
  description: "Calculateur de cotisations URSSAF pour auto-entrepreneurs",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export const STRIPE_CONFIG = {
  priceIdMensuel: process.env.NEXT_PUBLIC_STRIPE_PRICE_MENSUEL ?? "",
  priceIdAnnuel: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUEL ?? "",
  prixMensuel: 4.99,
  prixAnnuel: 39.99,
} as const;

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  resetPassword: "/reset-password",
  dashboard: "/dashboard",
  declaration: "/declaration",
  cotisations: "/cotisations",
  simulateur: "/simulateur",
  importCsv: "/import",
  historique: "/historique",
  graphiques: "/graphiques",
  export: "/export",
  fiscalite: "/fiscalite",
  parametres: "/parametres",
  premium: "/premium",
  nouveautes: "/nouveautes",
} as const;

// Alertes seuils CA (en pourcentage du plafond)
export const SEUILS_ALERTE_CA = [80, 90, 100] as const;
