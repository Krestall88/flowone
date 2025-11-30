import Link from "next/link";
import { Rocket, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { DocumentTable } from "@/components/dashboard/document-table";
import { Card, CardContent } from "@/components/ui/card";
import { AppSidebar } from "@/components/layout/app-sidebar";

const scopeConfig = {
  inbox: {
    label: "Входящие",
    description: "Новые документы на согласование",
    icon: Clock,
    where: (userId: number) => ({
      AND: [
        {
          tasks: {
            some: {
              assigneeId: userId,
              status: "pending",
            },
          },
        },
      ],
    }),
  },
  in_progress: {
    label: "На согласовании",
    description: "Документы в процессе, где вы уже отработали",
    icon: TrendingUp,
    where: (userId: number) => ({
      AND: [
        {
          status: "in_progress",
        },
        {
          tasks: {
            some: {
              assigneeId: userId,
              status: {
                in: ["approved", "rejected"],
              },
            },
          },
        },
      ],
    }),
  },
  archive: {
    label: "Архив",
    description: "Завершённая цепочка согласования",
    icon: CheckCircle2,
    where: (userId: number) => ({
      AND: [
        {
          status: {
            in: ["approved", "rejected", "executed"],
          },
        },
        {
          OR: [
            { authorId: userId },
            { responsibleId: userId },
            {
              tasks: {
                some: {
                  assigneeId: userId,
                },
              },
            },
          ],
        },
      ],
    }),
  },
} as const;

type ScopeKey = keyof typeof scopeConfig;
const DEFAULT_SCOPE: ScopeKey = "inbox";

export default async function WorkflowDashboardPage({
  searchParams,
}: {
  searchParams: { scope?: string };
}) {
  const sessionUser = await requireUser();
  const userId = Number(sessionUser.id);
  const scopeParam = (searchParams.scope as ScopeKey) ?? DEFAULT_SCOPE;
  const scope = scopeParam in scopeConfig ? scopeParam : DEFAULT_SCOPE;

  const [documents, counts] = await Promise.all([
    prisma.document.findMany({
      where: {
        AND: [
          scopeConfig[scope].where(userId),
          {
            OR: [
              { responsibleId: userId },
              { authorId: userId },
              { tasks: { some: { assigneeId: userId } } },
            ],
          },
        ],
      },
      include: {
        author: { select: { name: true } },
        responsible: { select: { name: true } },
        tasks: {
          include: {
            assignee: {
              select: { name: true },
            },
          },
          orderBy: { step: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    (async () => {
      const entries = (Object.keys(scopeConfig) as ScopeKey[]).map(async (s) => {
        const count = await prisma.document.count({ where: scopeConfig[s].where(userId) });
        return [s, count] as const;
      });
      const resolved = await Promise.all(entries);
      return Object.fromEntries(resolved) as Record<ScopeKey, number>;
    })(),
  ]);

  const currentScope = scopeConfig[scope];
  const ScopeIcon = currentScope.icon;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AppSidebar
        user={{
          id: sessionUser.id,
          name: sessionUser.name ?? null,
          email: sessionUser.email ?? null,
          role: sessionUser.role,
        }}
        inboxCount={counts.inbox}
      />

      <main className="lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="mb-4 flex items-center gap-2 sm:gap-3">
              <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 sm:flex">
                <ScopeIcon className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{currentScope.label}</h1>
                <p className="text-sm text-slate-400">{currentScope.description}</p>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {(Object.entries(scopeConfig) as [ScopeKey, (typeof scopeConfig)[ScopeKey]][]).map(
                ([key, cfg]) => {
                  const Icon = cfg.icon;
                  const isActive = scope === key;
                  return (
                    <Link
                      key={key}
                      href={`/workflow?scope=${key}`}
                      className={`group rounded-xl border p-5 transition-all ${
                        isActive
                          ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                          : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <Icon className={`h-5 w-5 ${isActive ? "text-emerald-400" : "text-slate-500"}`} />
                        <span
                          className={`text-xs font-medium uppercase tracking-wider ${
                            isActive ? "text-emerald-400" : "text-slate-500"
                          }`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className={`text-3xl font-bold ${isActive ? "text-white" : "text-slate-300"}`}>
                        {counts[key]}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{cfg.description}</p>
                    </Link>
                  );
                },
              )}
            </div>
          </div>

          {/* Documents table */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardContent className="p-6">
              {documents.length > 0 ? (
                <DocumentTable documents={documents} />
              ) : (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50">
                    <ScopeIcon className="h-8 w-8 text-slate-600" />
                  </div>
                  <p className="mb-2 text-lg font-medium text-slate-400">Документов нет</p>
                  <p className="text-sm text-slate-500">
                    {scope === "inbox" && "У вас нет задач, требующих вашего внимания"}
                    {scope === "in_progress" && "Нет документов на согласовании"}
                    {scope === "archive" && "Архив пуст"}
                  </p>
                  {scope === "inbox" && (
                    <Button
                      asChild
                      className="mt-6 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
                    >
                      <Link href="/documents/new">
                        <Rocket className="mr-2 h-4 w-4" />
                        Создать первый документ
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
