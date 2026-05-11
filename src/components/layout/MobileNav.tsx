"use client";

import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/utils/notifications";
import {
  Calculator,
  Crown,
  Download,
  FileText,
  History,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Déclarer", href: ROUTES.declaration, icon: PlusCircle },
  { label: "Cotisations", href: ROUTES.cotisations, icon: Calculator },
  { label: "Simulateur", href: ROUTES.simulateur, icon: Zap },
  { label: "Graphiques", href: ROUTES.graphiques, icon: LineChart },
  { label: "Historique", href: ROUTES.historique, icon: History },
  { label: "Import CSV", href: ROUTES.importCsv, icon: Upload },
  { label: "Export", href: ROUTES.export, icon: Download },
  { label: "Fiscal 2042-C", href: ROUTES.fiscalite, icon: FileText, premiumOnly: true },
] as const;

/**
 * Barre de navigation mobile (visible < lg)
 */
export function MobileNav({
  isPremium = false,
  notifications = [],
}: {
  isPremium?: boolean;
  notifications?: AppNotification[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Header mobile */}
      <header className="border-border bg-sidebar flex h-14 items-center justify-between border-b px-4 lg:hidden">
        <Link href={ROUTES.dashboard} className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="Cotizpro"
            width={28}
            height={28}
            className="rounded-lg"
          />
          <span className="text-sidebar-foreground text-sm font-semibold">Cotizpro</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            className="h-8 w-8"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          {/* Panneau */}
          <nav className="bg-sidebar absolute top-0 left-0 flex h-full w-72 flex-col shadow-xl">
            {/* En-tête drawer */}
            <div className="border-border flex h-14 shrink-0 items-center justify-between border-b px-5">
              <span className="text-sidebar-foreground text-sm font-semibold">
                Navigation
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded-md p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation principale — scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-0.5 px-3 py-3">
                {NAV_ITEMS.filter(
                  (item) => !("premiumOnly" in item && item.premiumOnly && !isPremium)
                ).map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Bas du drawer — fixe */}
            <div className="border-border shrink-0 border-t">
              {/* Notifications + Premium */}
              <div className="space-y-0.5 px-3 pt-3 pb-2">
                <NotificationBell notifications={notifications} />

                {isPremium ? (
                  <Link
                    href={ROUTES.parametres}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md bg-yellow-500/10 px-3 py-2.5 text-sm font-medium text-yellow-600 hover:bg-yellow-500/20 dark:text-yellow-400"
                  >
                    <Crown className="h-4 w-4 shrink-0" />
                    Premium actif
                  </Link>
                ) : (
                  <Link
                    href={ROUTES.premium}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md bg-yellow-500/10 px-3 py-2.5 text-sm font-semibold text-yellow-600 hover:bg-yellow-500/20 dark:text-yellow-400"
                  >
                    <Crown className="h-4 w-4 shrink-0 text-yellow-500" />
                    Passer Premium
                  </Link>
                )}
              </div>

              {/* Séparateur */}
              <div className="border-border mx-3 border-t" />

              {/* Compte */}
              <div className="space-y-0.5 px-3 pt-2 pb-2">
                <Link
                  href={ROUTES.nouveautes}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname === ROUTES.nouveautes
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  Changelog
                </Link>

                <Link
                  href={ROUTES.parametres}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname === ROUTES.parametres
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  Paramètres
                </Link>

                <form action={logout}>
                  <button
                    type="submit"
                    className="text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-destructive flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Déconnexion
                  </button>
                </form>
              </div>

              {/* Pied : liens légaux */}
              <div className="border-border mx-3 border-t" />
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex gap-3">
                  <Link
                    href="/mentions-legales"
                    onClick={() => setOpen(false)}
                    className="text-sidebar-foreground/40 hover:text-sidebar-foreground/70 text-[11px] transition-colors"
                  >
                    Mentions légales
                  </Link>
                  <span className="text-sidebar-foreground/20 text-[11px]">·</span>
                  <Link
                    href="/cgu"
                    onClick={() => setOpen(false)}
                    className="text-sidebar-foreground/40 hover:text-sidebar-foreground/70 text-[11px] transition-colors"
                  >
                    CGU
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
