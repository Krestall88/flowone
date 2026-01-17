import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit-log";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }
  const userId = Number(user.id);
  const documentId = Number(params.id);

  if (!Number.isFinite(userId) || !Number.isFinite(documentId)) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      watchers: true,
      tasks: true,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
  }

  const isWatcher = document.watchers.some((w) => w.userId === userId);
  const isResponsible = document.responsibleId === userId;
  const isAuthor = document.authorId === userId;
  const isRecipient = document.recipientId === userId;
  const hasAccess =
    isAuthor ||
    isRecipient ||
    isResponsible ||
    isWatcher ||
    document.tasks.some((t) => t.assigneeId === userId);

  if (!hasAccess) {
    return NextResponse.json({ error: "Нет доступа к документу" }, { status: 403 });
  }

  await logAudit({
    actorId: userId,
    action: "document.acknowledge",
    entityType: "document",
    entityId: documentId,
  });

  return NextResponse.json({ success: true });
}
