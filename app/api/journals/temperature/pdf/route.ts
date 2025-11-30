import { NextRequest, NextResponse } from "next/server";
import { format, parseISO, startOfToday } from "date-fns";
import { ru } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { renderTemperatureJournalPdf } from "./render";

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

  const entries = await prisma.temperatureEntry.findMany({
    where: {
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    include: {
      equipment: {
        include: {
          location: true,
        },
      },
    },
    orderBy: {
      equipmentId: "asc",
    },
  });

  const grouped = entries.reduce(
    (acc, entry) => {
      const locId = entry.equipment.locationId;
      const locName = entry.equipment.location.name;
      const key = String(locId);

      if (!acc[key]) {
        acc[key] = {
          id: locId,
          name: locName,
          items: [] as {
            equipmentName: string;
            targetTemp: number;
            tolerance: number;
            morning: number | null;
            day: number | null;
            evening: number | null;
          }[],
        };
      }

      acc[key].items.push({
        equipmentName: entry.equipment.name,
        targetTemp: entry.equipment.targetTemp,
        tolerance: entry.equipment.tolerance,
        morning: entry.morning,
        day: entry.day,
        evening: entry.evening,
      });

      return acc;
    },
    {} as Record<
      string,
      {
        id: number;
        name: string;
        items: {
          equipmentName: string;
          targetTemp: number;
          tolerance: number;
          morning: number | null;
          day: number | null;
          evening: number | null;
        }[];
      }
    >,
  );

  const locations = Object.values(grouped);

  const pdfBuffer = await renderTemperatureJournalPdf({
    userName: user.name ?? null,
    humanDate,
    locations,
  });

  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="temperature_journal_${isoDate}.pdf"`,
    },
  });
}
