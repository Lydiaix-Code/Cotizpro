import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace Cotizpro.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Connexion</h1>
        <p className="text-muted-foreground text-sm">Accédez à votre tableau de bord</p>
      </div>
      <LoginForm />
    </div>
  );
}
