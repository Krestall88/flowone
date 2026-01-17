import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { formatDateISO, getDayRangeUTC, todayUTC } from "@/lib/date-utils";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function AuditChecklistPage() {
  const user = await requireUser();
  const userId = Number(user.id);

  const today = todayUTC();
  const { start: todayStart, end: todayEnd } = getDayRangeUTC(today);
  const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const { start: weekRangeStart } = getDayRangeUTC(weekStart);

  const [
    inboxCount,
    activeAuditSession,
    equipmentTotal,
    employeesTotal,
    temperatureSignedToday,
    healthSignedToday,
    temperatureSignedWeek,
    healthSignedWeek,
    temperatureEntriesToday,
    healthEntriesCriticalToday,
    nonconformitiesOpen,
    nonconformitiesCriticalOpen,
    registryExpired,
    registryExpiring,
  ] = await Promise.all([
    getInboxCount(userId),
    prisma.auditSession.findFirst({ where: { status: "active" }, orderBy: { startedAt: "desc" } }),
    prisma.equipment.count(),
    prisma.employee.count({ where: { active: true } }),
    prisma.temperatureEntry.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        signedAt: { not: null },
      },
    }),
    prisma.healthCheck.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        signedAt: { not: null },
      },
    }),
    prisma.temperatureEntry.count({
      where: {
        date: { gte: weekRangeStart, lte: todayEnd },
        signedAt: { not: null },
      },
    }),
    prisma.healthCheck.count({
      where: {
        date: { gte: weekRangeStart, lte: todayEnd },
        signedAt: { not: null },
      },
    }),
    prisma.temperatureEntry.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        signedAt: { not: null },
      },
      select: {
        morning: true,
        day: true,
        evening: true,
        equipment: {
          select: {
            targetTemp: true,
            tolerance: true,
          },
        },
      },
    }),
    prisma.healthCheckEmployee.count({
      where: {
        status: { in: ["sick", "sick_leave"] },
        check: {
          date: { gte: todayStart, lte: todayEnd },
        },
      },
    }),
    (prisma as any).nonconformity.count({ where: { status: "open" } }),
    (prisma as any).nonconformity.count({ where: { status: "open", severity: "critical" } }),
    (prisma as any).registryDocument.count({ where: { expiresAt: { lt: new Date() } } }),
    (prisma as any).registryDocument.count({
      where: {
        expiresAt: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const expectedTempToday = equipmentTotal;
  const expectedHealthToday = employeesTotal > 0 ? 1 : 0;
  const expectedTotalToday = expectedTempToday + expectedHealthToday;
  const doneTotalToday = temperatureSignedToday + (healthSignedToday > 0 ? 1 : 0);
  const journalsPercentToday =
    expectedTotalToday > 0 ? Math.round((doneTotalToday / expectedTotalToday) * 100) : 0;

  const expectedTotalWeek = equipmentTotal * 7 + (employeesTotal > 0 ? 7 : 0);
  const doneTotalWeek = temperatureSignedWeek + healthSignedWeek;
  const journalsPercentWeek = expectedTotalWeek > 0 ? Math.round((doneTotalWeek / expectedTotalWeek) * 100) : 0;

  const temperatureCriticalToday = (temperatureEntriesToday as any[]).reduce((acc: number, entry: any) => {
    const min = entry.equipment.targetTemp - entry.equipment.tolerance;
    const max = entry.equipment.targetTemp + entry.equipment.tolerance;
    const points = [entry.morning, entry.day, entry.evening].filter((v) => typeof v === "number");
    const hasCritical = (points as number[]).some((v) => v < min || v > max);
    return acc + (hasCritical ? 1 : 0);
  }, 0);

  const criticalTotalToday = temperatureCriticalToday + healthEntriesCriticalToday;
  const isoToday = formatDateISO(today);

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
          <Breadcrumb items={[{ label: "Audit Checklist" }]} />
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Audit Checklist</h1>
            <p className="mt-1 text-sm text-slate-400">
              Режим проверки: {activeAuditSession ? `активен (${activeAuditSession.auditType})` : "не активен"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link href="/audit/package" className="text-xs font-semibold text-emerald-200 hover:underline">
                Открыть пакет аудитора
              </Link>
              <Link href="/audit-log?session=active" className="text-xs font-semibold text-emerald-200 hover:underline">
                Журнал действий (текущая проверка)
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Журналы</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Заполнение (сегодня / 7 дней)</span>
                  <span className={journalsPercentToday < 100 ? "text-amber-200" : "text-emerald-300"}>
                    {journalsPercentToday}% / {journalsPercentWeek}%
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Критические отклонения (сегодня)</span>
                  <span className={criticalTotalToday > 0 ? "text-red-300" : "text-emerald-300"}>{criticalTotalToday}</span>
                </div>
                <div className="mt-4 flex flex-col gap-1">
                  <Link href={`/journals/temperature?date=${isoToday}`} className="text-xs font-semibold text-emerald-200 hover:underline">
                    Журнал температур (сегодня)
                  </Link>
                  <Link href={`/journals/health?date=${isoToday}`} className="text-xs font-semibold text-emerald-200 hover:underline">
                    Журнал здоровья (сегодня)
                  </Link>
                  <Link href={`/journals/history?date=${isoToday}`} className="text-xs font-semibold text-emerald-200 hover:underline">
                    История журналов
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Документы</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Просрочено в реестре</span>
                  <span className={registryExpired > 0 ? "text-red-300" : "text-emerald-300"}>{registryExpired}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Истекает ≤ 30 дней</span>
                  <span className={registryExpiring > 0 ? "text-amber-200" : "text-emerald-300"}>{registryExpiring}</span>
                </div>
                <div className="mt-4">
                  <Link href="/registry/package" className="text-xs font-semibold text-emerald-200 hover:underline">
                    Открыть пакет для проверки
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Несоответствия</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Открыто</span>
                  <span className={nonconformitiesOpen > 0 ? "text-amber-200" : "text-emerald-300"}>{nonconformitiesOpen}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Критические (open)</span>
                  <span className={nonconformitiesCriticalOpen > 0 ? "text-red-300" : "text-emerald-300"}>{nonconformitiesCriticalOpen}</span>
                </div>
                <div className="mt-4">
                  <Link href="/nonconformities" className="text-xs font-semibold text-emerald-200 hover:underline">
                    Перейти к списку
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
