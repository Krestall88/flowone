"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, FileText, PlusCircle, Archive, LogOut, User, Send, Menu, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "next-auth/react";
import { useTransition, useState } from "react";

interface AppSidebarProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
  inboxCount?: number;
}

const ROLE_LABELS: Record<string, string> = {
  director: "Директор",
  accountant: "Главный бухгалтер",
  head: "Руководитель",
  employee: "Сотрудник",
};

const navigation = [
  { name: "Входящие", href: "/dashboard", icon: Home, exact: true, showBadge: true },
  { name: "На согласовании", href: "/dashboard?scope=in_progress", icon: FileText, exact: false },
  { name: "Архив", href: "/dashboard?scope=archive", icon: Archive, exact: false },
  { name: "Telegram", href: "/telegram", icon: Send, exact: true },
];

export function AppSidebar({ user, inboxCount = 0 }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope");
  const [isPending, startTransition] = useTransition();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    startTransition(async () => {
      await signOut({ callbackUrl: "/login" });
    });
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-white shadow-lg lg:hidden"
        aria-label="Открыть меню"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 border-r border-slate-800 bg-slate-950 transition-transform duration-300 lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:block`}
      >
      <div className="flex h-full flex-col p-4">
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Закрыть меню"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="mb-6 px-2">
          <h1 className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-2xl font-bold text-transparent">
            FlowOne
          </h1>
          <p className="text-xs text-slate-500">Документооборот</p>
        </div>

        {/* User info */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-sm font-bold text-white">
                {user.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-white">
                {user.name ?? "Пользователь"}
              </p>
              <p className="truncate text-xs text-slate-400">
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            let isActive = false;
            
            // Parse item href
            const [itemPath, itemQuery] = item.href.split("?");
            const itemScope = itemQuery ? new URLSearchParams(itemQuery).get("scope") : null;
            
            if (item.exact) {
              // Exact match: path must match AND scope must match (or both be null)
              if (itemPath === pathname) {
                isActive = itemScope === scope;
              }
            } else {
              // For non-exact matches with scope
              if (itemScope) {
                isActive = pathname === itemPath && scope === itemScope;
              } else {
                isActive = pathname.startsWith(itemPath);
              }
            }
            
            const Icon = item.icon;
            const showBadge = item.showBadge && inboxCount > 0;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.name}</span>
                {showBadge && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-xs font-bold text-white">
                    {inboxCount}
                  </span>
                )}
              </Link>
            );
          })}

          <Separator className="my-4 bg-slate-800" />

          <Link
            href="/documents/new"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-cyan-700 ${
              pathname === "/documents/new" ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950" : ""
            }`}
          >
            <PlusCircle className="h-5 w-5" />
            <span>Новый документ</span>
          </Link>
        </nav>

        {/* Logout */}
        <div className="border-t border-slate-800 pt-4">
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
        </div>
      </div>
    </aside>
    </>
  );
}
