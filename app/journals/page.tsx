import { ThermometerSun, HeartPulse, ClipboardList, Recycle, ShieldCheck, Droplets, Leaf, Scale, Sparkles, Warehouse } from "lucide-react";
import { format, parseISO, startOfToday } from "date-fns";

import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { JournalsDateToolbar } from "@/components/journals/journals-date-toolbar";

const journals = [
  {
    id: 1,
    title: "Учёт температурных режимов холодильного оборудования",
    description: "Контроль утренних, дневных и вечерних температур по каждому холодильнику.",
    href: "/journals/temperature",
    icon: ThermometerSun,
    status: "active" as const,
  },
  {
    id: 2,
    title: "Журнал здоровья сотрудников",
    description: "Фиксация состояния сотрудников перед сменой и замечаний по самочувствию.",
    href: "/journals/health",
    icon: HeartPulse,
    status: "active" as const,
  },
  {
    id: 3,
    title: "Входной контроль сырья и материалов",
    description: "Проверка качества и документации при приёмке сырья.",
    href: "#",
    icon: ClipboardList,
    status: "wip" as const,
  },
  {
    id: 4,
    title: "Бракераж пищевых продуктов и продовольственного сырья",
    description: "Оценка качества поступающей продукции.",
    href: "#",
    icon: ShieldCheck,
    status: "wip" as const,
  },
  {
    id: 5,
    title: "Бракераж готовой кулинарной продукции",
    description: "Фиксация результатов дегустации и оценки блюд.",
    href: "#",
    icon: Sparkles,
    status: "wip" as const,
  },
  {
    id: 6,
    title: "Использования фритюрных жиров",
    description: "Учёт сроков и условий использования фритюра.",
    href: "#",
    icon: Droplets,
    status: "wip" as const,
  },
  {
    id: 7,
    title: "Получения и расходования дезинфицирующих средств",
    description: "Контроль остатков и расхода дезсредств.",
    href: "#",
    icon: Recycle,
    status: "wip" as const,
  },
  {
    id: 8,
    title: "Учёт движения отходов",
    description: "Фиксация вывоза и утилизации отходов.",
    href: "#",
    icon: Leaf,
    status: "wip" as const,
  },
  {
    id: 9,
    title: "Гигиенический журнал",
    description: "Контроль личной гигиены и санитарных мероприятий.",
    href: "#",
    icon: ShieldCheck,
    status: "wip" as const,
  },
  {
    id: 10,
    title: "Регистрация температуры и влажности в складских помещениях",
    description: "Параметры микроклимата на складах.",
    href: "#",
    icon: Warehouse,
    status: "wip" as const,
  },
];

export default async function JournalsPage({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);
  const inboxCount = await getInboxCount(userId);

  const today = startOfToday();
  const dateParam = searchParams?.date;

  let selectedDate = today;
  if (dateParam) {
    const parsed = parseISO(dateParam);
    if (!Number.isNaN(parsed.getTime())) {
      selectedDate = parsed;
    }
  }

  const isoDate = format(selectedDate, "yyyy-MM-dd");

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
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h1 className="bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                Производственные журналы
              </h1>
              <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                Все ключевые журналы безопасности и качества в едином цифровом интерфейсе. Выберите нужный журнал,
                чтобы внести записи за текущую смену.
              </p>
            </div>
          </div>

          <JournalsDateToolbar date={isoDate} basePath="/journals" />

          {/* Journals grid */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            {journals.map((journal) => {
              const Icon = journal.icon;
              const isActive = journal.status === "active";

              const card = (
                <Card
                  className={`group relative overflow-hidden border-slate-800 bg-slate-900/70 backdrop-blur-sm transition-all ${
                    isActive
                      ? "cursor-pointer hover:-translate-y-1 hover:border-emerald-500/70 hover:bg-slate-900/90 hover:shadow-lg hover:shadow-emerald-500/40"
                      : "opacity-70"
                  }`}
                >
                  {!isActive && (
                    <div className="pointer-events-none absolute inset-0 bg-slate-950/40" />
                  )}

                  <CardHeader className="relative space-y-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/40">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold text-white">
                        {journal.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-300 sm:text-sm">
                        {journal.description}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="relative flex items-center justify-between gap-3 pb-5 pl-6 pr-4">
                    <div className="text-xs text-slate-500">
                      {isActive ? "Доступен для заполнения" : "Скоро появится в системе FlowOne"}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <Badge variant="secondary" className="border-slate-700 bg-slate-900/60 text-[11px] text-slate-300">
                          В разработке
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );

              if (!isActive) {
                return (
                  <div key={journal.id} className="group block">
                    {card}
                  </div>
                );
              }

              return (
                <Link
                  key={journal.id}
                  href={`${journal.href}?date=${isoDate}`}
                  className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-2xl"
                >
                  {card}
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
