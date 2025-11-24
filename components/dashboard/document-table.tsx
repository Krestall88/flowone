import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusMeta } from "@/lib/status";
import { getActionMeta } from "@/lib/workflow";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { FileText } from "lucide-react";

export type DashboardDocument = {
  id: number;
  title: string;
  status: string;
  createdAt: Date;
  author: {
    name: string;
  };
  tasks: {
    step: number;
    status: string;
    action: string;
    assignee?: {
      name: string | null;
    } | null;
  }[];
};

interface DocumentTableProps {
  documents: DashboardDocument[];
}

export function DocumentTable({ documents }: DocumentTableProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 py-16 text-center">
        <FileText className="mb-4 h-10 w-10 text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-300">
          Пока нет документов в этой категории
        </h3>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Создайте новую служебную записку или дождитесь назначения задач, чтобы увидеть их здесь.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile view - Cards */}
      <div className="space-y-3 lg:hidden">
        {documents.map((doc) => {
          const statusMeta = getStatusMeta(doc.status);
          const pendingTask = doc.tasks.find((task) => task.status === "pending" && task.step > 0);
          const completedCount = doc.tasks.filter((task) => task.status === "approved").length;
          const visibleAction = pendingTask ? getActionMeta(pendingTask.action as any) : null;
          const statusLabel = visibleAction?.label ?? "Этап завершён";
          
          return (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-all hover:border-slate-700 hover:bg-slate-800/50"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-white line-clamp-2">{doc.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {format(new Date(doc.createdAt), "d MMM yyyy", { locale: ru })}
                  </p>
                </div>
                <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
              </div>
              
              {pendingTask && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-800/50 p-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-emerald-400">
                      Этап {pendingTask.step}: {statusLabel}
                    </p>
                    <p className="text-xs text-slate-500">
                      {pendingTask.assignee?.name || "Не назначен"}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Автор: {doc.author.name}</span>
                <span className="text-emerald-400">Открыть →</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop view - Table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm lg:block">
        <table className="w-full text-left text-sm">
        <thead className="bg-slate-800/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-6 py-4">Тема</th>
            <th className="px-6 py-4">Статус</th>
            <th className="px-6 py-4">Текущий шаг</th>
            <th className="px-6 py-4">Автор</th>
            <th className="px-6 py-4">Создан</th>
            <th className="px-6 py-4 text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const statusMeta = getStatusMeta(doc.status);
            // Find current pending task (excluding initiator step 0)
            const pendingTask = doc.tasks.find((task) => task.status === "pending" && task.step > 0);
            const completedCount = doc.tasks.filter((task) => task.status === "approved").length;
            const visibleAction = pendingTask ? getActionMeta(pendingTask.action as any) : null;
            const statusLabel = visibleAction?.label ?? "Этап завершён";
            
            return (
              <tr key={doc.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{doc.title}</span>
                    {pendingTask?.assignee?.name && (
                      <span className="text-xs text-slate-500">
                        Ответственный: {pendingTask.assignee.name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    {pendingTask ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-sm font-medium text-emerald-400">
                            Этап {pendingTask.step}: {statusLabel}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 ml-4">
                          {pendingTask.assignee?.name || "Не назначен"}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-slate-400">
                        Все этапы выполнены
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-300">{doc.author.name}</td>
                <td className="px-6 py-4 text-slate-400">
                  {format(doc.createdAt, "d MMMM yyyy", { locale: ru })}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button asChild size="sm" variant="outline" className="border-slate-700 text-white hover:bg-slate-800 hover:text-white">
                    <Link href={`/documents/${doc.id}`}>Открыть</Link>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
