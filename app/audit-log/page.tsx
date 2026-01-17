import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { canViewAuditLog } from "@/lib/audit-log";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AuditLogTable } from "@/components/audit-log/audit-log-table";
import { getActiveAuditSessionId } from "@/lib/audit-session";
import { Breadcrumb } from "@/components/ui/breadcrumb";

type AuditLogWithActor = {
  id: number;
  createdAt: Date;
  action: string;
  entityType: string;
  entityId: number | null;
  actor: { name: string };
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams?: { q?: string; action?: string; entityType?: string; auditSessionId?: string; session?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);

  if (!canViewAuditLog(user.role)) {
    redirect("/dashboard");
  }

  const q = (searchParams?.q ?? "").trim();
  const action = (searchParams?.action ?? "").trim();
  const entityType = (searchParams?.entityType ?? "").trim();
  const sessionMode = (searchParams?.session ?? "").trim();
  const auditSessionIdRaw = (searchParams?.auditSessionId ?? "").trim();

  const resolvedAuditSessionId =
    sessionMode === "active"
      ? await getActiveAuditSessionId()
      : auditSessionIdRaw
        ? Number(auditSessionIdRaw)
        : null;

  const [inboxCount, rows] = await Promise.all([
    getInboxCount(userId),
    prisma.auditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(entityType ? { entityType } : {}),
        ...(resolvedAuditSessionId ? { auditSessionId: resolvedAuditSessionId } : {}),
        ...(q
          ? {
              OR: [
                { action: { contains: q, mode: "insensitive" } },
                { entityType: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        actor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

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
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
          <Breadcrumb items={[{ label: "Audit Log" }]} />
          <AuditLogTable
            rows={(rows as AuditLogWithActor[]).map((r: AuditLogWithActor) => ({
              id: r.id,
              createdAt: r.createdAt.toISOString(),
              action: r.action,
              entityType: r.entityType,
              entityId: r.entityId,
              actorName: r.actor.name,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
