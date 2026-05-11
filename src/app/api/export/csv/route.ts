import { getIsPremium } from "@/lib/premium";
import { createClient } from "@/lib/supabase/server";
import type { Regime } from "@/types/database";
import { LABELS_REGIME, PLAFONDS_CA } from "@/types/database";
import { NextRequest, NextResponse } from "next/server";

// Limite raisonnable pour éviter un export abusif
const ANNEE_MIN = 2000;

type DeclarationRow = {
  mois: number;
  montant_ca: number;
  regime: Regime;
  cotisations: Array<{
    montant_cotisations: number;
    montant_versement_liberatoire: number | null;
    taux_applique: number;
    acre_applique: boolean;
  }>;
};

const NOMS_MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function escapeCsvCell(value: string | number | boolean): string {
  const str = String(value);
  // Protéger contre l'injection de formules CSV (OWASP)
  if (/^[=+\-@\t\r]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows: DeclarationRow[], annee: number): string {
  const lines: string[] = [];

  // En-tête
  lines.push(
    [
      "Mois",
      "CA déclaré (€)",
      "Cotisations URSSAF (€)",
      "Versement libératoire (€)",
      "Total charges (€)",
      "Revenu net (€)",
      "Taux appliqué (%)",
      "ACRE",
      "Régime",
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  for (const row of rows) {
    const c = row.cotisations[0];
    const cotisations = c?.montant_cotisations ?? 0;
    const vl = c?.montant_versement_liberatoire ?? 0;
    const total = cotisations + vl;
    const net = row.montant_ca - total;
    const taux = c ? (c.taux_applique * 100).toFixed(1) : "0.0";

    lines.push(
      [
        NOMS_MOIS[row.mois - 1],
        row.montant_ca.toFixed(2),
        cotisations.toFixed(2),
        vl.toFixed(2),
        total.toFixed(2),
        net.toFixed(2),
        taux,
        c?.acre_applique ? "Oui" : "Non",
        LABELS_REGIME[row.regime],
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }

  // Ligne totaux
  const totCA = rows.reduce((s, r) => s + r.montant_ca, 0);
  const totCotis = rows.reduce(
    (s, r) => s + (r.cotisations[0]?.montant_cotisations ?? 0),
    0
  );
  const totVl = rows.reduce(
    (s, r) => s + (r.cotisations[0]?.montant_versement_liberatoire ?? 0),
    0
  );
  const totTotal = totCotis + totVl;
  const totNet = totCA - totTotal;

  const regime = rows[0]?.regime;
  const plafond = regime ? PLAFONDS_CA[regime] : 0;

  lines.push(
    [
      `TOTAL ${annee}`,
      totCA.toFixed(2),
      totCotis.toFixed(2),
      totVl.toFixed(2),
      totTotal.toFixed(2),
      totNet.toFixed(2),
      "",
      "",
      "",
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  lines.push("");
  lines.push(escapeCsvCell(`Plafond CA annuel,${plafond.toFixed(2)}`));
  lines.push(
    escapeCsvCell(`Exporté le,${new Date().toLocaleDateString("fr-FR")} - Cotizpro`)
  );

  return lines.join("\r\n");
}

export async function GET(request: NextRequest) {
  // ── Authentification via cookies (jamais via query param) ──────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  // ── Vérification Premium pour les activités secondaires ──────────────────
  // Un ex-premium peut exporter uniquement son activité principale (activite_id IS NULL)
  const isPremium = await getIsPremium();

  // ── Validation de l'année (sécurité : bornes strictes) ────────────────────
  const anneeRaw = request.nextUrl.searchParams.get("annee");
  const annee = anneeRaw ? parseInt(anneeRaw, 10) : new Date().getFullYear();
  const anneeActuelle = new Date().getFullYear();

  if (isNaN(annee) || annee < ANNEE_MIN || annee > anneeActuelle) {
    return new NextResponse("Paramètre annee invalide", { status: 400 });
  }

  // ── Récupération des données (RLS garantit l'isolation par user) ──────────
  // Si pas premium : uniquement les déclarations de l'activité principale (activite_id IS NULL)
  let query = supabase
    .from("declarations")
    .select(
      "mois, montant_ca, regime, cotisations(montant_cotisations, montant_versement_liberatoire, taux_applique, acre_applique)"
    )
    .eq("user_id", user.id)
    .eq("annee", annee);

  if (!isPremium) {
    query = query.is("activite_id", null);
  }

  const { data, error } = await query.order("mois", { ascending: true });

  if (error) {
    return new NextResponse("Erreur lors de la récupération des données", {
      status: 500,
    });
  }

  if (!data || data.length === 0) {
    return new NextResponse("Aucune donnée pour cette année", { status: 404 });
  }

  const rows = data as unknown as DeclarationRow[];
  const csv = buildCsv(rows, annee);
  const filename = `Cotizpro-${annee}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // BOM UTF-8 pour Excel (France)
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Sécurité : pas de mise en cache de données personnelles
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
