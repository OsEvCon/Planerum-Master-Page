"use client";

import { useEffect } from "react";

export default function MasterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Master page error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[var(--background-light)] flex items-center justify-center p-6">
      <div className="mx-auto max-w-md rounded-2xl bg-[var(--surface-light)] p-8 shadow-sm text-center">
        <p className="text-lg text-[var(--error)]">
          Что-то пошло не так при загрузке страницы.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-[var(--primary)] px-6 py-3 text-white font-medium hover:opacity-90 transition-opacity"
        >
          Попробовать снова
        </button>
      </div>
    </main>
  );
}
