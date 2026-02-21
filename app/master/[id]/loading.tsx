export default function MasterLoading() {
  return (
    <main className="min-h-screen bg-[var(--background-light)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-[800px]">
        <div className="rounded-2xl bg-[var(--surface-light)] p-6 shadow-sm md:p-8">
          <div className="h-9 w-3/4 animate-pulse rounded bg-[var(--secondary)]/20" />
          <div className="mt-6 h-5 w-1/2 animate-pulse rounded bg-[var(--secondary)]/10" />
          <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-[var(--secondary)]/10" />
        </div>
        <div className="mt-6 rounded-2xl border border-[var(--secondary)]/20 bg-[var(--surface-light)] p-6 md:mt-8 md:p-8">
          <div className="h-6 w-48 animate-pulse rounded bg-[var(--secondary)]/20" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-[var(--secondary)]/10" />
        </div>
      </div>
    </main>
  );
}
