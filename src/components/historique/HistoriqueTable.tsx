import type { HistoriqueAnnee } from "@/actions/historique";

interface Props {
  data: HistoriqueAnnee;
}

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const PCT = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function HistoriqueTable({ data }: Props) {
  const { mois, totaux } = data;

  // Afficher la colonne Activité seulement si au moins une déclaration a une activité
  const hasActivites = mois.some((m) => m.activite_nom !== null);

  if (mois.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        Aucune déclaration pour {data.annee}.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
            <th className="pr-4 pb-3">Mois</th>
            {hasActivites && <th className="pr-4 pb-3">Activité</th>}
            <th className="pr-4 pb-3 text-right">CA déclaré</th>
            <th className="pr-4 pb-3 text-right">Cotisations</th>
            <th className="pr-4 pb-3 text-right">Vers. lib.</th>
            <th className="pr-4 pb-3 text-right">Total charges</th>
            <th className="pr-4 pb-3 text-right">Revenu net</th>
            <th className="pb-3 text-right">Taux</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {mois.map((m) => (
            <tr key={m.mois} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <td className="py-3 pr-4 font-medium">
                {m.label_mois}
                {m.acre_applique && (
                  <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                    ACRE
                  </span>
                )}
              </td>
              {hasActivites && (
                <td className="py-3 pr-4 text-sm text-gray-500">
                  {m.activite_nom ?? (
                    <span className="text-gray-400 italic">Principale</span>
                  )}
                </td>
              )}
              <td className="py-3 pr-4 text-right tabular-nums">
                {EUR.format(m.montant_ca)}
              </td>
              <td className="py-3 pr-4 text-right text-amber-700 tabular-nums">
                {EUR.format(m.cotisations)}
              </td>
              <td className="py-3 pr-4 text-right text-gray-500 tabular-nums">
                {m.versement_liberatoire > 0 ? EUR.format(m.versement_liberatoire) : "—"}
              </td>
              <td className="py-3 pr-4 text-right font-medium text-red-600 tabular-nums">
                {EUR.format(m.total_charges)}
              </td>
              <td
                className={
                  "py-3 pr-4 text-right font-semibold tabular-nums " +
                  (m.revenu_net >= 0 ? "text-emerald-600" : "text-red-600")
                }
              >
                {EUR.format(m.revenu_net)}
              </td>
              <td className="py-3 text-right text-gray-500 tabular-nums">
                {PCT.format(m.taux_applique)}
              </td>
            </tr>
          ))}
        </tbody>

        {/* Ligne totaux */}
        <tfoot>
          <tr className="border-t-2 border-gray-300 font-semibold">
            <td className="pt-3 pr-4 text-xs tracking-wide text-gray-500 uppercase">
              Total {data.annee}
            </td>
            {hasActivites && <td className="pt-3 pr-4" />}
            <td className="pt-3 pr-4 text-right tabular-nums">{EUR.format(totaux.ca)}</td>
            <td className="pt-3 pr-4 text-right text-amber-700 tabular-nums">
              {EUR.format(totaux.cotisations)}
            </td>
            <td className="pt-3 pr-4 text-right text-gray-500 tabular-nums">
              {totaux.versement_liberatoire > 0
                ? EUR.format(totaux.versement_liberatoire)
                : "—"}
            </td>
            <td className="pt-3 pr-4 text-right text-red-600 tabular-nums">
              {EUR.format(totaux.total_charges)}
            </td>
            <td
              className={
                "pt-3 pr-4 text-right tabular-nums " +
                (totaux.revenu_net >= 0 ? "text-emerald-600" : "text-red-600")
              }
            >
              {EUR.format(totaux.revenu_net)}
            </td>
            <td className="pt-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
