"use client";

import {
  generateBackupCodes,
  getBackupCodesStatus,
  regenerateBackupCodes,
} from "@/actions/backup-codes";
import { unenrollMFA } from "@/actions/mfa";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Download, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

interface Props {
  /** ID du facteur TOTP déjà enrôlé, si la 2FA est activée */
  factorId?: string;
}

export function MFASection({ factorId: initialFactorId }: Props) {
  const supabase = createClient();

  const [step, setStep] = useState<"idle" | "enrolling" | "showCodes">("idle");
  const [localFactorId, setLocalFactorId] = useState(initialFactorId);
  const [enrollFactorId, setEnrollFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const [codesStatus, setCodesStatus] = useState<{
    remaining: number;
    total: number;
  } | null>(null);

  // Charge le statut des codes de secours quand la 2FA est active
  useEffect(() => {
    if (localFactorId) {
      getBackupCodesStatus().then(setCodesStatus);
    }
  }, [localFactorId]);

  // ─── Démarrer l'enrôlement ─────────────────────────────────────────────────

  async function handleStartEnroll() {
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: "Cotizpro",
      friendlyName: "Cotizpro",
    });

    if (error || !data) {
      setError("Impossible d'initialiser la 2FA. Réessayez.");
      setLoading(false);
      return;
    }

    setEnrollFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep("enrolling");
    setLoading(false);
  }

  // ─── Confirmer l'enrôlement ────────────────────────────────────────────────

  async function handleConfirmEnroll() {
    setError("");
    setLoading(true);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrollFactorId,
    });

    if (challengeError) {
      setError("Erreur lors de la vérification. Réessayez.");
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId: challenge.id,
      code: code.replace(/\s/g, ""),
    });

    if (verifyError) {
      setError("Code incorrect. Vérifiez votre application et réessayez.");
      setLoading(false);
      return;
    }

    // Enrôlement réussi — génère les codes de secours
    setLocalFactorId(enrollFactorId);
    setCode("");
    setQrCode("");
    setSecret("");
    setEnrollFactorId("");

    const { codes, error: codesError } = await generateBackupCodes();
    if (codesError || !codes) {
      setError(
        "2FA activée, mais impossible de générer les codes de secours. Régénérez-les depuis les paramètres."
      );
      setStep("idle");
    } else {
      setBackupCodes(codes);
      setStep("showCodes");
    }
    setLoading(false);
  }

  // ─── Annuler l'enrôlement en cours ────────────────────────────────────────

  async function handleCancelEnroll() {
    // Supprimer le facteur non vérifié créé côté Supabase
    if (enrollFactorId) {
      await supabase.auth.mfa.unenroll({ factorId: enrollFactorId });
    }
    setStep("idle");
    setCode("");
    setQrCode("");
    setSecret("");
    setEnrollFactorId("");
    setError("");
  }

  // ─── Désactiver la 2FA ─────────────────────────────────────────────────────

  function handleDisable() {
    if (!localFactorId) return;
    setError("");

    startTransition(async () => {
      const result = await unenrollMFA(localFactorId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setLocalFactorId(undefined);
      setCodesStatus(null);
    });
  }

  // ─── Régénérer les codes de secours ───────────────────────────────────────

  function handleRegenerate() {
    setError("");
    startTransition(async () => {
      const { codes, error: codesError } = await regenerateBackupCodes();
      if (codesError || !codes) {
        setError("Impossible de régénérer les codes. Réessayez.");
        return;
      }
      setBackupCodes(codes);
      setStep("showCodes");
    });
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {localFactorId ? (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          )}
          <CardTitle className="text-base">
            Authentification à deux facteurs (2FA)
          </CardTitle>
        </div>
        <CardDescription>
          {localFactorId
            ? "Votre compte est protégé par une application d'authentification (TOTP)."
            : "Protégez votre compte avec Google Authenticator, Authy ou 1Password."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── État : 2FA activée ── */}
        {localFactorId && step === "idle" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  2FA activée
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisable}
                disabled={isPending}
                className="text-destructive hover:text-destructive"
              >
                {isPending ? "Désactivation…" : "Désactiver"}
              </Button>
            </div>

            {/* Statut des codes de secours */}
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Codes de secours</p>
                <p className="text-muted-foreground text-xs">
                  {codesStatus
                    ? `${codesStatus.remaining} / ${codesStatus.total} codes restants`
                    : "Chargement…"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isPending}
              >
                Régénérer
              </Button>
            </div>
          </div>
        )}

        {/* ── État : 2FA désactivée ── */}
        {!localFactorId && step === "idle" && (
          <Button onClick={handleStartEnroll} disabled={loading} size="sm">
            {loading ? "Chargement…" : "Activer la 2FA"}
          </Button>
        )}

        {/* ── État : enrôlement en cours ── */}
        {step === "enrolling" && (
          <div className="space-y-5">
            {/* Étape 1 : scan du QR code */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                1. Scannez ce QR code avec votre application
              </p>
              <p className="text-muted-foreground text-xs">
                Compatible : Google Authenticator, Authy, 1Password, Bitwarden…
              </p>

              {qrCode && (
                <div className="inline-block rounded-lg border bg-white p-3">
                  {/* Supabase retourne une data-URI SVG */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCode}
                    alt="QR code pour configurer la 2FA"
                    width={160}
                    height={160}
                    className="block"
                  />
                </div>
              )}

              <details className="text-xs">
                <summary className="text-muted-foreground hover:text-foreground cursor-pointer">
                  Saisir la clé manuellement
                </summary>
                <code className="bg-muted mt-1 block rounded px-2 py-1.5 font-mono text-xs tracking-widest break-all">
                  {secret}
                </code>
              </details>
            </div>

            {/* Étape 2 : code de confirmation */}
            <div className="space-y-2">
              <Label htmlFor="mfa-code" className="text-sm font-medium">
                2. Entrez le code généré par votre application
              </Label>
              <div className="flex gap-2">
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]{6,7}"
                  maxLength={7}
                  placeholder="123 456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                  className="max-w-[140px] font-mono tracking-widest"
                />
                <Button
                  onClick={handleConfirmEnroll}
                  disabled={loading || code.replace(/\s/g, "").length < 6}
                >
                  {loading ? "Vérification…" : "Confirmer"}
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEnroll}
              disabled={loading}
            >
              Annuler
            </Button>
          </div>
        )}

        {/* ── État : affichage des codes de secours ── */}
        {step === "showCodes" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Sauvegardez vos codes de secours
                  </p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    Ces codes ne seront plus jamais affichés. Si vous perdez accès à votre
                    application d&apos;authentification, ils vous permettront de vous
                    connecter.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 grid grid-cols-2 gap-2 rounded-lg border p-4">
              {backupCodes.map((c, i) => (
                <code
                  key={i}
                  className="py-0.5 text-center font-mono text-xs tracking-widest"
                >
                  {c}
                </code>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const blob = new Blob(
                  [
                    "Codes de secours Cotizpro\n" +
                      "Conservez ce fichier en lieu sûr.\n" +
                      "Chaque code ne peut être utilisé qu'une seule fois.\n\n" +
                      backupCodes.join("\n"),
                  ],
                  { type: "text/plain" }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "Cotizpro-codes-secours.txt";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger (.txt)
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setCodesStatus({
                  remaining: backupCodes.length,
                  total: backupCodes.length,
                });
                setBackupCodes([]);
                setStep("idle");
              }}
            >
              J&apos;ai sauvegardé mes codes
            </Button>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
