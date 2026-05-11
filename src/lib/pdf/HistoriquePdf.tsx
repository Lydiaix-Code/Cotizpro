/**
 * Composant PDF — récapitulatif annuel Cotizpro
 * Rendu exclusivement côté serveur via @react-pdf/renderer.
 * Ne jamais importer ce fichier dans un Client Component.
 */

import type { HistoriqueAnnee } from "@/actions/historique";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Désactive l'hyphenation automatique (inutile en français pour les montants)
Font.registerHyphenationCallback((word) => [word]);

const INDIGO = "#4f46e5";
const EMERALD = "#059669";
const AMBER = "#d97706";
const RED = "#dc2626";
const GRAY_50 = "#f9fafb";
const GRAY_200 = "#e5e7eb";
const GRAY_500 = "#6b7280";
const GRAY_800 = "#1f2937";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: GRAY_800,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    backgroundColor: "#ffffff",
  },
  // ── En-tête ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: INDIGO,
  },
  headerLeft: { flexDirection: "column", gap: 2 },
  brandName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: INDIGO },
  headerTitle: { fontSize: 11, color: GRAY_500, marginTop: 2 },
  headerRight: { flexDirection: "column", alignItems: "flex-end", gap: 2 },
  headerYear: { fontSize: 22, fontFamily: "Helvetica-Bold", color: GRAY_800 },
  headerRegime: { fontSize: 8, color: GRAY_500 },
  // ── Cartes de résumé ──────────────────────────────────────────────────────
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: GRAY_50,
    borderWidth: 1,
    borderColor: GRAY_200,
    borderRadius: 6,
    padding: 10,
  },
  summaryLabel: {
    fontSize: 7,
    color: GRAY_500,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  summaryValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  // ── Barre de progression ──────────────────────────────────────────────────
  progressSection: { marginBottom: 20 },
  progressLabel: { fontSize: 8, color: GRAY_500, marginBottom: 4 },
  progressTrack: {
    height: 6,
    backgroundColor: GRAY_200,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  progressInfoText: { fontSize: 7, color: GRAY_500 },
  // ── Table ─────────────────────────────────────────────────────────────────
  tableSection: { marginBottom: 20 },
  tableTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: INDIGO,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 5,
    marginBottom: 2,
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  tableRowEven: { backgroundColor: GRAY_50 },
  tableCell: { fontSize: 8, textAlign: "right" },
  tableCellLeft: { fontSize: 8, textAlign: "left" },
  tableTotals: {
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: GRAY_800,
    borderRadius: 3,
    marginTop: 4,
  },
  tableTotalCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textAlign: "right",
  },
  tableTotalCellLeft: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textAlign: "left",
  },
  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: GRAY_500 },
});

// ── Formatters ────────────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const PCT = (v: number) => `${(v * 100).toFixed(1)} %`;

// ── Colonnes de la table (widths en %) ───────────────────────────────────────

type Col = { label: string; width: string; align?: "left" | "right" };
const COLS: Col[] = [
  { label: "Mois", width: "14%", align: "left" },
  { label: "CA déclaré", width: "17%" },
  { label: "Cotisations", width: "17%" },
  { label: "Vers. lib.", width: "15%" },
  { label: "Total charges", width: "17%" },
  { label: "Revenu net", width: "15%" },
  { label: "Taux", width: "5%" },
];

// ── Composant PDF ─────────────────────────────────────────────────────────────

interface Props {
  data: HistoriqueAnnee;
}

export function HistoriquePdf({ data }: Props) {
  const { annee, label_regime, mois, totaux, plafond, pourcentage_plafond } = data;
  const ratio = Math.min(pourcentage_plafond / 100, 1);
  const barColor = ratio >= 1 ? RED : ratio >= 0.8 ? AMBER : EMERALD;
  const today = new Date().toLocaleDateString("fr-FR");

  return (
    <Document
      title={`Cotizpro — Récapitulatif ${annee}`}
      author="Cotizpro"
      creator="Cotizpro"
    >
      <Page size="A4" style={styles.page}>
        {/* ── En-tête ────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandName}>Cotizpro</Text>
            <Text style={styles.headerTitle}>Récapitulatif de cotisations URSSAF</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerYear}>{annee}</Text>
            <Text style={styles.headerRegime}>{label_regime}</Text>
          </View>
        </View>

        {/* ── Cartes de résumé ───────────────────────────────────────────── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>CA total</Text>
            <Text style={[styles.summaryValue, { color: GRAY_800 }]}>
              {EUR.format(totaux.ca)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Cotisations URSSAF</Text>
            <Text style={[styles.summaryValue, { color: AMBER }]}>
              {EUR.format(totaux.cotisations)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total charges</Text>
            <Text style={[styles.summaryValue, { color: RED }]}>
              {EUR.format(totaux.total_charges)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Revenu net</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: totaux.revenu_net >= 0 ? EMERALD : RED },
              ]}
            >
              {EUR.format(totaux.revenu_net)}
            </Text>
          </View>
        </View>

        {/* ── Barre de progression vers le plafond ──────────────────────── */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            Progression vers le plafond CA — {pourcentage_plafond} %
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${pourcentage_plafond}%`, backgroundColor: barColor },
              ]}
            />
          </View>
          <View style={styles.progressInfo}>
            <Text style={styles.progressInfoText}>
              CA cumulé : {EUR.format(totaux.ca)}
            </Text>
            <Text style={styles.progressInfoText}>
              Plafond annuel : {EUR.format(plafond)}
            </Text>
            <Text style={[styles.progressInfoText, { color: barColor }]}>
              Reste : {EUR.format(Math.max(plafond - totaux.ca, 0))}
            </Text>
          </View>
        </View>

        {/* ── Table de détail mensuel ───────────────────────────────────── */}
        <View style={styles.tableSection}>
          <Text style={styles.tableTitle}>Détail mensuel</Text>

          {/* En-tête de table */}
          <View style={styles.tableHeader}>
            {COLS.map((col) => (
              <Text
                key={col.label}
                style={[
                  styles.tableHeaderCell,
                  {
                    width: col.width,
                    textAlign: col.align === "left" ? "left" : "right",
                  },
                ]}
              >
                {col.label}
              </Text>
            ))}
          </View>

          {/* Lignes */}
          {mois.map((m, i) => (
            <View
              key={m.mois}
              style={[styles.tableRow, i % 2 === 1 ? styles.tableRowEven : {}]}
            >
              <Text style={[styles.tableCellLeft, { width: "14%" }]}>
                {m.label_mois}
                {m.acre_applique ? " ★" : ""}
              </Text>
              <Text style={[styles.tableCell, { width: "17%" }]}>
                {EUR.format(m.montant_ca)}
              </Text>
              <Text style={[styles.tableCell, { width: "17%", color: AMBER }]}>
                {EUR.format(m.cotisations)}
              </Text>
              <Text style={[styles.tableCell, { width: "15%", color: GRAY_500 }]}>
                {m.versement_liberatoire > 0 ? EUR.format(m.versement_liberatoire) : "—"}
              </Text>
              <Text style={[styles.tableCell, { width: "17%", color: RED }]}>
                {EUR.format(m.total_charges)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { width: "15%", color: m.revenu_net >= 0 ? EMERALD : RED },
                ]}
              >
                {EUR.format(m.revenu_net)}
              </Text>
              <Text style={[styles.tableCell, { width: "5%", color: GRAY_500 }]}>
                {PCT(m.taux_applique)}
              </Text>
            </View>
          ))}

          {/* Totaux */}
          <View style={styles.tableTotals}>
            <Text style={[styles.tableTotalCellLeft, { width: "14%" }]}>TOTAL</Text>
            <Text style={[styles.tableTotalCell, { width: "17%" }]}>
              {EUR.format(totaux.ca)}
            </Text>
            <Text style={[styles.tableTotalCell, { width: "17%" }]}>
              {EUR.format(totaux.cotisations)}
            </Text>
            <Text style={[styles.tableTotalCell, { width: "15%" }]}>
              {totaux.versement_liberatoire > 0
                ? EUR.format(totaux.versement_liberatoire)
                : "—"}
            </Text>
            <Text style={[styles.tableTotalCell, { width: "17%" }]}>
              {EUR.format(totaux.total_charges)}
            </Text>
            <Text style={[styles.tableTotalCell, { width: "15%" }]}>
              {EUR.format(totaux.revenu_net)}
            </Text>
            <Text style={[styles.tableTotalCell, { width: "5%" }]} />
          </View>

          {/* Légende */}
          {mois.some((m) => m.acre_applique) && (
            <Text style={[styles.progressInfoText, { marginTop: 4 }]}>
              ★ Mois avec ACRE appliqué
            </Text>
          )}
        </View>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Généré le {today} — Cotizpro</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
