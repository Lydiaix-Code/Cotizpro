"use client";

import { logout } from "@/actions/auth";
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
  PlusCircle,
  Settings,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  {
    label: "Tableau de bord",
    href: ROUTES.dashboard,
    icon: LayoutDashboard,
  },
  {
    label: "Déclarer un CA",
    href: ROUTES.declaration,
    icon: PlusCircle,
  },
  {
    label: "Cotisations",
    href: ROUTES.cotisations,
    icon: Calculator,
  },
  {
    label: "Simulateur",
    href: ROUTES.simulateur,
    icon: Zap,
  },
  {
    label: "Graphiques",
    href: ROUTES.graphiques,
    icon: LineChart,
  },
  {
    label: "Historique",
    href: ROUTES.historique,
    icon: History,
  },
  {
    label: "Import CSV",
    href: ROUTES.importCsv,
    icon: Upload,
  },
  {
    label: "Export",
    href: ROUTES.export,
    icon: Download,
  },
  {
    label: "Fiscal 2042-C",
    href: ROUTES.fiscalite,
    icon: FileText,
    premiumOnly: true,
  },
] as const;

const BOTTOM_ITEMS = [
  {
    label: "Changelog",
    href: ROUTES.nouveautes,
    icon: Sparkles,
  },
  {
    label: "Paramètres",
    href: ROUTES.parametres,
    icon: Settings,
  },
] as const;

export function Sidebar({
  isPremium = false,
  notifications = [],
}: {
  isPremium?: boolean;
  notifications?: AppNotification[];
}) {
  const pathname = usePathname();

  return (
    <aside className="border-border bg-sidebar flex h-screen w-60 shrink-0 flex-col border-r">
      {/* Logo */}
      <div className="border-border flex h-14 items-center border-b px-5">
        <Link href={ROUTES.dashboard} className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="Cotizpro"
            width={28}
            height={28}
            className="rounded-lg"
          />
          <span className="text-sidebar-foreground text-sm font-semibold tracking-tight">
            Cotizpro
          </span>
        </Link>
      </div>

      {/* Navigation principale */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.filter(
          (item) => !("premiumOnly" in item && item.premiumOnly && !isPremium)
        ).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bas de sidebar */}
      <div className="border-border border-t">
        {/* Bloc notifications + premium */}
        <div className="space-y-0.5 px-3 pt-3 pb-2">
          <NotificationBell notifications={notifications} />

          {isPremium ? (
            <Link
              href={ROUTES.parametres}
              className="flex items-center gap-3 rounded-md bg-yellow-500/10 px-3 py-2 text-sm font-medium text-yellow-600 transition-colors hover:bg-yellow-500/20 dark:text-yellow-400"
            >
              <Crown className="h-4 w-4 shrink-0" />
              Premium actif
            </Link>
          ) : (
            <Link
              href={ROUTES.premium}
              className="flex items-center gap-3 rounded-md bg-yellow-500/10 px-3 py-2 text-sm font-semibold text-yellow-600 transition-colors hover:bg-yellow-500/20 dark:text-yellow-400"
            >
              <Crown className="h-4 w-4 shrink-0 text-yellow-500" />
              Passer Premium
            </Link>
          )}
        </div>

        {/* Séparateur */}
        <div className="border-border mx-3 border-t" />

        {/* Bloc compte */}
        <div className="space-y-0.5 px-3 pt-2 pb-2">
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="text-sidebar-foreground/50 group-hover:text-sidebar-foreground h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <form action={logout}>
            <button
              type="submit"
              className="group text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-destructive flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              <LogOut className="text-sidebar-foreground/50 group-hover:text-destructive h-4 w-4 shrink-0" />
              Déconnexion
            </button>
          </form>
        </div>

        {/* Pied : thème + liens légaux sur une ligne */}
        <div className="border-border mx-3 border-t" />
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex gap-3">
            <Link
              href="/mentions-legales"
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground/70 text-[11px] transition-colors"
            >
              Mentions
            </Link>
            <span className="text-sidebar-foreground/20 text-[11px]">·</span>
            <Link
              href="/cgu"
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground/70 text-[11px] transition-colors"
            >
              CGU
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
