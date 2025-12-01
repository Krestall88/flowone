import { NextRequest, NextResponse } from "next/server";
import { parseISO, startOfMonth, endOfMonth, getDaysInMonth, getDate } from "date-fns";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { renderTemperatureJournalPdf, MONTHS_RU, type EquipmentRow } from "./render";

export async function GET(req: NextRequest) {
  await requireUser();

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

  // Загружаем всё оборудование с локациями
  const allEquipment = await prisma.equipment.findMany({
    include: {
      location: true,
    },
    orderBy: [
      { location: { name: "asc" } },
      { name: "asc" },
    ],
  });

  // Загружаем все записи температур за месяц
  const entries = await prisma.temperatureEntry.findMany({
    where: {
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
  });

  // Группируем записи по equipmentId и дню месяца
  const entriesMap = new Map<number, Record<number, { morning: number | null; evening: number | null }>>();

  for (const entry of entries) {
    const eqId = entry.equipmentId;
    const dayOfMonth = getDate(entry.date);

    if (!entriesMap.has(eqId)) {
      entriesMap.set(eqId, {});
    }

    const eqDays = entriesMap.get(eqId)!;
    eqDays[dayOfMonth] = {
      morning: entry.morning,
      evening: entry.evening,
    };
  }

  // Формируем данные для PDF
  const equipment: EquipmentRow[] = allEquipment.map((eq: typeof allEquipment[number]) => ({
    locationName: eq.location.name,
    equipmentName: eq.name,
    days: entriesMap.get(eq.id) ?? {},
  }));

  const pdfBuffer = await renderTemperatureJournalPdf({
    organizationName: "", // Можно добавить настройку организации позже
    monthName,
    year,
    daysInMonth,
    equipment,
  });

  const fileName = `temperature_journal_${year}_${String(month).padStart(2, "0")}.pdf`;

  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
