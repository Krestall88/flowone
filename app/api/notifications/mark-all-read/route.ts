import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// POST /api/notifications/mark-all-read - Отметить все уведомления как прочитанные
export async function POST(req: NextRequest) {
  const user = await requireUser();
  const userId = Number(user.id);

  const result = await (prisma as any).notification.updateMany({
    where: {
      OR: [
        { userId },
        { userId: null, targetRole: user.role },
      ],
      isRead: false,
    },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true, count: result.count });
}
