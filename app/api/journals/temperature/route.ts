import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { parseToUTCDate, todayUTC } from "@/lib/date-utils";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireUser();
    if (!sessionUser.email) {
      return NextResponse.json(
        { error: "В сессии отсутствует email пользователя" },
        { status: 401 },
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: sessionUser.email },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "Пользователь не найден или удалён" },
        { status: 401 },
      );
    }

    const formData = await req.formData();

    const rawDate = formData.get("date");

    const entriesMap = new Map<
      number,
      { morning?: number | null; day?: number | null; evening?: number | null }
    >();

    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string" || !value) continue;
      const [field, idPart] = key.split("-");
      const equipmentId = Number(idPart);
      if (!equipmentId || Number.isNaN(equipmentId)) continue;

      const numeric = value === "" ? null : Number(value);
      if (numeric !== null && Number.isNaN(numeric)) continue;

      const current = entriesMap.get(equipmentId) ?? {};
      if (field === "morning") current.morning = numeric;
      if (field === "day") current.day = numeric;
      if (field === "evening") current.evening = numeric;
      entriesMap.set(equipmentId, current);
    }

    if (entriesMap.size === 0) {
      return NextResponse.json({ error: "Нет данных для сохранения" }, { status: 400 });
    }

    // Нормализуем дату к UTC полночи
    let day = todayUTC();
    if (typeof rawDate === "string" && rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      day = parseToUTCDate(rawDate);
    }

    const now = new Date();

    await prisma.$transaction(
      Array.from(entriesMap.entries()).map(([equipmentId, { morning, day: dayValue, evening }]) =>
        prisma.temperatureEntry.upsert({
          where: {
            equipmentId_date: {
              equipmentId,
              date: day,
            },
          },
          update: {
            morning: morning ?? undefined,
            day: dayValue ?? undefined,
            evening: evening ?? undefined,
            userId: dbUser.id,
            signedAt: now,
          },
          create: {
            equipmentId,
            date: day,
            morning: morning ?? undefined,
            day: dayValue ?? undefined,
            evening: evening ?? undefined,
            userId: dbUser.id,
            signedAt: now,
          },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Temperature journal save error:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка при сохранении журнала температур" },
      { status: 500 },
    );
  }
}
