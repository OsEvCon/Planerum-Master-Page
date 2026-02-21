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

type MasterBookingProps = {
  masterId: string;
};

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm", { locale: ru });
}

function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function MasterBooking({ masterId }: MasterBookingProps) {
  const [slots, setSlots] = useState<VisitSlot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<VisitSlot | null>(null);
  const timeSlotsRef = useRef<HTMLDivElement>(null);
  const bookButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate && timeSlotsRef.current) {
      timeSlotsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedSlot && bookButtonRef.current) {
      bookButtonRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSlot]);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/masters/${masterId}/available-slots`);
      if (!res.ok) {
        setError("Не удалось загрузить свободные записи.");
        return;
      }
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      setError("Не удалось подключиться к серверу.");
    } finally {
      setLoading(false);
    }
  }, [masterId]);

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
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((m) => addMonths(m, 1));
    setSelectedDate(null);
    setSelectedSlot(null);
  }, []);

  const today = startOfDay(new Date());

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
            onClick={fetchSlots}
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
                          onClick={() => setSelectedSlot(isSelected ? null : slot)}
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
                  <div ref={bookButtonRef} className="mt-6 rounded-xl bg-[var(--primary)]/10 p-4">
                    <p className="text-sm text-[var(--secondary)]">
                      Выбрано: {format(selectedDate, "d MMMM", { locale: ru })}, {formatTime(selectedSlot.visitDateTime)}
                    </p>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-xl bg-[var(--primary)] py-3.5 text-white font-semibold transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                    >
                      Записаться
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
