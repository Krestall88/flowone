import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { formatDateISO, todayUTC } from "@/lib/date-utils";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";

function getExpiryStatus(expiresAt: Date | null): "active" | "expiring" | "expired" | "no_expiry" {
  if (!expiresAt) return "no_expiry";
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "active";
}

const STATUS_META: Record<ReturnType<typeof getExpiryStatus>, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Действует", variant: "default" },
  expiring: { label: "≤ 30 дней", variant: "secondary" },
  expired: { label: "Просрочен", variant: "destructive" },
  no_expiry: { label: "Без срока", variant: "secondary" },
};

function buildSearchHref(params: { q?: string; docs?: string | null }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.docs) sp.set("docs", params.docs);
  const qs = sp.toString();
  return qs ? `/audit/package?${qs}` : "/audit/package";
}

export default async function AuditPackagePage({
  searchParams,
}: {
  searchParams?: { q?: string; docs?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);

  const today = todayUTC();
  const isoToday = formatDateISO(today);

  const now = new Date();
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const q = (searchParams?.q ?? "").trim();
  const docsFilter = (searchParams?.docs ?? "").trim();

  const expiryWhere =
    docsFilter === "expired"
      ? { expiresAt: { lt: now } }
      : docsFilter === "expiring"
        ? { expiresAt: { gte: now, lte: in30Days } }
        : { OR: [{ expiresAt: { lt: now } }, { expiresAt: { gte: now, lte: in30Days } }] };

  const qWhere = q
    ? {
        OR: [
          { supplier: { contains: q, mode: "insensitive" as const } },
          { zone: { contains: q, mode: "insensitive" as const } },
          { objectType: { contains: q, mode: "insensitive" as const } },
          { document: { title: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [inboxCount, activeAuditSession, registryExpired, registryExpiring, registryAttentionItems, nonconformitiesOpen] =
    await Promise.all([
      getInboxCount(userId),
      prisma.auditSession.findFirst({ where: { status: "active" }, orderBy: { startedAt: "desc" } }),
      (prisma as any).registryDocument.count({ where: { expiresAt: { lt: new Date() } } }),
      (prisma as any).registryDocument.count({
        where: {
          expiresAt: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      (prisma as any).registryDocument.findMany({
        where: {
          ...expiryWhere,
          ...qWhere,
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              files: { orderBy: { createdAt: "desc" }, take: 1 },
            },
          },
        },
        orderBy: [{ expiresAt: "asc" }, { updatedAt: "desc" }],
        take: 50,
      }),
      (prisma as any).nonconformity.findMany({
        where: { status: "open" },
        include: {
          createdBy: { select: { name: true } },
          document: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  const auditLogRecent = await prisma.auditLog.findMany({
    where: {
      ...(activeAuditSession?.id ? { auditSessionId: activeAuditSession.id } : {}),
    },
    include: {
      actor: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const registryHref =
    registryExpired > 0
      ? "/registry?status=expired"
      : registryExpiring > 0
        ? "/registry?status=expiring"
        : "/registry";

  const registryPackageHref = "/registry/package";
  const auditLogActiveHref = "/audit-log?session=active";

  // PDF-роуты сейчас генерируют PDF по месяцу, определяемому date=YYYY-MM-DD.
  // Для MVP пакета аудитора даём ссылки на текущий месяц (можно расширить до диапазона позже).
  const temperaturePdfHref = `/api/journals/temperature/pdf?date=${isoToday}`;
  const healthPdfHref = `/api/journals/health/pdf?date=${isoToday}`;
  const temperaturePdf7dHref = `/api/journals/temperature/pdf-7d?date=${isoToday}`;
  const healthPdf7dHref = `/api/journals/health/pdf-7d?date=${isoToday}`;

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
          <Breadcrumb items={[{ label: "Audit Checklist", href: "/audit/checklist" }, { label: "Пакет аудитора" }]} />
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Пакет аудитора</h1>
            <p className="mt-1 text-sm text-slate-400">
              {activeAuditSession
                ? `Проверка активна (${activeAuditSession.auditType}). Пакет собирается по актуальным данным.`
                : "Проверка не активна. Пакет можно использовать для подготовки."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Документы и реестр</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Просрочено</span>
                  <span className={registryExpired > 0 ? "text-red-300" : "text-emerald-300"}>{registryExpired}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Истекает ≤ 30 дней</span>
                  <span className={registryExpiring > 0 ? "text-amber-200" : "text-emerald-300"}>{registryExpiring}</span>
                </div>

                <div className="mt-4 flex flex-col gap-1">
                  <Link href={registryHref} className="text-xs font-semibold text-emerald-200 hover:underline">
                    Открыть реестр (с фильтром)
                  </Link>
                  <Link href={registryPackageHref} className="text-xs font-semibold text-emerald-200 hover:underline">
                    Пакет документов (просрочено/≤30 дней)
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/50 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">Документы, требующие внимания</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={buildSearchHref({ q, docs: null })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                        !docsFilter ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-200"
                      }`}
                    >
                      Все (просрочено + ≤30)
                    </Link>
                    <Link
                      href={buildSearchHref({ q, docs: "expired" })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                        docsFilter === "expired"
                          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                          : "border-slate-700 text-slate-200"
                      }`}
                    >
                      Просрочено
                    </Link>
                    <Link
                      href={buildSearchHref({ q, docs: "expiring" })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                        docsFilter === "expiring"
                          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                          : "border-slate-700 text-slate-200"
                      }`}
                    >
                      ≤ 30 дней
                    </Link>
                  </div>

                  <form className="grid gap-2 sm:grid-cols-6" action="/audit/package">
                    <input
                      name="q"
                      defaultValue={q}
                      placeholder="Поиск: название / поставщик / зона / тип"
                      className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-500 sm:col-span-5"
                    />
                    {docsFilter && <input type="hidden" name="docs" value={docsFilter} />}
                    <button
                      type="submit"
                      className="h-10 rounded-lg border border-slate-700 bg-slate-900/60 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Найти
                    </button>
                  </form>
                </div>

                {(registryAttentionItems as any[]).length === 0 ? (
                  <div className="text-sm text-emerald-200">Просроченных и истекающих документов нет.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                      <thead className="text-left text-xs text-slate-400">
                        <tr>
                          <th className="border-b border-slate-800 px-3 py-2">Название</th>
                          <th className="border-b border-slate-800 px-3 py-2">Тип</th>
                          <th className="border-b border-slate-800 px-3 py-2">Зона</th>
                          <th className="border-b border-slate-800 px-3 py-2">Поставщик</th>
                          <th className="border-b border-slate-800 px-3 py-2">Срок</th>
                          <th className="border-b border-slate-800 px-3 py-2">Статус</th>
                          <th className="border-b border-slate-800 px-3 py-2">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-white">
                        {(registryAttentionItems as any[]).map((item: any) => {
                          const expiryStatus = getExpiryStatus(item.expiresAt);
                          const meta = STATUS_META[expiryStatus];
                          const lastFile = item.document?.files?.[0] ?? null;
                          return (
                            <tr key={item.id} className="align-top">
                              <td className="border-b border-slate-900 px-3 py-3">
                                <div className="font-medium">{item.document?.title ?? "—"}</div>
                              </td>
                              <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">{item.objectType ?? "—"}</td>
                              <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">{item.zone ?? "—"}</td>
                              <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">{item.supplier ?? "—"}</td>
                              <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">
                                {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString("ru-RU") : "—"}
                              </td>
                              <td className="border-b border-slate-900 px-3 py-3">
                                <Badge variant={meta.variant}>{meta.label}</Badge>
                              </td>
                              <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">
                                <div className="flex flex-wrap items-center gap-3">
                                  {item.documentId ? (
                                    <Link href={`/documents/${item.documentId}`} className="underline underline-offset-2">
                                      Открыть документ
                                    </Link>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                  {lastFile?.url ? (
                                    <a href={lastFile.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                                      Открыть файл
                                    </a>
                                  ) : (
                                    <span className="text-slate-500">Файл не прикреплён</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="mt-3">
                      <Link href={registryHref} className="text-xs font-semibold text-emerald-200 hover:underline">
                        Открыть реестр (с фильтром)
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Журналы (PDF)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-300">
                <div className="mt-2 flex flex-col gap-1">
                  <div className="text-xs font-semibold text-slate-300">Журнал температур</div>
                  <a href={temperaturePdf7dHref} className="text-xs font-semibold text-emerald-200 hover:underline">
                    Скачать PDF за 7 дней
                  </a>
                  <a href={temperaturePdfHref} className="text-xs font-semibold text-emerald-200 hover:underline">
                    Скачать PDF за месяц
                  </a>

                  <div className="mt-2 text-xs font-semibold text-slate-300">Журнал здоровья</div>
                  <a href={healthPdf7dHref} className="text-xs font-semibold text-emerald-200 hover:underline">
                    Скачать PDF за 7 дней
                  </a>
                  <a href={healthPdfHref} className="text-xs font-semibold text-emerald-200 hover:underline">
                    Скачать PDF за месяц
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/50 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">Несоответствия (open)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                {nonconformitiesOpen.length === 0 ? (
                  <div className="text-sm text-emerald-200">Открытых несоответствий нет.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                      <thead className="text-left text-xs text-slate-400">
                        <tr>
                          <th className="border-b border-slate-800 px-3 py-2">Название</th>
                          <th className="border-b border-slate-800 px-3 py-2">Критичность</th>
                          <th className="border-b border-slate-800 px-3 py-2">Документ</th>
                          <th className="border-b border-slate-800 px-3 py-2">Создал</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-white">
                        {(nonconformitiesOpen as any[]).map((n: any) => (
                          <tr key={n.id} className="align-top">
                            <td className="border-b border-slate-900 px-3 py-3">
                              <div className="font-medium">{n.title}</div>
                            </td>
                            <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">{n.severity}</td>
                            <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">
                              {n.document ? (
                                <Link href={`/documents/${n.document.id}`} className="underline underline-offset-2">
                                  {n.document.title}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">{n.createdBy?.name ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3">
                      <Link href="/nonconformities?status=open" className="text-xs font-semibold text-emerald-200 hover:underline">
                        Перейти к несоответствиям
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/50 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">Доказательность (Audit Log)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-300">
                <p className="text-xs text-slate-400">
                  Во время Audit Mode действия автоматически попадают в текущую сессию проверки.
                </p>
                <Link href={auditLogActiveHref} className="text-xs font-semibold text-emerald-200 hover:underline">
                  Открыть журнал действий (текущая проверка)
                </Link>

                {(auditLogRecent as any[]).length === 0 ? (
                  <div className="pt-2 text-xs text-slate-500">Записей пока нет.</div>
                ) : (
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full border-separate border-spacing-0">
                      <thead className="text-left text-xs text-slate-400">
                        <tr>
                          <th className="border-b border-slate-800 px-3 py-2">Время</th>
                          <th className="border-b border-slate-800 px-3 py-2">Пользователь</th>
                          <th className="border-b border-slate-800 px-3 py-2">Действие</th>
                          <th className="border-b border-slate-800 px-3 py-2">Сущность</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-white">
                        {(auditLogRecent as any[]).map((row: any) => {
                          const entityHref = row.entityType === "document" && row.entityId ? `/documents/${row.entityId}` : null;
                          const label = row.entityId ? `${row.entityType} #${row.entityId}` : row.entityType;
                          return (
                            <tr key={row.id} className="align-top">
                              <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">
                                {new Date(row.createdAt).toLocaleString("ru-RU")}
                              </td>
                              <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">
                                {row.actor?.name ?? "—"}
                              </td>
                              <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">{row.action}</td>
                              <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">
                                {entityHref ? (
                                  <Link href={entityHref} className="underline underline-offset-2">
                                    {label}
                                  </Link>
                                ) : (
                                  label
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
