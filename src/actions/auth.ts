"use server";

import { APP_CONFIG, ROUTES } from "@/config";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validations";
import { redirect } from "next/navigation";

// ─── Types de retour ──────────────────────────────────────────────────────────

export interface ActionResult {
  error?: string;
  success?: string;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();

  // Token CAPTCHA Turnstile (absent en dev local sans clé configurée)
  const captchaToken = formData.get("cf-turnstile-response") as string | null;

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
    ...(captchaToken ? { options: { captchaToken } } : {}),
  });

  if (error) {
    if (
      error.message.includes("Invalid login credentials") ||
      error.message.includes("invalid_credentials")
    ) {
      return { error: "Email ou mot de passe incorrect" };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "Confirmez votre email avant de vous connecter" };
    }
    if (error.message.includes("captcha")) {
      return { error: "Vérification anti-bot échouée. Rechargez la page et réessayez." };
    }
    return { error: "Une erreur est survenue. Réessayez." };
  }

  redirect(ROUTES.dashboard);
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function register(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();

  // Token CAPTCHA Turnstile (absent en dev local sans clé configurée)
  const captchaToken = formData.get("cf-turnstile-response") as string | null;

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${APP_CONFIG.url}/auth/callback`,
      ...(captchaToken ? { captchaToken } : {}),
    },
  });

  if (error) {
    if (
      error.message.includes("User already registered") ||
      error.message.includes("already been registered")
    ) {
      return { error: "Un compte existe déjà avec cet email" };
    }
    if (error.message.includes("Password should be")) {
      return { error: "Le mot de passe ne respecte pas les critères requis" };
    }
    return { error: "Une erreur est survenue. Réessayez." };
  }

  // Email de bienvenue — fire-and-forget (non bloquant)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const functionSecret = process.env.FUNCTION_SECRET;
  if (supabaseUrl && functionSecret) {
    fetch(`${supabaseUrl}/functions/v1/email-onboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Function-Secret": functionSecret,
      },
      body: JSON.stringify({ email: parsed.data.email }),
    }).catch(() => {});
  }

  return {
    success: "Compte créé ! Vérifiez votre email pour confirmer votre inscription.",
  };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.login);
}

// ─── Reset password ───────────────────────────────────────────────────────────

export async function resetPassword(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email invalide" };
  }

  const supabase = await createClient();

  // Token CAPTCHA Turnstile (absent en dev local sans clé configurée)
  const captchaToken = formData.get("cf-turnstile-response") as string | null;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${APP_CONFIG.url}/auth/update-password`,
    ...(captchaToken ? { captchaToken } : {}),
  });

  if (error) {
    return { error: "Une erreur est survenue. Réessayez." };
  }

  // Toujours retourner succès même si l'email n'existe pas (anti-énumération OWASP)
  return {
    success:
      "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
  };
}
