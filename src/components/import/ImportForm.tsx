"use client";

import type { ImportResult } from "@/actions/import";
import { importDeclarations } from "@/actions/import";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/config";
import type { Activite } from "@/types/database";
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  FileText,
  Settings,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewRow {
  annee: number;
  mois: number;
  montant_ca: number;
  error?: string;
}

const MOIS_COURTS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jul",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const MAX_ROWS_PREVIEW = 50;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ImportFormProps {
  activites?: Activite[];
  isPremium?: boolean;
}

// ─── CSV client-side parser (preview only — server re-validates) ──────────────

function parsePreview(text: string): PreviewRow[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, MAX_ROWS_PREVIEW + 1) // +1 pour détecter overflow
    .reduce<PreviewRow[]>((acc, line, i) => {
      const sep = line.includes(";") ? ";" : ",";
      const p = line.split(sep).map((s) => s.trim().replace(/^["']|["']$/g, ""));

      // Sauter la ligne d'en-tête (première ligne non-numérique)
      if (i === 0 && isNaN(Number(p[0]))) return acc;

      if (p.length < 3) {
        acc.push({ annee: 0, mois: 0, montant_ca: 0, error: "Colonnes insuffisantes" });
        return acc;
      }

      const annee = parseInt(p[0], 10);
      const mois = parseInt(p[1], 10);
      const montant_ca = parseFloat(p[2].replace(",", "."));

      if (isNaN(annee) || isNaN(mois) || isNaN(montant_ca)) {
        acc.push({ annee, mois, montant_ca, error: "Valeur non numérique" });
        return acc;
      }
      if (mois < 1 || mois > 12) {
        acc.push({ annee, mois, montant_ca, error: "Mois invalide (1-12)" });
        return acc;
      }
      if (montant_ca < 0) {
        acc.push({ annee, mois, montant_ca, error: "CA négatif refusé" });
        return acc;
      }

      acc.push({ annee, mois, montant_ca });
      return acc;
    }, []);
}

// ─── Component ────────────────────────────────────────────────────────────────

const INITIAL_STATE: ImportResult = { success: false };

export function ImportForm({ activites = [], isPremium = false }: ImportFormProps) {
  const [state, action, isPending] = useActionState(importDeclarations, INITIAL_STATE);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [selectedActiviteId, setSelectedActiviteId] = useState<string>("principale");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérification type côté client (le serveur re-valide)
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      alert("Seuls les fichiers .csv sont acceptés.");
      e.target.value = "";
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      // Met la valeur dans l'input caché (hidden)
      if (csvInputRef.current) csvInputRef.current.value = text;
      setPreview(parsePreview(text));
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleReset() {
    setPreview(null);
    setFileName(null);
    setCsvContent("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (csvInputRef.current) csvInputRef.current.value = "";
  }

  const validRows = preview?.filter((r) => !r.error) ?? [];
  const invalidRows = preview?.filter((r) => r.error) ?? [];

  return (
    <div className="space-y-6">
      {/* Format attendu */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Format CSV attendu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-3 text-sm">
            3 colonnes, séparateur virgule ou point-virgule. L&apos;en-tête est
            optionnelle.
          </p>
          <pre className="bg-muted rounded-lg p-3 font-mono text-xs">
            {`annee,mois,montant_ca
2025,1,3500.00
2025,2,4200.00
2025,3,2800.50`}
          </pre>
          <p className="text-muted-foreground mt-2 text-xs">
            Maximum {MAX_ROWS_PREVIEW} lignes par import
            {isPremium && activites.length > 0
              ? " · Sélectionnez l'activité ci-dessous"
              : " · Activité principale uniquement"}
          </p>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Importer un fichier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            {/* Input caché pour le contenu CSV */}
            <input
              ref={csvInputRef}
              type="hidden"
              name="csv_content"
              defaultValue={csvContent}
            />
            {/* activite_id — vide = activité principale */}
            <input
              type="hidden"
              name="activite_id"
              value={selectedActiviteId === "principale" ? "" : selectedActiviteId}
            />

            {/* Sélecteur d'activité (Premium + plusieurs activités) */}
            {isPremium && activites.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Activité concernée</label>
                <Select
                  value={selectedActiviteId}
                  onValueChange={(v) => setSelectedActiviteId(v ?? "principale")}
                >
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Choisir une activité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principale">Activité principale</SelectItem>
                    {activites.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nom ?? a.regime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Hint Premium — non abonné */}
            {!isPremium && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-950/40">
                <div className="flex items-center gap-3">
                  <Crown className="h-4 w-4 shrink-0 text-yellow-500" />
                  <p className="text-sm text-indigo-900 dark:text-indigo-100">
                    Import vers une{" "}
                    <span className="font-medium">activité secondaire</span> disponible
                    avec Premium.
                  </p>
                </div>
                <Link
                  href={ROUTES.premium}
                  className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  Découvrir
                </Link>
              </div>
            )}
            {/* Hint créer activité — premium sans activités */}
            {isPremium && activites.length === 0 && (
              <div className="border-border bg-muted/40 flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Settings className="text-muted-foreground h-4 w-4 shrink-0" />
                  <p className="text-muted-foreground text-sm">
                    Créez une{" "}
                    <span className="text-foreground font-medium">
                      activité secondaire
                    </span>{" "}
                    pour l’importer ici.
                  </p>
                </div>
                <Link
                  href={ROUTES.parametres}
                  className="border-border text-foreground hover:bg-muted shrink-0 rounded-md border bg-transparent px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  Paramètres
                </Link>
              </div>
            )}

            {/* File input visible */}
            <div className="flex items-center gap-3">
              <label
                htmlFor="csv-file"
                className="border-input bg-background hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors"
              >
                <Upload className="h-4 w-4" />
                {fileName ?? "Choisir un fichier .csv"}
              </label>
              <input
                ref={fileInputRef}
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {fileName && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                >
                  Supprimer
                </button>
              )}
            </div>

            {/* Aperçu */}
            {preview !== null && preview.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Aperçu — {validRows.length} ligne
                  {validRows.length > 1 ? "s" : ""} valide
                  {validRows.length > 1 ? "s" : ""}
                  {invalidRows.length > 0 ? ` · ${invalidRows.length} en erreur` : ""}
                </p>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="px-3 py-2 text-left font-medium">Période</th>
                        <th className="px-3 py-2 text-right font-medium">CA</th>
                        <th className="px-3 py-2 text-left font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`border-b last:border-0 ${row.error ? "bg-destructive/5" : ""}`}
                        >
                          <td className="px-3 py-2 tabular-nums">
                            {row.error
                              ? "—"
                              : `${MOIS_COURTS[row.mois - 1]} ${row.annee}`}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {row.error ? "—" : EUR.format(row.montant_ca)}
                          </td>
                          <td className="px-3 py-2">
                            {row.error ? (
                              <span className="text-destructive text-xs">
                                {row.error}
                              </span>
                            ) : (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                ✓ Valide
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview !== null && preview.length === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Aucune donnée trouvée dans le fichier.
                </AlertDescription>
              </Alert>
            )}

            {/* Résultat de l'import */}
            {state.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p>{state.error}</p>
                  {state.rowErrors && state.rowErrors.length > 0 && (
                    <ul className="mt-1 list-inside list-disc text-xs">
                      {state.rowErrors.slice(0, 10).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                      {state.rowErrors.length > 10 && (
                        <li>... et {state.rowErrors.length - 10} autre(s)</li>
                      )}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {state.success && (
              <Alert className="border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                  <p className="font-medium">
                    {state.inserted} déclaration
                    {(state.inserted ?? 0) > 1 ? "s" : ""} importée
                    {(state.inserted ?? 0) > 1 ? "s" : ""} avec succès.
                  </p>
                  {(state.skipped ?? 0) > 0 && (
                    <p className="mt-0.5 text-xs">
                      {state.skipped} doublon
                      {(state.skipped ?? 0) > 1 ? "s" : ""} ignoré
                      {(state.skipped ?? 0) > 1 ? "s" : ""} (déjà présent
                      {(state.skipped ?? 0) > 1 ? "s" : ""}).
                    </p>
                  )}
                  {state.rowErrors && state.rowErrors.length > 0 && (
                    <ul className="mt-1 list-inside list-disc text-xs opacity-70">
                      {state.rowErrors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isPending || validRows.length === 0}
              className="w-full sm:w-auto"
            >
              {isPending
                ? "Import en cours…"
                : `Importer ${validRows.length > 0 ? `${validRows.length} déclaration${validRows.length > 1 ? "s" : ""}` : ""}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
