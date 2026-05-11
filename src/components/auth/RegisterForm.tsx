"use client";

import type { ActionResult } from "@/actions/auth";
import { register } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const initialState: ActionResult = {};

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(register, initialState);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [captchaReady, setCaptchaReady] = useState(!SITE_KEY);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [prevError, setPrevError] = useState(state.error);

  if (state.error !== prevError) {
    setPrevError(state.error);
    if (state.error) {
      setTurnstileKey((k) => k + 1);
      setCaptchaReady(!SITE_KEY);
    }
  }

  if (state.success) {
    return (
      <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
        {state.success}
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <Alert variant="destructive" className="text-sm">
          {state.error}
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Adresse email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.fr"
          required
          disabled={isPending}
          className="bg-background"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          disabled={isPending}
          className="bg-background"
        />
        <p className="text-muted-foreground text-xs">
          8 caractères minimum, 1 majuscule, 1 chiffre
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          disabled={isPending}
          className="bg-background"
        />
      </div>

      {SITE_KEY && (
        <div className="flex justify-center">
          <Turnstile
            key={turnstileKey}
            ref={turnstileRef}
            siteKey={SITE_KEY}
            options={{ theme: "auto", language: "fr" }}
            onSuccess={() => setCaptchaReady(true)}
            onExpire={() => setCaptchaReady(false)}
            onError={() => setCaptchaReady(false)}
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending || !captchaReady}>
        {isPending ? "Création…" : "Créer mon compte"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Déjà un compte ?{" "}
        <Link
          href={ROUTES.login}
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  );
}
