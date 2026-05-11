"use client";

import type { ActionResult } from "@/actions/auth";
import { login } from "@/actions/auth";
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

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [captchaReady, setCaptchaReady] = useState(!SITE_KEY);
  // Clé incrémentée pour forcer le re-mount du widget Turnstile après erreur
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [prevError, setPrevError] = useState(state.error);

  // Pattern React : ajustement d'état dérivé pendant le rendu (sans useEffect)
  if (state.error !== prevError) {
    setPrevError(state.error);
    if (state.error) {
      setTurnstileKey((k) => k + 1);
      setCaptchaReady(!SITE_KEY);
    }
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Mot de passe</Label>
          <Link
            href={ROUTES.resetPassword}
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {isPending ? "Connexion…" : "Se connecter"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Pas encore de compte ?{" "}
        <Link
          href={ROUTES.register}
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
