"use client";

import { createPortalSession } from "@/actions/stripe";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleManage() {
    setLoading(true);
    setError("");
    const result = await createPortalSession();
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // En cas de succès, redirect() dans le Server Action redirige
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleManage}
        disabled={loading}
        className="border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Gérer mon abonnement Stripe
      </button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
