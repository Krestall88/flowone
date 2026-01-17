import { requireUser } from "@/lib/session";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TelegramBindingWidget } from "@/components/telegram/telegram-binding-widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, MessageSquare, Clock, CheckCircle } from "lucide-react";
import { getInboxCount } from "@/lib/inbox-count";

export const dynamic = 'force-dynamic';

export default async function TelegramPage() {
  const user = await requireUser();
  const userId = Number(user.id);
  const inboxCount = await getInboxCount(userId);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AppSidebar
        user={{
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          role: user.role,
        }}
        inboxCount={inboxCount}
      />

      <main className="lg:ml-64">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent">
              📱 Telegram
            </h1>
            <p className="mt-2 text-slate-400">
              Управление уведомлениями и интеграцией с Telegram
            </p>
          </div>

          <div className="space-y-6">
            {/* Info banner */}
            <Card className="border-blue-800 bg-blue-950/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-blue-500/20 p-3">
                    <Bell className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-300">
                      Уведомления в Telegram
                    </h3>
                    <p className="mt-1 text-sm text-blue-200">
                      Привяжите свой Telegram аккаунт, чтобы получать мгновенные
                      уведомления о новых документах, изменениях статусов и важных
                      событиях прямо в мессенджер.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Binding widget */}
            <TelegramBindingWidget currentUserRole={user.role} />

            {/* Features */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">
                  Возможности интеграции
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      icon: MessageSquare,
                      title: "Мгновенные уведомления",
                      description:
                        "Получайте уведомления о новых документах на согласование в реальном времени",
                    },
                    {
                      icon: CheckCircle,
                      title: "Статусы документов",
                      description:
                        "Отслеживайте изменения статусов и прогресс согласования",
                    },
                    {
                      icon: Clock,
                      title: "Напоминания о дедлайнах",
                      description:
                        "Не пропустите важные сроки с автоматическими напоминаниями",
                    },
                    {
                      icon: Bell,
                      title: "Персонализация",
                      description:
                        "Настройте типы уведомлений под свои потребности",
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 transition-all hover:border-slate-700"
                    >
                      <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 p-2">
                        <feature.icon className="h-5 w-5 text-emerald-400" />
                      </div>
                      <h4 className="mb-1 font-semibold text-white">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-slate-400">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">
                  Как это работает?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium text-white">
                        Нажмите "Привязать Telegram"
                      </h4>
                      <p className="mt-1 text-sm text-slate-400">
                        Система сгенерирует уникальный код привязки, действительный
                        10 минут
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium text-white">
                        Откройте Telegram бота
                      </h4>
                      <p className="mt-1 text-sm text-slate-400">
                        Найдите бота в Telegram и отправьте команду /start
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium text-white">
                        Отправьте код привязки
                      </h4>
                      <p className="mt-1 text-sm text-slate-400">
                        Отправьте боту команду /bind с вашим кодом
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium text-white">
                        Готово! Получайте уведомления
                      </h4>
                      <p className="mt-1 text-sm text-slate-400">
                        Теперь вы будете получать все важные уведомления в Telegram
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
