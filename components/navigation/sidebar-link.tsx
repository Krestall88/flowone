"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, ClipboardCheck, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = {
  inbox: Inbox,
  approvals: ClipboardCheck,
  archive: Archive,
};

interface SidebarLinkProps {
  href: string;
  iconName: keyof typeof iconMap;
  label: string;
  exact?: boolean;
  isActive?: boolean;
}

export function SidebarLink({ href, iconName, label, exact, isActive }: SidebarLinkProps) {
  const pathname = usePathname();
  const computedActive = exact ? pathname === href : pathname.startsWith(href);
  const active = typeof isActive === "boolean" ? isActive : computedActive;
  const Icon = iconMap[iconName];

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition",
        active
          ? "bg-white text-slate-900 shadow"
          : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
