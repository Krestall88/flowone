"use client";

import Link from "next/link";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isReadOnlyRole } from "@/lib/roles";

type NonconformityItem = {
  id: number;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  createdAt: string;
  closedAt: string | null;
  createdBy: { name: string };
  closedBy: { name: string } | null;
  document: { id: number; title: string } | null;
};

export function NonconformitiesList({ items, status, currentUserRole }: { items: NonconformityItem[]; status: string; currentUserRole?: string }) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readOnly = isReadOnlyRole(currentUserRole);

  const doAction = async (id: number, action: "close" | "reopen") => {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/nonconformities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось обновить статус");
      }

      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка обновления");
    } finally {
      setBusyId(null);
    }
  };

  const getSeverityBadge = (s: string) => {
    const v = (s ?? "").toLowerCase();
    if (v === "minor") return <Badge variant="secondary">Незнач.</Badge>;
    if (v === "major") return <Badge variant="secondary">Сущ.</Badge>;
    return <Badge variant="destructive">Крит.</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl text-white">Несоответствия</CardTitle>
              <CardDescription className="text-slate-400">
                Отклонения и корректирующие действия (минимально для аудита).
              </CardDescription>
            </div>
            {!readOnly && (
              <Button asChild className="bg-emerald-600 font-semibold text-white hover:bg-emerald-500">
                <Link href="/nonconformities/new">Добавить</Link>
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              variant={status === "open" ? "default" : "outline"}
              className={status === "open" ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-white hover:bg-slate-800"}
            >
              <Link href="/nonconformities?status=open">Открытые</Link>
            </Button>
            <Button
              asChild
              variant={status === "closed" ? "default" : "outline"}
              className={status === "closed" ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-white hover:bg-slate-800"}
            >
              <Link href="/nonconformities?status=closed">Закрытые</Link>
            </Button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {items.map((i) => (
          <Card key={i.id} className="border-slate-800 bg-slate-900/70">
            <CardContent className="space-y-3 pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-white">{i.title}</div>
                    {getSeverityBadge(i.severity)}
                    {i.status === "closed" ? <Badge variant="secondary">Закрыто</Badge> : <Badge variant="default">Открыто</Badge>}
                  </div>
                  <div className="text-xs text-slate-400">
                    Создано: {new Date(i.createdAt).toLocaleString("ru-RU")} • {i.createdBy.name}
                  </div>
                  {i.closedAt && (
                    <div className="text-xs text-slate-500">
                      Закрыто: {new Date(i.closedAt).toLocaleString("ru-RU")}
                      {i.closedBy ? ` • ${i.closedBy.name}` : ""}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {i.status === "open" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-700 text-white hover:bg-slate-800"
                      disabled={busyId === i.id || readOnly}
                      onClick={() => doAction(i.id, "close")}
                    >
                      {busyId === i.id ? "..." : "Закрыть"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-700 text-white hover:bg-slate-800"
                      disabled={busyId === i.id || readOnly}
                      onClick={() => doAction(i.id, "reopen")}
                    >
                      {busyId === i.id ? "..." : "Открыть снова"}
                    </Button>
                  )}
                </div>
              </div>

              {i.document && (
                <div className="text-xs text-slate-300">
                  Документ: <Link className="text-emerald-200 hover:underline" href={`/documents/${i.document.id}`}>{i.document.title}</Link>
                </div>
              )}

              {i.description && <div className="text-sm text-slate-200">{i.description}</div>}
            </CardContent>
          </Card>
        ))}

        {items.length === 0 && (
          <Card className="border-slate-800 bg-slate-900/70">
            <CardContent className="py-10 text-center text-sm text-slate-400">
              Нет записей.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
