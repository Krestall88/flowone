import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// POST /api/notifications/[id]/read - Отметить уведомление как прочитанное
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  const notificationId = Number(params.id);

  const notification = await (prisma as any).notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return NextResponse.json(notification);
}
