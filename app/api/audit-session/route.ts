import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canManageAuditMode, getActiveAuditSession } from "@/lib/audit-session";
import { logAudit } from "@/lib/audit-log";

 export const dynamic = "force-dynamic";

const startSchema = z.object({
  auditType: z.enum(["HACCP", "SanPiN", "Internal", "Certification"]),
  auditorName: z.string().optional(),
  auditorOrg: z.string().optional(),
  comment: z.string().optional(),
});

const closeSchema = z.object({
  comment: z.string().optional(),
});

export async function GET() {
  await requireUser();
  const session = await getActiveAuditSession();
  return NextResponse.json({ session });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!canManageAuditMode(user.role)) {
    return NextResponse.json({ error: "Нет прав для запуска проверки" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await getActiveAuditSession();
  if (existing) {
    return NextResponse.json(
      { error: "Проверка уже запущена", session: existing },
      { status: 409 },
    );
  }

  const created = await prisma.auditSession.create({
    data: {
      status: "active",
      auditType: parsed.data.auditType,
      auditorName: parsed.data.auditorName?.trim() ? parsed.data.auditorName.trim() : null,
      auditorOrg: parsed.data.auditorOrg?.trim() ? parsed.data.auditorOrg.trim() : null,
      initiatedByUserId: Number(user.id),
      comment: parsed.data.comment?.trim() ? parsed.data.comment.trim() : null,
    },
  });

  await logAudit({
    actorId: Number(user.id),
    action: "auditSession.start",
    entityType: "auditSession",
    entityId: created.id,
    auditSessionId: created.id,
    meta: {
      auditType: created.auditType,
      auditorOrg: created.auditorOrg,
      auditorName: created.auditorName,
    },
  });

  return NextResponse.json({ session: created });
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!canManageAuditMode(user.role)) {
    return NextResponse.json({ error: "Нет прав для завершения проверки" }, { status: 403 });
  }

  const active = await getActiveAuditSession();
  if (!active) {
    return NextResponse.json({ error: "Нет активной проверки" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = closeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updated = await prisma.auditSession.update({
    where: { id: active.id },
    data: {
      status: "closed",
      endedAt: new Date(),
      comment: parsed.data.comment?.trim() ? parsed.data.comment.trim() : active.comment,
    },
  });

  await logAudit({
    actorId: Number(user.id),
    action: "auditSession.close",
    entityType: "auditSession",
    entityId: updated.id,
    auditSessionId: updated.id,
  });

  return NextResponse.json({ session: updated });
}
