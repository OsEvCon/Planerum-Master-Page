"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import type { Client } from "./MasterPageClient";

type Visit = {
  id: number;
  visitDateTime: string;
  status?: string;
  notes?: string | null;
  clientId: number;
  clientName?: string;
  clientPhone?: string;
  masterId: number;
  masterName?: string;
  procedureIds?: number[];
  procedureNames?: string[];
};

type ClientVisitsListProps = {
  client: Client;
  masterId: string;
  fingerprint: string;
};

export function ClientVisitsList({
  client,
  masterId,
  fingerprint,
}: ClientVisitsListProps) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [confirmCancelVisit, setConfirmCancelVisit] = useState<Visit | null>(null);

  const fetchVisits = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        masterId,
        fingerprint,
      });
      const res = await fetch(
        `/api/clients/${client.id}/visits?${params.toString()}`
      );
      const text = await res.text();
      if (!res.ok) return;
      const data = text ? JSON.parse(text) : [];
      const list = Array.isArray(data) ? data : [];
      setVisits(list);
    } catch {
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, [client.id, masterId, fingerprint]);

  useEffect(() => {
    if (!client.id || !fingerprint) return;
    fetchVisits();
  }, [client.id, fingerprint, fetchVisits]);

  const handleCancelClick = useCallback((visit: Visit) => {
    setConfirmCancelVisit(visit);
  }, []);

  const handleCancelConfirm = useCallback(
    async (visit: Visit) => {
      if (!fingerprint) return;
      setConfirmCancelVisit(null);
      setCancellingId(visit.id);
      try {
        const res = await fetch("/api/visits/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitId: visit.id,
            clientId: client.id,
            fingerprint,
          }),
        });
        if (res.ok) {
          setVisits((prev) => prev.filter((v) => v.id !== visit.id));
        }
      } finally {
        setCancellingId(null);
      }
    },
    [client.id, fingerprint]
  );

  if (loading) {
    return (
      <p className="mt-3 text-sm text-[var(--secondary)]/80">Загрузка записей…</p>
    );
  }

  if (visits.length === 0) return null;

  return (
    <div className="mt-4">
      <h2 className="text-base font-semibold text-[var(--secondary)]">
        Ваши записи
      </h2>
      <ul className="mt-2 space-y-3">
        {visits.map((visit) => (
          <li
            key={visit.id}
            className="rounded-xl border border-[var(--secondary)]/20 bg-[var(--surface-light)] p-4"
          >
            <p className="text-sm font-medium text-[var(--secondary)]">
              {format(parseISO(visit.visitDateTime), "d MMMM yyyy, HH:mm", {
                locale: ru,
              })}
            </p>
            {visit.procedureNames && visit.procedureNames.length > 0 && (
              <p className="mt-1 text-sm text-[var(--secondary)]/90">
                {visit.procedureNames.join(", ")}
              </p>
            )}
            <button
              type="button"
              onClick={() => handleCancelClick(visit)}
              disabled={cancellingId === visit.id}
              className="mt-3 rounded-lg border border-[var(--error)]/50 bg-transparent px-3 py-1.5 text-sm font-medium text-[var(--error)] hover:bg-[var(--error)]/10 disabled:opacity-50"
            >
              {cancellingId === visit.id ? "Отмена…" : "Отменить"}
            </button>
          </li>
        ))}
      </ul>

      {confirmCancelVisit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !cancellingId && setConfirmCancelVisit(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-cancel-title"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[var(--surface-light)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-cancel-title" className="text-lg font-semibold text-[var(--secondary)]">
              Отменить запись?
            </h3>
            <p className="mt-2 text-sm text-[var(--secondary)]/90">
              {format(parseISO(confirmCancelVisit.visitDateTime), "d MMMM yyyy, HH:mm", { locale: ru })}
              {confirmCancelVisit.procedureNames && confirmCancelVisit.procedureNames.length > 0 && (
                <> · {confirmCancelVisit.procedureNames.join(", ")}</>
              )}
            </p>
            <p className="mt-2 text-sm text-[var(--secondary)]/80">
              Вы уверены, что хотите отменить эту запись?
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => !cancellingId && setConfirmCancelVisit(null)}
                disabled={cancellingId !== null}
                className="flex-1 rounded-xl border border-[var(--secondary)]/30 py-2.5 text-sm font-medium text-[var(--secondary)] hover:bg-[var(--secondary)]/10 disabled:opacity-60"
              >
                Нет
              </button>
              <button
                type="button"
                onClick={() => handleCancelConfirm(confirmCancelVisit)}
                disabled={cancellingId !== null}
                className="flex-1 rounded-xl bg-[var(--error)] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70"
              >
                {cancellingId === confirmCancelVisit.id ? "Отмена…" : "Да, отменить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
