import { LoginForm } from "@/components/auth/login-form";
import { SampleUsersPanel } from "@/components/auth/sample-users-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BadgeCheck, Shield, Workflow, Zap, Lock, Activity } from "lucide-react";

const sampleUsers = [
  { role: "Админ журналов", email: "journals-admin@example.com" },
];

export default async function JournalsLoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/journals");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-cyan-500/20 blur-3xl delay-1000" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 animate-pulse rounded-full bg-emerald-500/10 blur-3xl delay-500" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:gap-16">
        {/* Left section - Hero */}
        <section className="flex-1 space-y-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 backdrop-blur-sm">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium uppercase tracking-wider text-white/90">
              FlowOne • Production Journals
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl lg:text-6xl">
              Производственные журналы FlowOne
            </h1>
            <p className="text-base leading-relaxed text-slate-300 sm:text-lg lg:max-w-xl">
              Температурные режимы, здоровье сотрудников и санитарные журналы — в одном удобном цифровом интерфейсе.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {[
              {
                icon: Zap,
                title: "Ежедневный контроль",
                description: "Быстрый ввод показаний по всем холодильникам",
              },
              {
                icon: BadgeCheck,
                title: "Цифровые подписи",
                description: "Фиксация ответственного и времени подписания",
              },
              {
                icon: Workflow,
                title: "Здоровье персонала",
                description: "Статусы сотрудников в один клик",
              },
              {
                icon: Lock,
                title: "Соответствие требованиям",
                description: "Подготовка к проверкам без бумажной рутины",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 sm:rounded-2xl sm:p-5"
              >
                <div className="mb-3 inline-flex rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 p-3">
                  <feature.icon className="h-6 w-6 text-emerald-300" />
                </div>
                <h3 className="mb-1 font-semibold text-white">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Sample users panel */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                Тестовый аккаунт журналов
              </p>
            </div>
            <SampleUsersPanel users={sampleUsers} />
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
              <Lock className="h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-300">
                Пароль: <span className="font-mono font-semibold text-white">password</span>
              </p>
            </div>
          </div>
        </section>

        {/* Right section - Login form */}
        <section className="flex-1 lg:max-w-md">
          <Card className="border-slate-800 bg-slate-900/80 text-white shadow-2xl backdrop-blur-xl">
            <CardHeader className="space-y-3 pb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">Вход в журналы</CardTitle>
              <CardDescription className="text-slate-400">
                Используйте логин администратора журналов для доступа к модулям
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm callbackUrl="/journals" />
            </CardContent>
          </Card>

          {/* Additional info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Нужна помощь?{" "}
              <a href="#" className="font-medium text-emerald-400 hover:text-emerald-300">
                Свяжитесь с поддержкой
              </a>
            </p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/5 bg-slate-950/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <p className="text-center text-xs text-slate-500">
            © 2025 FlowOne. Модуль производственных журналов.
          </p>
        </div>
      </div>
    </div>
  );
}
