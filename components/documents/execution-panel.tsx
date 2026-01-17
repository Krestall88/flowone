"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Clock3, Eye, Briefcase } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isReadOnlyRole } from "@/lib/roles";

type ExecutionStatus = "pending" | "viewed" | "in_progress" | "completed";

interface ExecutionAssignee {
  id: number;
  name: string;
  email: string;
}

interface ExecutionAssignment {
  id: number;
  assigneeId: number;
  status: ExecutionStatus;
  deadline: string | null;
  comment: string | null;
  assignee: ExecutionAssignee;
}

interface ExecutionPanelProps {
  documentId: number;
  currentUserId: number;
  currentUserRole: string;
  authorId: number;
  responsibleId: number | null;
  recipientId: number;
  executionAssignments: ExecutionAssignment[];
  executionNotes: string | null;
}

interface User {
  id: number;
  name: string;
  email: string;
}

function getStatusMeta(status: ExecutionStatus) {
  switch (status) {
    case "pending":
      return { label: "Не начато", tone: "secondary" as const };
    case "viewed":
      return { label: "Просмотрено", tone: "info" as const };
    case "in_progress":
      return { label: "В работе", tone: "warning" as const };
    case "completed":
      return { label: "Отработано", tone: "success" as const };
    default:
      return { label: status, tone: "secondary" as const };
  }
}

const ALLOWED_NEXT: Record<ExecutionStatus, ExecutionStatus[]> = {
  pending: ["viewed", "in_progress", "completed"],
  viewed: ["in_progress", "completed"],
  in_progress: ["completed"],
  completed: [],
};

export function ExecutionPanel({
  documentId,
  currentUserId,
  currentUserRole,
  authorId,
  responsibleId,
  recipientId,
  executionAssignments,
  executionNotes,
}: ExecutionPanelProps) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isUpdatingStatus, startUpdatingStatus] = useTransition();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>(
    executionAssignments.map((a) => a.assigneeId),
  );
  const [notes, setNotes] = useState(executionNotes ?? "");

  const canManageExecution =
    currentUserId === authorId ||
    currentUserId === recipientId ||
    (responsibleId !== null && currentUserId === responsibleId) ||
    currentUserRole === "director";

  const readOnly = isReadOnlyRole(currentUserRole);

  useEffect(() => {
    if (!canManageExecution) return;

    async function fetchUsers() {
      setLoadingUsers(true);
      try {
        const response = await fetch("/api/users");
        if (!response.ok) return;
        const data = await response.json();
        setUsers(data.users as User[]);
      } catch (error) {
        console.error("Failed to load users", error);
      } finally {
        setLoadingUsers(false);
      }
    }

    fetchUsers();
  }, [canManageExecution]);

  const toggleAssignee = (id: number) => {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSaveAssignments = () => {
    if (!canManageExecution || selectedAssignees.length === 0) {
      return;
    }

    startSaving(async () => {
      try {
        const body = {
          assignments: selectedAssignees.map((assigneeId) => ({ assigneeId })),
          notes,
        };
        const response = await fetch(`/api/documents/${documentId}/execution`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          alert(data?.error || "Не удалось сохранить исполнителей");
          return;
        }

        router.refresh();
      } catch (error) {
        alert("Ошибка сети при сохранении исполнителей");
      }
    });
  };

  const handleStatusChange = (assignment: ExecutionAssignment, nextStatus: ExecutionStatus) => {
    if (assignment.assigneeId !== currentUserId) return;

    const allowed = ALLOWED_NEXT[assignment.status] || [];
    if (!allowed.includes(nextStatus)) {
      return;
    }

    startUpdatingStatus(async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/execution`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignmentId: assignment.id,
            status: nextStatus,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          alert(data?.error || "Не удалось обновить статус исполнения");
          return;
        }

        router.refresh();
      } catch (error) {
        alert("Ошибка сети при обновлении статуса");
      }
    });
  };

  const currentUserAssignments = executionAssignments.filter(
    (assignment) => assignment.assigneeId === currentUserId,
  );

  const isExecutor = currentUserAssignments.length > 0;

  return (
    <div className="space-y-4">
      {canManageExecution && !readOnly && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Назначение исполнителей
            </Label>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
          </div>
          <p className="text-xs text-slate-500">
            Выберите сотрудников, которые должны отработать документ после согласования. Они увидят его в своём списке
            исполнения.
          </p>
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-2 lg:grid-cols-3">
            {loadingUsers && <p className="text-xs text-slate-500">Загрузка пользователей…</p>}
            {!loadingUsers &&
              users.map((user) => (
                <label
                  key={user.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={selectedAssignees.includes(user.id)}
                    onChange={() => toggleAssignee(user.id)}
                  />
                  <span>
                    {user.name}
                    <span className="ml-1 font-mono text-[10px] text-slate-400">{user.email}</span>
                  </span>
                </label>
              ))}
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-600">Общие примечания по исполнению (видны исполнителям)</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Например: довести до сведения сотрудников отдела, срок исполнения до ..."
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAssignments}
              disabled={isSaving || selectedAssignees.length === 0}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить исполнителей
            </Button>
          </div>
        </div>
      )}

      {executionAssignments.length > 0 && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Briefcase className="h-4 w-4 text-slate-500" />
            Исполнение документа
          </div>
          <div className="space-y-2 text-xs text-slate-500">
            <p>
              Каждый исполнитель отмечает статус: сначала просмотрено, затем при необходимости "в работе" и по завершении
              "отработано".
            </p>
          </div>
          <div className="space-y-2">
            {executionAssignments.map((assignment) => {
              const meta = getStatusMeta(assignment.status);
              const isCurrentExecutor = assignment.assigneeId === currentUserId;
              const allowedNext = ALLOWED_NEXT[assignment.status] || [];

              return (
                <div
                  key={assignment.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {assignment.assignee.name}
                      </span>
                      <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-mono text-slate-500">
                        {assignment.assignee.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      {assignment.status === "completed" ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : assignment.status === "in_progress" ? (
                        <Clock3 className="h-3 w-3 text-amber-500" />
                      ) : assignment.status === "viewed" ? (
                        <Eye className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Clock3 className="h-3 w-3 text-slate-400" />
                      )}
                      <span>{meta.label}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isCurrentExecutor && !readOnly && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isUpdatingStatus || !allowedNext.includes("viewed")}
                          onClick={() => handleStatusChange(assignment, "viewed")}
                        >
                          <Eye className="mr-1 h-3 w-3" /> Просмотрено
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isUpdatingStatus || !allowedNext.includes("in_progress")}
                          onClick={() => handleStatusChange(assignment, "in_progress")}
                        >
                          <Briefcase className="mr-1 h-3 w-3" /> В работе
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          disabled={isUpdatingStatus || !allowedNext.includes("completed")}
                          onClick={() => handleStatusChange(assignment, "completed")}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Отработано
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!canManageExecution && !isExecutor && executionAssignments.length === 0 && (
        <p className="text-xs text-slate-500">Для этого документа пока нет назначенных исполнителей.</p>
      )}
    </div>
  );
}
