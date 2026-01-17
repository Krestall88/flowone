import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  draft: "Черновик",
  in_progress: "В работе",
  in_execution: "На исполнении",
  executed: "Исполнен",
  approved: "Утверждён",
  rejected: "Отклонён",
};

function getStatusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "rejected") return "destructive";
  if (status === "approved" || status === "executed") return "default";
  return "secondary";
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: { pick?: string; q?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);
  const readOnly = isReadOnlyRole(user.role);

  const pickMode = (searchParams?.pick ?? "").trim();
  const q = (searchParams?.q ?? "").trim();

  const [inboxCount, documents] = await Promise.all([
    getInboxCount(userId),
    (prisma as any).document.findMany({
      where: {
        ...(q
          ? {
              OR: [{ title: { contains: q, mode: "insensitive" } }],
            }
          : {}),
        OR: [
          { authorId: userId },
          { recipientId: userId },
          { responsibleId: userId },
          { watchers: { some: { userId } } },
          { tasks: { some: { assigneeId: userId } } },
        ],
      },
      include: {
        author: { select: { name: true } },
        registryDocument: { select: { id: true, documentId: true } },
        files: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

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
              <h1 className="text-2xl font-bold text-white">Документы</h1>
              <p className="mt-1 text-sm text-slate-400">
                {pickMode === "registry" ? "Выберите документ, который нужно добавить в реестр." : "Все доступные вам документы."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!readOnly && (
                <Button asChild variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                  <Link href="/documents/new">Добавить документ</Link>
                </Button>
              )}
              {!readOnly && (
                <Button asChild variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                  <Link href="/documents/import">Импорт</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                <Link href="/registry">В реестр</Link>
              </Button>
            </div>
          </div>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Список ({documents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="mb-6 grid gap-3 sm:grid-cols-4" action="/documents">
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Поиск: название документа"
                  className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-500 sm:col-span-3"
                />
                {pickMode && <input type="hidden" name="pick" value={pickMode} />}
                <Button type="submit" variant="outline" className="h-10 border-slate-700 text-white hover:bg-slate-800">
                  Найти
                </Button>
              </form>

              {documents.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">Нет документов.</div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc: any) => {
                    const inRegistry = !!doc.registryDocument;
                    const lastFile = doc.files?.[0] ?? null;
                    const statusLabel = STATUS_LABEL[doc.status] ?? doc.status;

                    return (
                      <div
                        key={doc.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/documents/${doc.id}`} className="font-semibold text-white hover:underline">
                              {doc.title}
                            </Link>
                            <Badge variant={getStatusVariant(doc.status)}>{statusLabel}</Badge>
                            {inRegistry ? <Badge variant="secondary">В реестре</Badge> : <Badge variant="default">Не в реестре</Badge>}
                            {lastFile?.url ? <Badge variant="secondary">Файл</Badge> : <Badge variant="secondary">Нет файла</Badge>}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">Автор: {doc.author?.name ?? "—"}</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button asChild size="sm" variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                            <Link href={`/documents/${doc.id}`}>Открыть</Link>
                          </Button>

                          {lastFile?.url && (
                            <Button asChild size="sm" variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                              <a href={lastFile.url} target="_blank" rel="noreferrer">
                                Открыть файл
                              </a>
                            </Button>
                          )}

                          {pickMode === "registry" && !inRegistry && (
                            !readOnly && (
                              <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500">
                                <Link href={`/registry/new?documentId=${doc.id}`}>Добавить в реестр</Link>
                              </Button>
                            )
                          )}

                          {pickMode === "registry" && inRegistry && (
                            <Button asChild size="sm" variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                              <Link href={`/registry?documentId=${doc.id}`}>Открыть в реестре</Link>
                            </Button>
                          )}
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
