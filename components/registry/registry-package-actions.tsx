"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export function RegistryPackageActions({ exportHref }: { exportHref: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <Button
        type="button"
        onClick={() => {
          window.print();
        }}
        className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
      >
        Печать
      </Button>
      <Button asChild variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
        <Link href={exportHref}>Экспорт CSV</Link>
      </Button>
    </div>
  );
}
