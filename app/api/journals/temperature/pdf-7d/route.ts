import { NextRequest, NextResponse } from "next/server";
import { parseISO, subDays, startOfDay, endOfDay, format, addDays } from "date-fns";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { renderTemperatureJournal7dPdf, type EquipmentRow7d } from "./render";

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

  const allEquipment = await prisma.equipment.findMany({
    include: { location: true },
    orderBy: [{ location: { name: "asc" } }, { name: "asc" }],
  });

  const entries = await prisma.temperatureEntry.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
  });

  const entriesMap = new Map<number, Record<string, { morning: number | null; evening: number | null }>>();

  for (const entry of entries) {
    const eqId = entry.equipmentId;
    const dayKey = format(entry.date, "yyyy-MM-dd");

    if (!entriesMap.has(eqId)) {
      entriesMap.set(eqId, {});
    }

    const eqDays = entriesMap.get(eqId)!;
    eqDays[dayKey] = {
      morning: entry.morning,
      evening: entry.evening,
    };
  }

  const equipment: EquipmentRow7d[] = allEquipment.map((eq: typeof allEquipment[number]) => ({
    locationName: eq.location.name,
    equipmentName: eq.name,
    days: entriesMap.get(eq.id) ?? {},
  }));

  const periodLabel = `Период: ${format(start, "dd.MM.yyyy")} — ${format(end, "dd.MM.yyyy")} (7 дней)`;

  const pdfBuffer = await renderTemperatureJournal7dPdf({
    organizationName: "",
    periodLabel,
    dates,
    equipment,
  });

  const fileName = `temperature_journal_7d_${format(endDate, "yyyy_MM_dd")}.pdf`;

  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
