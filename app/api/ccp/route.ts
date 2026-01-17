import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isReadOnlyRole } from "@/lib/session";
import { isAuditModeActive, auditModeLockedResponse } from "@/lib/audit-session";
import { logAuditAction } from "@/lib/audit-log";

// GET /api/ccp - Получить список всех CCP с фильтрами
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  
  const riskLevel = searchParams.get("riskLevel") || "";
  const status = searchParams.get("status") || "";
  const q = searchParams.get("q") || "";

  const ccps = await prisma.cCP.findMany({
    where: {
      ...(riskLevel ? { riskLevel } : {}),
      ...(status ? { status } : {}),
      ...(q ? {
        OR: [
          { process: { contains: q, mode: "insensitive" } },
          { hazard: { contains: q, mode: "insensitive" } },
          { controlMeasures: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: {
      relatedDocument: {
        select: { id: true, title: true },
      },
      relatedNonconformity: {
        select: { id: true, title: true },
      },
      actions: {
        orderBy: { takenAt: "desc" },
        take: 5,
      },
    },
    orderBy: [
      { riskLevel: "desc" }, // high -> medium -> low
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json(ccps);
}

// POST /api/ccp - Создать новый CCP
export async function POST(req: NextRequest) {
  const user = await requireUser();
  
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  // Проверка Audit Mode (можно создавать CCP в любое время, но логируем)
  const auditModeActive = await isAuditModeActive();

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
    relatedDocumentId,
    relatedNonconformityId,
  } = body;

  // Валидация обязательных полей
  if (!process || !hazard || !controlMeasures || !correctiveActions) {
    return NextResponse.json(
      { error: "Обязательные поля: process, hazard, controlMeasures, correctiveActions" },
      { status: 400 }
    );
  }

  const ccp = await prisma.cCP.create({
    data: {
      process,
      hazard,
      riskLevel: riskLevel || "medium",
      controlMeasures,
      correctiveActions,
      criticalLimits,
      monitoringProcedure,
      responsiblePerson,
      relatedDocumentId: relatedDocumentId ? Number(relatedDocumentId) : null,
      relatedNonconformityId: relatedNonconformityId ? Number(relatedNonconformityId) : null,
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

  // Логируем создание CCP
  await logAuditAction({
    userId: Number(user.id),
    action: "create_ccp",
    entityType: "ccp",
    entityId: ccp.id,
    meta: { process: ccp.process, riskLevel: ccp.riskLevel },
  });

  return NextResponse.json(ccp, { status: 201 });
}
