import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type AuditLogRow = {
  id: number;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: number | null;
  actorName: string;
};

export function AuditLogTable({ rows }: { rows: AuditLogRow[] }) {
  const badgeVariant = (action: string): "default" | "secondary" | "destructive" => {
    const a = (action ?? "").toLowerCase();
    if (a.includes("delete") || a.includes("close")) return "destructive";
    if (a.includes("create") || a.includes("sign")) return "default";
    return "secondary";
  };

  const linkFor = (entityType: string, entityId: number | null) => {
    if (!entityId) return null;
    if (entityType === "document") return `/documents/${entityId}`;
    if (entityType === "registryDocument") return `/registry?documentId=${entityId}`;
    if (entityType === "nonconformity") return `/nonconformities`;
    return null;
  };

  return (
    <Card className="border-slate-800 bg-slate-900/70">
      <CardHeader>
        <CardTitle className="text-xl text-white">Журнал действий</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="hidden grid-cols-12 gap-3 border-b border-slate-800 pb-2 text-xs text-slate-400 sm:grid">
          <div className="col-span-3">Время</div>
          <div className="col-span-2">Пользователь</div>
          <div className="col-span-2">Действие</div>
          <div className="col-span-3">Сущность</div>
          <div className="col-span-2">Ссылка</div>
        </div>

        {rows.map((r) => {
          const href = linkFor(r.entityType, r.entityId);
          return (
            <div key={r.id} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-12 sm:items-center sm:gap-3">
              <div className="text-xs text-slate-300 sm:col-span-3">
                {new Date(r.createdAt).toLocaleString("ru-RU")}
              </div>
              <div className="text-sm font-medium text-white sm:col-span-2">{r.actorName}</div>
              <div className="sm:col-span-2">
                <Badge variant={badgeVariant(r.action)}>{r.action}</Badge>
              </div>
              <div className="text-xs text-slate-300 sm:col-span-3">
                {r.entityType}
                {r.entityId ? ` #${r.entityId}` : ""}
              </div>
              <div className="sm:col-span-2">
                {href ? (
                  <Link href={href} className="text-xs font-semibold text-emerald-200 hover:underline">
                    Открыть
                  </Link>
                ) : (
                  <span className="text-xs text-slate-600">—</span>
                )}
              </div>
            </div>
          );
        })}

        {rows.length === 0 && <div className="py-10 text-center text-sm text-slate-400">Записей пока нет.</div>}
      </CardContent>
    </Card>
  );
}
