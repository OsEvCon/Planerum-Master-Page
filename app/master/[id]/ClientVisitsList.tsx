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

  const handleCancel = useCallback(
    async (visit: Visit) => {
      if (!fingerprint) return;
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
        Мои записи
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
              onClick={() => handleCancel(visit)}
              disabled={cancellingId === visit.id}
              className="mt-3 rounded-lg border border-[var(--error)]/50 bg-transparent px-3 py-1.5 text-sm font-medium text-[var(--error)] hover:bg-[var(--error)]/10 disabled:opacity-50"
            >
              {cancellingId === visit.id ? "Отмена…" : "Отменить"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
