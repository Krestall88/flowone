import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isReadOnlyRole } from "@/lib/session";
import { logAuditAction } from "@/lib/audit-log";
import { formatDateISO, parseToUTCDate, getDayRangeUTC } from "@/lib/date-utils";

// POST /api/lab-tests/sign - Подписать лабораторные исследования за день
export async function POST(req: NextRequest) {
  const user = await requireUser();
  
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  const body = await req.json();
  const { date } = body;

  if (!date) {
    return NextResponse.json({ error: "Обязательное поле: date" }, { status: 400 });
  }

  const selectedDate = parseToUTCDate(date);
  const { start, end } = getDayRangeUTC(selectedDate);

  // Подписываем все неподписанные записи за день
  const result = await (prisma as any).labTest.updateMany({
    where: {
      date: { gte: start, lt: end },
      signedAt: null,
    },
    data: {
      signedAt: new Date(),
    },
  });

  // Логируем подписание
  await logAuditAction({
    userId: Number(user.id),
    action: "sign_labtests",
    entityType: "labtest",
    meta: { date: formatDateISO(selectedDate), count: result.count },
  });

  return NextResponse.json({ success: true, count: result.count });
}
