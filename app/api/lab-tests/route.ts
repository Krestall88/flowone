import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isReadOnlyRole } from "@/lib/session";
import { isAuditModeActive, auditModeLockedResponse } from "@/lib/audit-session";
import { logAuditAction } from "@/lib/audit-log";
import { formatDateISO, parseToUTCDate, getDayRangeUTC, todayUTC } from "@/lib/date-utils";

// GET /api/lab-tests - Получить список лабораторных исследований
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  
  const result = searchParams.get("result") || "";
  const testType = searchParams.get("testType") || "";
  const q = searchParams.get("q") || "";
  const dateParam = searchParams.get("date") || "";

  let dateFilter = {};
  if (dateParam) {
    const selectedDate = parseToUTCDate(dateParam);
    const { start, end } = getDayRangeUTC(selectedDate);
    dateFilter = { date: { gte: start, lt: end } };
  }

  const labTests = await (prisma as any).labTest.findMany({
    where: {
      ...(result ? { result } : {}),
      ...(testType ? { testType } : {}),
      ...(q ? {
        OR: [
          { supplier: { contains: q, mode: "insensitive" } },
          { batchNumber: { contains: q, mode: "insensitive" } },
          { testType: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
      ...dateFilter,
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
    orderBy: { date: "desc" },
    take: 200,
  });

  return NextResponse.json(labTests);
}

// POST /api/lab-tests - Создать новое лабораторное исследование
export async function POST(req: NextRequest) {
  const user = await requireUser();
  
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  const body = await req.json();
  const {
    date,
    testType,
    batchNumber,
    supplier,
    result,
    resultDetails,
    reportFileUrl,
    reportFileName,
    registryDocumentId,
  } = body;

  // Валидация
  if (!testType || !result) {
    return NextResponse.json(
      { error: "Обязательные поля: testType, result" },
      { status: 400 }
    );
  }

  // Проверка Audit Mode: можно заполнять только текущий день
  const auditModeActive = await isAuditModeActive();
  const selectedDate = date ? parseToUTCDate(date) : todayUTC();
  const today = todayUTC();
  
  if (auditModeActive && selectedDate < today) {
    return NextResponse.json(
      auditModeLockedResponse("В режиме проверки запрещено редактирование прошлых данных"),
      { status: 403 }
    );
  }

  const labTest = await (prisma as any).labTest.create({
    data: {
      date: selectedDate,
      testType,
      batchNumber,
      supplier,
      result,
      resultDetails,
      reportFileUrl,
      reportFileName,
      performedBy: user.name || user.email,
      registryDocumentId: registryDocumentId ? Number(registryDocumentId) : null,
    },
    include: {
      registryDocument: {
        select: { 
          id: true, 
          supplier: true,
          document: { select: { id: true, title: true } },
        },
      },
    },
  });

  // Если отклонение - автоматически создаём несоответствие
  if (result === "deviation") {
    const nonconformity = await (prisma as any).nonconformity.create({
      data: {
        title: `Отклонение в лабораторных исследованиях: ${testType}`,
        description: `Партия: ${batchNumber || "—"}\nПоставщик: ${supplier || "—"}\nДетали: ${resultDetails || "—"}`,
        severity: "critical",
        status: "open",
        createdById: Number(user.id),
      },
    });

    // Связываем LabTest с Nonconformity
    await (prisma as any).labTest.update({
      where: { id: labTest.id },
      data: { nonconformityId: nonconformity.id },
    });

    // Логируем создание несоответствия
    await logAuditAction({
      userId: Number(user.id),
      action: "auto_create_nonconformity_from_labtest",
      entityType: "nonconformity",
      entityId: nonconformity.id,
      meta: { labTestId: labTest.id, testType },
    });
  }

  // Логируем создание лабораторного исследования
  await logAuditAction({
    userId: Number(user.id),
    action: "create_labtest",
    entityType: "labtest",
    entityId: labTest.id,
    meta: { testType, result },
  });

  return NextResponse.json(labTest, { status: 201 });
}
