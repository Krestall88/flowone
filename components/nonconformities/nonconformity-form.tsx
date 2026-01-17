"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function NonconformityForm({ defaultDocumentId }: { defaultDocumentId?: number | null }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("critical");
  const [documentId, setDocumentId] = useState(defaultDocumentId ? String(defaultDocumentId) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    const t = title.trim();
    if (!t) {
      setError("Укажите название несоответствия");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/nonconformities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          description: description.trim() || undefined,
          severity,
          documentId: documentId.trim() ? Number(documentId.trim()) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось создать несоответствие");
      }

      window.location.href = "/nonconformities";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/70">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl text-white">Новое несоответствие</CardTitle>
        <CardDescription className="text-slate-400">
          Зафиксируйте отклонение и при необходимости привяжите к документу (регламенту/инструкции).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-slate-400">Название</p>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 rounded-lg border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
            placeholder="Например: Температура холодильника вне допуска"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-slate-400">Описание (необязательно)</p>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[96px] rounded-lg border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
            placeholder="Что произошло, где, кто обнаружил, какие действия предприняты"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Критичность</p>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
            >
              <option value="critical">Критическое</option>
              <option value="major">Существенное</option>
              <option value="minor">Незначительное</option>
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-400">Документ (ID, необязательно)</p>
            <Input
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              inputMode="numeric"
              className="h-10 rounded-lg border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
              placeholder="Например: 12"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            {busy ? "Сохраняем..." : "Создать"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
