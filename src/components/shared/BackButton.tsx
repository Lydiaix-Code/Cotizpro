"use client";

import { useRouter } from "next/navigation";

export function BackButton({
  label = "← Retour",
  fallback = "/",
}: {
  label?: string;
  fallback?: string;
}) {
  const router = useRouter();

  const handleBack = () => {
    const referrer = document.referrer;
    const isSameOrigin = referrer && new URL(referrer).origin === window.location.origin;
    if (isSameOrigin) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <button onClick={handleBack} className="text-primary text-sm hover:underline">
      {label}
    </button>
  );
}
