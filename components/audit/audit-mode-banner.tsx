"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuditSession = {
  id: number;
  status: string;
  auditType: string;
  auditorName?: string | null;
  auditorOrg?: string | null;
  startedAt: string;
};

export function AuditModeBanner() {
  const [session, setSession] = useState<AuditSession | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch("/api/audit-session")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setSession(data.session ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!session) return null;

  const started = new Date(session.startedAt);

  return (
    <Link
      href="/audit/checklist"
      className="fixed left-0 right-0 top-0 z-[60] flex items-center justify-center gap-2 border-b border-red-700/40 bg-red-950/80 px-4 py-2 text-xs font-semibold text-red-100 backdrop-blur"
    >
      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-400" />
      <span>
        Идёт проверка: {session.auditType} • с {started.toLocaleDateString("ru-RU")}
      </span>
      <span className="text-red-200/70">(открыть чек-лист)</span>
    </Link>
  );
}
