import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: "Réinitialisez votre mot de passe Cotizpro.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Mot de passe oublié</h1>
        <p className="text-muted-foreground text-sm">
          Recevez un lien pour réinitialiser votre mot de passe
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
