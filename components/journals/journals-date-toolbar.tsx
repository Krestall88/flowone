"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, format, parseISO, startOfToday } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface JournalsDateToolbarProps {
  date?: string | null; // YYYY-MM-DD
  basePath: string;
  hasData?: boolean;
}

export function JournalsDateToolbar({ date, basePath, hasData }: JournalsDateToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedDate = useMemo(() => {
    if (date) {
      const parsed = parseISO(date);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return startOfToday();
  }, [date]);

  const iso = format(selectedDate, "yyyy-MM-dd");
  const human = format(selectedDate, "d MMMM yyyy", { locale: ru });

  const navigateTo = (newDate: Date) => {
    const nextIso = format(newDate, "yyyy-MM-dd");
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", nextIso);
    const query = params.toString();
    const url = query ? `${basePath}?${query}` : basePath;
    router.push(url);
  };

  const handlePrevDay = () => {
    navigateTo(addDays(selectedDate, -1));
  };

  const handleNextDay = () => {
    navigateTo(addDays(selectedDate, 1));
  };

  const handleToday = () => {
    navigateTo(startOfToday());
  };

  const handleDateInputChange = (value: string) => {
    if (!value) return;
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) return;
    navigateTo(parsed);
  };

  return (
    <div
      className={`mb-6 flex flex-col gap-4 rounded-2xl border bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between ${
        hasData ? "border-emerald-600/70 shadow-[0_0_0_1px_rgba(16,185,129,0.45)]" : "border-slate-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/40">
          <Calendar className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Дата журнала</p>
          <p className="text-sm font-semibold text-white sm:text-base">{human}</p>
          {hasData && (
            <p className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Есть заполненные журналы</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-500 hover:bg-slate-800"
            onClick={handlePrevDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-emerald-600 bg-emerald-600/10 px-4 text-xs font-semibold text-emerald-200 hover:bg-emerald-600/20"
            onClick={handleToday}
          >
            Сегодня
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-500 hover:bg-slate-800"
            onClick={handleNextDay}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={iso}
            onChange={(e) => handleDateInputChange(e.target.value)}
            className="h-9 w-full rounded-lg border-slate-700 bg-slate-900 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500 sm:w-44"
          />
        </div>
      </div>
    </div>
  );
}
