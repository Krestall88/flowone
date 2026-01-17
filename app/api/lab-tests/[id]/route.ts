import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isReadOnlyRole } from "@/lib/session";
import { isAuditModeActive, auditModeLockedResponse } from "@/lib/audit-session";
import { logAuditAction } from "@/lib/audit-log";

// GET /api/lab-tests/[id] - Получить детали лабораторного исследования
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await requireUser();
  const labTestId = Number(params.id);

  const labTest = await (prisma as any).labTest.findUnique({
    where: { id: labTestId },
    include: {
      registryDocument: {
        select: { 
          id: true, 
          supplier: true,
          zone: true,
          document: { select: { id: true, title: true } },
        },
      },
      nonconformity: {
        select: { id: true, title: true, status: true, severity: true },
      },
    },
  });

  if (!labTest) {
    return NextResponse.json({ error: "Лабораторное исследование не найдено" }, { status: 404 });
  }

  return NextResponse.json(labTest);
}

// PUT /api/lab-tests/[id] - Обновить лабораторное исследование
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  const labTestId = Number(params.id);
  const body = await req.json();

  // Проверка Audit Mode: нельзя редактировать подписанные записи
  const existingLabTest = await (prisma as any).labTest.findUnique({
    where: { id: labTestId },
  });

  if (!existingLabTest) {
    return NextResponse.json({ error: "Лабораторное исследование не найдено" }, { status: 404 });
  }

  const auditModeActive = await isAuditModeActive();
  if (auditModeActive && existingLabTest.signedAt) {
    return NextResponse.json(
      auditModeLockedResponse("В режиме проверки запрещено редактирование подписанных записей"),
      { status: 403 }
    );
  }

  const {
    testType,
    batchNumber,
    supplier,
    result,
    resultDetails,
    reportFileUrl,
    reportFileName,
    signedAt,
  } = body;

  const labTest = await (prisma as any).labTest.update({
    where: { id: labTestId },
    data: {
      ...(testType && { testType }),
      ...(batchNumber !== undefined && { batchNumber }),
      ...(supplier !== undefined && { supplier }),
      ...(result && { result }),
      ...(resultDetails !== undefined && { resultDetails }),
      ...(reportFileUrl !== undefined && { reportFileUrl }),
      ...(reportFileName !== undefined && { reportFileName }),
      ...(signedAt !== undefined && { signedAt: signedAt ? new Date(signedAt) : null }),
    },
    include: {
      registryDocument: {
        select: { 
          id: true, 
          supplier: true,
          document: { select: { id: true, title: true } },
        },
      },
      nonconformity: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  // Логируем обновление
  await logAuditAction({
    userId: Number(user.id),
    action: "update_labtest",
    entityType: "labtest",
    entityId: labTest.id,
    meta: { changes: body },
  });

  return NextResponse.json(labTest);
}

// DELETE /api/lab-tests/[id] - Удалить лабораторное исследование
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  
  if (user.role !== "director" && user.role !== "head") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const labTestId = Number(params.id);

  await (prisma as any).labTest.delete({
    where: { id: labTestId },
  });

  // Логируем удаление
  await logAuditAction({
    userId: Number(user.id),
    action: "delete_labtest",
    entityType: "labtest",
    entityId: labTestId,
  });

  return NextResponse.json({ success: true });
}
