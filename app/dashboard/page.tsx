import Link from "next/link";
import { ArrowRight, FileText, NotebookTabs } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PlatformDashboardPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        {/* Header */}
        <header className="mb-10 space-y-6 text-center lg:mb-16 lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-200 shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>FlowOne • Enterprise Platform</span>
          </div>

          <div className="space-y-4">
            <h1 className="bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl lg:text-5xl xl:text-6xl">
              FlowOne — Единая платформа управления предприятием
            </h1>
            <p className="mx-auto max-w-3xl text-base text-slate-300 sm:text-lg">
              Документооборот нового поколения и автоматизация производственных журналов в одном месте.
              Быстрые согласования, цифровые подписи и контроль критически важных параметров — в единой системе.
            </p>
          </div>
        </header>

        {/* Modules grid */}
        <main className="flex flex-1 items-center justify-center">
          <div className="grid w-full max-w-3xl gap-6 md:grid-cols-2">
            {/* Документооборот */}
            <Card className="group relative overflow-hidden border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 shadow-xl shadow-emerald-500/10">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl transition-opacity group-hover:opacity-100" />
              <CardHeader className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/40">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold text-white">Электронный документооборот</CardTitle>
                  <CardDescription className="text-sm text-slate-300">
                    Маршруты согласования, статусы в реальном времени и моментальные уведомления для всей команды.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-4">
                <div className="space-y-1 text-xs text-slate-400">
                  <p>• Сложные маршруты согласования без Excel и бумажек</p>
                  <p>• Хранение файлов и история действий по каждому документу</p>
                </div>
                <Button
                  asChild
                  className="shrink-0 gap-2 bg-emerald-600 text-base font-semibold shadow-emerald-500/40 hover:bg-emerald-500"
                >
                  <Link href="/login">
                    Войти в модуль
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Журналы */}
            <Card className="group relative overflow-hidden border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 shadow-xl shadow-cyan-500/10">
              <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-cyan-500/25 blur-3xl transition-opacity group-hover:opacity-100" />
              <CardHeader className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-500 text-white shadow-lg shadow-cyan-500/40">
                  <NotebookTabs className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold text-white">Производственные журналы</CardTitle>
                  <CardDescription className="text-sm text-slate-300">
                    Температурные режимы, здоровье персонала и санитарные журналы — в удобном цифровом формате.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-4">
                <div className="space-y-1 text-xs text-slate-400">
                  <p>• Быстрый ввод показаний по холодильникам и складам</p>
                  <p>• Статусы сотрудников и отметка ответственного за смену</p>
                </div>
                <Button
                  asChild
                  className="shrink-0 gap-2 bg-cyan-600 text-base font-semibold shadow-cyan-500/40 hover:bg-cyan-500"
                >
                  <Link href="/journals/login">
                    Войти в модуль
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-800/60 pt-4 text-center text-xs text-slate-500">
          © 2025 FlowOne • Все права защищены
        </footer>
      </div>
    </div>
  );
}
