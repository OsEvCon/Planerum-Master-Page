"use client";

import { useState, useEffect, useCallback } from "react";
import { MasterProcedures } from "./MasterProcedures";
import { MasterBooking } from "./MasterBooking";

const FINGERPRINT_KEY = "planerum_fingerprint";

function generateFingerprint(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 15)}-${Math.random().toString(36).slice(2, 15)}`;
}

function getOrCreateFingerprint(): string {
  if (typeof window === "undefined") return "";
  let value = localStorage.getItem(FINGERPRINT_KEY);
  if (!value) {
    value = generateFingerprint();
    localStorage.setItem(FINGERPRINT_KEY, value);
  }
  return value;
}

export type Client = {
  id: number;
  name: string;
  phoneNumber: string;
};

/** Нормализует ответ бэкенда (camelCase/snake_case, возможно обёрнут в data) в Client */
function normalizeClientResponse(data: unknown): Client | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const o = raw && typeof raw.data === "object" && raw.data !== null
    ? (raw.data as Record<string, unknown>)
    : raw;
  const id = typeof o.id === "number" ? o.id : Number(o.id);
  const name = typeof o.name === "string" ? o.name : String(o.name ?? "");
  const phoneNumber =
    typeof (o.phoneNumber ?? o.phone_number) === "string"
      ? String(o.phoneNumber ?? o.phone_number)
      : "";
  if (Number.isNaN(id) || !name) return null;
  return { id, name, phoneNumber };
}

type MasterPageClientProps = {
  masterId: string;
  masterName: string;
  bioSection?: React.ReactNode;
};

export function MasterPageClient({ masterId, masterName, bioSection }: MasterPageClientProps) {
  const [fingerprint, setFingerprint] = useState("");
  const [client, setClient] = useState<Client | null>(null);
  const [clientLoading, setClientLoading] = useState(true);

  useEffect(() => {
    setFingerprint(getOrCreateFingerprint());
  }, []);

  useEffect(() => {
    if (!fingerprint) return;
    let cancelled = false;
    setClientLoading(true);
    fetch(
      `/api/clients/by-fingerprint?fingerprint=${encodeURIComponent(fingerprint)}&masterId=${encodeURIComponent(masterId)}`
    )
      .then(async (res) => {
        if (cancelled) return null;
        const text = await res.text();
        if (!res.ok) return null;
        try {
          return text ? JSON.parse(text) : null;
        } catch {
          return null;
        }
      })
      .then((data) => {
        if (cancelled || data == null) return;
        const client = normalizeClientResponse(data);
        if (client) setClient(client);
        else setClient(null);
      })
      .catch(() => {
        if (!cancelled) setClient(null);
      })
      .finally(() => {
        if (!cancelled) setClientLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fingerprint, masterId]);

  const handleVisitSuccess = useCallback(() => {
    if (!fingerprint) return;
    fetch(
      `/api/clients/by-fingerprint?fingerprint=${encodeURIComponent(fingerprint)}&masterId=${encodeURIComponent(masterId)}`
    )
      .then(async (res) => {
        if (!res.ok) return null;
        const text = await res.text();
        try {
          return text ? JSON.parse(text) : null;
        } catch {
          return null;
        }
      })
      .then((data) => {
        const client = data ? normalizeClientResponse(data) : null;
        if (client) setClient(client);
      })
      .catch(() => {});
  }, [fingerprint, masterId]);

  return (
    <>
      {!clientLoading && client && (
        <p className="text-lg font-medium text-[var(--primary)]">
          Здравствуйте, {client.name}
        </p>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-[var(--primary)] sm:text-3xl md:text-4xl mt-2">
        Запись к {masterName}
      </h1>
      {bioSection}
      <MasterProcedures masterId={masterId} />
      <MasterBooking
        masterId={masterId}
        fingerprint={fingerprint}
        client={client}
        onVisitSuccess={handleVisitSuccess}
      />
    </>
  );
}
