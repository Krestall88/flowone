"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface CCPFormProps {
  initialData?: {
    id?: number;
    process: string;
    hazard: string;
    riskLevel: string;
    controlMeasures: string;
    correctiveActions: string;
    criticalLimits?: string;
    monitoringProcedure?: string;
    responsiblePerson?: string;
    relatedDocumentId?: number;
    relatedNonconformityId?: number;
  };
  onSuccess?: () => void;
}

const RISK_LEVELS = [
  { value: "low", label: "Низкий", color: "bg-green-500", description: "Минимальная вероятность возникновения опасности, незначительные последствия" },
  { value: "medium", label: "Средний", color: "bg-yellow-500", description: "Умеренная вероятность, средние последствия, требует контроля" },
  { value: "high", label: "Высокий", color: "bg-red-500", description: "Высокая вероятность или критические последствия, требует немедленных мер" },
];

export function CCPForm({ initialData, onSuccess }: CCPFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    process: initialData?.process || "",
    hazard: initialData?.hazard || "",
    riskLevel: initialData?.riskLevel || "medium",
    controlMeasures: initialData?.controlMeasures || "",
    correctiveActions: initialData?.correctiveActions || "",
    criticalLimits: initialData?.criticalLimits || "",
    monitoringProcedure: initialData?.monitoringProcedure || "",
    responsiblePerson: initialData?.responsiblePerson || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = initialData?.id ? `/api/ccp/${initialData.id}` : "/api/ccp";
      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка при сохранении CCP");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/haccp-plan");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-white">
          {initialData?.id ? "Редактировать CCP" : "Создать новую критическую контрольную точку"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Процесс <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.process}
              onChange={(e) => setFormData({ ...formData, process: e.target.value })}
              placeholder="Например: Приёмка сырья, Термообработка"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Опасность <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              value={formData.hazard}
              onChange={(e) => setFormData({ ...formData, hazard: e.target.value })}
              placeholder="Описание опасности (биологическая, химическая, физическая)"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-slate-300">
                Уровень риска <span className="text-red-400">*</span>
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-500 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-2">Как определить уровень риска:</p>
                    <ul className="space-y-1 text-xs">
                      <li>🟢 <strong>Низкий:</strong> {RISK_LEVELS[0].description}</li>
                      <li>🟡 <strong>Средний:</strong> {RISK_LEVELS[1].description}</li>
                      <li>🔴 <strong>Высокий:</strong> {RISK_LEVELS[2].description}</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-3">
              {RISK_LEVELS.map((level) => (
                <TooltipProvider key={level.value}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, riskLevel: level.value })}
                        className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                          formData.riskLevel === level.value
                            ? `${level.color} border-transparent text-white`
                            : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {level.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{level.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Меры контроля <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              value={formData.controlMeasures}
              onChange={(e) => setFormData({ ...formData, controlMeasures: e.target.value })}
              placeholder="Что делаем для предотвращения опасности"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Корректирующие действия <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              value={formData.correctiveActions}
              onChange={(e) => setFormData({ ...formData, correctiveActions: e.target.value })}
              placeholder="Что делать при отклонении"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Критические лимиты
            </label>
            <input
              type="text"
              value={formData.criticalLimits}
              onChange={(e) => setFormData({ ...formData, criticalLimits: e.target.value })}
              placeholder="Например: Температура не выше +4°C"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Методы мониторинга
            </label>
            <textarea
              value={formData.monitoringProcedure}
              onChange={(e) => setFormData({ ...formData, monitoringProcedure: e.target.value })}
              placeholder="Как контролируем выполнение"
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Ответственный
            </label>
            <input
              type="text"
              value={formData.responsiblePerson}
              onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
              placeholder="ФИО или должность"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? "Сохранение..." : initialData?.id ? "Сохранить изменения" : "Создать CCP"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
