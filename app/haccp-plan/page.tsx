import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CCPTable } from "@/components/haccp/ccp-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Download } from "lucide-react";

export default async function HACCPPlanPage({
  searchParams,
}: {
  searchParams?: { riskLevel?: string; status?: string; q?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);

  const riskLevel = searchParams?.riskLevel || "";
  const status = searchParams?.status || "";
  const q = searchParams?.q || "";

  const [inboxCount, ccps, highRiskCount] = await Promise.all([
    getInboxCount(userId),
    prisma.cCP.findMany({
      where: {
        ...(riskLevel ? { riskLevel } : {}),
        ...(status ? { status } : {}),
        ...(q ? {
          OR: [
            { process: { contains: q, mode: "insensitive" } },
            { hazard: { contains: q, mode: "insensitive" } },
            { controlMeasures: { contains: q, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: {
        relatedDocument: {
          select: { id: true, title: true },
        },
        relatedNonconformity: {
          select: { id: true, title: true },
        },
        actions: {
          orderBy: { takenAt: "desc" },
          take: 5,
        },
      },
      orderBy: [
        { riskLevel: "desc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.cCP.count({
      where: {
        riskLevel: "high",
        status: "active",
      },
    }),
  ]);

  const buildFilterHref = (params: { riskLevel?: string; status?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params.riskLevel) sp.set("riskLevel", params.riskLevel);
    if (params.status) sp.set("status", params.status);
    if (params.q) sp.set("q", params.q);
    const qs = sp.toString();
    return qs ? `/haccp-plan?${qs}` : "/haccp-plan";
  };

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
          <Breadcrumb items={[{ label: "HACCP Plan" }]} />

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">HACCP Plan</h1>
              <p className="mt-1 text-sm text-slate-400">
                Критические контрольные точки (CCP) и матрица рисков
              </p>
              {highRiskCount > 0 && (
                <p className="mt-2 text-sm text-red-400">
                  ⚠️ Обнаружено {highRiskCount} активных высоких рисков
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                asChild
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Link href="/haccp-plan/export">
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт PDF
                </Link>
              </Button>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/haccp-plan/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Создать CCP
                </Link>
              </Button>
            </div>
          </div>

          {/* Фильтры */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-400">Уровень риска:</span>
              <Link
                href={buildFilterHref({ status, q })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  !riskLevel ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Все
              </Link>
              <Link
                href={buildFilterHref({ riskLevel: "high", status, q })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  riskLevel === "high" ? "border-red-500/60 bg-red-500/10 text-red-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Высокий
              </Link>
              <Link
                href={buildFilterHref({ riskLevel: "medium", status, q })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  riskLevel === "medium" ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Средний
              </Link>
              <Link
                href={buildFilterHref({ riskLevel: "low", status, q })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  riskLevel === "low" ? "border-green-500/60 bg-green-500/10 text-green-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Низкий
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-400">Статус:</span>
              <Link
                href={buildFilterHref({ riskLevel, q })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  !status ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Все
              </Link>
              <Link
                href={buildFilterHref({ riskLevel, status: "active", q })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  status === "active" ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Активные
              </Link>
              <Link
                href={buildFilterHref({ riskLevel, status: "resolved", q })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  status === "resolved" ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Решённые
              </Link>
            </div>

            <form action="/haccp-plan" method="GET" className="flex gap-2">
              <input
                type="hidden"
                name="riskLevel"
                value={riskLevel}
              />
              <input
                type="hidden"
                name="status"
                value={status}
              />
              <input
                type="search"
                name="q"
                placeholder="Поиск по процессу, опасности, мерам контроля..."
                defaultValue={q}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <Button
                type="submit"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Поиск
              </Button>
            </form>
          </div>

          {/* Таблица CCP */}
          <CCPTable ccps={ccps} />
        </div>
      </main>
    </div>
  );
}
