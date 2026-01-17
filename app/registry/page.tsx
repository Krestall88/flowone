import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

function getExpiryStatus(expiresAt: Date | null): "active" | "expiring" | "expired" | "no_expiry" {
  if (!expiresAt) return "no_expiry";
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "active";
}

function getCanonicalObjectType(raw: string): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "chemicals" || v === "дезсредства" || v === "моющие" || v === "моющие и дезсредства" || v === "дезсредства и моющие") return "chemicals";
  if (v === "raw" || v === "сырьё" || v === "сырье" || v === "поставщики" || v === "сырьё и поставщики" || v === "сырье и поставщики") return "raw";
  if (v === "equipment" || v === "оборудование") return "equipment";
  if (v === "personnel" || v === "персонал" || v === "сотрудники") return "personnel";
  return raw;
}

function getObjectTypeFilterValues(type: string): string[] {
  const canonical = getCanonicalObjectType(type);
  if (canonical === "chemicals") return ["chemicals", "дезсредства", "моющие", "моющие и дезсредства", "дезсредства и моющие"];
  if (canonical === "raw") return ["raw", "сырьё", "сырье", "поставщики", "сырьё и поставщики", "сырье и поставщики"];
  if (canonical === "equipment") return ["equipment", "оборудование"];
  if (canonical === "personnel") return ["personnel", "персонал", "сотрудники"];
  return [type];
}

const OBJECT_TYPE_LABEL: Record<string, string> = {
  chemicals: "Дезсредства и моющие",
  raw: "Сырьё и поставщики",
  equipment: "Оборудование",
  personnel: "Персонал",
};

const STATUS_META: Record<ReturnType<typeof getExpiryStatus>, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Действует", variant: "default" },
  expiring: { label: "Скоро истекает", variant: "secondary" },
  expired: { label: "Просрочен", variant: "destructive" },
  no_expiry: { label: "Без срока", variant: "secondary" },
};

export default async function RegistryPage({
  searchParams,
}: {
  searchParams?: { q?: string; type?: string; status?: string; documentId?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);
  const readOnly = isReadOnlyRole(user.role);

  const q = (searchParams?.q ?? "").trim();
  const type = (searchParams?.type ?? "").trim();
  const statusFilter = (searchParams?.status ?? "").trim();
  const documentIdFilter = searchParams?.documentId ? Number(searchParams.documentId) : null;

  const qFilter = q
    ? {
        OR: [
          { supplier: { contains: q, mode: "insensitive" as const } },
          { zone: { contains: q, mode: "insensitive" as const } },
          { objectType: { contains: q, mode: "insensitive" as const } },
          { document: { title: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [inboxCount, items] = await Promise.all([
    getInboxCount(userId),
    (prisma as any).registryDocument.findMany({
      where: {
        ...(type ? { objectType: { in: getObjectTypeFilterValues(type) } } : {}),
        ...(documentIdFilter ? { documentId: documentIdFilter } : {}),
        ...qFilter,
        document: {
          OR: [
            { authorId: userId },
            { recipientId: userId },
            { responsibleId: userId },
            { watchers: { some: { userId } } },
            { tasks: { some: { assigneeId: userId } } },
          ],
        },
      },
      include: {
        document: {
          include: {
            author: { select: { name: true } },
            files: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const filteredByStatus = statusFilter
    ? (items as any[]).filter((i: any) => getExpiryStatus(i.expiresAt) === statusFilter)
    : items;

  const statusCounts = (items as any[]).reduce(
    (acc: Record<ReturnType<typeof getExpiryStatus>, number>, item: any) => {
      const s = getExpiryStatus(item.expiresAt);
      acc[s] += 1;
      return acc;
    },
    { active: 0, expiring: 0, expired: 0, no_expiry: 0 } as Record<ReturnType<typeof getExpiryStatus>, number>
  );

  const buildHref = (nextStatus: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (documentIdFilter) params.set("documentId", String(documentIdFilter));
    if (nextStatus) params.set("status", nextStatus);
    const query = params.toString();
    return query ? `/registry?${query}` : "/registry";
  };

  const buildTypeHref = (nextType: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    if (documentIdFilter) params.set("documentId", String(documentIdFilter));
    if (nextType) params.set("type", nextType);
    const query = params.toString();
    return query ? `/registry?${query}` : "/registry";
  };

  const buildPackageHref = () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (statusFilter === "expired" || statusFilter === "expiring") params.set("status", statusFilter);
    if (documentIdFilter) params.set("documentId", String(documentIdFilter));
    const query = params.toString();
    return query ? `/registry/package?${query}` : "/registry/package";
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
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Документы для проверок</h1>
              <p className="mt-1 text-sm text-slate-400">Сертификаты, разрешения и критичные документы ХАССП — быстрый поиск за 5–10 секунд.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                <Link href={buildPackageHref()}>Пакет для проверки</Link>
              </Button>
              {!readOnly && (
                <Button asChild className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700">
                  <Link href="/documents/new">Добавить документ</Link>
                </Button>
              )}
              {!readOnly && (
                <Button asChild variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                  <Link href="/documents?pick=registry">Добавить в реестр</Link>
                </Button>
              )}
            </div>
          </div>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Реестр</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid gap-3 sm:grid-cols-4">
                <Link
                  href={buildHref("expired")}
                  className={`rounded-xl border bg-slate-950/30 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/50 ${
                    statusFilter === "expired" ? "border-emerald-500/50" : "border-slate-800"
                  }`}
                >
                  <div className="text-xs text-slate-400">Просрочено</div>
                  <div className="mt-1 text-2xl font-bold text-white">{statusCounts.expired}</div>
                </Link>
                <Link
                  href={buildHref("expiring")}
                  className={`rounded-xl border bg-slate-950/30 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/50 ${
                    statusFilter === "expiring" ? "border-emerald-500/50" : "border-slate-800"
                  }`}
                >
                  <div className="text-xs text-slate-400">Истекает ≤ 30 дней</div>
                  <div className="mt-1 text-2xl font-bold text-white">{statusCounts.expiring}</div>
                </Link>
                <Link
                  href={buildHref("active")}
                  className={`rounded-xl border bg-slate-950/30 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/50 ${
                    statusFilter === "active" ? "border-emerald-500/50" : "border-slate-800"
                  }`}
                >
                  <div className="text-xs text-slate-400">Действует</div>
                  <div className="mt-1 text-2xl font-bold text-white">{statusCounts.active}</div>
                </Link>
                <Link
                  href={buildHref("no_expiry")}
                  className={`rounded-xl border bg-slate-950/30 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/50 ${
                    statusFilter === "no_expiry" ? "border-emerald-500/50" : "border-slate-800"
                  }`}
                >
                  <div className="text-xs text-slate-400">Без срока</div>
                  <div className="mt-1 text-2xl font-bold text-white">{statusCounts.no_expiry}</div>
                </Link>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Link
                  href={buildTypeHref(null)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                    !type ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-200"
                  }`}
                >
                  Все
                </Link>
                <Link
                  href={buildTypeHref("chemicals")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                    getCanonicalObjectType(type) === "chemicals"
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 text-slate-200"
                  }`}
                >
                  Моющие
                </Link>
                <Link
                  href={buildTypeHref("raw")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                    getCanonicalObjectType(type) === "raw"
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 text-slate-200"
                  }`}
                >
                  Сырьё
                </Link>
                <Link
                  href={buildTypeHref("equipment")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                    getCanonicalObjectType(type) === "equipment"
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 text-slate-200"
                  }`}
                >
                  Оборудование
                </Link>
                <Link
                  href={buildTypeHref("personnel")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                    getCanonicalObjectType(type) === "personnel"
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 text-slate-200"
                  }`}
                >
                  Персонал
                </Link>
              </div>

              <form className="mb-6 grid gap-3 sm:grid-cols-4" action="/registry">
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Быстрый поиск по названию"
                  className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-500 sm:col-span-2"
                />
                <select
                  name="type"
                  defaultValue={type}
                  className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                >
                  <option value="">Все типы</option>
                  <option value="chemicals">Дезсредства и моющие</option>
                  <option value="raw">Сырьё и поставщики</option>
                  <option value="equipment">Оборудование</option>
                  <option value="personnel">Персонал</option>
                </select>
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                >
                  <option value="">Все статусы</option>
                  <option value="active">Действует</option>
                  <option value="expiring">Скоро истекает</option>
                  <option value="expired">Просрочен</option>
                  <option value="no_expiry">Без срока</option>
                </select>
                {documentIdFilter && <input type="hidden" name="documentId" value={String(documentIdFilter)} />}
                <div className="sm:col-span-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                      Применить
                    </Button>
                    {(q || type || statusFilter || documentIdFilter) && (
                      <Button asChild variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                        <Link href="/registry">Сбросить фильтры</Link>
                      </Button>
                    )}
                    {statusFilter && (
                      <Button asChild variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                        <Link href={buildHref(null)}>Сбросить статус</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </form>

              {filteredByStatus.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  {q || type || statusFilter || documentIdFilter
                    ? "Ничего не найдено по текущим фильтрам."
                    : "В реестре пока нет документов."}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredByStatus.map((item: any) => {
                    const expiryStatus = getExpiryStatus(item.expiresAt);
                    const meta = STATUS_META[expiryStatus];
                    const objectTypeCanonical = getCanonicalObjectType(item.objectType);
                    const lastFile = item.document?.files?.[0] ?? null;
                    return (
                      <div
                        key={item.id}
                        className="block rounded-xl border border-slate-800 bg-slate-950/30 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/50"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={`/documents/${item.documentId}`} className="font-semibold text-white hover:underline">
                                {item.document.title}
                              </Link>
                              <Badge variant={meta.variant}>{meta.label}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">Автор: {item.document.author.name}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                              <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2 py-1">
                                Тип: {OBJECT_TYPE_LABEL[objectTypeCanonical] ?? item.objectType}
                              </span>
                              {item.zone && (
                                <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2 py-1">
                                  Зона: {item.zone}
                                </span>
                              )}
                              {item.supplier && (
                                <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2 py-1">
                                  Поставщик: {item.supplier}
                                </span>
                              )}
                              <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2 py-1">
                                Срок: {item.expiresAt ? item.expiresAt.toLocaleDateString("ru-RU") : "не указан"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/documents/${item.documentId}`}
                              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-emerald-500 hover:text-emerald-200"
                            >
                              Открыть документ
                            </Link>
                            {lastFile?.url ? (
                              <a
                                href={lastFile.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-emerald-600/60 bg-emerald-600/10 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-600/20"
                                title={lastFile.name ?? "Открыть файл"}
                              >
                                Открыть файл
                              </a>
                            ) : (
                              <span className="rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2 text-xs text-slate-500">
                                Файл не прикреплён
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
