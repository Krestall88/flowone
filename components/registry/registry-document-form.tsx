"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isReadOnlyRole } from "@/lib/roles";

export function RegistryDocumentForm({
  documentId,
  documentTitle,
  currentUserRole,
}: {
  documentId: number;
  documentTitle: string;
  currentUserRole?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const readOnly = isReadOnlyRole(currentUserRole);

  const [objectType, setObjectType] = useState("chemicals");
  const [zone, setZone] = useState("");
  const [supplier, setSupplier] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/registry-documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentId,
          objectType,
          zone,
          supplier,
          expiresAt: expiresAt || undefined,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(payload?.error ?? "Не удалось добавить документ в реестр");
        return;
      }

      router.push(`/registry?documentId=${documentId}`);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-12">
      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Добавить в документы для проверок</CardTitle>
          <p className="mt-1 text-sm text-slate-400">Документ: {documentTitle}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-slate-300">Тип объекта</p>
              <select
                value={objectType}
                onChange={(e) => setObjectType(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                disabled={isPending || readOnly}
              >
                <option value="chemicals">Дезсредства и моющие средства</option>
                <option value="raw">Сырьё и поставщики</option>
                <option value="equipment">Оборудование</option>
                <option value="personnel">Персонал</option>
              </select>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-300">Срок действия</p>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                disabled={isPending || readOnly}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-300">Цех / зона применения</p>
              <input
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="Например: Холодный цех"
                className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-500"
                disabled={isPending || readOnly}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-300">Поставщик / производитель</p>
              <input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Например: ООО Поставщик"
                className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-500"
                disabled={isPending || readOnly}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {!readOnly && (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="h-11 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
              >
                {isPending ? "Сохраняем…" : "Добавить в реестр"}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
              className="h-11 border-slate-700 text-white hover:bg-slate-800"
            >
              Назад
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
