import type { Metadata } from "next";
import { RetryButton } from "./RetryButton";

export const metadata: Metadata = {
  title: "Hors ligne",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="rounded-full bg-indigo-100 p-5 dark:bg-indigo-950">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-indigo-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l18 18M8.111 8.111A7 7 0 0118.364 18.364M1.636 1.636A16 16 0 0122.364 22.364"
          />
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Vous êtes hors ligne</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Cotizpro nécessite une connexion pour fonctionner. Vérifiez votre réseau et
          réessayez.
        </p>
      </div>
      <RetryButton />
    </div>
  );
}
