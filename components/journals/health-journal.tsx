"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isSameDay, parseISO, startOfToday } from "date-fns";
import { CheckCircle2, Edit2, Plus, User } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { offlineDB } from "@/lib/offline-db";

type Status = "healthy" | "sick" | "vacation" | "day_off" | "sick_leave" | null;

interface EmployeeEntry {
  id: number;
  name: string;
  position?: string | null;
  active?: boolean;
}

function getEmployeeCardTone(status: Status) {
  switch (status) {
    case "healthy":
      return "border-emerald-500/40 bg-emerald-500/5";
    case "sick":
      return "border-red-500/50 bg-red-500/10";
    case "sick_leave":
      return "border-amber-500/50 bg-amber-500/10";
    case "vacation":
      return "border-sky-500/40 bg-sky-500/10";
    case "day_off":
      return "border-slate-700 bg-slate-900/70";
    default:
      return "border-slate-800 bg-slate-900/70";
  }
}

interface HealthJournalProps {
  employees: EmployeeEntry[];
  date: string; // YYYY-MM-DD
  initialStatuses?: Record<number, Status>;
  initialNotes?: Record<number, string>;
  signedLabel?: string | null;
}

const STATUS_OPTIONS: { value: Exclude<Status, null>; label: string; description: string }[] = [
  { value: "healthy", label: "Зд.", description: "допущен к работе" },
  { value: "sick", label: "Отстранён", description: "отстранён от работы" },
  { value: "vacation", label: "Отп.", description: "в отпуске" },
  { value: "day_off", label: "В", description: "выходной день" },
  { value: "sick_leave", label: "Б/л", description: "на больничном" },
];

function getStatusClasses(status: Status) {
  switch (status) {
    case "healthy":
      return "border-emerald-400 bg-emerald-500/35 text-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.7)]";
    case "sick":
      return "border-red-400 bg-red-500/30 text-red-50 shadow-[0_0_0_1px_rgba(248,113,113,0.7)]";
    case "vacation":
      return "border-sky-400 bg-sky-500/30 text-sky-50 shadow-[0_0_0_1px_rgba(56,189,248,0.7)]";
    case "day_off":
      return "border-slate-300 bg-slate-600 text-slate-50 shadow-[0_0_0_1px_rgba(148,163,184,0.7)]";
    case "sick_leave":
      return "border-amber-400 bg-amber-500/30 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.7)]";
    default:
      return "border-slate-700 bg-slate-900 text-slate-300";
  }
}

function getStatusDotColor(status: Exclude<Status, null>) {
  switch (status) {
    case "healthy":
      return "bg-emerald-400";
    case "sick":
      return "bg-red-400";
    case "vacation":
      return "bg-sky-400";
    case "day_off":
      return "bg-slate-400";
    case "sick_leave":
      return "bg-amber-400";
    default:
      return "bg-slate-400";
  }
}

export function HealthJournal({ employees, date, initialStatuses, initialNotes, signedLabel }: HealthJournalProps) {
  const [statuses, setStatuses] = useState<Record<number, Status>>(initialStatuses ?? {});
  const [notes, setNotes] = useState<Record<number, string>>(initialNotes ?? {});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = searchParams.get("documentId");
  const [success, setSuccess] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeePosition, setNewEmployeePosition] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setStatuses(initialStatuses ?? {});
    setNotes(initialNotes ?? {});
    setSuccess(false);
    setSavedOffline(false);
    setError(null);
  }, [date, initialStatuses, initialNotes]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pending = await offlineDB.getPendingEntries();
        const candidate = pending
          .filter((e) => e.type === "health" && e.data?.date === date)
          .sort((a, b) => b.timestamp - a.timestamp)[0];

        if (!candidate || cancelled) return;

        const pendingEntries = Array.isArray(candidate.data?.entries) ? candidate.data.entries : [];
        const nextStatuses: Record<number, any> = {};
        const nextNotes: Record<number, string> = {};

        for (const entry of pendingEntries) {
          const employeeId = Number(entry?.employeeId);
          if (!employeeId || Number.isNaN(employeeId)) continue;
          if (entry?.status) nextStatuses[employeeId] = entry.status;
          if (typeof entry?.note === "string" && entry.note.trim()) nextNotes[employeeId] = entry.note;
        }

        setStatuses((prev) => ({ ...prev, ...nextStatuses }));
        setNotes((prev) => ({ ...prev, ...nextNotes }));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const selectedDate = parseISO(date);
  const isToday = isSameDay(selectedDate, startOfToday());
  const isReadOnly = !isToday;

  const handleStatusChange = (id: number, status: Status) => {
    setStatuses((prev) => ({ ...prev, [id]: status }));
  };

  const handleNoteChange = (id: number, value: string) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddEmployee = async () => {
    const name = newEmployeeName.trim();
    const position = newEmployeePosition.trim();
    if (!name) {
      setAddError("Укажите ФИО сотрудника");
      return;
    }

    setAddError(null);
    setIsAdding(true);

    try {
      const payload: { name: string; position?: string } = { name };
      if (position) {
        payload.position = position;
      }

      const res = await fetch("/api/journals/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось добавить сотрудника");
      }

      setIsAddFormOpen(false);
      setNewEmployeeName("");
      setNewEmployeePosition("");

      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Ошибка добавления сотрудника");
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenEdit = (employee: EmployeeEntry) => {
    setEditingEmployeeId(employee.id);
    setEditName(employee.name);
    setEditPosition(employee.position ?? "");
    setEditActive(employee.active ?? true);
    setEditError(null);
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployeeId) return;

    const name = editName.trim();
    const position = editPosition.trim();

    if (!name) {
      setEditError("Укажите ФИО сотрудника");
      return;
    }

    setEditError(null);
    setIsSavingEdit(true);

    try {
      const res = await fetch("/api/journals/employees", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingEmployeeId,
          name,
          position,
          active: editActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось сохранить сотрудника");
      }

      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Ошибка сохранения сотрудника");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!editingEmployeeId) return;

    setEditError(null);
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/journals/employees?id=${editingEmployeeId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось удалить сотрудника");
      }

      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Ошибка удаления сотрудника");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = () => {
    if (isReadOnly) return;
    setError(null);
    setSuccess(false);
    setSavedOffline(false);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("date", date);
        if (documentId && documentId.trim()) {
          formData.append("documentId", documentId.trim());
        }
        employees.forEach((e) => {
          const status = statuses[e.id];
          const note = notes[e.id];
          if (!status) return;
          formData.append(`status-${e.id}`, status);
          if (note && note.trim()) {
            formData.append(`note-${e.id}`, note.trim());
          }
        });

        let res: Response | null = null;
        try {
          res = await fetch("/api/journals/health", {
            method: "POST",
            body: formData,
          });
        } catch {
          res = null;
        }

        if (!res) {
          if (typeof navigator !== "undefined" && navigator.onLine) {
            throw new Error("Не удалось отправить данные. Попробуйте ещё раз.");
          }

          const payload = {
            date,
            documentId: documentId && documentId.trim() ? documentId.trim() : null,
            entries: employees
              .map((e) => {
                const status = statuses[e.id];
                const note = notes[e.id];
                return {
                  employeeId: e.id,
                  status,
                  note: note && note.trim() ? note.trim() : null,
                };
              })
              .filter((e) => !!e.status),
          };

          await offlineDB.addEntry("health", payload);
          setSavedOffline(true);
          setSuccess(true);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          if (res.status === 403 && data?.reason === "audit_mode_lock") {
            throw new Error(data?.error ?? "Действие запрещено в режиме проверки");
          }
          throw new Error(data?.error ?? "Не удалось сохранить журнал");
        }

        setSuccess(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка сохранения журнала");
      }
    });
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredEmployees = normalizedSearch
    ? employees.filter((employee) => {
        const position = employee.position ?? "";
        return (
          employee.name.toLowerCase().includes(normalizedSearch) ||
          position.toLowerCase().includes(normalizedSearch)
        );
      })
    : employees;

  const statusCounts = employees.reduce<Record<string, number>>((acc, employee) => {
    const status = statuses[employee.id];
    const key = status ?? "unset";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-24">
      {isReadOnly && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Режим просмотра: журнал можно заполнять и подписывать только за текущий день.
        </div>
      )}

      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader className="space-y-3">
          <div>
            <CardTitle className="text-xl text-white">Состояние сотрудников</CardTitle>
            <CardDescription className="text-sm text-slate-400">
              Отметьте статус каждого сотрудника за выбранный день. При необходимости добавьте примечание.
            </CardDescription>
            {documentId && documentId.trim() && (
              <p className="mt-2 text-[11px] text-slate-300">
                Привязано к документу{" "}
                <Link
                  href={`/documents/${documentId}`}
                  className="font-semibold text-emerald-200 underline-offset-2 hover:underline"
                >
                  #{documentId}
                </Link>
              </p>
            )}
            {signedLabel && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Журнал подписан {signedLabel}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {STATUS_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/30 px-2 py-1"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(option.value)}`} />
                <span className="text-slate-200">
                  {option.label}: <span className="font-semibold">{statusCounts[option.value] ?? 0}</span>
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/30 px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              <span className="text-slate-200">
                Без статуса: <span className="font-semibold">{statusCounts.unset ?? 0}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ФИО или должности..."
              className="h-10 w-full max-w-md rounded-lg border-slate-700 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-500">Всего сотрудников: {employees.length}</p>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg border-emerald-600/60 bg-emerald-600/10 px-4 text-xs font-semibold text-emerald-100 hover:bg-emerald-600/20"
                onClick={() => {
                  setIsAddFormOpen((prev) => !prev);
                  setAddError(null);
                }}
                disabled={isReadOnly}
              >
                {isAddFormOpen ? "Скрыть" : "Добавить"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
            <span className="mr-1 uppercase tracking-wide text-slate-500">
              Условные обозначения:
            </span>
            {STATUS_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(option.value)}`}
                />
                <span className="text-[11px] text-slate-200">
                  {option.label} — {option.description}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isAddFormOpen && (
        <Card className="border-slate-800 bg-slate-900/70">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg text-white">Новый сотрудник</CardTitle>
            <CardDescription className="text-sm text-slate-400">
              Добавьте сотрудника в справочник журнала.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-slate-400">ФИО сотрудника</p>
                <Input
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  className="h-10 rounded-lg border-slate-700 bg-slate-900 text-sm text-white placeholder:text-slate-500"
                  placeholder="Например: Иван Петров"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Должность (по желанию)</p>
                <Input
                  value={newEmployeePosition}
                  onChange={(e) => setNewEmployeePosition(e.target.value)}
                  className="h-10 rounded-lg border-slate-700 bg-slate-900 text-sm text-white placeholder:text-slate-500"
                  placeholder="Например: Повар"
                />
              </div>
            </div>
            {addError && <p className="text-xs text-red-400">{addError}</p>}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg border-slate-600 bg-slate-900/80 text-xs text-slate-100 hover:bg-slate-800"
                onClick={() => {
                  setIsAddFormOpen(false);
                  setAddError(null);
                }}
              >
                Отмена
              </Button>
              <Button
                type="button"
                onClick={handleAddEmployee}
                disabled={isAdding}
                className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                {isAdding ? "Сохраняем..." : "Добавить"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filteredEmployees.map((employee) => (
          <Card
            key={employee.id}
            className={getEmployeeCardTone(statuses[employee.id] ?? null)}
          >
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{employee.name}</p>
                  {employee.position && (
                    <p className="truncate text-xs text-slate-400">{employee.position}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-slate-700 px-2 text-[11px] text-slate-200 hover:border-emerald-500 hover:text-emerald-200"
                  onClick={() => handleOpenEdit(employee)}
                  disabled={isReadOnly}
                >
                  <Edit2 className="mr-1 h-3 w-3" />
                  Редактировать
                </Button>
              </div>

              {editingEmployeeId === employee.id && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">ФИО</p>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-10 rounded-lg border-slate-700 bg-slate-900 text-sm text-white placeholder:text-slate-500"
                        placeholder="ФИО"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">Должность</p>
                      <Input
                        value={editPosition}
                        onChange={(e) => setEditPosition(e.target.value)}
                        className="h-10 rounded-lg border-slate-700 bg-slate-900 text-sm text-white placeholder:text-slate-500"
                        placeholder="Например: Повар"
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-slate-400">Статус сотрудника</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={`h-8 rounded-full px-3 text-xs ${
                          editActive
                            ? "border-emerald-500/70 bg-emerald-500/20 text-emerald-100"
                            : "border-slate-600 bg-slate-900/80 text-slate-200"
                        }`}
                        onClick={() => setEditActive(true)}
                      >
                        Активен
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={`h-8 rounded-full px-3 text-xs ${
                          !editActive
                            ? "border-red-500/70 bg-red-500/20 text-red-100"
                            : "border-slate-600 bg-slate-900/80 text-slate-200"
                        }`}
                        onClick={() => setEditActive(false)}
                      >
                        Заблокирован
                      </Button>
                    </div>
                  </div>

                  {editError && <p className="mt-2 text-xs text-red-400">{editError}</p>}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-9 rounded-lg bg-red-500/80 px-4 text-xs text-white"
                      onClick={handleDeleteEmployee}
                      disabled={isDeleting || isSavingEdit}
                    >
                      {isDeleting ? "Удаляем..." : "Удалить"}
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-lg border-slate-600 bg-slate-900/80 text-xs text-slate-100 hover:bg-slate-800"
                        onClick={() => {
                          setEditingEmployeeId(null);
                          setEditError(null);
                        }}
                        disabled={isDeleting || isSavingEdit}
                      >
                        Закрыть
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveEmployee}
                        disabled={isSavingEdit || isDeleting}
                        className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        {isSavingEdit ? "Сохраняем..." : "Сохранить"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs text-slate-400">Статус за день</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((option) => {
                    const isActiveStatus = statuses[employee.id] === option.value;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`h-8 rounded-full px-3 text-xs ${
                          isActiveStatus
                            ? `border-2 ${getStatusClasses(option.value)}`
                            : "border-slate-700 bg-slate-900/60 text-slate-200"
                        }`}
                        onClick={() => handleStatusChange(employee.id, option.value)}
                        disabled={isReadOnly}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400">Примечание (по желанию)</p>
                <Textarea
                  rows={2}
                  className="resize-none border-slate-700 bg-slate-900/80 text-sm text-white placeholder:text-slate-600"
                  placeholder="Например: жалобы на недомогание, направление к врачу, причина отсутствия"
                  value={notes[employee.id] ?? ""}
                  onChange={(e) => handleNoteChange(employee.id, e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-6 text-sm text-slate-300">
          По вашему запросу сотрудники не найдены.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          {savedOffline
            ? "Сохранено оффлайн. Записи будут отправлены автоматически при появлении связи."
            : "Журнал успешно подписан."}
        </div>
      )}

      <div className="sticky bottom-0 z-30 -mx-4 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur sm:rounded-2xl sm:border">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-400">
            {isReadOnly ? "Только просмотр" : "После нажатия журнал будет подписан ответственным"}
          </div>
          <Button
            type="button"
            size="lg"
            onClick={handleSubmit}
            disabled={isPending || isReadOnly}
            className="w-full gap-2 bg-emerald-600 text-base font-semibold shadow-emerald-500/40 hover:bg-emerald-500 sm:w-auto sm:min-w-[260px]"
          >
            {isPending && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-transparent" />
            )}
            Подписать смену
          </Button>
        </div>
      </div>
      <Button
        type="button"
        size="icon"
        onClick={() => {
          setIsAddFormOpen(true);
          setAddError(null);
          setNewEmployeeName("");
          setNewEmployeePosition("");
        }}
        disabled={isReadOnly}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-500"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
