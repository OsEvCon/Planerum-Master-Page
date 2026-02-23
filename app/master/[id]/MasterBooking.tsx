"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isBefore,
  startOfDay,
} from "date-fns";
import { ru } from "date-fns/locale";
import toast from "react-hot-toast";

type VisitSlot = {
  id: number;
  visitDateTime: string;
  status?: string;
  clientId?: number | null;
  masterId: number;
  masterName: string;
  procedureIds?: number[];
  procedureNames?: string[];
};

type Procedure = {
  id: number;
  name: string;
  price: number | string;
};

type Client = {
  id: number;
  name: string;
  phoneNumber: string;
};

type MasterBookingProps = {
  masterId: string;
  fingerprint: string;
  client: Client | null;
  onVisitSuccess?: () => void;
};

/** Из сырой строки поля извлекаем только цифры после +7 (без кода страны), макс 10 */
function parsePhoneDigitsFromInput(raw: string): string {
  let d = raw.replace(/\D/g, "").slice(0, 11);
  if (raw.trim().startsWith("+7") && d.startsWith("7")) d = d.slice(1);
  return d.slice(0, 10);
}

/** Форматирование цифр для отображения: +7 (XXX) XXX-XX-XX. Без завершающего тире — чтобы Backspace всегда удалял цифру */
function formatPhoneFromDigits(digits: string): string {
  if (digits.length === 0) return "+7 ";
  if (digits.length <= 3) return `+7 (${digits}`;
  if (digits.length <= 6) return `+7 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length === 7) return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits[6]}`;
  if (digits.length === 8) return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}`;
  if (digits.length === 9) return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits[8]}`;
  return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function formatPrice(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm", { locale: ru });
}

function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function MasterBooking({
  masterId,
  fingerprint,
  client,
  onVisitSuccess,
}: MasterBookingProps) {
  const [slots, setSlots] = useState<VisitSlot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<VisitSlot | null>(null);
  const [procedures, setProcedures] = useState<Procedure[] | null>(null);
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhoneDigits, setFormPhoneDigits] = useState("");
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const timeSlotsRef = useRef<HTMLDivElement>(null);
  const proceduresRef = useRef<HTMLDivElement>(null);
  const bookButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate && timeSlotsRef.current) {
      timeSlotsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedSlot) return;
    const hasProcedures = procedures && procedures.length > 0;
    if (hasProcedures && proceduresRef.current) {
      proceduresRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (bookButtonRef.current) {
      bookButtonRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSlot, procedures]);

  useEffect(() => {
    if (selectedProcedureIds.size > 0 && bookButtonRef.current) {
      bookButtonRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedProcedureIds.size]);

  const fetchSlotsAndProcedures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [slotsRes, proceduresRes] = await Promise.all([
        fetch(`/api/masters/${masterId}/available-slots`),
        fetch(`/api/masterProcedures/${masterId}`),
      ]);
      if (!slotsRes.ok) {
        setError("Не удалось загрузить свободные записи.");
        return;
      }
      const slotsData = await slotsRes.json();
      setSlots(Array.isArray(slotsData) ? slotsData : []);
      if (proceduresRes.ok) {
        const proceduresData = await proceduresRes.json();
        setProcedures(Array.isArray(proceduresData) ? proceduresData : []);
      } else {
        setProcedures([]);
      }
    } catch {
      setError("Не удалось подключиться к серверу.");
    } finally {
      setLoading(false);
    }
  }, [masterId]);

  const refetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`/api/masters/${masterId}/available-slots`);
      if (res.ok) {
        const data = await res.json();
        setSlots(Array.isArray(data) ? data : []);
      }
    } catch {
      // тихо игнорируем ошибку при обновлении
    }
  }, [masterId]);

  const toggleProcedure = useCallback((id: number) => {
    setSelectedProcedureIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const datesWithSlots = useMemo(() => {
    if (!slots?.length) return new Set<string>();
    return new Set(
      slots.map((s) => format(parseISO(s.visitDateTime), "yyyy-MM-dd"))
    );
  }, [slots]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDate || !slots?.length) return [];
    const key = toDateKey(selectedDate);
    return slots
      .filter((s) => format(parseISO(s.visitDateTime), "yyyy-MM-dd") === key)
      .sort(
        (a, b) =>
          new Date(a.visitDateTime).getTime() -
          new Date(b.visitDateTime).getTime()
      );
  }, [slots, selectedDate]);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((m) => subMonths(m, 1));
    setSelectedDate(null);
    setSelectedSlot(null);
    setSelectedProcedureIds(new Set());
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((m) => addMonths(m, 1));
    setSelectedDate(null);
    setSelectedSlot(null);
    setSelectedProcedureIds(new Set());
  }, []);

  const hasProcedures = Boolean(procedures && procedures.length > 0);
  const canBook = !hasProcedures || selectedProcedureIds.size > 0;

  const today = startOfDay(new Date());

  const submitVisit = useCallback(
    async (body: {
      visitId: number;
      fingerprint: string;
      clientName: string;
      clientPhone: string;
      notes?: string;
      procedureIds?: number[];
    }) => {
      setSubmitting(true);
      try {
        const res = await fetch("/api/visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok || res.status === 201) {
          const dateStr = selectedDate && selectedSlot
            ? format(parseISO(selectedSlot.visitDateTime), "d MMMM yyyy, HH:mm", { locale: ru })
            : "";
          toast.success(`Вы записаны на ${dateStr}`);
          onVisitSuccess?.();
          setSelectedDate(null);
          setSelectedSlot(null);
          setSelectedProcedureIds(new Set());
          setModalOpen(false);
          setFormName("");
          setFormPhoneDigits("");
          setFormErrors({});
          refetchSlots();
        } else {
          toast.error(typeof data?.message === "string" ? data.message : "Не удалось записаться. Попробуйте позже.");
        }
      } catch {
        toast.error("Не удалось отправить запрос.");
      } finally {
        setSubmitting(false);
      }
    },
    [selectedDate, selectedSlot, onVisitSuccess, refetchSlots]
  );

  const handleBookClick = useCallback(() => {
    if (!selectedSlot || !fingerprint) return;
    const procedureIds = selectedProcedureIds.size > 0 ? Array.from(selectedProcedureIds) : undefined;
    if (client) {
      const clientPhone = client.phoneNumber.startsWith("+") ? client.phoneNumber : `+${client.phoneNumber}`;
      submitVisit({
        visitId: selectedSlot.id,
        fingerprint,
        clientName: client.name,
        clientPhone,
        procedureIds,
      });
    } else {
      setModalOpen(true);
    }
  }, [selectedSlot, fingerprint, client, selectedProcedureIds, submitVisit]);

  const handleModalSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = formName.trim();
      const err: { name?: string; phone?: string } = {};
      if (!name) err.name = "Введите имя";
      if (formPhoneDigits.length !== 10) {
        err.phone = "Введите корректный телефон (10 цифр после +7)";
      }
      setFormErrors(err);
      if (Object.keys(err).length > 0) return;
      const clientPhone = `+7${formPhoneDigits}`;
      if (!selectedSlot) return;
      submitVisit({
        visitId: selectedSlot.id,
        fingerprint,
        clientName: name,
        clientPhone,
        procedureIds: selectedProcedureIds.size > 0 ? Array.from(selectedProcedureIds) : undefined,
      });
    },
    [formName, formPhoneDigits, selectedSlot, fingerprint, selectedProcedureIds, submitVisit]
  );

  return (
    <section className="mt-6 rounded-2xl border border-[var(--secondary)]/30 bg-[var(--surface-light)] overflow-hidden md:mt-8">
      <div className="p-6 md:p-8">
        <h2 className="text-xl font-semibold text-[var(--secondary)]">
          Выберите дату и время
        </h2>
        <p className="mt-1 text-sm text-[var(--secondary)]/80">
          Зелёным отмечены дни на которые можно записаться.
        </p>

        {!slots && !loading && !error && (
          <button
            type="button"
            onClick={fetchSlotsAndProcedures}
            className="mt-4 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-white font-medium transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
          >
            Показать календарь
          </button>
        )}

        {loading && (
          <p className="mt-4 text-[var(--secondary)]/80">Загрузка...</p>
        )}

        {error && (
          <p className="mt-4 text-[var(--error)]">{error}</p>
        )}

        {slots && !loading && (
          <>
            {/* Month navigation */}
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-lg p-2 text-[var(--secondary)] transition-colors hover:bg-[var(--secondary)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                aria-label="Предыдущий месяц"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-lg font-medium text-[var(--secondary)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                {format(currentMonth, "LLLL yyyy", { locale: ru })}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-lg p-2 text-[var(--secondary)] transition-colors hover:bg-[var(--secondary)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                aria-label="Следующий месяц"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="mt-4 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-1 text-center text-xs font-medium uppercase tracking-wider text-[var(--secondary)]/70"
                >
                  {day}
                </div>
              ))}
              {calendarDays.map((day) => {
                const key = toDateKey(day);
                const available = datesWithSlots.has(key);
                const selected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isPast = isBefore(day, today);
                const isToday = isSameDay(day, today);

                return (
                  <div key={key} className="aspect-square p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (available && !isPast) {
                          setSelectedDate(day);
                          setSelectedSlot(null);
                        }
                      }}
                      disabled={!available || isPast}
                      className={`h-full w-full rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1
                        ${!isCurrentMonth ? "text-[var(--secondary)]/40" : "text-[var(--secondary)]"}
                        ${available && !isPast ? "hover:bg-[var(--primary)]/15 cursor-pointer font-bold" : "cursor-default"}
                        ${selected ? "bg-[var(--primary)]/25 ring-2 ring-[var(--primary)] ring-offset-1" : ""}
                        ${available && !selected && !isPast ? "bg-[var(--scheduled)]/15" : ""}
                        ${isToday && !selected ? "ring-2 ring-[var(--primary)] ring-offset-1" : ""}
                        ${(!available || isPast) ? "opacity-60" : ""}`}
                    >
                      {format(day, "d")}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Time slots for selected day */}
            {selectedDate && (
              <div ref={timeSlotsRef} className="mt-6 border-t border-[var(--secondary)]/20 pt-6">
                <h3 className="text-sm font-medium text-[var(--secondary)]">
                  {format(selectedDate, "d MMMM", { locale: ru })} — выберите время
                </h3>
                {slotsForSelectedDay.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--secondary)]/80">
                    Нет свободных слотов на эту дату.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {slotsForSelectedDay.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(isSelected ? null : slot);
                            setSelectedProcedureIds(new Set());
                          }}
                          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2
                            ${isSelected
                              ? "bg-[var(--primary)] text-white"
                              : "bg-[var(--secondary)]/10 text-[var(--secondary)] hover:bg-[var(--primary)]/15"}`}
                        >
                          {formatTime(slot.visitDateTime)}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedSlot && (
                  <>
                    {hasProcedures && (
                      <div ref={proceduresRef} className="mt-6">
                        <h4 className="text-sm font-medium text-[var(--secondary)]">
                          Выберите процедуры
                        </h4>
                        <ul className="mt-3 space-y-2">
                          {procedures!.map((proc) => {
                            const checked = selectedProcedureIds.has(proc.id);
                            return (
                              <li key={proc.id}>
                                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--secondary)]/20 bg-[var(--surface-light)] p-3 transition-colors hover:border-[var(--primary)]/40 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary)]/10">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleProcedure(proc.id)}
                                    className="h-4 w-4 rounded border-[var(--secondary)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                  />
                                  <span className="flex-1 text-sm font-medium text-[var(--secondary)]">
                                    {proc.name}
                                  </span>
                                  <span className="text-sm font-semibold text-[var(--primary)]">
                                    {formatPrice(proc.price)}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    <div ref={bookButtonRef} className="mt-6 rounded-xl bg-[var(--primary)]/10 p-4">
                      <p className="text-sm text-[var(--secondary)]">
                        Выбрано: {format(selectedDate!, "d MMMM", { locale: ru })}, {formatTime(selectedSlot.visitDateTime)}
                        {selectedProcedureIds.size > 0 && (
                          <> · {Array.from(selectedProcedureIds).length} процедур{Array.from(selectedProcedureIds).length === 1 ? "а" : "ы"}</>
                        )}
                      </p>
                      {canBook && (
                        <button
                          type="button"
                          onClick={handleBookClick}
                          disabled={submitting}
                          className="mt-4 w-full rounded-xl bg-[var(--primary)] py-3.5 text-white font-semibold transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:opacity-70"
                        >
                          {submitting ? "Отправка…" : "Записаться"}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Модальное окно для новых клиентов */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !submitting && setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[var(--surface-light)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="modal-title" className="text-xl font-semibold text-[var(--secondary)]">
              Укажите данные для записи
            </h3>
            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="client-name" className="block text-sm font-medium text-[var(--secondary)]">
                  Имя <span className="text-[var(--error)]">*</span>
                </label>
                <input
                  id="client-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Иван"
                  className="mt-1 w-full rounded-xl border border-[var(--secondary)]/30 bg-[var(--surface-light)] px-4 py-2.5 text-[var(--secondary)] placeholder:text-[var(--secondary)]/50 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  autoComplete="name"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-[var(--error)]">{formErrors.name}</p>
                )}
              </div>
              <div>
                <label htmlFor="client-phone" className="block text-sm font-medium text-[var(--secondary)]">
                  Телефон <span className="text-[var(--error)]">*</span>
                </label>
                <input
                  id="client-phone"
                  type="tel"
                  value={formatPhoneFromDigits(formPhoneDigits)}
                  onChange={(e) => setFormPhoneDigits(parsePhoneDigitsFromInput(e.target.value))}
                  placeholder="+7 (999) 123-45-67"
                  className="mt-1 w-full rounded-xl border border-[var(--secondary)]/30 bg-[var(--surface-light)] px-4 py-2.5 text-[var(--secondary)] placeholder:text-[var(--secondary)]/50 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  autoComplete="tel"
                />
                {formErrors.phone && (
                  <p className="mt-1 text-sm text-[var(--error)]">{formErrors.phone}</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !submitting && setModalOpen(false)}
                  className="flex-1 rounded-xl border border-[var(--secondary)]/30 py-2.5 text-[var(--secondary)] hover:bg-[var(--secondary)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-[var(--primary)] py-2.5 text-white font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-70"
                >
                  {submitting ? "Отправка…" : "Записаться"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
