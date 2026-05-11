"use client";

import { verifyAndUnenrollWithBackupCode } from "@/actions/backup-codes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MFAChallengePage() {
  const router = useRouter();
  const supabase = createClient();

  const [factorId, setFactorId] = useState<string>("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [mode, setMode] = useState<"totp" | "backup">("totp");

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === "verified");

      if (!verified) {
        router.replace("/dashboard");
        return;
      }

      setFactorId(verified.id);
      setInitializing(false);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) {
        setError("Impossible de créer le défi 2FA. Réessayez.");
        setLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.replace(/\s/g, ""),
      });

      if (verifyError) {
        setError("Code incorrect. Vérifiez votre application et réessayez.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Une erreur inattendue est survenue. Réessayez.");
      setLoading(false);
    }
  }

  async function handleBackupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await verifyAndUnenrollWithBackupCode(code, factorId);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      // Facteur supprimé — rafraîchit la session pour que le proxy
      // ne redirige plus vers /mfa (nextLevel redevient aal1)
      await supabase.auth.refreshSession();
      router.replace("/dashboard");
    } catch {
      setError("Une erreur inattendue est survenue. Réessayez.");
      setLoading(false);
    }
  }

  function switchMode(newMode: "totp" | "backup") {
    setMode(newMode);
    setCode("");
    setError("");
  }

  if (initializing) {
    return (
      <div className="flex justify-center py-8">
        <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="space-y-1.5 text-center">
        <div className="bg-primary/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
          <ShieldCheck className="text-primary h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Vérification 2FA</h1>
        <p className="text-muted-foreground text-sm">
          {mode === "totp"
            ? "Entrez le code de votre application d'authentification"
            : "Entrez l'un de vos codes de secours"}
        </p>
      </div>

      {/* Formulaire TOTP */}
      {mode === "totp" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code à 6 chiffres</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              placeholder="123 456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              autoComplete="one-time-code"
              required
              className="text-center font-mono text-lg tracking-widest"
            />
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || code.replace(/\s/g, "").length < 6}
          >
            {loading ? "Vérification…" : "Continuer"}
          </Button>
        </form>
      )}

      {/* Formulaire code de secours */}
      {mode === "backup" && (
        <form onSubmit={handleBackupSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-code">Code de secours</Label>
            <Input
              id="backup-code"
              type="text"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              autoComplete="off"
              required
              className="text-center font-mono tracking-widest"
            />
            <p className="text-muted-foreground text-xs">
              Attention : l&apos;utilisation d&apos;un code de secours désactivera votre
              2FA. Vous devrez la reconfigurer.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || code.replace(/[-\s]/g, "").length < 16}
          >
            {loading ? "Vérification…" : "Utiliser ce code"}
          </Button>
        </form>
      )}

      {/* Bascule entre les modes */}
      <p className="text-muted-foreground text-center text-sm">
        {mode === "totp" ? (
          <>
            Vous n&apos;avez plus votre app ?{" "}
            <button
              type="button"
              onClick={() => switchMode("backup")}
              className="text-primary underline underline-offset-4 hover:no-underline"
            >
              Utiliser un code de secours
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => switchMode("totp")}
            className="text-primary underline underline-offset-4 hover:no-underline"
          >
            ← Retour au code TOTP
          </button>
        )}
      </p>
    </div>
  );
}
