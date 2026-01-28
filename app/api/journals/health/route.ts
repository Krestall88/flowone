import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { parseToUTCDate, todayUTC } from "@/lib/date-utils";
import { logAudit } from "@/lib/audit-log";
import { isAuditModeActive, auditModeLockedResponse } from "@/lib/audit-session";

export async function POST(req: NextRequest) {
  try {
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
    type Entry = { employeeId: number; status: string; note?: string | null };
    const entries: Entry[] = [];

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      rawDate = body?.date;
      documentId =
        typeof body?.documentId === "number"
          ? body.documentId
          : typeof body?.documentId === "string" && body.documentId.trim()
            ? Number(body.documentId)
            : null;

      const bodyEntries = Array.isArray(body?.entries) ? body.entries : [];
      for (const entry of bodyEntries) {
        const employeeId = Number(entry?.employeeId);
        const status = typeof entry?.status === "string" ? entry.status : "";
        const note = typeof entry?.note === "string" ? entry.note : null;

        if (!employeeId || Number.isNaN(employeeId) || !status) continue;
        entries.push({ employeeId, status, note });
      }
    } else {
      const formData = await req.formData();

      rawDate = formData.get("date");
      const rawDocumentId = formData.get("documentId");
      documentId =
        typeof rawDocumentId === "string" && rawDocumentId.trim()
          ? Number(rawDocumentId)
          : null;

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
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: "Нет данных для сохранения" }, { status: 400 });
    }

    // Нормализуем дату к UTC полночи, чтобы dev и prod видели одни записи
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

    // Ищем уже существующие записи журнала здоровья за этот день для текущего пользователя
    // Сравниваем по точному значению поля date, чтобы избежать погрешностей по времени.
    const existingChecks = await prisma.healthCheck.findMany({
      where: {
        userId: dbUser.id,
        date: day,
      },
      select: { id: true },
    });

    if ((await isAuditModeActive()) && existingChecks.length > 0) {
      return NextResponse.json(
        auditModeLockedResponse("В режиме проверки запрещено перезаписывать журнал здоровья за день"),
        { status: 403 },
      );
    }

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
    const createData: Prisma.HealthCheckCreateInput = {
      user: { connect: { id: dbUser.id } },
      date: day,
      signedAt: now,
      ...(documentId && !Number.isNaN(documentId)
        ? {
            document: {
              connect: { id: documentId },
            },
          }
        : {}),
      entries: {
        create: entries.map((e) => ({
          employee: { connect: { id: e.employeeId } },
          status: e.status,
          note: e.note ?? undefined,
        })),
      },
    };

    const created = await prisma.healthCheck.create({
      data: createData,
    });

    await logAudit({
      actorId: dbUser.id,
      action: "journal.health.sign",
      entityType: "healthCheck",
      entityId: created.id,
      meta: {
        date: day.toISOString(),
        entriesCount: entries.length,
        documentId: documentId && !Number.isNaN(documentId) ? documentId : null,
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
