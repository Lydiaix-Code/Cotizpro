"use client";

export function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
    >
      Réessayer
    </button>
  );
}
