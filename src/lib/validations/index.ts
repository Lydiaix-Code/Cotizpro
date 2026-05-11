import { z } from "zod";

// ─── Authentification ─────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .max(254, "Email trop long"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .max(128, "Mot de passe trop long"),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "L'email est requis")
      .email("Format d'email invalide")
      .max(254, "Email trop long"),
    password: z
      .string()
      .min(8, "Minimum 8 caractères")
      .max(128, "Mot de passe trop long")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    confirmPassword: z.string().min(1, "Confirmez votre mot de passe"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z.object({
  email: z.string().min(1, "L'email est requis").email("Format d'email invalide"),
});

// ─── Profil auto-entrepreneur ─────────────────────────────────────────────────

export const profileSchema = z.object({
  regime: z.enum(["bic_marchandises", "bic_services", "bnc"] as const, {
    error: "Choisissez un régime fiscal",
  }),
  date_debut_activite: z
    .string()
    .min(1, "La date de début est requise")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  acre: z.boolean().default(false),
  versement_liberatoire: z.boolean().default(false),
  notifications_email: z.boolean().default(false),
  frequence_declaration: z.enum(["mensuelle", "trimestrielle"] as const, {
    error: "Choisissez une fréquence",
  }),
});

// ─── Déclaration CA ───────────────────────────────────────────────────────────

export const declarationSchema = z.object({
  mois: z.number().int().min(1, "Mois invalide").max(12, "Mois invalide"),
  annee: z.number().int().min(2000, "Année invalide").max(2100, "Année invalide"),
  montant_ca: z
    .number()
    .min(0, "Le CA ne peut pas être négatif")
    .max(1_000_000, "Montant trop élevé")
    .multipleOf(0.01, "Maximum 2 décimales"),
});

// ─── Activité (multi-activité Premium) ───────────────────────────────────────

export const activiteSchema = z.object({
  nom: z
    .string()
    .min(1, "Le nom est requis")
    .max(80, "Nom trop long (80 caractères max)")
    .trim(),
  regime: z.enum(["bic_marchandises", "bic_services", "bnc"] as const, {
    error: "Choisissez un régime fiscal",
  }),
  date_debut: z
    .string()
    .min(1, "La date de début est requise")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  acre: z.boolean().default(false),
  versement_liberatoire: z.boolean().default(false),
});

export type ActiviteFormData = z.infer<typeof activiteSchema>;

// ─── Inferred types ───────────────────────────────────────────────────────────

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type DeclarationFormData = z.infer<typeof declarationSchema>;
