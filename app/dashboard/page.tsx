import Link from "next/link";
import { AlertTriangle, Package, Shield, Thermometer, Users, Info, NotebookTabs, FileText } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateISO, getDayRangeUTC, todayUTC } from "@/lib/date-utils";
import { redirect } from "next/navigation";
import { AuditModeControls } from "@/components/audit/audit-mode-controls";
import { TemperatureChart } from "@/components/dashboard/temperature-chart";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getInboxCount } from "@/lib/inbox-count";

export const dynamic = 'force-dynamic';

type TemperatureEntryToday = Prisma.TemperatureEntryGetPayload<{
  select: {
    morning: true;
    day: true;
    evening: true;
    equipment: {
      select: {
        targetTemp: true;
        tolerance: true;
      };
    };
  };
}>;

export default async function PlatformDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const userId = Number(user.id);
  const inboxCount = await getInboxCount(userId);
  const today = todayUTC();
  const { start: todayStart, end: todayEnd } = getDayRangeUTC(today);

  const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const { start: weekRangeStart } = getDayRangeUTC(weekStart);

  const [
    activeAuditSession,
    equipmentTotal,
    employeesTotal,
    temperatureTotalToday,
    temperatureSignedToday,
    healthTotalToday,
    healthSignedToday,
    temperatureSignedWeek,
    healthSignedWeek,
    pendingTasks,
    nonconformitiesOpen,
    registryExpired,
    registryExpiring,
    temperatureEntriesToday,
    healthEntriesCriticalToday,
    highRiskCCPCount,
    temperatureWeekData,
  ] = await Promise.all([
    prisma.auditSession.findFirst({
      where: { status: "active" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.equipment.count(),
    prisma.employee.count({ where: { active: true } }),
    prisma.temperatureEntry.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.temperatureEntry.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        signedAt: { not: null },
      },
    }),
    prisma.healthCheck.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
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
    prisma.task.count({
      where: {
        assigneeId: userId,
        status: "pending",
      },
    }),
    (prisma as any).nonconformity.count({
      where: {
        status: "open",
      },
    }),
    (prisma as any).registryDocument.count({
      where: {
        expiresAt: { lt: new Date() },
      },
    }),
    (prisma as any).registryDocument.count({
      where: {
        expiresAt: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
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
    // Подсчёт high-risk CCP
    prisma.cCP.count({
      where: {
        riskLevel: "high",
        status: "active",
      },
    }),
    // Данные температур за 7 дней для графика
    prisma.temperatureEntry.findMany({
      where: {
        date: { gte: weekRangeStart, lte: todayEnd },
      },
      select: {
        date: true,
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
      orderBy: { date: 'asc' },
    }),
  ]);

  const expectedTempToday = equipmentTotal;
  const expectedHealthToday = employeesTotal > 0 ? 1 : 0;
  const expectedTotalToday = expectedTempToday + expectedHealthToday;
  const doneTotalToday = temperatureSignedToday + (healthSignedToday > 0 ? 1 : 0);
  const journalsPercentToday = expectedTotalToday > 0 ? Math.round((doneTotalToday / expectedTotalToday) * 100) : 0;

  const expectedTotalWeek = equipmentTotal * 7 + (employeesTotal > 0 ? 7 : 0);
  const doneTotalWeek = temperatureSignedWeek + healthSignedWeek;
  const journalsPercentWeek = expectedTotalWeek > 0 ? Math.round((doneTotalWeek / expectedTotalWeek) * 100) : 0;

  const temperatureCriticalToday = (temperatureEntriesToday as TemperatureEntryToday[]).reduce(
    (acc: number, entry: TemperatureEntryToday) => {
    const min = entry.equipment.targetTemp - entry.equipment.tolerance;
    const max = entry.equipment.targetTemp + entry.equipment.tolerance;
    const points = [entry.morning, entry.day, entry.evening].filter((v): v is number => typeof v === "number");
    const hasCritical = points.some((v) => v < min || v > max);
    return acc + (hasCritical ? 1 : 0);
    },
    0,
  );

  const criticalTotalToday = temperatureCriticalToday + healthEntriesCriticalToday;

  // Универсальная функция для обработки данных температур
  const processTemperatureData = (rawData: any[]) => {
    type TempEntry = { date: Date; morning: number | null; day: number | null; evening: number | null; equipment: { targetTemp: number; tolerance: number } };
    const data = rawData as unknown as TempEntry[];
    
    if (!data || data.length === 0) return [];
    
    // Группируем данные по дням
    const dayMap = new Map<string, { temps: number[], targetTemp: number, tolerance: number }>();
    
    data.forEach((entry) => {
      const dateKey = formatDateISO(entry.date);
      const temps = [entry.morning, entry.day, entry.evening].filter((v): v is number => typeof v === "number");
      
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, { 
          temps: [], 
          targetTemp: entry.equipment.targetTemp, 
          tolerance: entry.equipment.tolerance 
        });
      }
      
      dayMap.get(dateKey)!.temps.push(...temps);
    });
    
    // Преобразуем в формат для графика
    return Array.from(dayMap.entries()).map(([date, data]) => {
      const temps = data.temps;
      const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
      const minTemp = temps.length > 0 ? Math.min(...temps) : 0;
      const maxTemp = temps.length > 0 ? Math.max(...temps) : 0;
      
      return {
        date: new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        avgTemp: Math.round(avgTemp * 10) / 10,
        minTemp: Math.round(minTemp * 10) / 10,
        maxTemp: Math.round(maxTemp * 10) / 10,
        targetMin: Math.round((data.targetTemp - data.tolerance) * 10) / 10,
        targetMax: Math.round((data.targetTemp + data.tolerance) * 10) / 10,
      };
    });
  };

  // Обработка данных для всех периодов (используем одни и те же данные за 7 дней для демонстрации)
  // В реальности нужно будет добавить отдельные запросы для 14 и 30 дней
  const temperatureChartData7 = processTemperatureData(temperatureWeekData || []);
  const temperatureChartData14 = processTemperatureData(temperatureWeekData || []); // TODO: добавить запрос за 14 дней
  const temperatureChartData30 = processTemperatureData(temperatureWeekData || []); // TODO: добавить запрос за 30 дней

  const isoToday = formatDateISO(today);

  const registryHref = registryExpired > 0 ? "/registry?status=expired" : registryExpiring > 0 ? "/registry?status=expiring" : "/registry";
  const nonconformitiesHref = nonconformitiesOpen > 0 ? "/nonconformities?status=open" : "/nonconformities";
  const criticalHref = `/journals/history?date=${isoToday}`;
  const temperatureHref = `/journals/temperature?date=${isoToday}`;
  const healthHref = `/journals/health?date=${isoToday}`;
  const tasksHref = pendingTasks > 0 ? "/workflow?scope=in_progress" : "/workflow";

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AppSidebar
        user={{
          id: String(user.id),
          name: user.name ?? null,
          email: user.email ?? null,
          role: user.role,
        }}
        inboxCount={inboxCount}
      />

      <div className="lg:pl-64">
        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6">
          <header className="mb-8 space-y-4">
            <h1 className="bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl">
              Панель управления
            </h1>
            <p className="text-base text-slate-400">
              Обзор системы ХАССП и готовность к проверкам
            </p>
          </header>

        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        {/* Статус-баннер Audit Mode */}
        {activeAuditSession && (
          <div className="mb-6 rounded-lg border-2 border-red-500/50 bg-red-500/10 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-200">Режим проверки активен</h3>
                <p className="text-sm text-red-300/80">
                  {activeAuditSession.auditType} • {activeAuditSession.auditorName || "Аудитор не указан"}
                  {activeAuditSession.auditorOrg && ` • ${activeAuditSession.auditorOrg}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-red-300/60">Начало проверки</p>
                <p className="text-sm font-medium text-red-200">
                  {new Date(activeAuditSession.startedAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm transition-colors hover:bg-slate-900/70">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-200">Заполнение журналов</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        {journalsPercentToday === 0 ? "Нет записей за сегодня" : "Процент заполненных и подписанных записей"}
                        {journalsPercentWeek === 0 && " / Нет записей за 7 дней"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription className="text-xs text-slate-400">Сегодня / 7 дней</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${journalsPercentToday === 0 ? "text-slate-500" : "text-white"}`}>
                {journalsPercentToday}% / {journalsPercentWeek}%
              </div>
              <NotebookTabs className="h-5 w-5 text-slate-500" />
            </CardContent>
            </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm transition-colors hover:bg-slate-900/70">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-200">Температуры сегодня</CardTitle>
                {equipmentTotal === 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-slate-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Нет оборудования для контроля температуры</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <CardDescription className="text-xs text-slate-400">Всего / подписано</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${equipmentTotal === 0 ? "text-slate-500" : "text-white"}`}>
                {equipmentTotal === 0 ? "Нет точек" : `${temperatureTotalToday} / ${temperatureSignedToday}`}
              </div>
              <Thermometer className={`h-5 w-5 ${equipmentTotal === 0 ? "text-slate-600" : "text-slate-500"}`} />
            </CardContent>
            </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm transition-colors hover:bg-slate-900/70">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-200">Здоровье сегодня</CardTitle>
                {employeesTotal === 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-slate-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Нет активных сотрудников для контроля</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <CardDescription className="text-xs text-slate-400">Всего / подписано</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${employeesTotal === 0 ? "text-slate-500" : "text-white"}`}>
                {employeesTotal === 0 ? "Нет точек" : `${healthTotalToday} / ${healthSignedToday}`}
              </div>
              <Users className={`h-5 w-5 ${employeesTotal === 0 ? "text-slate-600" : "text-slate-500"}`} />
            </CardContent>
            </Card>

          <Card className={`border-slate-800 bg-slate-900/50 backdrop-blur-sm transition-colors hover:bg-slate-900/70 ${
              registryExpired > 0 ? "ring-2 ring-red-500/40" : registryExpiring > 0 ? "ring-2 ring-amber-500/30" : ""
            }`}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-semibold text-slate-200">Документы для проверок</CardTitle>
              <CardDescription className="text-xs text-slate-400">Просрочено / ≤ 30 дней</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${
                registryExpired > 0 ? "text-red-300" : registryExpiring > 0 ? "text-amber-300" : "text-white"
              }`}>
                {registryExpired} / {registryExpiring}
              </div>
              <FileText className={`h-5 w-5 ${
                registryExpired > 0 ? "text-red-300" : registryExpiring > 0 ? "text-amber-300" : "text-slate-500"
              }`} />
            </CardContent>
            </Card>
        </div>

        <div className="mb-8 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
              className={`border-slate-800 bg-slate-900/50 backdrop-blur-sm transition-colors hover:bg-slate-900/70 ${
                criticalTotalToday > 0 ? "ring-2 ring-red-500/40" : ""
              }`}
            >
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-semibold text-slate-200">Критические отклонения</CardTitle>
              <CardDescription className="text-xs text-slate-400">Сегодня (красным)</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${criticalTotalToday > 0 ? "text-red-300" : "text-white"}`}>
                {criticalTotalToday}
              </div>
              <AlertTriangle className={`h-5 w-5 ${criticalTotalToday > 0 ? "text-red-300" : "text-slate-500"}`} />
            </CardContent>
            </Card>

          <Card
              className={`border-slate-800 bg-slate-900/50 backdrop-blur-sm transition-colors hover:bg-slate-900/70 ${
                nonconformitiesOpen > 0 ? "ring-2 ring-amber-500/30" : ""
              }`}
            >
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-semibold text-slate-200">Несоответствия</CardTitle>
              <CardDescription className="text-xs text-slate-400">Открыто</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${nonconformitiesOpen > 0 ? "text-amber-200" : "text-white"}`}>
                {nonconformitiesOpen}
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 border-slate-700 px-3 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                <Link href="/nonconformities">Открыть</Link>
              </Button>
            </CardContent>
            </Card>

          <Card
              className={`border-slate-800 bg-slate-900/50 backdrop-blur-sm transition-colors hover:bg-slate-900/70 ${
                (highRiskCCPCount || 0) > 0 ? "ring-2 ring-red-500/40" : ""
              }`}
            >
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-semibold text-slate-200">Открытые риски</CardTitle>
              <CardDescription className="text-xs text-slate-400">High-risk CCP</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${(highRiskCCPCount || 0) > 0 ? "text-red-300" : "text-white"}`}>
                {highRiskCCPCount || 0}
              </div>
              <Shield className={`h-5 w-5 ${(highRiskCCPCount || 0) > 0 ? "text-red-300" : "text-slate-500"}`} />
            </CardContent>
            </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm transition-colors hover:bg-slate-900/70">
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-semibold text-slate-200">Задачи</CardTitle>
              <CardDescription className="text-xs text-slate-400">Ожидают действия</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-white">{pendingTasks}</CardContent>
            </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-semibold text-slate-200">Пакет к проверке</CardTitle>
              <CardDescription className="text-xs text-slate-400">Список + ссылки</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-emerald-600 font-semibold text-white hover:bg-emerald-500">
                <Link href="/registry/package">
                  <Package className="mr-2 h-4 w-4" />
                  Сформировать
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* График температур */}
        <div className="mb-8">
          <TemperatureChart 
            data7={temperatureChartData7} 
            data14={temperatureChartData14} 
            data30={temperatureChartData30} 
          />
        </div>

        </div>
      </div>
    </div>
  );
}
