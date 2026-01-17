"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/documents/file-upload";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface WorkflowStep {
  id: string;
  userId: number;
  user: User;
  action: "approve" | "sign" | "review";
}

interface DocumentImportFormProps {
  users: User[];
  currentUser: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
}

const ACTION_LABELS: Record<WorkflowStep["action"], string> = {
  approve: "Утверждение",
  sign: "Подпись",
  review: "Ознакомление",
};

const ROLE_LABELS: Record<string, string> = {
  director: "Директор",
  accountant: "Главный бухгалтер",
  head: "Руководитель",
  employee: "Сотрудник",
};

type ImportMode = "archive" | "workflow";

export function DocumentImportForm({ users }: DocumentImportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<ImportMode>("archive");
  const [titlePrefix, setTitlePrefix] = useState<string>("");

  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [responsibleId, setResponsibleId] = useState<number | null>(null);

  const eligibleUsers = useMemo(
    () => users.filter((u) => !["journals_admin", "auditor", "technologist"].includes(u.role)),
    [users],
  );

  const usedUserIds = workflowSteps.map((s) => s.userId);
  const availableUsers = eligibleUsers.filter((u) => !usedUserIds.includes(u.id));

  const addUserToWorkflow = (user: User) => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      userId: user.id,
      user,
      action: "approve",
    };
    setWorkflowSteps([...workflowSteps, newStep]);
  };

  const removeUserFromWorkflow = (stepId: string) => {
    setWorkflowSteps(workflowSteps.filter((s) => s.id !== stepId));
  };

  const updateStepAction = (stepId: string, action: WorkflowStep["action"]) => {
    setWorkflowSteps(workflowSteps.map((s) => (s.id === stepId ? { ...s, action } : s)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      alert("Добавьте хотя бы один файл");
      return;
    }

    if (mode === "workflow") {
      if (workflowSteps.length === 0) {
        alert("Добавьте хотя бы один этап маршрута");
        return;
      }
      if (!responsibleId) {
        alert("Назначьте ответственного исполнителя");
        return;
      }
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("mode", mode);
        formData.append("titlePrefix", titlePrefix);

        if (mode === "workflow") {
          formData.append("responsibleId", String(responsibleId));
          formData.append(
            "stages",
            JSON.stringify(
              workflowSteps.map((step) => ({
                assigneeId: step.userId,
                action: step.action,
              })),
            ),
          );
        }

        files.forEach((file) => formData.append("files", file));

        const response = await fetch("/api/documents/import", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          let errorData: any = null;
          try {
            errorData = await response.json();
          } catch {
            const text = await response.text().catch(() => "");
            throw new Error(text || "Ошибка импорта");
          }

          throw new Error(errorData.error || "Ошибка импорта");
        }

        const data = await response.json();

        if (data?.created?.length) {
          router.push(`/documents/${data.created[0].id}`);
          return;
        }

        router.push("/documents");
      } catch (error) {
        console.error("Import error:", error);
        alert(error instanceof Error ? error.message : "Ошибка импорта");
      }
    });
  };

  const responsibleUser = responsibleId ? eligibleUsers.find((u) => u.id === responsibleId) : null;

  return (
    <form onSubmit={handleSubmit} className="px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Импорт документов</h1>
          <p className="text-sm text-slate-400">
            Оцифровка существующих регламентов/инструкций/сертификатов: загрузите файлы и выберите режим — архив или запуск маршрута.
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Режим</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("archive")}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      mode === "archive"
                        ? "border-emerald-500 bg-emerald-500/10 text-white"
                        : "border-slate-700 bg-slate-950/30 text-slate-300 hover:bg-slate-800/30"
                    }`}
                  >
                    Архив (без маршрута)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("workflow")}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      mode === "workflow"
                        ? "border-emerald-500 bg-emerald-500/10 text-white"
                        : "border-slate-700 bg-slate-950/30 text-slate-300 hover:bg-slate-800/30"
                    }`}
                  >
                    Запуск маршрута
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titlePrefix" className="text-slate-300">
                  Префикс названия (опционально)
                </Label>
                <Input
                  id="titlePrefix"
                  value={titlePrefix}
                  onChange={(e) => setTitlePrefix(e.target.value)}
                  placeholder='Например: "Импорт" или "Сертификат"'
                  className="border-slate-700 bg-slate-950/30 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Файлы</Label>
              <FileUpload files={files} onFilesChange={setFiles} maxFiles={30} maxSize={15 * 1024 * 1024} />
              <div className="text-xs text-slate-500">
                <Badge variant="secondary" className="mr-2">
                  {files.length}
                </Badge>
                Файлов в импорте
              </div>
            </div>
          </CardContent>
        </Card>

        {mode === "workflow" && (
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Ответственный исполнитель</Label>
                <select
                  value={responsibleId?.toString() ?? ""}
                  onChange={(e) => setResponsibleId(e.target.value ? Number(e.target.value) : null)}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/30 px-3 text-sm text-white"
                >
                  <option value="">Выберите ответственного</option>
                  {eligibleUsers.map((u) => (
                    <option key={u.id} value={u.id.toString()}>
                      {u.name} • {ROLE_LABELS[u.role] ?? u.role}
                    </option>
                  ))}
                </select>
                {responsibleUser && (
                  <p className="text-xs text-slate-400">
                    Выбран: {responsibleUser.name} • {ROLE_LABELS[responsibleUser.role] ?? responsibleUser.role}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Маршрут согласования (одинаковый для всей пачки)</Label>

                {workflowSteps.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/30 p-4 text-sm text-slate-400">
                    Добавьте сотрудников ниже.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workflowSteps.map((step, idx) => (
                      <div
                        key={step.id}
                        className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-950/20 p-3 sm:flex-row sm:items-center"
                      >
                        <div className="text-xs text-slate-500 sm:w-10">#{idx + 1}</div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-white">{step.user.name}</div>
                          <div className="truncate text-xs text-slate-500">{ROLE_LABELS[step.user.role] ?? step.user.role}</div>
                        </div>

                        <select
                          value={step.action}
                          onChange={(e) => updateStepAction(step.id, e.target.value as WorkflowStep["action"])}
                          className="h-9 rounded-md border border-slate-700 bg-slate-950/30 px-2 text-xs text-white"
                        >
                          {Object.entries(ACTION_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeUserFromWorkflow(step.id)}
                          className="border-slate-700 text-white hover:bg-slate-800"
                        >
                          Убрать
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  {availableUsers.slice(0, 12).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => addUserToWorkflow(u)}
                      className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2 text-left text-sm text-white transition hover:bg-slate-800/30"
                    >
                      <span className="truncate">{u.name}</span>
                      <span className="ml-2 shrink-0 text-xs text-slate-500">{ROLE_LABELS[u.role] ?? u.role}</span>
                    </button>
                  ))}
                </div>

                {availableUsers.length > 12 && (
                  <p className="text-xs text-slate-500">Показаны первые 12 сотрудников. При необходимости расширим список.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            {mode === "archive" ? "Импорт создаст документы без маршрута (сразу как утверждённые)." : "Импорт создаст документы и запустит маршрут согласования."}
          </div>
          <Button
            type="submit"
            disabled={isPending || files.length === 0 || (mode === "workflow" && (!responsibleId || workflowSteps.length === 0))}
            className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
          >
            {isPending ? (
              "Импорт..."
            ) : mode === "archive" ? (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Импортировать
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Импортировать и запустить
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
