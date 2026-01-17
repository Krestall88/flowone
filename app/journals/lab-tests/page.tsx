import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { LabTestJournal } from "@/components/journals/lab-test-journal";
import { formatDateISO, parseToUTCDate, getDayRangeUTC, todayUTC } from "@/lib/date-utils";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function LabTestsJournalPage({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);

  const dateParam = searchParams?.date || formatDateISO(todayUTC());
  const selectedDate = parseToUTCDate(dateParam);
  const { start, end } = getDayRangeUTC(selectedDate);

  const prevDate = new Date(selectedDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const [inboxCount, tests] = await Promise.all([
    getInboxCount(userId),
    prisma.labTest.findMany({
      where: {
        date: { gte: start, lt: end },
      },
      include: {
        registryDocument: {
          select: {
            id: true,
            supplier: true,
            document: { select: { id: true, title: true } },
          },
        },
        nonconformity: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  const isSigned = tests.length > 0 && tests.every((t) => t.signedAt !== null);

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
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-12">
          <Breadcrumb 
            items={[
              { label: "Журналы", href: "/journals" }, 
              { label: "Лабораторные исследования" }
            ]} 
          />

          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Журнал лабораторных исследований</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Результаты микробиологических, химических и физических анализов
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Link href={`/journals/lab-tests/export?date=${dateParam}`}>
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт PDF
                </Link>
              </Button>
            </div>

            {/* Навигация по датам */}
            <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <Link
                href={`/journals/lab-tests?date=${formatDateISO(prevDate)}`}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm">Предыдущий день</span>
              </Link>

              <div className="text-center">
                <input
                  type="date"
                  value={dateParam}
                  onChange={(e) => {
                    window.location.href = `/journals/lab-tests?date=${e.target.value}`;
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {selectedDate.toLocaleDateString("ru-RU", { weekday: "long" })}
                </p>
              </div>

              <Link
                href={`/journals/lab-tests?date=${formatDateISO(nextDate)}`}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                <span className="text-sm">Следующий день</span>
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <LabTestJournal
            date={dateParam}
            initialTests={tests.map((t) => ({
              id: t.id,
              testType: t.testType,
              batchNumber: t.batchNumber || undefined,
              supplier: t.supplier || undefined,
              result: t.result,
              resultDetails: t.resultDetails || undefined,
              reportFileUrl: t.reportFileUrl || undefined,
              reportFileName: t.reportFileName || undefined,
              signedAt: t.signedAt ? t.signedAt.toISOString() : undefined,
            }))}
            isSigned={isSigned}
            currentUserRole={user.role}
          />
        </div>
      </main>
    </div>
  );
}
