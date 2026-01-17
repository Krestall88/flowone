import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit-log";
import { isAuditModeActive, auditModeLockedResponse } from "@/lib/audit-session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const prismaAny = prisma as any;
  const user = await requireUser();
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Некорректный идентификатор" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action.trim() : "";

  if (action !== "close" && action !== "reopen") {
    return NextResponse.json({ error: "Некорректное действие" }, { status: 400 });
  }

  if (action === "reopen" && (await isAuditModeActive())) {
    return NextResponse.json(auditModeLockedResponse("В режиме проверки запрещено переоткрывать несоответствия"), {
      status: 403,
    });
  }

  const updated = await prismaAny.nonconformity.update({
    where: { id },
    data:
      action === "close"
        ? {
            status: "closed",
            closedAt: new Date(),
            closedById: Number(user.id),
          }
        : {
            status: "open",
            closedAt: null,
            closedById: null,
          },
  });

  await logAudit({
    actorId: Number(user.id),
    action: action === "close" ? "nonconformity.close" : "nonconformity.reopen",
    entityType: "nonconformity",
    entityId: updated.id,
  });

  return NextResponse.json({ item: updated });
}
