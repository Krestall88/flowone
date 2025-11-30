import { NextRequest, NextResponse } from "next/server";
import { parseISO, startOfToday } from "date-fns";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

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

    type Entry = { employeeId: number; status: string; note?: string | null };
    const entries: Entry[] = [];

    const byEmployee = new Map<number, Entry>();

    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string" || !value) continue;
      const [field, idPart] = key.split("-");
      const employeeId = Number(idPart);
      if (!employeeId || Number.isNaN(employeeId)) continue;

      const current = byEmployee.get(employeeId) ?? { employeeId, status: "" };

      if (field === "status") {
        current.status = value;
      }
      if (field === "note") {
        current.note = value || null;
      }

      byEmployee.set(employeeId, current);
    }

    for (const entry of byEmployee.values()) {
      if (!entry.status) continue;
      entries.push(entry);
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: "Нет данных для сохранения" }, { status: 400 });
    }

    let day = startOfToday();
    if (typeof rawDate === "string") {
      const parsed = parseISO(rawDate);
      if (!Number.isNaN(parsed.getTime())) {
        day = parsed;
      }
    }

    const now = new Date();

    // Ищем уже существующие записи журнала здоровья за этот день для текущего пользователя
    // Сравниваем по точному значению поля date, чтобы избежать погрешностей по времени.
    const existingChecks = await prisma.healthCheck.findMany({
      where: {
        userId: dbUser.id,
        date: day,
      },
      select: { id: true },
    });

    if (existingChecks.length > 0) {
      const checkIds = existingChecks.map((check) => check.id);

      // Удаляем все старые записи сотрудников за день
      await prisma.healthCheckEmployee.deleteMany({
        where: {
          checkId: { in: checkIds },
        },
      });

      // Удаляем сами записи журнала, чтобы гарантировать одну запись на день
      await prisma.healthCheck.deleteMany({
        where: {
          id: { in: checkIds },
        },
      });
    }

    // Создаём свежую запись журнала здоровья за день
    await prisma.healthCheck.create({
      data: {
        userId: dbUser.id,
        date: day,
        signedAt: now,
        entries: {
          create: entries.map((e) => ({
            employeeId: e.employeeId,
            status: e.status,
            note: e.note ?? undefined,
          })),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Health journal save error:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка при сохранении журнала здоровья" },
      { status: 500 },
    );
  }
}
