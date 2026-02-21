"use client";

import { useState, useCallback } from "react";

type Procedure = {
  id: number;
  name: string;
  price: number | string;
  description: string | null;
  createdAt: string;
  masterId: number;
  masterName: string;
};

type MasterProceduresProps = {
  masterId: string;
};

function formatPrice(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function ProcedureItem({
  procedure,
}: {
  procedure: Procedure;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDescription = Boolean(procedure.description?.trim());

  return (
    <div className="border-b border-[var(--secondary)]/15 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 rounded"
        aria-expanded={isOpen}
        aria-controls={`procedure-desc-${procedure.id}`}
      >
        <span className="font-medium text-[var(--secondary)]">
          {procedure.name}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[var(--primary)] font-semibold">
            {formatPrice(procedure.price)}
          </span>
          {hasDescription && (
            <svg
              className={`h-4 w-4 text-[var(--secondary)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </span>
      </button>
      {hasDescription && (
        <div
          id={`procedure-desc-${procedure.id}`}
          className="grid transition-[grid-template-rows] duration-200 ease-in-out"
          style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
          aria-hidden={!isOpen}
        >
          <div className="overflow-hidden">
            <div className="pb-3 pl-0 text-[var(--secondary)]/90 leading-relaxed">
              {procedure.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MasterProcedures({ masterId }: MasterProceduresProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [procedures, setProcedures] = useState<Procedure[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProcedures = useCallback(async () => {
    if (procedures !== null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/masterProcedures/${masterId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setProcedures([]);
        } else {
          setError("Не удалось загрузить список услуг.");
        }
        return;
      }
      const data = await res.json();
      setProcedures(Array.isArray(data) ? data : []);
    } catch {
      setError("Не удалось подключиться к серверу.");
    } finally {
      setLoading(false);
    }
  }, [masterId, procedures]);

  const handleToggle = useCallback(() => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) fetchProcedures();
  }, [isOpen, fetchProcedures]);

  return (
    <section className="mt-6 rounded-2xl border border-[var(--secondary)]/30 bg-[var(--surface-light)] overflow-hidden md:mt-8">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-2 p-6 text-left text-[var(--primary)] transition-opacity hover:opacity-90 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-inset md:p-8"
        aria-expanded={isOpen}
        aria-controls="master-procedures-content"
      >
        <h2 className="text-xl font-semibold">Услуги мастера</h2>
        <svg
          className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        id="master-procedures-content"
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
        aria-hidden={!isOpen}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[var(--secondary)]/20 px-6 pb-6 pt-2 md:px-8 md:pb-8 md:pt-2">
            {loading && (
              <p className="py-4 text-[var(--secondary)]/80">
                Загрузка...
              </p>
            )}
            {error && (
              <p className="py-4 text-[var(--error)]">{error}</p>
            )}
            {!loading && !error && procedures && procedures.length === 0 && (
              <p className="py-4 text-[var(--secondary)]/80">
                Нет доступных услуг.
              </p>
            )}
            {!loading && !error && procedures && procedures.length > 0 && (
              <ul className="space-y-0">
                {procedures.map((p) => (
                  <li key={p.id}>
                    <ProcedureItem procedure={p} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
