"use client";

import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/utils/notifications";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface NotificationBellProps {
  notifications: AppNotification[];
}

const SEVERITY_STYLES: Record<
  AppNotification["severity"],
  { dot: string; title: string }
> = {
  danger: {
    dot: "bg-red-500",
    title: "text-red-600 dark:text-red-400",
  },
  warning: {
    dot: "bg-amber-500",
    title: "text-amber-600 dark:text-amber-400",
  },
  info: {
    dot: "bg-indigo-500",
    title: "text-indigo-600 dark:text-indigo-400",
  },
};

const SEEN_KEY = "Cotizpro_notif_seen";

function loadSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {}
}

export function NotificationBell({ notifications }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(loadSeenIds);
  const ref = useRef<HTMLDivElement>(null);

  // Badge : uniquement les notifications non encore vues
  const unseenCount = notifications.filter((n) => !seenIds.has(n.id)).length;

  function handleToggle() {
    setOpen((v) => {
      if (!v) {
        // Ouverture → marquer toutes comme vues
        const newSeen = new Set([...seenIds, ...notifications.map((n) => n.id)]);
        setSeenIds(newSeen);
        saveSeenIds(newSeen);
      }
      return !v;
    });
  }

  // Fermer le popover au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fermer via Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications${unseenCount > 0 ? ` (${unseenCount})` : ""}`}
        aria-expanded={open}
        className={cn(
          "group text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          open && "bg-sidebar-accent/50 text-sidebar-foreground"
        )}
      >
        <Bell className="text-sidebar-foreground/50 group-hover:text-sidebar-foreground h-4 w-4 shrink-0" />
        <span>Notifications</span>
        {unseenCount > 0 && (
          <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="bg-popover border-border absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border shadow-lg"
        >
          <div className="border-border border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Bell className="text-muted-foreground mx-auto mb-2 h-5 w-5" />
              <p className="text-muted-foreground text-sm">Tout est à jour !</p>
            </div>
          ) : (
            <ul className="max-h-72 divide-y overflow-y-auto">
              {notifications.map((n) => {
                const styles = SEVERITY_STYLES[n.severity];
                const content = (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", styles.dot)}
                    />
                    <div className="min-w-0">
                      <p className={cn("text-xs font-semibold", styles.title)}>
                        {n.title}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {n.description}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="hover:bg-accent block transition-colors"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
