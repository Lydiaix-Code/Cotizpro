"use client";

import {
  deleteDeclaration,
  type DeclarationAvecCotisations,
} from "@/actions/declaration";
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
import { PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

const MOIS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
] as const;

interface DeclarationListProps {
  declarations: DeclarationAvecCotisations[];
}

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export function DeclarationList({ declarations }: DeclarationListProps) {
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Optimistic delete : l'item disparaît immédiatement du DOM avant la réponse serveur
  const [optimisticDeclarations, removeOptimistic] = useOptimistic(
    declarations,
    (state, idToRemove: string) => state.filter((d) => d.id !== idToRemove)
  );

  function handleDelete() {
    if (!toDelete) return;
    const idToRemove = toDelete;
    setToDelete(null);
    startTransition(async () => {
      removeOptimistic(idToRemove);
      const result = await deleteDeclaration(idToRemove);
      if (result.success) {
        toast.success("Déclaration supprimée.");
      } else {
        toast.error(result.error ?? "Erreur lors de la suppression.");
      }
    });
  }

  if (optimisticDeclarations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="bg-muted rounded-full p-3">
          <PlusCircle className="text-muted-foreground h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Aucune déclaration pour cette année</p>
          <p className="text-muted-foreground text-xs">
            Saisissez votre premier CA mensuel pour commencer le suivi.
          </p>
        </div>
        <Link
          href="/declaration"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Déclarer mon CA
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y rounded-lg border">
        {optimisticDeclarations.map((d) => {
          const cotisation = d.cotisations?.[0];
          const totalCotisations =
            (cotisation?.montant_cotisations ?? 0) +
            (cotisation?.montant_versement_liberatoire ?? 0);
          const revenuNet = d.montant_ca - totalCotisations;

          return (
            <div key={d.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">
                    {MOIS[d.mois - 1]} {d.annee}
                  </span>
                  {cotisation?.acre_applique && (
                    <Badge variant="secondary" className="text-xs">
                      ACRE
                    </Badge>
                  )}
                </div>
                <div className="text-muted-foreground mt-0.5 flex gap-3 text-xs">
                  <span>CA : {EUR.format(d.montant_ca)}</span>
                  {cotisation && (
                    <>
                      <span>Cotisations : {EUR.format(totalCotisations)}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Net : {EUR.format(revenuNet)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setToDelete(d.id)}
                aria-label="Supprimer cette déclaration"
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Dialog de confirmation suppression */}
      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette déclaration ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. La déclaration et ses cotisations associées
              seront définitivement supprimées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
