import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const assignSchema = z.object({
  assignments: z
    .array(
      z.object({
        assigneeId: z.number().int(),
        deadline: z.string().datetime().optional(),
        comment: z.string().optional(),
      }),
    )
    .min(1, "Укажите хотя бы одного исполнителя"),
  notes: z.string().optional(),
});

const statusSchema = z.object({
  assignmentId: z.number().int(),
  status: z.enum(["viewed", "in_progress", "completed"]),
  comment: z.string().optional(),
});

const EXECUTION_FLOW: Record<string, string[]> = {
  pending: ["viewed", "in_progress", "completed"],
  viewed: ["in_progress", "completed"],
  in_progress: ["completed"],
  completed: [],
};

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const documentId = Number(params.id);

  if (!Number.isFinite(documentId)) {
    return NextResponse.json({ error: "Неверный документ" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = assignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { assignments, notes } = parsed.data;
  const userId = Number(user.id);

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { executionAssignments: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
  }

  const canManage = document.authorId === userId || document.responsibleId === userId || user.role === "director";

  if (!canManage) {
    return NextResponse.json({ error: "Нет прав для назначения исполнителей" }, { status: 403 });
  }

  if (!assignments.length) {
    return NextResponse.json({ error: "Нужен хотя бы один исполнитель" }, { status: 400 });
  }

  const assigneeIds = assignments.map((item) => item.assigneeId);
  const existingUsers = await prisma.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true },
  });

  if (existingUsers.length !== assignments.length) {
    const existingSet = new Set(existingUsers.map((item) => item.id));
    const missing = assignments.filter((item) => !existingSet.has(item.assigneeId)).map((item) => item.assigneeId);
    return NextResponse.json({ error: `Не найдены пользователи: ${missing.join(", ")}` }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      assignments.map((assignment) =>
        tx.executionAssignment.upsert({
          where: {
            documentId_assigneeId: {
              documentId,
              assigneeId: assignment.assigneeId,
            },
          },
          create: {
            documentId,
            assigneeId: assignment.assigneeId,
            deadline: assignment.deadline ? new Date(assignment.deadline) : null,
            comment: assignment.comment ?? null,
            status: "pending",
          },
          update: {
            deadline: assignment.deadline ? new Date(assignment.deadline) : null,
            comment: assignment.comment ?? null,
          },
        }),
      ),
    );

    await tx.executionAssignment.deleteMany({
      where: {
        documentId,
        assigneeId: { notIn: assigneeIds },
      },
    });

    await tx.document.update({
      where: { id: documentId },
      data: {
        status: "in_execution",
        executionNotes: notes ?? document.executionNotes,
      },
    });
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const documentId = Number(params.id);

  if (!Number.isFinite(documentId)) {
    return NextResponse.json({ error: "Неверный документ" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { assignmentId, status, comment } = parsed.data;
  const userId = Number(user.id);

  const assignment = await prisma.executionAssignment.findUnique({
    where: { id: assignmentId },
    include: { document: true },
  });

  if (!assignment || assignment.documentId !== documentId) {
    return NextResponse.json({ error: "Исполнитель не найден" }, { status: 404 });
  }

  if (assignment.assigneeId !== userId) {
    return NextResponse.json({ error: "Нет доступа к этой задаче" }, { status: 403 });
  }

  const allowed = EXECUTION_FLOW[assignment.status] ?? [];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Недопустимый переход статуса" }, { status: 400 });
  }

  await prisma.executionAssignment.update({
    where: { id: assignmentId },
    data: {
      status,
      comment: comment ?? assignment.comment,
    },
  });

  if (status === "completed") {
    const remain = await prisma.executionAssignment.count({
      where: {
        documentId,
        status: { not: "completed" },
      },
    });

    if (remain === 0) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "executed" },
      });
    }
  }

  return NextResponse.json({ success: true });
}
