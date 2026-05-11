import { RegisterForm } from "@/components/auth/RegisterForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Créez votre compte Cotizpro gratuitement.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Créer un compte</h1>
        <p className="text-muted-foreground text-sm">
          Gratuit · Aucune carte bancaire requise
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
