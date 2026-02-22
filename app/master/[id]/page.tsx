import { MasterBio } from "./MasterBio";
import { MasterPageClient } from "./MasterPageClient";

const API_BASE = "http://localhost:8080";

type Master = {
  id: number;
  name: string;
  bio?: string;
};

export default async function MasterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let master: Master | null = null;
  let errorMessage: string | null = null;

  try {
    const res = await fetch(`${API_BASE}/api/public/masters/${id}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 404) {
        errorMessage = "Мастер не найден";
      } else {
        errorMessage = "Ошибка сервера. Попробуйте позже.";
      }
    } else {
      master = await res.json();
    }
  } catch {
    errorMessage = "Не удалось подключиться к серверу.";
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[var(--background-light)] px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-[800px] rounded-2xl bg-[var(--surface-light)] p-6 shadow-sm md:p-8">
          <p className="text-center text-lg text-[var(--error)]">
            {errorMessage}
          </p>
        </div>
      </main>
    );
  }

  if (!master) {
    return null;
  }

  const hasBio = Boolean(master.bio?.trim());

  return (
    <main className="min-h-screen bg-[var(--background-light)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-[800px]">
        <MasterPageClient
          masterId={id}
          masterName={master.name}
          bioSection={
            hasBio ? (
              <div className="mt-6 rounded-2xl bg-[var(--surface-light)] p-6 shadow-sm md:p-8">
                <div className="border-b border-[var(--secondary)]/20 pb-2">
                  <MasterBio bio={master.bio!} />
                </div>
              </div>
            ) : null
          }
        />
      </div>
    </main>
  );
}
