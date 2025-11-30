import { NextRequest, NextResponse } from "next/server";
import { format, parseISO, startOfToday } from "date-fns";
import { ru } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { renderHealthJournalPdf } from "./render";

export async function GET(req: NextRequest) {
  const user = await requireUser();

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");

  const today = startOfToday();
  let selectedDate = today;
  if (dateParam) {
    const parsed = parseISO(dateParam);
    if (!Number.isNaN(parsed.getTime())) {
      selectedDate = parsed;
    }
  }

  const isoDate = format(selectedDate, "yyyy-MM-dd");
  const humanDate = format(selectedDate, "d MMMM yyyy", { locale: ru });

  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);

  const checks = await prisma.healthCheck.findMany({
    where: {
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    include: {
      entries: {
        include: {
          employee: true,
        },
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const allEntries = checks.flatMap((check) =>
    check.entries.map((entry) => ({
      employeeId: entry.employeeId,
      employeeName: entry.employee.name,
      status: entry.status,
      note: entry.note ?? null,
    })),
  );

  const latestByEmployee = new Map<
    number,
    {
      employeeId: number;
      employeeName: string;
      status: string;
      note: string | null;
    }
  >();

  for (const entry of allEntries) {
    latestByEmployee.set(entry.employeeId, entry);
  }

  const employees = Array.from(latestByEmployee.values()).sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName, "ru"),
  );

  const statusCounts = employees.reduce(
    (acc, entry) => {
      acc[entry.status] = (acc[entry.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const pdfBuffer = await renderHealthJournalPdf({
    userName: user.name ?? null,
    humanDate,
    employees,
    statusCounts,
  });

  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="health_journal_${isoDate}.pdf"`,
    },
  });
}
