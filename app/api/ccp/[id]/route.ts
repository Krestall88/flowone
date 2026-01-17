import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isReadOnlyRole } from "@/lib/session";
import { isAuditModeActive, auditModeLockedResponse } from "@/lib/audit-session";
import { logAuditAction } from "@/lib/audit-log";

// GET /api/ccp/[id] - Получить детали CCP
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await requireUser();
  const ccpId = Number(params.id);

  const ccp = await prisma.cCP.findUnique({
    where: { id: ccpId },
    include: {
      relatedDocument: {
        select: { id: true, title: true },
      },
      relatedNonconformity: {
        select: { id: true, title: true, status: true },
      },
      actions: {
        orderBy: { takenAt: "desc" },
      },
    },
  });

  if (!ccp) {
    return NextResponse.json({ error: "CCP не найден" }, { status: 404 });
  }

  return NextResponse.json(ccp);
}

// PUT /api/ccp/[id] - Обновить CCP
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  const ccpId = Number(params.id);
  const body = await req.json();

  const {
    process,
    hazard,
    riskLevel,
    controlMeasures,
    correctiveActions,
    criticalLimits,
    monitoringProcedure,
    responsiblePerson,
    status,
    relatedDocumentId,
    relatedNonconformityId,
  } = body;

  const ccp = await prisma.cCP.update({
    where: { id: ccpId },
    data: {
      ...(process && { process }),
      ...(hazard && { hazard }),
      ...(riskLevel && { riskLevel }),
      ...(controlMeasures && { controlMeasures }),
      ...(correctiveActions && { correctiveActions }),
      ...(criticalLimits !== undefined && { criticalLimits }),
      ...(monitoringProcedure !== undefined && { monitoringProcedure }),
      ...(responsiblePerson !== undefined && { responsiblePerson }),
      ...(status && { status }),
      ...(relatedDocumentId !== undefined && { 
        relatedDocumentId: relatedDocumentId ? Number(relatedDocumentId) : null 
      }),
      ...(relatedNonconformityId !== undefined && { 
        relatedNonconformityId: relatedNonconformityId ? Number(relatedNonconformityId) : null 
      }),
    },
    include: {
      relatedDocument: {
        select: { id: true, title: true },
      },
      relatedNonconformity: {
        select: { id: true, title: true },
      },
    },
  });

  // Логируем обновление
  await logAuditAction({
    userId: Number(user.id),
    action: "update_ccp",
    entityType: "ccp",
    entityId: ccp.id,
    meta: { changes: body },
  });

  return NextResponse.json(ccp);
}

// DELETE /api/ccp/[id] - Удалить CCP (только для director/head)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  
  if (user.role !== "director" && user.role !== "head") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const ccpId = Number(params.id);

  await prisma.cCP.delete({
    where: { id: ccpId },
  });

  // Логируем удаление
  await logAuditAction({
    userId: Number(user.id),
    action: "delete_ccp",
    entityType: "ccp",
    entityId: ccpId,
  });

  return NextResponse.json({ success: true });
}
