import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="mb-6 flex items-center gap-2 text-sm">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-slate-400 transition-colors hover:text-white"
      >
        <Home className="h-4 w-4" />
        <span>Главная</span>
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-slate-600" />
          {item.href ? (
            <Link
              href={item.href}
              className="text-slate-400 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-white">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
