"use client";

import { useRouter } from "next/navigation";

interface Props {
  annees: number[];
  anneeActive: number;
}

export function AnneeSelector({ annees, anneeActive }: Props) {
  const router = useRouter();

  if (annees.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="annee-select" className="shrink-0 text-sm text-gray-500">
        Année
      </label>
      <select
        id="annee-select"
        value={anneeActive}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          if (!isNaN(val)) {
            router.push(`/historique?annee=${val}`);
          }
        }}
        className="border-input bg-background focus:ring-ring rounded-md border px-3 py-1.5 text-sm shadow-sm focus:ring-2 focus:outline-none"
      >
        {annees.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}
