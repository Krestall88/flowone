import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getActiveAuditSessionId } from "@/lib/audit-session";

type AuditLogInput = {
  actorId: number;
  action: string;
  entityType: string;
  entityId?: number | null;
  auditSessionId?: number | null;
  meta?: unknown;
};

export async function logAudit({ actorId, action, entityType, entityId, auditSessionId, meta }: AuditLogInput) {
  if (!Number.isFinite(actorId)) return;
  if (!action || !entityType) return;

  const activeSessionId =
    auditSessionId === undefined ? await getActiveAuditSessionId() : auditSessionId;

  await prisma.auditLog.create({
    data: {
      actorId,
      auditSessionId: activeSessionId,
      action,
      entityType,
      entityId: entityId ?? null,
      meta:
        meta === undefined
          ? undefined
          : meta === null
            ? Prisma.JsonNull
            : (meta as Prisma.InputJsonValue),
    },
  });
}

export function canViewAuditLog(role: string | null | undefined) {
  return role === "director" || role === "head" || role === "auditor" || role === "technologist";
}

// Алиас для более удобного использования
export async function logAuditAction({
  userId,
  action,
  entityType,
  entityId,
  meta,
}: {
  userId: number;
  action: string;
  entityType: string;
  entityId?: number | null;
  meta?: unknown;
}) {
  return logAudit({
    actorId: userId,
    action,
    entityType,
    entityId,
    meta,
  });
}
