import { NextRequest, NextResponse } from "next/server";
import { parseISO, subDays, startOfDay, endOfDay, format, addDays } from "date-fns";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { renderHealthJournal7dPdf, type EmployeeRow7d } from "./render";

export async function GET(req: NextRequest) {
  await requireUser();

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");

  let endDate = new Date();
  if (dateParam) {
    const parsed = parseISO(dateParam);
    if (!Number.isNaN(parsed.getTime())) {
      endDate = parsed;
    }
  }

  const end = endOfDay(endDate);
  const start = startOfDay(subDays(endDate, 6));
  const dates: Date[] = Array.from({ length: 7 }, (_, i) => startOfDay(addDays(start, i)));

  const allEmployees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const checks = await prisma.healthCheck.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
    include: { entries: true },
  });

  const entriesMap = new Map<number, Record<string, string>>();

  for (const check of checks) {
    const dayKey = format(check.date, "yyyy-MM-dd");

    for (const entry of check.entries) {
      const empId = entry.employeeId;

      if (!entriesMap.has(empId)) {
        entriesMap.set(empId, {});
      }

      const empDays = entriesMap.get(empId)!;
      empDays[dayKey] = entry.status;
    }
  }

  const employees: EmployeeRow7d[] = allEmployees.map((emp: typeof allEmployees[number]) => ({
    employeeId: emp.id,
    employeeName: emp.name,
    position: emp.position ?? "",
    days: entriesMap.get(emp.id) ?? {},
  }));

  const periodLabel = `Период: ${format(start, "dd.MM.yyyy")} — ${format(end, "dd.MM.yyyy")} (7 дней)`;

  const pdfBuffer = await renderHealthJournal7dPdf({
    organizationName: "",
    periodLabel,
    dates,
    employees,
  });

  const fileName = `health_journal_7d_${format(endDate, "yyyy_MM_dd")}.pdf`;

  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
