import { ROUTES } from "@/config";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header minimal */}
      <header className="border-border flex h-14 items-center border-b px-6">
        <Link href={ROUTES.home} className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="Cotizpro"
            width={28}
            height={28}
            className="rounded-lg"
          />
          <span className="text-foreground text-sm font-semibold tracking-tight">
            Cotizpro
          </span>
        </Link>
      </header>

      {/* Contenu centré */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      {/* Footer minimal */}
      <footer className="border-border flex h-12 items-center justify-center border-t">
        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} Cotizpro — Tous droits réservés
        </p>
      </footer>
    </div>
  );
}
