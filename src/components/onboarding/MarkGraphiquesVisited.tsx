"use client";

import { markGraphiquesVisitedAction } from "@/actions/onboarding";
import { useEffect } from "react";

/**
 * Composant invisible — marque la visite de la page graphiques côté serveur
 * (Supabase user metadata) et en cache localStorage.
 * La source de vérité est le serveur : croisement mobile/PC résolu.
 */
export function MarkGraphiquesVisited() {
  useEffect(() => {
    // Persist côté serveur (cross-device)
    markGraphiquesVisitedAction().catch(() => {
      // silencieux — non bloquant
    });
    // Cache local pour éviter un flash au prochain chargement sur cet appareil
    try {
      localStorage.setItem("Cotizpro_graphiques_visited", "1");
    } catch {
      // silencieux — localStorage indisponible
    }
  }, []);

  return null;
}
