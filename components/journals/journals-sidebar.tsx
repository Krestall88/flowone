"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ThermometerSun, HeartPulse, LogOut, History } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "next-auth/react";
import { useTransition } from "react";

interface JournalsSidebarProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
}

const navigation = [
  { name: "Журналы", href: "/journals", icon: LayoutDashboard },
  { name: "Температуры", href: "/journals/temperature", icon: ThermometerSun },
  { name: "Здоровье сотрудников", href: "/journals/health", icon: HeartPulse },
];

export function JournalsSidebar({ user }: JournalsSidebarProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await signOut({ callbackUrl: "/login" });
    });
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 border-r border-slate-800 bg-slate-950/95 lg:block">
      <div className="flex h-full flex-col p-4">
        {/* Logo */}
        <div className="mb-6 px-2">
          <h1 className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-2xl font-bold text-transparent">
            FlowOne
          </h1>
          <p className="text-xs text-slate-500">Производственные журналы</p>
        </div>

        {/* User info */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-sm font-bold text-white">
                {user.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-white">{user.name ?? "Пользователь"}</p>
              <p className="truncate text-xs text-slate-400">Администратор журналов</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.name}</span>
              </Link>
            );
          })}

          <Separator className="my-4 bg-slate-800" />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isPending}
            className="w-full justify-start text-slate-400 hover:text-white disabled:opacity-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isPending ? "Выход..." : "Выйти"}
          </Button>
        </nav>
      </div>
    </aside>
  );
}
