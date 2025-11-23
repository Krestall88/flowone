"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Rocket, Upload, Search, Check, Pen, Eye, Star, X, ChevronUp, ChevronDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
  instruction?: string;
}

interface DocumentCreationFormProps {
  users: User[];
  currentUser: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
}

const ACTION_CONFIG = {
  approve: { label: "Согласование", icon: Check, color: "bg-blue-500", textColor: "text-blue-400" },
  sign: { label: "Подписание", icon: Pen, color: "bg-purple-500", textColor: "text-purple-400" },
  review: { label: "Ознакомление", icon: Eye, color: "bg-cyan-500", textColor: "text-cyan-400" },
};

const ROLE_LABELS: Record<string, string> = {
  director: "Директор",
  accountant: "Главный бухгалтер",
  head: "Руководитель",
  employee: "Сотрудник",
};

const ROLE_COLORS: Record<string, string> = {
  director: "from-purple-500 to-pink-500",
  accountant: "from-blue-500 to-cyan-500",
  head: "from-emerald-500 to-teal-500",
  employee: "from-slate-600 to-slate-500",
};

export function DocumentCreationForm({ users, currentUser }: DocumentCreationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [responsibleId, setResponsibleId] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  // Filter users: exclude those already in workflow
  const usedUserIds = workflowSteps.map((s) => s.userId);
  const availableUsers = users.filter(
    (user) =>
      !usedUserIds.includes(user.id) &&
      (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addUserToWorkflow = (user: User) => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      userId: user.id,
      user,
      action: "approve", // Default action
    };
    setWorkflowSteps([...workflowSteps, newStep]);
  };

  const removeUserFromWorkflow = (stepId: string) => {
    setWorkflowSteps(workflowSteps.filter((s) => s.id !== stepId));
  };

  const updateStepAction = (stepId: string, action: WorkflowStep["action"]) => {
    setWorkflowSteps(
      workflowSteps.map((step) =>
        step.id === stepId ? { ...step, action } : step
      )
    );
  };

  const moveStepUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...workflowSteps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setWorkflowSteps(newSteps);
  };

  const moveStepDown = (index: number) => {
    if (index === workflowSteps.length - 1) return;
    const newSteps = [...workflowSteps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setWorkflowSteps(newSteps);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert("Заполните тему и содержание документа");
      return;
    }

    if (workflowSteps.length === 0) {
      alert("Добавьте хотя бы один этап в маршрут");
      return;
    }

    if (!responsibleId) {
      alert("Назначьте ответственного исполнителя");
      return;
    }

    // Ограничиваем суммарный размер вложений, чтобы не упираться в лимит Vercel (~4.5 МБ)
    const maxTotalSize = 4 * 1024 * 1024; // 4 МБ
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > maxTotalSize) {
      alert(`Слишком большой общий размер вложений. Максимум ${(maxTotalSize / 1024 / 1024).toFixed(1)} МБ.`);
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("body", content);
        formData.append("recipientId", responsibleId.toString());
        formData.append("responsibleId", responsibleId.toString());
        formData.append("stages", JSON.stringify(
          workflowSteps.map((step) => ({
            assigneeId: step.userId,
            action: step.action,
            instruction: step.instruction || "",
          }))
        ));

        // Add files
        files.forEach((file) => {
          formData.append("files", file);
        });

        console.log("Creating document with files:", files.length);

        const response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          let errorData: any = null;
          try {
            errorData = await response.json();
          } catch {
            const text = await response.text().catch(() => "");

            if (response.status === 413) {
              throw new Error(
                "Файл(ы) слишком большие для загрузки на сервер. Уменьшите размер вложений и попробуйте снова.",
              );
            }

            if (text) {
              throw new Error(text);
            }

            throw new Error("Ошибка создания документа");
          }

          console.error("API error:", errorData);

          if (errorData.errors) {
            // Zod validation errors
            const errorMessages = Object.entries(errorData.errors)
              .map(([field, messages]) => `${field}: ${(messages as string[]).join(", ")}`)
              .join("\n");
            throw new Error(`Ошибки валидации:\n${errorMessages}`);
          }
          
          throw new Error(errorData.error || "Ошибка создания документа");
        }

        const data = await response.json();
        console.log("Document created:", data);
        
        if (!data.document || !data.document.id) {
          throw new Error("Документ создан, но ID не получен");
        }
        
        router.push(`/documents/${data.document.id}`);
      } catch (error) {
        console.error("Error creating document:", error);
        alert(error instanceof Error ? error.message : "Ошибка создания документа");
      }
    });
  };

  const responsibleUser = responsibleId ? users.find((u) => u.id === responsibleId) : null;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-screen flex-col lg:flex-row">
      {/* Left column - Document editor (66%) */}
      <div className="flex-1 border-r border-slate-800 p-6 lg:w-2/3 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-3xl font-bold text-transparent lg:text-4xl">
              Новая служебная записка
            </h1>
            <p className="text-base text-slate-400 lg:text-lg">
              Создайте документ — он улетит по маршруту за секунды 🚀
            </p>
          </div>

          {/* Title field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-300">
              Тема документа
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Заявка на закупку муки 50 тонн"
              className="h-12 border-slate-700 bg-slate-900/50 text-base text-white placeholder:text-slate-500 lg:h-14 lg:text-lg"
              required
            />
          </div>

          {/* Content field */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-slate-300">
              Содержание
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Опишите детали документа..."
              rows={12}
              className="resize-none border-slate-700 bg-slate-900/50 text-white placeholder:text-slate-500"
              required
            />
          </div>

          {/* Attachments field */}
          <div className="space-y-2">
            <Label className="text-slate-300">Вложения</Label>
            <label className="flex h-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/30 transition-all hover:border-emerald-500 hover:bg-slate-800/50">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              />
              <div className="text-center">
                <Upload className="mx-auto mb-2 h-8 w-8 text-slate-500" />
                <p className="text-sm text-slate-400">
                  Нажмите для выбора файлов
                </p>
                <p className="mt-1 text-xs text-slate-600">PDF, DOC, XLS, изображения</p>
              </div>
            </label>

            {/* Selected files list */}
            {files.length > 0 && (
              <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/30 p-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-slate-800/50 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-emerald-500/20 p-2">
                        <Upload className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right column - Workflow builder (33%) */}
      <div className="w-full space-y-6 p-6 lg:w-1/3 lg:p-8">
        <div className="space-y-4">
          <div>
            <h2 className="mb-1 text-xl font-bold text-white lg:text-2xl">Маршрут</h2>
            <p className="text-sm text-slate-400">
              Выберите сотрудников для согласования
            </p>
          </div>

          {/* Workflow chain */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardContent className="p-4">
              {workflowSteps.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50">
                    <Rocket className="h-8 w-8 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500">
                    Выберите сотрудников из списка ниже
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workflowSteps.map((step, index) => {
                    const actionConfig = ACTION_CONFIG[step.action];
                    const Icon = actionConfig.icon;
                    return (
                      <div key={step.id}>
                        <div className="group relative flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-3 transition-all hover:border-emerald-500">
                          {/* Move buttons */}
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => moveStepUp(index)}
                              disabled={index === 0}
                              className="text-slate-500 hover:text-white disabled:opacity-30"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStepDown(index)}
                              disabled={index === workflowSteps.length - 1}
                              className="text-slate-500 hover:text-white disabled:opacity-30"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Step number */}
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                            {index + 1}
                          </div>

                          {/* Avatar */}
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback
                              className={`bg-gradient-to-br ${ROLE_COLORS[step.user.role] ?? ROLE_COLORS.employee} text-xs font-semibold text-white`}
                            >
                              {step.user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          {/* User info */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {step.user.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {ROLE_LABELS[step.user.role] ?? step.user.role}
                            </p>
                          </div>

                          {/* Action selector */}
                          <select
                            value={step.action}
                            onChange={(e) =>
                              updateStepAction(step.id, e.target.value as WorkflowStep["action"])
                            }
                            className="h-8 w-[140px] rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-white"
                          >
                            {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                              <option key={key} value={key}>
                                {config.label}
                              </option>
                            ))}
                          </select>

                          {/* Remove button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUserFromWorkflow(step.id)}
                            className="h-8 w-8 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Arrow between steps */}
                        {index < workflowSteps.length - 1 && (
                          <div className="flex justify-center py-1">
                            <ArrowRight className="h-4 w-4 rotate-90 text-slate-700" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responsible executor selector */}
          <Card className="border-emerald-800 bg-emerald-950/30">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Star className="h-4 w-4 text-emerald-400" />
                <Label className="text-sm font-medium text-slate-300">
                  Ответственный исполнитель
                </Label>
              </div>
              <select
                value={responsibleId?.toString() ?? ""}
                onChange={(e) => setResponsibleId(e.target.value ? parseInt(e.target.value) : null)}
                className="h-10 w-full rounded-md border border-emerald-700 bg-emerald-950/50 px-3 text-sm text-white"
              >
                <option value="">Выберите ответственного</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id.toString()}>
                    {user.name} • {ROLE_LABELS[user.role]}
                  </option>
                ))}
              </select>
              {responsibleUser && (
                <p className="mt-2 text-xs text-emerald-400">
                  {responsibleUser.name} • {ROLE_LABELS[responsibleUser.role]}
                </p>
              )}
            </CardContent>
          </Card>

          {/* User list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-300">
                Доступные сотрудники
              </Label>
              <Badge variant="secondary" className="text-xs">
                {availableUsers.length}
              </Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="border-slate-700 bg-slate-900/50 pl-10 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/30 p-3">
              {availableUsers.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  {searchQuery ? "Ничего не найдено" : "Все сотрудники добавлены"}
                </p>
              ) : (
                availableUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => addUserToWorkflow(user)}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/30 p-2 text-left transition-all hover:border-emerald-500 hover:bg-slate-800/50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className={`bg-gradient-to-br ${ROLE_COLORS[user.role] ?? ROLE_COLORS.employee} text-xs font-semibold text-white`}
                      >
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit button - fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur-sm lg:left-64">
        <div className="flex items-center justify-between px-6 py-4 lg:px-8">
          <div className="text-sm text-slate-400">
            {workflowSteps.length} {workflowSteps.length === 1 ? "этап" : "этапов"} •{" "}
            {responsibleUser ? `Ответственный: ${responsibleUser.name}` : "Назначьте ответственного"}
          </div>
          <Button
            type="submit"
            disabled={isPending || !title || !content || workflowSteps.length === 0 || !responsibleId}
            className="h-11 bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 text-base font-semibold shadow-lg hover:from-emerald-700 hover:to-cyan-700 lg:h-12 lg:px-8 lg:text-lg"
          >
            {isPending ? (
              <>Создание...</>
            ) : (
              <>
                <Rocket className="mr-2 h-5 w-5" />
                Создать и отправить
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Bottom padding to prevent content hiding behind fixed button */}
      <div className="h-20 lg:h-24" />
    </form>
  );
}
