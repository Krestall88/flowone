import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// GET /api/notifications - Получить уведомления для текущего пользователя
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const userId = Number(user.id);
  const { searchParams } = new URL(req.url);
  
  const isRead = searchParams.get("isRead");
  const priority = searchParams.get("priority");

  const notifications = await (prisma as any).notification.findMany({
    where: {
      AND: [
        {
          OR: [
            { userId },
            { userId: null, targetRole: user.role },
            { userId: null, targetRole: null }, // Для всех
          ],
        },
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      ],
      ...(isRead !== null ? { isRead: isRead === "true" } : {}),
      ...(priority ? { priority } : {}),
    },
    orderBy: [
      { isRead: "asc" }, // Непрочитанные первыми
      { priority: "desc" }, // high -> medium -> low
      { createdAt: "desc" },
    ],
    take: 100,
  });

  return NextResponse.json(notifications);
}

// POST /api/notifications - Создать уведомление (только для director/head)
export async function POST(req: NextRequest) {
  const user = await requireUser();
  
  if (user.role !== "director" && user.role !== "head") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json();
  const {
    type,
    title,
    message,
    priority,
    entityType,
    entityId,
    userId: targetUserId,
    targetRole,
    expiresAt,
  } = body;

  if (!type || !title || !message) {
    return NextResponse.json(
      { error: "Обязательные поля: type, title, message" },
      { status: 400 }
    );
  }

  const notification = await (prisma as any).notification.create({
    data: {
      type,
      title,
      message,
      priority: priority || "medium",
      entityType,
      entityId: entityId ? Number(entityId) : null,
      userId: targetUserId ? Number(targetUserId) : null,
      targetRole,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json(notification, { status: 201 });
}
