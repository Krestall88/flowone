import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { serializeDocumentContent } from "@/lib/document-content";
import { TASK_ACTIONS } from "@/lib/workflow";
import { sendTaskNotification } from "@/lib/telegram";

const stageActions = TASK_ACTIONS.length > 0 ? TASK_ACTIONS : ["approve", "sign", "review"];
const createSchema = z.object({
  title: z.string().min(3, "Минимум 3 символа"),
  body: z.string().min(10, "Опишите содержимое"),
  recipientId: z.number().int(),
  responsibleId: z.number().int().optional(),
  stages: z
    .array(
      z.object({
        assigneeId: z.number().int(),
        action: z.enum(stageActions as [string, ...string[]]),
        instruction: z.string().optional(),
        canSkip: z.boolean().optional(),
        commentRequired: z.boolean().optional(),
      }),
    )
    .min(1, "Добавьте хотя бы один этап"),
  watchers: z.array(z.number().int()).default([]),
  initiatorAcknowledged: z.boolean().default(false),
  returnToInitiator: z.boolean().default(false),
  executionAssignees: z.array(z.number().int()).default([]),
  executionNotes: z.string().optional(),
});

export async function GET() {
  const user = await requireUser();
  const userId = Number(user.id);
  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { authorId: userId },
        {
          tasks: {
            some: {
              assigneeId: userId,
            },
          },
        },
        {
          watchers: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    include: {
      author: { select: { name: true } },
      tasks: {
        include: { assignee: { select: { name: true, email: true, role: true } } },
        orderBy: { step: "asc" },
      },
      responsible: { select: { id: true, name: true } },
      watchers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      files: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const sessionUser = await requireUser();
  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const authorId = Number(sessionUser.id);
  const {
    title,
    body: contentBody,
    recipientId,
    responsibleId,
    stages,
    watchers,
    initiatorAcknowledged,
    returnToInitiator,
    executionAssignees,
    executionNotes,
  } = parsed.data;

  console.log("Creating document:", { 
    title, 
    recipientId, 
    responsibleId,
    stagesCount: stages.length,
    authorId, 
    sessionUserId: sessionUser.id,
    sessionUserEmail: sessionUser.email 
  });

  const recipientExists = await prisma.user.findUnique({ where: { id: recipientId } });
  console.log("Recipient check:", { recipientId, found: !!recipientExists });
  
  if (!recipientExists) {
    return NextResponse.json({ error: `Получатель не найден (ID: ${recipientId})` }, { status: 400 });
  }
  const stageAssigneeIds = stages.map((stage) => stage.assigneeId);
  const watcherIds = watchers ?? [];
  const executionIds = executionAssignees ?? [];
  const uniqueUserIds = Array.from(
    new Set([
      recipientId,
      ...(responsibleId ? [responsibleId] : []),
      ...stageAssigneeIds,
      ...watcherIds,
      ...executionIds,
    ]),
  );

  const existingUsers = await prisma.user.findMany({
    where: { id: { in: uniqueUserIds } },
    select: { id: true },
  });

  if (existingUsers.length !== uniqueUserIds.length) {
    const existingIds = new Set(existingUsers.map((user) => user.id));
    const missing = uniqueUserIds.filter((id) => !existingIds.has(id));
    return NextResponse.json(
      { error: `Не найдены пользователи: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  const content = serializeDocumentContent({ body: contentBody, recipientId });

  const result = await prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        title,
        body: contentBody,
        content,
        authorId,
        recipientId,
        responsibleId: responsibleId || null,
        status: "in_progress",
        currentStep: 1,
        initiatorAcknowledged,
        returnToInitiator,
        executionNotes: executionNotes ?? null,
      },
    });

    // Create initiator task (step 0)
    await tx.task.create({
      data: {
        documentId: document.id,
        step: 0,
        assigneeId: authorId,
        status: "approved",
        completedAt: new Date(),
      },
    });

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      await tx.task.create({
        data: {
          documentId: document.id,
          step: i + 1,
          assigneeId: stage.assigneeId,
          status: "pending",
          action: stage.action,
          instruction: stage.instruction ?? null,
          canSkip: stage.canSkip ?? false,
          commentRequired: stage.commentRequired ?? false,
          visibleAfterStep: Math.max(0, i),
        },
      });
    }

    const uniqueWatchers = Array.from(new Set(watcherIds.filter((id) => id && id !== authorId)));
    if (uniqueWatchers.length > 0) {
      await tx.documentWatcher.createMany({
        data: uniqueWatchers.map((userId) => ({
          documentId: document.id,
          userId,
        })),
      });
    }

    if (executionIds.length > 0) {
      await tx.executionAssignment.createMany({
        data: executionIds.map((assigneeId) => ({
          documentId: document.id,
          assigneeId,
          status: "pending",
        })),
        skipDuplicates: true,
      });
    }

    return document;
  });

  const documentWithRelations = await prisma.document.findUnique({
    where: { id: result.id },
    include: {
      author: { select: { name: true, email: true } },
      tasks: {
        include: { assignee: { select: { name: true, telegramId: true } } },
        orderBy: { step: "asc" },
      },
      watchers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      executionAssignments: {
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  const firstTask = documentWithRelations?.tasks.find((task) => task.step === 1);
  if (firstTask?.assignee) {
    await sendTaskNotification(
      firstTask.assignee,
      { id: result.id, title },
      { id: firstTask.id, step: firstTask.step },
    );
  }

  return NextResponse.json({ document: documentWithRelations });
}
