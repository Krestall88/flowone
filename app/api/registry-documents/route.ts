import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit-log";
import { auditModeLockedResponse, isAuditModeActive } from "@/lib/audit-session";

const createSchema = z.object({
  documentId: z.number().int(),
  objectType: z.string().min(1),
  zone: z.string().optional(),
  supplier: z.string().optional(),
  expiresAt: z.string().optional(), // YYYY-MM-DD
});

export async function POST(req: NextRequest) {
  const prismaAny = prisma as any;
  const sessionUser = await requireUser();
  if (isReadOnlyRole(sessionUser.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  if (await isAuditModeActive()) {
    return NextResponse.json(auditModeLockedResponse("В режиме проверки запрещено изменять реестр"), { status: 403 });
  }

  const userId = Number(sessionUser.id);

  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { documentId, objectType, zone, supplier, expiresAt } = parsed.data;

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

  const exists = await prismaAny.registryDocument.findUnique({
    where: { documentId },
    select: { id: true },
  });

  if (exists) {
    return NextResponse.json({ error: "Документ уже добавлен в реестр" }, { status: 409 });
  }

  const expiresAtValue = expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(expiresAt) ? new Date(`${expiresAt}T00:00:00.000Z`) : null;

  const registryDocument = await prismaAny.registryDocument.create({
    data: {
      documentId,
      objectType,
      zone: zone?.trim() ? zone.trim() : null,
      supplier: supplier?.trim() ? supplier.trim() : null,
      expiresAt: expiresAtValue,
    },
  });

  await logAudit({
    actorId: userId,
    action: "registryDocument.create",
    entityType: "registryDocument",
    entityId: registryDocument.documentId,
    meta: {
      registryId: registryDocument.id,
      objectType: registryDocument.objectType,
      expiresAt: registryDocument.expiresAt,
    },
  });

  return NextResponse.json({ registryDocument });
}
