import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bell, CheckCircle2, AlertTriangle, Info, Clock } from "lucide-react";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: { priority?: string; isRead?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);

  const priority = searchParams?.priority || "";
  const isReadFilter = searchParams?.isRead || "";

  const [inboxCount, notifications, unreadCount] = await Promise.all([
    getInboxCount(userId),
    prisma.notification.findMany({
      where: {
        AND: [
          {
            OR: [
              { userId },
              { userId: null, targetRole: user.role },
              { userId: null, targetRole: null },
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
        ...(priority ? { priority } : {}),
        ...(isReadFilter ? { isRead: isReadFilter === "true" } : {}),
      },
      orderBy: [
        { isRead: "asc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      take: 100,
    }),
    prisma.notification.count({
      where: {
        AND: [
          {
            OR: [
              { userId },
              { userId: null, targetRole: user.role },
              { userId: null, targetRole: null },
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
        isRead: false,
      },
    }),
  ]);

  const buildFilterHref = (params: { priority?: string; isRead?: string }) => {
    const sp = new URLSearchParams();
    if (params.priority) sp.set("priority", params.priority);
    if (params.isRead) sp.set("isRead", params.isRead);
    const qs = sp.toString();
    return qs ? `/notifications?${qs}` : "/notifications";
  };

  const PRIORITY_META: Record<string, { label: string; icon: any; color: string }> = {
    high: { label: "Высокий", icon: AlertTriangle, color: "text-red-400" },
    medium: { label: "Средний", icon: Info, color: "text-yellow-400" },
    low: { label: "Низкий", icon: Info, color: "text-blue-400" },
  };

  const TYPE_META: Record<string, { label: string; icon: any }> = {
    critical_deviation: { label: "Критическое отклонение", icon: AlertTriangle },
    reminder: { label: "Напоминание", icon: Clock },
    info: { label: "Информация", icon: Info },
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
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-12">
          <Breadcrumb items={[{ label: "Уведомления" }]} />

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Центр уведомлений</h1>
              <p className="mt-1 text-sm text-slate-400">
                {unreadCount > 0 ? `${unreadCount} непрочитанных уведомлений` : "Все уведомления прочитаны"}
              </p>
            </div>
            {unreadCount > 0 && (
              <form action="/api/notifications/mark-all-read" method="POST">
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Отметить все прочитанными
                </Button>
              </form>
            )}
          </div>

          {/* Фильтры */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-400">Приоритет:</span>
              <Link
                href={buildFilterHref({ isRead: isReadFilter })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  !priority ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Все
              </Link>
              <Link
                href={buildFilterHref({ priority: "high", isRead: isReadFilter })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  priority === "high" ? "border-red-500/60 bg-red-500/10 text-red-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Высокий
              </Link>
              <Link
                href={buildFilterHref({ priority: "medium", isRead: isReadFilter })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  priority === "medium" ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Средний
              </Link>
              <Link
                href={buildFilterHref({ priority: "low", isRead: isReadFilter })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  priority === "low" ? "border-blue-500/60 bg-blue-500/10 text-blue-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Низкий
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-400">Статус:</span>
              <Link
                href={buildFilterHref({ priority })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  !isReadFilter ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Все
              </Link>
              <Link
                href={buildFilterHref({ priority, isRead: "false" })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  isReadFilter === "false" ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Непрочитанные
              </Link>
              <Link
                href={buildFilterHref({ priority, isRead: "true" })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:bg-slate-800 ${
                  isReadFilter === "true" ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-200"
                }`}
              >
                Прочитанные
              </Link>
            </div>
          </div>

          {/* Список уведомлений */}
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="py-12 text-center">
                  <Bell className="mx-auto h-12 w-12 text-slate-600" />
                  <p className="mt-4 text-slate-400">Нет уведомлений</p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification) => {
                const priorityMeta = PRIORITY_META[notification.priority] || PRIORITY_META.medium;
                const typeMeta = TYPE_META[notification.type] || TYPE_META.info;
                const PriorityIcon = priorityMeta.icon;
                const TypeIcon = typeMeta.icon;

                return (
                  <Card
                    key={notification.id}
                    className={`border-slate-800 transition-colors ${
                      notification.isRead ? "bg-slate-900/30" : "bg-slate-900/70"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 ${priorityMeta.color}`}>
                          <PriorityIcon className="h-5 w-5" />
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-semibold ${notification.isRead ? "text-slate-300" : "text-white"}`}>
                                  {notification.title}
                                </h3>
                                {!notification.isRead && (
                                  <Badge variant="default" className="bg-emerald-600 text-xs">
                                    Новое
                                  </Badge>
                                )}
                              </div>
                              <p className={`mt-1 text-sm ${notification.isRead ? "text-slate-500" : "text-slate-300"}`}>
                                {notification.message}
                              </p>
                            </div>

                            {!notification.isRead && (
                              <form action={`/api/notifications/${notification.id}/read`} method="POST">
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="sm"
                                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </form>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <TypeIcon className="h-3 w-3" />
                              <span>{typeMeta.label}</span>
                            </div>
                            <span>•</span>
                            <span>{new Date(notification.createdAt).toLocaleString("ru-RU")}</span>
                            {notification.entityType && notification.entityId && (
                              <>
                                <span>•</span>
                                <Link
                                  href={
                                    notification.entityType === "temperature" ? "/journals/temperature" :
                                    notification.entityType === "health" ? "/journals/health" :
                                    notification.entityType === "ccp" ? `/haccp-plan/${notification.entityId}` :
                                    notification.entityType === "labtest" ? "/journals/lab-tests" :
                                    notification.entityType === "document" ? `/documents/${notification.entityId}` :
                                    "#"
                                  }
                                  className="text-emerald-400 hover:underline"
                                >
                                  Перейти к объекту
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
