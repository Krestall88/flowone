"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { format, isSameDay, parseISO, startOfToday } from "date-fns";
import { ru } from "date-fns/locale";
import { ThermometerSun, CheckCircle2, Plus, ChevronDown } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface TemperatureEquipmentEntry {
  id: number;
  name: string;
  locationId: number;
  locationName: string;
  targetTemp: number;
  tolerance: number;
  morning: number | null;
  day: number | null;
  evening: number | null;
}

interface LocationOption {
  id: number;
  name: string;
}

interface TemperatureJournalProps {
  userName: string | null;
  locations: LocationOption[];
  entries: TemperatureEquipmentEntry[];
  date: string; // YYYY-MM-DD
  signedLabel?: string | null;
}

export function TemperatureJournal({ userName, locations, entries, date, signedLabel }: TemperatureJournalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = searchParams.get("documentId");

  const [values, setValues] = useState<TemperatureEquipmentEntry[]>(entries);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [targetTempInput, setTargetTempInput] = useState("");
  const [toleranceInput, setToleranceInput] = useState("");
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const [isSavingEquipment, setIsSavingEquipment] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [openLocations, setOpenLocations] = useState<Record<number, boolean>>({});
  const [isDeviationsOpen, setIsDeviationsOpen] = useState(true);

  useEffect(() => {
    setValues(entries);
    setSuccess(false);
    setError(null);
    setWarnings([]);
    setOpenLocations({});
  }, [entries, date]);
  const selectedDate = parseISO(date);
  const dateLabel = format(selectedDate, "d MMMM yyyy", { locale: ru });

  const isToday = isSameDay(selectedDate, startOfToday());
  const isReadOnly = !isToday;

  const deviations = useMemo(() => {
    const list: string[] = [];
    values.forEach((entry) => {
      const min = entry.targetTemp - entry.tolerance;
      const max = entry.targetTemp + entry.tolerance;
      ([
        ["morning", "утро"],
        ["day", "день"],
        ["evening", "вечер"],
      ] as const).forEach(([field, label]) => {
        const temp = entry[field];
        if (temp === null || Number.isNaN(temp)) return;
        if (temp < min || temp > max) {
          list.push(`${entry.locationName} / ${entry.name}, ${label}: ${temp}°C (норма ${min}…${max}°C)`);
        }
      });
    });
    return list;
  }, [values]);

  const handleChange = (
    id: number,
    field: "morning" | "day" | "evening",
    value: string,
  ) => {
    setValues((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              [field]: value === "" ? null : Number(value),
            }
          : e,
      ),
    );
  };

  const handleCreateLocation = async () => {
    const name = newLocationName.trim();
    if (!name) {
      setLocationError("Укажите название помещения");
      return;
    }

    setLocationError(null);
    setIsSavingLocation(true);

    try {
      const res = await fetch("/api/journals/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось добавить помещение");
      }

      setIsLocationDialogOpen(false);
      setNewLocationName("");

      router.refresh();
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : "Ошибка добавления помещения");
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleCreateEquipment = async () => {
    const name = newEquipmentName.trim();
    if (!name) {
      setEquipmentError("Укажите название оборудования");
      return;
    }

    const locId = Number(selectedLocationId);
    if (!locId || Number.isNaN(locId)) {
      setEquipmentError("Выберите помещение");
      return;
    }

    const targetTemp = Number(targetTempInput.replace(",", "."));
    const tolerance = Number(toleranceInput.replace(",", "."));

    if (Number.isNaN(targetTemp) || Number.isNaN(tolerance)) {
      setEquipmentError("Укажите корректные числовые значения нормы и допуска");
      return;
    }

    setEquipmentError(null);
    setIsSavingEquipment(true);

    try {
      const res = await fetch("/api/journals/equipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          locationId: locId,
          targetTemp,
          tolerance,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось добавить оборудование");
      }

      setIsEquipmentDialogOpen(false);
      setNewEquipmentName("");
      setSelectedLocationId("");
      setTargetTempInput("");
      setToleranceInput("");

      router.refresh();
    } catch (err) {
      setEquipmentError(err instanceof Error ? err.message : "Ошибка добавления оборудования");
    } finally {
      setIsSavingEquipment(false);
    }
  };

  const handleSubmit = () => {
    if (isReadOnly) return;
    setError(null);
    setSuccess(false);
    setWarnings([]);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("date", date);
        if (documentId && documentId.trim()) {
          formData.append("documentId", documentId.trim());
        }

        values.forEach((entry) => {
          if (entry.morning !== null && !Number.isNaN(entry.morning)) {
            formData.append(`morning-${entry.id}`, String(entry.morning));
          }
          if (entry.day !== null && !Number.isNaN(entry.day)) {
            formData.append(`day-${entry.id}`, String(entry.day));
          }
          if (entry.evening !== null && !Number.isNaN(entry.evening)) {
            formData.append(`evening-${entry.id}`, String(entry.evening));
          }
        });

        const newWarnings: string[] = [];
        values.forEach((entry) => {
          const min = entry.targetTemp - entry.tolerance;
          const max = entry.targetTemp + entry.tolerance;
          ["morning", "day", "evening"].forEach((field) => {
            const temp = entry[field as "morning" | "day" | "evening"];
            if (temp === null || Number.isNaN(temp)) return;
            if (temp < min || temp > max) {
              const timeLabel =
                field === "morning" ? "утро" : field === "day" ? "день" : "вечер";
              newWarnings.push(
                `${entry.locationName} / ${entry.name}, ${timeLabel}: ${temp}°C (норма ${min}…${max}°C)`,
              );
            }
          });
        });

        const res = await fetch("/api/journals/temperature", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          if (res.status === 403 && data?.reason === "audit_mode_lock") {
            throw new Error(data?.error ?? "Действие запрещено в режиме проверки");
          }
          throw new Error(data?.error ?? "Не удалось сохранить журнал");
        }

        setWarnings(newWarnings);
        setSuccess(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка сохранения журнала");
      }
    });
  };

  const allLocations = locations.map((loc) => ({ id: loc.id, name: loc.name }));

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredValues = values.filter((e) => {
    if (locationFilter !== "all" && String(e.locationId) !== locationFilter) {
      return false;
    }
    if (typeFilter !== "all" && (e as any).type !== typeFilter) {
      return false;
    }
    if (!normalizedQuery) return true;
    const name = e.name.toLowerCase();
    const locationName = e.locationName.toLowerCase();
    return name.includes(normalizedQuery) || locationName.includes(normalizedQuery);
  });

  const visibleLocations = locations.filter((loc) => {
    if (locationFilter !== "all" && String(loc.id) !== locationFilter) {
      return false;
    }

    const equipmentsInLocation = filteredValues.filter((e) => e.locationId === loc.id);

    if (equipmentsInLocation.length > 0) {
      return true;
    }

    if (!normalizedQuery && typeFilter === "all") {
      // Нет дополнительного фильтра — показываем помещение даже без оборудования,
      // чтобы было видно, что оно успешно добавлено.
      return true;
    }

    return loc.name.toLowerCase().includes(normalizedQuery);
  });

  const typeOptions = Array.from(
    new Set(values.map((e) => (e as any).type).filter((v) => typeof v === "string" && v.trim())),
  ) as string[];

  const getTypeLabel = (t: string) => {
    const normalized = t.toLowerCase();
    if (normalized.includes("freezer") || normalized.includes("мороз")) return "Морозилка";
    if (normalized.includes("showcase") || normalized.includes("витрин")) return "Витрина";
    if (normalized.includes("camera") || normalized.includes("камера")) return "Камера";
    return "Холодильник";
  };

  return (
    <div className="relative space-y-4 pb-24">
      {isReadOnly && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Режим просмотра: записи можно вносить и подписывать только за текущий день.
        </div>
      )}

      {deviations.length > 0 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            onClick={() => setIsDeviationsOpen((prev) => !prev)}
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-200">Отклонения</p>
              <p className="truncate text-sm text-red-100">
                Значений вне нормы: <span className="font-semibold">{deviations.length}</span>
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-red-200 transition-transform ${isDeviationsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isDeviationsOpen && (
            <div className="border-t border-red-500/30 px-4 py-3">
              <ul className="space-y-1 text-xs text-red-100 sm:text-sm">
                {deviations.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur sm:rounded-2xl sm:border">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Дата</p>
            <p className="text-sm font-semibold text-white sm:text-base">{dateLabel}</p>
            {documentId && documentId.trim() && (
              <p className="mt-1 text-[11px] text-slate-300">
                Привязано к документу{" "}
                <Link
                  href={`/documents/${documentId}`}
                  className="font-semibold text-emerald-200 underline-offset-2 hover:underline"
                >
                  #{documentId}
                </Link>
              </p>
            )}
            {signedLabel && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Журнал подписан {signedLabel}</span>
              </p>
            )}
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Ответственный</p>
            <p className="truncate text-sm font-semibold text-emerald-100 sm:text-base">
              {userName ?? "Администратор журналов"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию..."
              className="h-10 rounded-xl border-slate-700 bg-slate-900/90 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm"
            >
              <option value="all">Помещение: все</option>
              {allLocations.map((loc) => (
                <option key={loc.id} value={String(loc.id)}>
                  {loc.name}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm"
            >
              <option value="all">Тип: все</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {getTypeLabel(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isReadOnly}
                className="h-8 rounded-lg border-slate-700 bg-slate-900/70 px-3 text-[11px] font-semibold text-slate-100 hover:border-emerald-500 hover:text-emerald-200"
              >
                Добавить помещение
              </Button>
            </DialogTrigger>
            <DialogContent className="border-slate-800 bg-slate-950 text-slate-50">
              <DialogHeader>
                <DialogTitle>Новое помещение</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Укажите название помещения (например: Кухня, Склад №1), в котором установлено холодильное оборудование.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Название помещения</p>
                  <Input
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    className="h-10 rounded-lg border-slate-700 bg-slate-900 text-sm text-white placeholder:text-slate-500"
                    placeholder="Например: Кухня горячего цеха"
                  />
                </div>
                {locationError && <p className="text-xs text-red-400">{locationError}</p>}
              </div>
              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg border-slate-600 bg-slate-900/80 text-xs text-slate-100 hover:bg-slate-800"
                  >
                    Отмена
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  onClick={handleCreateLocation}
                  disabled={isSavingLocation}
                  className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  {isSavingLocation ? "Сохраняем..." : "Добавить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEquipmentDialogOpen} onOpenChange={setIsEquipmentDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isReadOnly}
                className="h-8 rounded-lg border-emerald-600/60 bg-emerald-600/10 px-3 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-600/20"
              >
                Добавить оборудование
              </Button>
            </DialogTrigger>
            <DialogContent className="border-slate-800 bg-slate-950 text-slate-50">
              <DialogHeader>
                <DialogTitle>Новое оборудование</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Добавьте холодильное оборудование, указав помещение и температурный режим.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Название оборудования</p>
                  <Input
                    value={newEquipmentName}
                    onChange={(e) => setNewEquipmentName(e.target.value)}
                    className="h-10 rounded-lg border-slate-700 bg-slate-900 text-sm text-white placeholder:text-slate-500"
                    placeholder="Например: Холодильник №3"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Помещение</p>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Выберите помещение</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={String(loc.id)}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Нормальная температура, °C</p>
                    <Input
                      value={targetTempInput}
                      onChange={(e) => setTargetTempInput(e.target.value)}
                      className="h-10 rounded-lg border-slate-700 bg-slate-900 text-sm text-white placeholder:text-slate-500"
                      placeholder="Например: 4"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Допуск, °C</p>
                    <Input
                      value={toleranceInput}
                      onChange={(e) => setToleranceInput(e.target.value)}
                      className="h-10 rounded-lg border-slate-700 bg-slate-900 text-sm text-white placeholder:text-slate-500"
                      placeholder="Например: 2"
                      inputMode="decimal"
                    />
                  </div>
                </div>
                {equipmentError && <p className="text-xs text-red-400">{equipmentError}</p>}
              </div>
              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg border-slate-600 bg-slate-900/80 text-xs text-slate-100 hover:bg-slate-800"
                  >
                    Отмена
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  onClick={handleCreateEquipment}
                  disabled={isSavingEquipment}
                  className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  {isSavingEquipment ? "Сохраняем..." : "Добавить"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-3 space-y-4">
        {filteredValues.length === 0 && (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 text-center">
            <p className="text-base font-semibold text-slate-100">Нет оборудования по вашему запросу</p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              Попробуйте изменить фильтры или очистить строку поиска.
            </p>
          </div>
        )}

        {visibleLocations.map((location) => {
          const equipments = filteredValues.filter((e) => e.locationId === location.id);
          const isOpen = openLocations[location.id] ?? false;

          return (
            <div key={location.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
              <button
                type="button"
                onClick={() =>
                  setOpenLocations((prev) => ({
                    ...prev,
                    [location.id]: !isOpen,
                  }))
                }
                className="flex w-full items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3 text-left hover:bg-slate-900"
              >
                <div className="flex items-center gap-2">
                  <ChevronDown
                    className={`h-3 w-3 text-emerald-400 transition-transform ${
                      isOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    {location.name}
                  </p>
                </div>
                <p className="text-[11px] text-slate-400">
                  {equipments.length > 0 ? `Объектов: ${equipments.length}` : "Нет оборудования"}
                </p>
              </button>
              {isOpen && (
                equipments.length > 0 ? (
                  <div className="divide-y divide-slate-800">
                    {equipments.map((equipment) => {
                    const min = equipment.targetTemp - equipment.tolerance;
                    const max = equipment.targetTemp + equipment.tolerance;

                    return (
                      <div
                        key={equipment.id}
                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex flex-1 items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                            <ThermometerSun className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {equipment.name}
                            </p>
                            <p className="text-[11px] text-emerald-300">
                              Норма: {min}…{max} °C
                            </p>
                          </div>
                        </div>
                        <div className="grid flex-1 grid-cols-3 gap-2 sm:max-w-md">
                          {(["morning", "day", "evening"] as const).map((field) => {
                            const label = field === "morning" ? "Утро" : field === "day" ? "День" : "Вечер";
                            const value = equipment[field];
                            const outOfRange =
                              value !== null && !Number.isNaN(value) && (value < min || value > max);

                            return (
                              <div key={field} className="space-y-1">
                                <p className="text-center text-[11px] text-slate-400">{label}</p>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  className={`h-14 w-full rounded-2xl border text-center text-lg font-semibold tracking-tight placeholder:text-slate-600 ${
                                    outOfRange
                                      ? "border-red-500/70 bg-red-500/10 text-red-100"
                                      : "border-slate-700 bg-slate-900/80 text-white"
                                  }`}
                                  placeholder="--"
                                  value={value ?? ""}
                                  title={outOfRange ? "Отклонение от нормы!" : undefined}
                                  onChange={(e) => handleChange(equipment.id, field, e.target.value)}
                                  disabled={isReadOnly}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                ) : (
                  <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
                    В этом помещении ещё не добавлено холодильного оборудования.
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p className="mb-1 font-semibold">Есть значения вне допустимого диапазона:</p>
          <ul className="space-y-1 text-xs sm:text-sm">
            {warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Записи успешно сохранены и подписаны.
        </div>
      )}

      <div className="sticky bottom-0 z-30 -mx-4 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur sm:rounded-2xl sm:border">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-400">
            {isReadOnly ? "Только просмотр" : "После нажатия журнал будет подписан ответственным"}
          </div>
          <Button
            type="button"
            size="lg"
            onClick={handleSubmit}
            disabled={isPending || isReadOnly}
            className="w-full gap-2 bg-emerald-600 text-base font-semibold shadow-emerald-500/40 hover:bg-emerald-500 sm:w-auto sm:min-w-[260px]"
          >
            {isPending && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-transparent" />
            )}
            Подписать смену
          </Button>
        </div>
      </div>

      {/* Плавающая кнопка добавления оборудования */}
      <Button
        type="button"
        size="icon"
        onClick={() => setIsEquipmentDialogOpen(true)}
        disabled={isReadOnly}
        className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-500 sm:h-16 sm:w-16"
        aria-label="Добавить оборудование"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
