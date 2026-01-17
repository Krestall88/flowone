import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { parseToUTCDate, todayUTC, formatDateISO } from "@/lib/date-utils";
import { getInboxCount } from "@/lib/inbox-count";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { HealthJournal } from "@/components/journals/health-journal";
import { JournalsDateToolbar } from "@/components/journals/journals-date-toolbar";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function HealthJournalPage({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);

  const dateParam = searchParams?.date;

  // Нормализуем дату к UTC полночи
  let selectedDate = todayUTC();
  if (dateParam && dateParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
    selectedDate = parseToUTCDate(dateParam);
  }

  const isoDate = formatDateISO(selectedDate);

  const dbUser = await prisma.user.findUnique({
    where: {
      email: user.email!,
    },
  });

  if (!dbUser) {
    throw new Error("Пользователь не найден");
  }

  const [inboxCount, employees] = await Promise.all([
    getInboxCount(userId),
    prisma.employee.findMany({
      where: {
        active: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const mapped = employees.map((e) => ({
    id: e.id,
    name: e.name,
    position: e.position,
    active: e.active,
  }));

  const existingCheck = await prisma.healthCheck.findFirst({
    where: {
      userId: dbUser.id,
      // Сравниваем по точному значению поля date, чтобы получать ровно ту запись,
      // которая была создана при сохранении журнала за этот день.
      date: selectedDate,
    },
    include: {
      entries: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  const initialStatuses: Record<number, string | null> = {};
  const initialNotes: Record<number, string> = {};

  if (existingCheck) {
    for (const entry of existingCheck.entries) {
      initialStatuses[entry.employeeId] = entry.status;
      if (entry.note) {
        initialNotes[entry.employeeId] = entry.note;
      }
    }
  }

  const hasData = !!existingCheck;
  const signedLabel =
    existingCheck?.signedAt
      ? format(existingCheck.signedAt, "d MMMM yyyy HH:mm", { locale: ru })
      : null;

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
          <Breadcrumb items={[{ label: "Журналы", href: "/journals" }, { label: "Здоровье" }]} />
          <div className="mb-6 space-y-2">
            <h1 className="bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              Журнал здоровья сотрудников
            </h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Отметьте состояние каждого сотрудника перед началом смены и при необходимости добавьте примечание.
            </p>
          </div>

          <JournalsDateToolbar date={isoDate} basePath="/journals/health" hasData={hasData} />

          <div className="mt-3 flex justify-end">
            <a
              href={`/api/journals/health/pdf?date=${isoDate}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-sm transition hover:border-emerald-500 hover:text-emerald-200"
            >
              Экспорт в PDF
            </a>
          </div>

          <HealthJournal
            employees={mapped}
            date={isoDate}
            initialStatuses={initialStatuses as any}
            initialNotes={initialNotes}
            signedLabel={signedLabel}
          />
        </div>
      </main>
    </div>
  );
}
