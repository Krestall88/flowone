import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { parseToUTCDate, todayUTC } from "@/lib/date-utils";
import { logAudit } from "@/lib/audit-log";
import { isAuditModeActive, auditModeLockedResponse } from "@/lib/audit-session";

export async function POST(req: NextRequest) {
  try {
    const prismaAny = prisma as any;
    const sessionUser = await requireUser();
    if (isReadOnlyRole(sessionUser.role)) {
      return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
    }
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

    const contentType = req.headers.get("content-type") ?? "";

    let rawDate: unknown;
    let documentId: number | null = null;
    const entriesMap = new Map<
      number,
      { morning?: number | null; day?: number | null; evening?: number | null }
    >();

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      rawDate = body?.date;
      documentId =
        typeof body?.documentId === "number"
          ? body.documentId
          : typeof body?.documentId === "string" && body.documentId.trim()
            ? Number(body.documentId)
            : null;

      const entries = Array.isArray(body?.entries) ? body.entries : [];
      for (const entry of entries) {
        const equipmentId = Number(entry?.equipmentId);
        if (!equipmentId || Number.isNaN(equipmentId)) continue;

        const current = entriesMap.get(equipmentId) ?? {};

        const morning = entry?.morning;
        const dayValue = entry?.day;
        const evening = entry?.evening;

        if (morning !== undefined) {
          const num = morning === null ? null : Number(morning);
          if (num === null || !Number.isNaN(num)) current.morning = num;
        }
        if (dayValue !== undefined) {
          const num = dayValue === null ? null : Number(dayValue);
          if (num === null || !Number.isNaN(num)) current.day = num;
        }
        if (evening !== undefined) {
          const num = evening === null ? null : Number(evening);
          if (num === null || !Number.isNaN(num)) current.evening = num;
        }

        entriesMap.set(equipmentId, current);
      }
    } else {
      const formData = await req.formData();

      rawDate = formData.get("date");
      const rawDocumentId = formData.get("documentId");
      documentId =
        typeof rawDocumentId === "string" && rawDocumentId.trim()
          ? Number(rawDocumentId)
          : null;

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
    }

    if (entriesMap.size === 0) {
      return NextResponse.json({ error: "Нет данных для сохранения" }, { status: 400 });
    }

    // Нормализуем дату к UTC полночи
    let day = todayUTC();
    if (typeof rawDate === "string" && rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      day = parseToUTCDate(rawDate);
    }

    const today = todayUTC();
    if (day.getTime() !== today.getTime()) {
      return NextResponse.json(
        { error: "Запись журнала разрешена только за текущий день" },
        { status: 403 },
      );
    }

    const now = new Date();

    if (await isAuditModeActive()) {
      const equipmentIds = Array.from(entriesMap.keys());
      const existing = await prismaAny.temperatureEntry.findFirst({
        where: {
          date: day,
          equipmentId: { in: equipmentIds },
        },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json(
          auditModeLockedResponse("В режиме проверки запрещено перезаписывать журнал температур за день"),
          { status: 403 },
        );
      }
    }

    await prismaAny.$transaction(
      Array.from(entriesMap.entries()).map(([equipmentId, { morning, day: dayValue, evening }]) =>
        prismaAny.temperatureEntry.upsert({
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
            documentId: documentId && !Number.isNaN(documentId) ? documentId : undefined,
          },
          create: {
            equipmentId,
            date: day,
            morning: morning ?? undefined,
            day: dayValue ?? undefined,
            evening: evening ?? undefined,
            userId: dbUser.id,
            signedAt: now,
            documentId: documentId && !Number.isNaN(documentId) ? documentId : undefined,
          },
        }),
      ),
    );

    await logAudit({
      actorId: dbUser.id,
      action: "journal.temperature.sign",
      entityType: "temperatureEntry",
      meta: {
        date: day.toISOString(),
        entriesCount: entriesMap.size,
        documentId: documentId && !Number.isNaN(documentId) ? documentId : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Temperature journal save error:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка при сохранении журнала температур" },
      { status: 500 },
    );
  }
}
