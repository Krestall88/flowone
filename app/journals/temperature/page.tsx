import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { parseToUTCDate, todayUTC, formatDateISO, getDayRangeUTC } from "@/lib/date-utils";
import { getInboxCount } from "@/lib/inbox-count";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TemperatureJournal } from "@/components/journals/temperature-journal";
import { JournalsDateToolbar } from "@/components/journals/journals-date-toolbar";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function TemperatureJournalPage({
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

  const { start, end } = getDayRangeUTC(selectedDate);

  const [inboxCount, locations, equipment, tempEntries] = await Promise.all([
    getInboxCount(userId),
    prisma.location.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.equipment.findMany({
      include: { location: true },
      orderBy: { name: "asc" },
    }),
    prisma.temperatureEntry.findMany({
      where: {
        date: {
          gte: start,
          lt: end,
        },
      },
    }),
  ]);

  const locationOptions = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
  }));

  const equipmentWithType = equipment as Array<
    (typeof equipment)[number] & {
      type?: string;
    }
  >;

  const mapped = equipmentWithType.map((eq) => {
    const entry = tempEntries.find((e) => e.equipmentId === eq.id);
    return {
      id: eq.id,
      name: eq.name,
      locationId: eq.locationId,
      locationName: eq.location.name,
      targetTemp: eq.targetTemp,
      tolerance: eq.tolerance,
      type: eq.type ?? "fridge",
      morning: entry?.morning ?? null,
      day: entry?.day ?? null,
      evening: entry?.evening ?? null,
    };
  });

  const hasData = tempEntries.length > 0;

  const lastSignedAt = tempEntries.reduce<Date | null>((latest, entry) => {
	if (!entry.signedAt) return latest;
	if (!latest || entry.signedAt > latest) {
		return entry.signedAt;
	}
	return latest;
  }, null);

  const signedLabel =
	lastSignedAt !== null
	  ? format(lastSignedAt, "d MMMM yyyy HH:mm", { locale: ru })
	  : null;

  const isoDate = formatDateISO(selectedDate);

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
          <Breadcrumb items={[{ label: "Журналы", href: "/journals" }, { label: "Температуры" }]} />
          <div className="mb-6 space-y-2">
            <h1 className="bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              Учёт температурных режимов холодильного оборудования
            </h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Укажите фактические температуры по каждому холодильнику за текущую смену. Все записи будут подписаны
              вашим пользователем.
            </p>
          </div>

          <JournalsDateToolbar date={isoDate} basePath="/journals/temperature" hasData={hasData} />

          <div className="mt-3 flex justify-end">
            <a
              href={`/api/journals/temperature/pdf?date=${isoDate}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-sm transition hover:border-emerald-500 hover:text-emerald-200"
            >
              Экспорт в PDF
            </a>
          </div>

          <TemperatureJournal
            userName={user.name ?? null}
            locations={locationOptions}
            entries={mapped}
            date={isoDate}
            signedLabel={signedLabel}
          />
        </div>
      </main>
    </div>
  );
}
