"use client";

import { useMemo, useState, useTransition } from "react";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AuditType = "HACCP" | "SanPiN" | "Internal" | "Certification";

const AUDIT_TYPES: { value: AuditType; label: string }[] = [
  { value: "HACCP", label: "HACCP" },
  { value: "SanPiN", label: "СанПиН" },
  { value: "Internal", label: "Внутренняя" },
  { value: "Certification", label: "Сертификация" },
];

function canManageAuditMode(role: string) {
  return role === "director" || role === "head";
}

export function AuditModeControls({
  currentUserRole,
  initialSession,
}: {
  currentUserRole: string;
  initialSession: any | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [session, setSession] = useState<any | null>(initialSession);

  const allowed = canManageAuditMode(currentUserRole);

  const [auditType, setAuditType] = useState<AuditType>("HACCP");
  const [auditorOrg, setAuditorOrg] = useState<string>("");
  const [auditorName, setAuditorName] = useState<string>("");
  const [comment, setComment] = useState<string>("");

  const statusLabel = useMemo(() => {
    if (!session) return "Проверка не активна";
    return `Идёт проверка: ${session.auditType}`;
  }, [session]);

  const startAudit = () => {
    startTransition(async () => {
      const res = await fetch("/api/audit-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ auditType, auditorOrg, auditorName, comment }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Ошибка запуска проверки");
        return;
      }

      setSession(data.session);
      setOpen(false);
    });
  };

  const closeAudit = () => {
    if (!confirm("Завершить проверку?")) return;

    startTransition(async () => {
      const res = await fetch("/api/audit-session", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ comment }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Ошибка завершения проверки");
        return;
      }

      setSession(null);
    });
  };

  if (!allowed) return null;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      {session ? (
        <Button
          onClick={closeAudit}
          disabled={isPending}
          className="bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
        >
          Завершить проверку
        </Button>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={isPending}
              className="bg-red-600 font-semibold text-white hover:bg-red-500"
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              Начать проверку
            </Button>
          </DialogTrigger>

          <DialogContent className="border-slate-800 bg-slate-950 text-white">
            <DialogHeader>
              <DialogTitle>Начать проверку (Audit Mode)</DialogTitle>
              <DialogDescription className="text-slate-400">
                После старта часть действий будет заблокирована, чтобы исключить «правки задним числом».
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Тип проверки</Label>
                <select
                  value={auditType}
                  onChange={(e) => setAuditType(e.target.value as AuditType)}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white"
                >
                  {AUDIT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auditorOrg" className="text-slate-300">
                  Проверяющий орган (опционально)
                </Label>
                <Input
                  id="auditorOrg"
                  value={auditorOrg}
                  onChange={(e) => setAuditorOrg(e.target.value)}
                  className="border-slate-700 bg-slate-900 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auditorName" className="text-slate-300">
                  ФИО аудитора (опционально)
                </Label>
                <Input
                  id="auditorName"
                  value={auditorName}
                  onChange={(e) => setAuditorName(e.target.value)}
                  className="border-slate-700 bg-slate-900 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment" className="text-slate-300">
                  Комментарий (опционально)
                </Label>
                <Input
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="border-slate-700 bg-slate-900 text-white"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={startAudit}
                disabled={isPending}
                className="bg-red-600 font-semibold text-white hover:bg-red-500"
              >
                Запустить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="text-xs text-slate-400">{statusLabel}</div>
    </div>
  );
}
