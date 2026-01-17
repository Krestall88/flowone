import { format } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { parseToUTCDate, todayUTC, formatDateISO, getDayRangeUTC } from "@/lib/date-utils";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { JournalsDateToolbar } from "@/components/journals/journals-date-toolbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const HEALTH_STATUS_LABELS: Record<string, string> = {
  healthy: "Здоров",
  sick: "Отстранён",
  vacation: "Отпуск",
  day_off: "Выходной",
  sick_leave: "Больничный",
};

function getHealthStatusBadgeClasses(status: string) {
  switch (status) {
    case "healthy":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-500/40";
    case "sick":
      return "bg-red-500/10 text-red-200 border-red-500/40";
    case "vacation":
      return "bg-sky-500/10 text-sky-200 border-sky-500/40";
    case "day_off":
      return "bg-slate-700/60 text-slate-100 border-slate-500/50";
    case "sick_leave":
      return "bg-amber-500/10 text-amber-200 border-amber-500/40";
    default:
      return "bg-slate-800 text-slate-200 border-slate-600";
  }
}

export default async function JournalsHistoryPage({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);
  const inboxCount = await getInboxCount(userId);

  const dateParam = searchParams?.date;

  // Нормализуем дату к UTC полночи, чтобы история совпадала с конкретными журналами
  let selectedDate = todayUTC();
  if (dateParam && dateParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
    selectedDate = parseToUTCDate(dateParam);
  }

  const isoDate = formatDateISO(selectedDate);
  const humanDate = format(selectedDate, "d MMMM yyyy", { locale: ru });

  const { start: dayStart, end: dayEnd } = getDayRangeUTC(selectedDate);

  const [temperatureEntries, healthChecks] = await Promise.all([
    prisma.temperatureEntry.findMany({
      where: {
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      include: {
        equipment: {
          include: {
            location: true,
          },
        },
      },
      orderBy: {
        equipmentId: "asc",
      },
    }),
    prisma.healthCheck.findMany({
      where: {
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      include: {
        entries: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    }),
  ]);

  const groupedTemperatures = temperatureEntries.reduce(
    (acc, entry) => {
      const locationId = entry.equipment.locationId;
      const locationName = entry.equipment.location.name;
      const key = String(locationId);

      if (!acc[key]) {
        acc[key] = {
          id: locationId,
          name: locationName,
          items: [] as {
            equipmentName: string;
            targetTemp: number;
            tolerance: number;
            morning: number | null;
            day: number | null;
            evening: number | null;
          }[],
        };
      }

      acc[key].items.push({
        equipmentName: entry.equipment.name,
        targetTemp: entry.equipment.targetTemp,
        tolerance: entry.equipment.tolerance,
        morning: entry.morning,
        day: entry.day,
        evening: entry.evening,
      });

      return acc;
    },
    {} as Record<
      string,
      {
        id: number;
        name: string;
        items: {
          equipmentName: string;
          targetTemp: number;
          tolerance: number;
          morning: number | null;
          day: number | null;
          evening: number | null;
        }[];
      }
    >,
  );

  const allHealthEntries = healthChecks.flatMap((check) =>
    check.entries.map((entry) => ({
      checkId: check.id,
      employeeId: entry.employeeId,
      employeeName: entry.employee.name,
      status: entry.status,
      note: entry.note ?? null,
    })),
  );

  const latestHealthByEmployee = new Map<
    number,
    {
      employeeId: number;
      employeeName: string;
      status: string;
      note: string | null;
    }
  >();

  for (const entry of allHealthEntries) {
    latestHealthByEmployee.set(entry.employeeId, {
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      status: entry.status,
      note: entry.note,
    });
  }

  const healthEntries = Array.from(latestHealthByEmployee.values()).sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName, "ru"),
  );

  const healthStatusCounts = healthEntries.reduce(
    (acc, entry) => {
      acc[entry.status] = (acc[entry.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const temperatureDeviationsCount = temperatureEntries.reduce((acc, entry) => {
    const min = entry.equipment.targetTemp - entry.equipment.tolerance;
    const max = entry.equipment.targetTemp + entry.equipment.tolerance;
    const temps = [entry.morning, entry.day, entry.evening];
    const hasDeviation = temps.some(
      (t) => t !== null && !Number.isNaN(t) && (t < min || t > max),
    );
    return acc + (hasDeviation ? 1 : 0);
  }, 0);

  const temperatureLastSignedAt = temperatureEntries.reduce<Date | null>((latest, entry) => {
    if (!entry.signedAt) return latest;
    if (!latest || entry.signedAt > latest) return entry.signedAt;
    return latest;
  }, null);

  const healthLastSignedAt = healthChecks.reduce<Date | null>((latest, check) => {
    if (!check.signedAt) return latest;
    if (!latest || check.signedAt > latest) return check.signedAt;
    return latest;
  }, null);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AppSidebar
        user={{
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          role: user.role,
        }}
        inboxCount={inboxCount}
      />

      <main className="lg:ml-64">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
          <div className="mb-6 space-y-2">
            <h1 className="bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              Архив журналов
            </h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Посмотрите сводную информацию по всем журналам за выбранный день: температуры холодильного оборудования и
              отметки здоровья сотрудников.
            </p>
          </div>

          <JournalsDateToolbar date={isoDate} basePath="/journals/history" />

          <p className="mt-4 text-xs text-slate-400">Выбранная дата: {humanDate}</p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Температурный журнал */}
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader className="space-y-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg text-white">Температурный журнал</CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Итоги измерений температур холодильного оборудования за выбранный день.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {temperatureEntries.length > 0 && temperatureDeviationsCount > 0 && (
                      <Badge className="border border-red-500/40 bg-red-500/10 text-red-200">
                        Отклонения: {temperatureDeviationsCount}
                      </Badge>
                    )}
                    {temperatureEntries.length > 0 && (
                      <Badge
                        className={`border ${
                          temperatureLastSignedAt
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        {temperatureLastSignedAt
                          ? `Подписан ${format(temperatureLastSignedAt, "HH:mm", { locale: ru })}`
                          : "Не подписан"}
                      </Badge>
                    )}
                    <Button asChild variant="outline" className="h-8 border-slate-700 bg-slate-900/60 px-3 text-xs">
                      <Link href={`/journals/temperature?date=${isoDate}`}>Открыть</Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.keys(groupedTemperatures).length === 0 && (
                  <p className="text-sm text-slate-400">За выбранную дату записи в температурном журнале отсутствуют.</p>
                )}

                {Object.values(groupedTemperatures).map((location) => (
                  <div key={location.id} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{location.name}</p>
                      <span className="text-[11px] text-slate-500">
                        Объектов: {location.items.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {location.items.map((item, idx) => {
                        const min = item.targetTemp - item.tolerance;
                        const max = item.targetTemp + item.tolerance;

                        const cells: { label: string; value: number | null }[] = [
                          { label: "У", value: item.morning },
                          { label: "Д", value: item.day },
                          { label: "В", value: item.evening },
                        ];

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 rounded-lg bg-slate-900/70 px-3 py-2 text-xs text-slate-200"
                          >
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-[13px] font-medium text-white">{item.equipmentName}</span>
                              <span className="text-[11px] text-slate-400">
                                Норма: {min}…{max} °C
                              </span>
                            </div>
                            <div className="flex gap-1">
                              {cells.map((cell) => {
                                const outOfRange =
                                  cell.value !== null &&
                                  !Number.isNaN(cell.value) &&
                                  (cell.value < min || cell.value > max);

                                return (
                                  <div
                                    key={cell.label}
                                    className={`flex h-9 w-9 flex-col items-center justify-center rounded-md border text-[11px] font-semibold ${
                                      cell.value == null || Number.isNaN(cell.value)
                                        ? "border-slate-700/70 bg-slate-900/50 text-slate-500"
                                        : outOfRange
                                          ? "border-red-500/70 bg-red-500/10 text-red-100"
                                          : "border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                                    }`}
                                  >
                                    <span className="text-[9px] uppercase text-slate-400">{cell.label}</span>
                                    <span>{cell.value ?? "--"}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Журнал здоровья */}
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader className="space-y-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg text-white">Журнал здоровья сотрудников</CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Итоги осмотра и отметки по каждому сотруднику за выбранный день.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {healthChecks.length > 0 && (
                      <Badge
                        className={`border ${
                          healthLastSignedAt
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        {healthLastSignedAt
                          ? `Подписан ${format(healthLastSignedAt, "HH:mm", { locale: ru })}`
                          : "Не подписан"}
                      </Badge>
                    )}
                    <Button asChild variant="outline" className="h-8 border-slate-700 bg-slate-900/60 px-3 text-xs">
                      <Link href={`/journals/health?date=${isoDate}`}>Открыть</Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {healthEntries.length === 0 && (
                  <p className="text-sm text-slate-400">За выбранную дату записи в журнале здоровья отсутствуют.</p>
                )}

                {healthEntries.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                      {Object.entries(healthStatusCounts).map(([status, count]) => (
                        <Badge
                          key={status}
                          variant="secondary"
                          className={`border px-2 py-0.5 text-[11px] ${getHealthStatusBadgeClasses(status)}`}
                        >
                          {HEALTH_STATUS_LABELS[status] ?? status}: {count}
                        </Badge>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {healthEntries.map((entry) => (
                        <div
                          key={entry.employeeId}
                          className="flex items-start justify-between gap-3 rounded-lg bg-slate-950/60 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{entry.employeeName}</p>
                            {entry.note && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{entry.note}</p>
                            )}
                          </div>
                          <Badge
                            variant="secondary"
                            className={`ml-1 whitespace-nowrap border px-2 py-1 text-[11px] font-semibold ${getHealthStatusBadgeClasses(entry.status)}`}
                          >
                            {HEALTH_STATUS_LABELS[entry.status] ?? entry.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
