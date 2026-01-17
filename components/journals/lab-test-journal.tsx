"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";

interface LabTestJournalProps {
  date: string;
  initialTests: Array<{
    id: number;
    testType: string;
    batchNumber?: string;
    supplier?: string;
    result: string;
    resultDetails?: string;
    reportFileUrl?: string;
    reportFileName?: string;
    signedAt?: string;
  }>;
  isSigned: boolean;
  currentUserRole: string;
}

const TEST_TYPES = [
  "Микробиология",
  "Химический анализ",
  "Физические показатели",
  "Органолептика",
  "Другое",
];

export function LabTestJournal({ date, initialTests, isSigned, currentUserRole }: LabTestJournalProps) {
  const router = useRouter();
  const [tests, setTests] = useState(initialTests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);

  const [newTest, setNewTest] = useState({
    testType: TEST_TYPES[0],
    batchNumber: "",
    supplier: "",
    result: "compliant",
    resultDetails: "",
  });

  const handleAddTest = async () => {
    if (!newTest.testType) {
      setError("Укажите тип анализа");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/lab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          ...newTest,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.reason === "audit_mode_lock") {
          throw new Error("В режиме проверки запрещено редактирование прошлых данных");
        }
        throw new Error(data.error || "Ошибка при сохранении");
      }

      const savedTest = await res.json();
      setTests([...tests, savedTest]);
      setNewTest({
        testType: TEST_TYPES[0],
        batchNumber: "",
        supplier: "",
        result: "compliant",
        resultDetails: "",
      });
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    setSigning(true);
    setError("");

    try {
      const res = await fetch("/api/lab-tests/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка при подписании");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSigning(false);
    }
  };

  const readOnly = currentUserRole === "auditor" || currentUserRole === "technologist";

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Форма добавления нового исследования */}
      {!isSigned && !readOnly && (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Добавить результат анализа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Тип анализа <span className="text-red-400">*</span>
                </label>
                <select
                  value={newTest.testType}
                  onChange={(e) => setNewTest({ ...newTest, testType: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {TEST_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Партия/Номер образца
                </label>
                <input
                  type="text"
                  value={newTest.batchNumber}
                  onChange={(e) => setNewTest({ ...newTest, batchNumber: e.target.value })}
                  placeholder="Например: П-2024-001"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Поставщик/Производитель
                </label>
                <input
                  type="text"
                  value={newTest.supplier}
                  onChange={(e) => setNewTest({ ...newTest, supplier: e.target.value })}
                  placeholder="Название поставщика"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Результат <span className="text-red-400">*</span>
                </label>
                <select
                  value={newTest.result}
                  onChange={(e) => setNewTest({ ...newTest, result: e.target.value })}
                  className={`w-full rounded-lg border px-4 py-2 focus:outline-none ${
                    newTest.result === "deviation"
                      ? "border-red-500 bg-red-500/10 text-red-200"
                      : "border-slate-700 bg-slate-800 text-white focus:border-emerald-500"
                  }`}
                >
                  <option value="compliant">Соответствует</option>
                  <option value="deviation">Отклонение</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Детали результата
              </label>
              <textarea
                value={newTest.resultDetails}
                onChange={(e) => setNewTest({ ...newTest, resultDetails: e.target.value })}
                placeholder="Числовые значения, описание..."
                rows={2}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {newTest.result === "deviation" && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-200">
                ⚠️ При сохранении отклонения автоматически будет создано несоответствие
              </div>
            )}

            <Button
              onClick={handleAddTest}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? "Сохранение..." : "Добавить результат"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Список исследований */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              Результаты за {new Date(date).toLocaleDateString("ru-RU")}
            </CardTitle>
            {isSigned && (
              <Badge variant="default" className="bg-emerald-600">
                Подписано
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <p className="text-center text-slate-400 py-8">
              Нет результатов анализов за этот день
            </p>
          ) : (
            <div className="space-y-3">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className={`rounded-lg border p-4 ${
                    test.result === "deviation"
                      ? "border-red-500/50 bg-red-500/5"
                      : "border-slate-700 bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        {test.result === "deviation" ? (
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        )}
                        <span className="font-semibold text-white">{test.testType}</span>
                        <Badge variant={test.result === "deviation" ? "destructive" : "default"}>
                          {test.result === "deviation" ? "Отклонение" : "Соответствует"}
                        </Badge>
                      </div>

                      <div className="grid gap-2 text-sm md:grid-cols-2">
                        {test.batchNumber && (
                          <div>
                            <span className="text-slate-400">Партия:</span>{" "}
                            <span className="text-slate-300">{test.batchNumber}</span>
                          </div>
                        )}
                        {test.supplier && (
                          <div>
                            <span className="text-slate-400">Поставщик:</span>{" "}
                            <span className="text-slate-300">{test.supplier}</span>
                          </div>
                        )}
                      </div>

                      {test.resultDetails && (
                        <div className="text-sm">
                          <span className="text-slate-400">Детали:</span>{" "}
                          <span className="text-slate-300">{test.resultDetails}</span>
                        </div>
                      )}

                      {test.reportFileUrl && (
                        <a
                          href={test.reportFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline"
                        >
                          <Upload className="h-4 w-4" />
                          {test.reportFileName || "Отчёт"}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isSigned && tests.length > 0 && !readOnly && (
            <div className="mt-6 pt-6 border-t border-slate-700">
              <Button
                onClick={handleSign}
                disabled={signing}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {signing ? "Подписание..." : "Подписать журнал за день"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
