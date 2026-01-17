import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegistryPackageActions } from "@/components/registry/registry-package-actions";
import { Breadcrumb } from "@/components/ui/breadcrumb";

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

const OBJECT_TYPE_LABEL: Record<string, string> = {
  chemicals: "Дезсредства и моющие",
  raw: "Сырьё и поставщики",
  equipment: "Оборудование",
  personnel: "Персонал",
};

export default async function RegistryPackagePage({
  searchParams,
}: {
  searchParams?: { q?: string; type?: string; status?: string; documentId?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);

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

  const whereBase = {
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
  };

  const [inboxCount, items] = await Promise.all([
    getInboxCount(userId),
    (prisma as any).registryDocument.findMany({
      where: whereBase,
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
    : (items as any[]).filter((i: any) => {
        const s = getExpiryStatus(i.expiresAt);
        return s === "expired" || s === "expiring";
      });

  const exportParams = new URLSearchParams();
  exportParams.set("mode", "package");
  if (q) exportParams.set("q", q);
  if (type) exportParams.set("type", type);
  if (statusFilter) exportParams.set("status", statusFilter);
  if (documentIdFilter) exportParams.set("documentId", String(documentIdFilter));

  const exportHref = `/api/registry-documents/export?${exportParams.toString()}`;

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
          <Breadcrumb items={[{ label: "Реестр", href: "/registry" }, { label: "Пакет для проверки" }]} />
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
            <div>
              <h1 className="text-2xl font-bold text-white">Пакет документов для проверки</h1>
              <p className="mt-1 text-sm text-slate-400">Автосбор для аудитора: просрочено и ≤ 30 дней (по умолчанию).</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RegistryPackageActions exportHref={exportHref} />
              <Link
                href="/registry"
                className="rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Назад в реестр
              </Link>
            </div>
          </div>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Список ({filteredByStatus.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredByStatus.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">Нет документов, требующих внимания (просрочено или ≤ 30 дней).</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0">
                    <thead className="text-left text-xs text-slate-400">
                      <tr>
                        <th className="border-b border-slate-800 px-3 py-2">Название</th>
                        <th className="border-b border-slate-800 px-3 py-2">Файл</th>
                        <th className="border-b border-slate-800 px-3 py-2">Тип</th>
                        <th className="border-b border-slate-800 px-3 py-2">Зона</th>
                        <th className="border-b border-slate-800 px-3 py-2">Поставщик</th>
                        <th className="border-b border-slate-800 px-3 py-2">Срок</th>
                        <th className="border-b border-slate-800 px-3 py-2">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-white">
                      {filteredByStatus.map((item: any) => {
                        const expiryStatus = getExpiryStatus(item.expiresAt);
                        const meta = STATUS_META[expiryStatus];
                        const objectTypeCanonical = getCanonicalObjectType(item.objectType);
                        const lastFile = item.document?.files?.[0] ?? null;
                        return (
                          <tr key={item.id} className="align-top">
                            <td className="border-b border-slate-900 px-3 py-3">
                              <div className="font-medium">{item.document.title}</div>
                              <div className="mt-1 text-xs text-slate-500">Автор: {item.document.author.name}</div>
                              <div className="mt-2 text-xs text-slate-500 print:hidden">
                                <Link href={`/documents/${item.documentId}`} className="underline underline-offset-2">
                                  Открыть документ
                                </Link>
                              </div>
                            </td>
                            <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300 print:hidden">
                              {lastFile?.url ? (
                                <a href={lastFile.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                                  Открыть файл
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">
                              {OBJECT_TYPE_LABEL[objectTypeCanonical] ?? item.objectType}
                            </td>
                            <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">{item.zone ?? "—"}</td>
                            <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">{item.supplier ?? "—"}</td>
                            <td className="border-b border-slate-900 px-3 py-3 text-xs text-slate-300">
                              {item.expiresAt ? item.expiresAt.toLocaleDateString("ru-RU") : "—"}
                            </td>
                            <td className="border-b border-slate-900 px-3 py-3">
                              <Badge variant={meta.variant}>{meta.label}</Badge>
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
      </main>
    </div>
  );
}
