import { prisma } from "@/lib/prisma";

export type AuditSessionStatus = "active" | "closed";
export type AuditType = "HACCP" | "SanPiN" | "Internal" | "Certification";

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  HACCP: "HACCP",
  SanPiN: "СанПиН",
  Internal: "Внутренняя",
  Certification: "Сертификация",
};

export function canManageAuditMode(role: string | null | undefined) {
  return role === "director" || role === "head";
}

export async function getActiveAuditSession() {
  const session = await prisma.auditSession.findFirst({
    where: { status: "active" },
    orderBy: { startedAt: "desc" },
  });
  return session;
}

export async function getActiveAuditSessionId() {
  const session = await getActiveAuditSession();
  return session?.id ?? null;
}

export async function isAuditModeActive() {
  const id = await getActiveAuditSessionId();
  return Boolean(id);
}

export async function assertAuditModeLock(message?: string) {
  const active = await isAuditModeActive();
  if (!active) return;
  const err = new Error(message ?? "Действие запрещено в режиме проверки");
  (err as any).code = "audit_mode_lock";
  throw err;
}

export function auditModeLockedResponse(message?: string) {
  return {
    error: message ?? "Действие запрещено в режиме проверки",
    reason: "audit_mode_lock" as const,
  };
}
