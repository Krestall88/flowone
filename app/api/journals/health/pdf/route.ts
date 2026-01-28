import { NextRequest, NextResponse } from "next/server";
import { parseISO, startOfMonth, endOfMonth, getDaysInMonth, getDate } from "date-fns";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { renderHealthJournalPdf, MONTHS_RU, type EmployeeRow } from "./render";

 export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");

  // Определяем месяц по переданной дате (или текущий)
  let selectedDate = new Date();
  if (dateParam) {
    const parsed = parseISO(dateParam);
    if (!Number.isNaN(parsed.getTime())) {
      selectedDate = parsed;
    }
  }

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1; // 1-12
  const monthName = MONTHS_RU[month] ?? String(month);
  const daysInMonth = getDaysInMonth(selectedDate);

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  // Загружаем всех активных сотрудников
  const allEmployees = await prisma.employee.findMany({
    where: {
      active: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // Загружаем все записи журнала здоровья за месяц
  const checks = await prisma.healthCheck.findMany({
    where: {
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    include: {
      entries: true,
    },
  });

  // Группируем записи по employeeId и дню месяца
  // Берём последнюю запись за день, если их несколько
  const entriesMap = new Map<number, Record<number, string>>();

  for (const check of checks) {
    const dayOfMonth = getDate(check.date);

    for (const entry of check.entries) {
      const empId = entry.employeeId;

      if (!entriesMap.has(empId)) {
        entriesMap.set(empId, {});
      }

      const empDays = entriesMap.get(empId)!;
      empDays[dayOfMonth] = entry.status;
    }
  }

  // Формируем данные для PDF
  const employees: EmployeeRow[] = allEmployees.map((emp: typeof allEmployees[number]) => ({
    employeeId: emp.id,
    employeeName: emp.name,
    position: emp.position ?? "",
    days: entriesMap.get(emp.id) ?? {},
  }));

  const pdfBuffer = await renderHealthJournalPdf({
    organizationName: "", // Можно добавить настройку организации позже
    monthName,
    year,
    daysInMonth,
    employees,
  });

  const fileName = `health_journal_${year}_${String(month).padStart(2, "0")}.pdf`;

  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
  } catch (error) {
    console.error("[PDF] Health journal PDF generation error:", error);
    return NextResponse.json(
      { error: "Не удалось создать PDF" },
      { status: 500 }
    );
  }
}
