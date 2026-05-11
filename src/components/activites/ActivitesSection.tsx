"use client";

import {
  createActivite,
  deleteActivite,
  reactiverActivite,
  updateActivite,
  type ActiviteActionResult,
} from "@/actions/activite";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Activite } from "@/types/database";
import { Crown, Pencil, Plus, PowerOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

const LABELS_REGIME: Record<string, string> = {
  bic_marchandises: "Vente de marchandises (BIC)",
  bic_services: "Prestations de services (BIC)",
  bnc: "Activité libérale (BNC)",
};

const BADGE_REGIME: Record<string, string> = {
  bic_marchandises: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  bic_services:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  bnc: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

// ─── Dialog formulaire activité ───────────────────────────────────────────────

interface ActiviteDialogProps {
  open: boolean;
  onClose: () => void;
  activite?: Activite; // si fourni = mode édition
}

function ActiviteDialog({ open, onClose, activite }: ActiviteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [regime, setRegime] = useState<string>(activite?.regime ?? "bic_services");
  const [acre, setAcre] = useState(activite?.acre ?? false);
  const [versLib, setVersLib] = useState(activite?.versement_liberatoire ?? false);

  const isEdit = !!activite;
  const title = isEdit ? "Modifier l'activité" : "Nouvelle activité";

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    // Les booleans doivent être envoyés explicitement
    fd.set("acre", String(acre));
    fd.set("versement_liberatoire", String(versLib));

    startTransition(async () => {
      let result: ActiviteActionResult;
      if (isEdit) {
        result = await updateActivite(activite.id, fd);
      } else {
        result = await createActivite(fd);
      }
      if (result.success) {
        handleClose();
      } else {
        setError(result.error ?? "Erreur inconnue.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Le régime fiscal détermine le taux de cotisations URSSAF applicable.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <Alert variant="destructive">
              <p className="text-sm">{error}</p>
            </Alert>
          )}

          {/* Régime — en premier pour que le dropdown s'ouvre vers le bas */}
          <div className="space-y-1.5">
            <Label htmlFor="act-regime">Régime fiscal *</Label>
            <input type="hidden" name="regime" value={regime} />
            <Select
              value={regime}
              onValueChange={(v) => {
                if (v) setRegime(v);
              }}
            >
              <SelectTrigger id="act-regime" className="w-full">
                <SelectValue className="truncate" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="bic_marchandises">
                  Vente de marchandises — 12,3 %
                </SelectItem>
                <SelectItem value="bic_services">
                  Prestations de services — 21,2 %
                </SelectItem>
                <SelectItem value="bnc">Activité libérale (BNC) — 23,1 %</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nom */}
          <div className="space-y-1.5">
            <Label htmlFor="act-nom">Nom de l&apos;activité *</Label>
            <Input
              id="act-nom"
              name="nom"
              required
              maxLength={80}
              defaultValue={activite?.nom ?? ""}
              placeholder="Ex : Consulting informatique"
            />
          </div>

          {/* Date début */}
          <div className="space-y-1.5">
            <Label htmlFor="act-date">Date de début *</Label>
            <Input
              id="act-date"
              name="date_debut"
              type="date"
              required
              defaultValue={activite?.date_debut ?? ""}
            />
          </div>

          {/* ACRE */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="act-acre"
              checked={acre}
              onChange={(e) => setAcre(e.target.checked)}
              className="border-input accent-primary h-4 w-4 rounded"
            />
            <Label htmlFor="act-acre" className="cursor-pointer font-normal">
              Bénéficie de l&apos;ACRE (exonération 1ère année)
            </Label>
          </div>

          {/* Versement libératoire */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="act-versl"
              checked={versLib}
              onChange={(e) => setVersLib(e.target.checked)}
              className="border-input accent-primary h-4 w-4 rounded"
            />
            <Label htmlFor="act-versl" className="cursor-pointer font-normal">
              Versement libératoire de l&apos;impôt
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Enregistrement…"
                : isEdit
                  ? "Mettre à jour"
                  : "Créer l'activité"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface ActivitesSectionProps {
  activites: Activite[];
  isPremium: boolean;
}

export function ActivitesSection({ activites, isPremium }: ActivitesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Activite | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const activeCount = activites.filter((a) => a.actif).length;

  function openCreate() {
    setEditTarget(undefined);
    setDialogOpen(true);
  }

  function openEdit(a: Activite) {
    setEditTarget(a);
    setDialogOpen(true);
  }

  function handleToggle(a: Activite) {
    setActionError(null);
    startTransition(async () => {
      const result = a.actif ? await deleteActivite(a.id) : await reactiverActivite(a.id);
      if (!result.success) setActionError(result.error ?? "Erreur.");
    });
  }

  // Gate Premium
  if (!isPremium) {
    return (
      <div className="bg-muted/30 space-y-3 rounded-xl border border-dashed p-6 text-center">
        <Crown className="mx-auto h-6 w-6 text-yellow-500" />
        <p className="text-sm font-medium">Multi-activité — fonctionnalité Premium</p>
        <p className="text-muted-foreground text-xs">
          Gérez plusieurs régimes fiscaux en parallèle et suivez le CA de chaque activité
          séparément.
        </p>
        <Link
          href="/premium"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <Crown className="h-3 w-3 text-yellow-300" />
          Passer Premium
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <Alert variant="destructive">
          <p className="text-sm">{actionError}</p>
        </Alert>
      )}

      {activites.length === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">
          Aucune activité secondaire. Votre activité principale est définie dans le profil
          ci-dessus.
        </p>
      ) : (
        <div className="space-y-2">
          {activites.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition-opacity ${!a.actif ? "opacity-50" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{a.nom}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${BADGE_REGIME[a.regime] ?? ""}`}
                  >
                    {LABELS_REGIME[a.regime]}
                  </span>
                  {!a.actif && (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground text-[10px]"
                    >
                      Désactivée
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Depuis le {new Date(a.date_debut).toLocaleDateString("fr-FR")}
                  {a.acre ? " · ACRE" : ""}
                  {a.versement_liberatoire ? " · Vers. lib." : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {a.actif && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(a)}
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${a.actif ? "text-destructive hover:text-destructive" : "text-emerald-600 hover:text-emerald-600"}`}
                  onClick={() => handleToggle(a)}
                  disabled={isPending}
                  title={a.actif ? "Désactiver" : "Réactiver"}
                >
                  {a.actif ? (
                    <PowerOff className="h-3.5 w-3.5" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={openCreate}
        disabled={activeCount >= 5}
        className="gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une activité
        {activeCount >= 5 && <span className="text-muted-foreground">(max 5)</span>}
      </Button>

      <ActiviteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        activite={editTarget}
      />
    </div>
  );
}
