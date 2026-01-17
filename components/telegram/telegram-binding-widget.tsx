"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Copy, Clock, X } from "lucide-react";
import { isReadOnlyRole } from "@/lib/roles";

interface TelegramBindingData {
  isBound: boolean;
  telegram: {
    username?: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

interface BindingCodeData {
  bindingCode: string;
  expiresAt: string;
  botUsername: string;
  instructions: string;
}

export function TelegramBindingWidget({ currentUserRole }: { currentUserRole?: string }) {
  const [bindingData, setBindingData] = useState<TelegramBindingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [codeData, setCodeData] = useState<BindingCodeData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const readOnly = isReadOnlyRole(currentUserRole);

  useEffect(() => {
    loadBindingStatus();
  }, []);

  useEffect(() => {
    if (!codeData) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const expiresAt = new Date(codeData.expiresAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0) {
        setCodeData(null);
        setIsModalOpen(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [codeData]);

  const loadBindingStatus = async () => {
    try {
      const response = await fetch("/api/user/telegram/bind");
      if (response.ok) {
        const data = await response.json();
        setBindingData(data);
      }
    } catch (error) {
      console.error("Ошибка загрузки статуса привязки:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCode = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/user/telegram/bind", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setCodeData(data);
        setIsModalOpen(true);
      } else {
        alert("Ошибка генерации кода");
      }
    } catch (error) {
      console.error("Ошибка генерации кода:", error);
      alert("Ошибка генерации кода");
    } finally {
      setIsGenerating(false);
    }
  };

  const unbindTelegram = async () => {
    if (!confirm("Вы уверены, что хотите отвязать Telegram?")) {
      return;
    }

    try {
      const response = await fetch("/api/user/telegram/bind", {
        method: "DELETE",
      });

      if (response.ok) {
        setBindingData({ isBound: false, telegram: null });
        alert("Telegram успешно отвязан");
      } else {
        alert("Ошибка отвязки");
      }
    } catch (error) {
      console.error("Ошибка отвязки:", error);
      alert("Ошибка отвязки");
    }
  };

  const copyCode = () => {
    if (codeData) {
      navigator.clipboard.writeText(`/bind ${codeData.bindingCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-1/4 rounded bg-slate-800"></div>
            <div className="h-10 rounded bg-slate-800"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <span className="text-2xl">📱</span>
            Telegram уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bindingData?.isBound ? (
            <>
              <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <div className="flex-1">
                    <h4 className="font-medium text-emerald-400">
                      Telegram привязан
                    </h4>
                    <div className="mt-2 space-y-1 text-sm text-emerald-300">
                      <p>
                        <span className="font-medium">Имя:</span>{" "}
                        {bindingData.telegram?.firstName}{" "}
                        {bindingData.telegram?.lastName}
                      </p>
                      {bindingData.telegram?.username && (
                        <p>
                          <span className="font-medium">Username:</span> @
                          {bindingData.telegram.username}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-400">
                <p className="mb-2 font-medium text-slate-300">
                  Вы будете получать уведомления о:
                </p>
                <ul className="ml-4 space-y-1 list-disc">
                  <li>Новых документах на согласование</li>
                  <li>Изменении статуса документов</li>
                  <li>Комментариях к задачам</li>
                  <li>Приближении дедлайнов</li>
                </ul>
              </div>

              <Button
                onClick={unbindTelegram}
                variant="outline"
                className="w-full border-red-800 text-red-400 hover:bg-red-950/50 hover:text-red-300"
                disabled={readOnly}
              >
                Отвязать Telegram
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400">
                Привяжите Telegram, чтобы получать уведомления о новых документах
                и важных событиях прямо в мессенджер.
              </p>

              {!readOnly && (
                <Button
                  onClick={generateCode}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
                >
                  {isGenerating ? "Генерация..." : "Привязать Telegram"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal with binding code */}
      {isModalOpen && codeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  Привязка Telegram
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Следуйте инструкциям для привязки вашего аккаунта
                </p>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">
                    Код привязки:
                  </span>
                  {timeLeft !== null && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock className="h-4 w-4" />
                      {formatTime(timeLeft)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-2xl font-bold text-emerald-400">
                    {codeData.bindingCode}
                  </div>
                  <Button
                    onClick={copyCode}
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-blue-800 bg-blue-950/30 p-4">
                <h4 className="font-semibold text-blue-300">
                  📝 Инструкция:
                </h4>
                <ol className="space-y-2 text-sm text-blue-200">
                  <li className="flex gap-2">
                    <span className="font-bold">1.</span>
                    <span>
                      Откройте Telegram и найдите бота{" "}
                      <span className="font-mono font-semibold">
                        @{codeData.botUsername}
                      </span>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">2.</span>
                    <span>Нажмите кнопку "Start" или отправьте /start</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">3.</span>
                    <span>
                      Отправьте команду:{" "}
                      <span className="font-mono font-semibold">
                        /bind {codeData.bindingCode}
                      </span>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">4.</span>
                    <span>
                      Бот подтвердит успешную привязку, и вы начнёте получать
                      уведомления
                    </span>
                  </li>
                </ol>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Закрыть
                </Button>
                <Button
                  onClick={copyCode}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
                >
                  {copied ? "Скопировано!" : "Копировать команду"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
