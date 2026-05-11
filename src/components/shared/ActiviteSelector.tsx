"use client";

import type { Activite } from "@/types/database";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface Props {
  activites: Pick<Activite, "id" | "nom" | "regime">[];
  /** Valeur active : "" = toutes, "principale" = activite_id NULL, UUID = activité nommée */
  activiteActive: string;
  /** Afficher l'option "Activité principale" (true quand des déclarations ont activite_id = null) */
  showPrincipale?: boolean;
}

const LABELS_REGIME_COURT: Record<string, string> = {
  bic_marchandises: "Marchandises",
  bic_services: "Services",
  bnc: "BNC",
};

export function ActiviteSelector({
  activites,
  activiteActive,
  showPrincipale = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (activites.length === 0) return null;

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "") {
      params.delete("activite");
    } else {
      params.set("activite", value);
    }
    // Supprimer ici les params qui n'ont pas de sens après un changement de filtre activité
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="activite-select" className="shrink-0 text-sm text-gray-500">
        Activité
      </label>
      <select
        id="activite-select"
        value={activiteActive}
        onChange={(e) => handleChange(e.target.value)}
        className="border-input bg-background focus:ring-ring rounded-md border px-3 py-1.5 text-sm shadow-sm focus:ring-2 focus:outline-none"
      >
        <option value="">Toutes les activités</option>
        {showPrincipale && <option value="principale">Activité principale</option>}
        {activites.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nom} ({LABELS_REGIME_COURT[a.regime] ?? a.regime})
          </option>
        ))}
      </select>
    </div>
  );
}
