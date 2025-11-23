import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Calendar, User, Users, CheckCircle2, Clock, XCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { TaskActions } from "@/components/documents/task-actions";
import { getDocumentStatusLabel } from "@/lib/status";
import { getActionMeta, TaskAction } from "@/lib/workflow";
import { FilePreviewer } from "@/components/documents/file-preview";
import { ExecutionPanel } from "@/components/documents/execution-panel";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getInboxCount } from "@/lib/inbox-count";

interface DocumentPageProps {
  params: {
    id: string;
  };
}

const ROLE_LABELS: Record<string, string> = {
  director: "Директор",
  accountant: "Главный бухгалтер",
  head: "Руководитель",
  employee: "Сотрудник",
};

export default async function DocumentPage({ params }: DocumentPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const userId = Number(user.id);
  if (Number.isNaN(userId)) {
    throw new Error("Некорректный идентификатор пользователя");
  }

  const documentId = parseInt(params.id);
  if (isNaN(documentId)) {
    notFound();
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      recipient: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      tasks: {
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          step: "asc",
        },
      },
      responsible: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      watchers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      files: {
        orderBy: {
          createdAt: "asc",
        },
      },
      executionAssignments: {
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!document) {
    notFound();
  }

  // Check if user has access to this document
  const isWatcher = document.watchers.some((watcher) => watcher.userId === userId);
  const isResponsible = document.responsibleId === userId;
  const isAuthor = document.authorId === userId;
  const isRecipient = document.recipientId === userId;
  const hasAccess =
    isAuthor ||
    isRecipient ||
    isResponsible ||
    isWatcher ||
    document.tasks.some((task) => task.assigneeId === userId);

  if (!hasAccess) {
    notFound();
  }

  const userTasks = document.tasks.filter((task) => task.assigneeId === userId);
  const userFirstStep = userTasks.length > 0 ? Math.min(...userTasks.map((task) => task.step)) : null;
  const beforeUserTurn = userFirstStep !== null && document.currentStep < userFirstStep;
  const isPrivilegedViewer = isAuthor || isRecipient || isResponsible || isWatcher;

  const statusInfo = getDocumentStatusLabel(document.status);
  
  // Find current pending task (excluding initiator step 0)
  const currentTask = document.tasks.find((t) => t.status === "pending" && t.step > 0);
  const pendingActionMeta = currentTask ? getActionMeta(currentTask.action as TaskAction) : null;

  const completedTasks = document.tasks.filter((t) => t.status === "approved" || t.status === "completed").length;
  const totalTasks = document.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const inboxCount = await getInboxCount(userId);

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
        <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Back button */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-6 text-slate-400 hover:text-white"
        >
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к дашборду
          </Link>
        </Button>

        <div className="space-y-6">
          {/* Header card */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold text-white">{document.title}</h1>
                    <Badge
                      variant={statusInfo.variant}
                      className="text-sm font-semibold"
                    >
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-semibold text-white">
                          {document.author.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs text-slate-500">Инициатор</p>
                        <p className="font-medium text-white">{document.author.name}</p>
                      </div>
                    </div>

                    {document.responsible && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-xs font-semibold text-white">
                            {document.responsible.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs text-slate-500">Ответственный</p>
                          <p className="font-medium text-white">{document.responsible.name}</p>
                        </div>
                      </div>
                    )}

                    {currentTask && currentTask.assignee && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-semibold text-white animate-pulse">
                            {currentTask.assignee.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs text-emerald-400">Текущий шаг</p>
                          <p className="font-medium text-white">{currentTask.assignee.name}</p>
                          <p className="text-xs text-slate-400">{pendingActionMeta?.label}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(document.createdAt).toLocaleDateString("ru-RU")}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <a href={`/api/documents/${document.id}/pdf`} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Скачать PDF
                  </a>
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Progress card */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-white">Прогресс согласования</CardTitle>
                <span className="text-sm text-slate-400">
                  {completedTasks} из {totalTasks} этапов
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Progress value={progress} className="h-3 bg-slate-800" />

              {/* Timeline */}
              <div className="relative space-y-4">
                {document.tasks.length > 1 && (
                  <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-slate-800" />
                )}
                {document.tasks.map((task, index) => {
                  const isInitiator = task.step === 0;
                  const actionMeta = isInitiator ? { label: "Инициатор" } : getActionMeta(task.action as TaskAction);
                  const isCompleted = task.status === "approved" || task.status === "completed";
                  const isPending = task.status === "pending";
                  const isRejected = task.status === "rejected";
                  const isCurrentStep = currentTask?.id === task.id;

                  return (
                    <div key={task.id} className={`relative flex items-start gap-4 ${isCurrentStep ? 'ring-2 ring-emerald-500/50 rounded-xl p-3 -m-3 bg-emerald-950/20' : ''}`}>
                      <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center">
                        <Avatar className="h-12 w-12 border-4 border-slate-900">
                          <AvatarFallback
                            className={`text-sm font-bold ${
                              isCompleted
                                ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white"
                                : isPending
                                ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                                : isRejected
                                ? "bg-gradient-to-br from-red-500 to-rose-500 text-white"
                                : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            {task.assignee?.name?.charAt(0) ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        {isCompleted && (
                          <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </div>
                        )}
                        {isRejected && (
                          <div className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1">
                            <XCircle className="h-3 w-3 text-white" />
                          </div>
                        )}
                        {isPending && (
                          <div className="absolute -right-1 -top-1 rounded-full bg-blue-500 p-1">
                            <Clock className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-white">{task.assignee?.name ?? "Не назначен"}</h3>
                            <p className="text-xs text-slate-400">
                              {task.assignee?.role ? (ROLE_LABELS[task.assignee.role] ?? task.assignee.role) : ""}
                            </p>
                          </div>
                          <Badge
                            variant={
                              isCompleted ? "default" : isPending ? "secondary" : "destructive"
                            }
                            className="text-xs"
                          >
                            {actionMeta.label}
                          </Badge>
                        </div>

                        {task.instruction && (
                          <p className="mb-2 text-sm text-slate-400">{task.instruction}</p>
                        )}

                        {task.comment && (
                          <div className="mt-3 rounded-lg bg-slate-900/50 p-3">
                            <p className="text-xs text-slate-500">Комментарий:</p>
                            <p className="text-sm text-slate-300">{task.comment}</p>
                          </div>
                        )}

                        {!isInitiator && task.assigneeId === userId && isPending && currentTask?.id === task.id && (
                          <div className="mt-4">
                            <TaskActions 
                              taskId={task.id} 
                              actionType={task.action as TaskAction}
                              canSkip={task.canSkip}
                              commentRequired={task.commentRequired}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Content card */}
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl text-white">Содержание документа</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{document.body}</p>
              </div>
            </CardContent>
          </Card>

          {/* Files */}
          {document.files.length > 0 && (
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl text-white">Прикреплённые файлы</CardTitle>
              </CardHeader>
              <CardContent>
                <FilePreviewer files={document.files} />
              </CardContent>
            </Card>
          )}

          {/* Watchers */}
          {document.watchers.length > 0 && (
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl text-white">Наблюдатели</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {document.watchers.map((watcher) => (
                    <div
                      key={watcher.id}
                      className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-4 py-2"
                    >
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-300">{watcher.user.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Execution panel */}
          {document.executionAssignments.length > 0 && (
            <ExecutionPanel
              documentId={document.id}
              currentUserId={userId}
              currentUserRole={user.role}
              authorId={document.authorId}
              responsibleId={document.responsibleId}
              recipientId={document.recipientId}
              executionAssignments={document.executionAssignments.map((ea) => ({
                id: ea.id,
                assigneeId: ea.assigneeId,
                status: ea.status as any,
                deadline: ea.deadline?.toISOString() ?? null,
                comment: ea.comment,
                assignee: ea.assignee,
              }))}
              executionNotes={document.executionNotes}
            />
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
