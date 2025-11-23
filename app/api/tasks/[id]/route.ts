import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { sendTaskNotification, sendDocumentStatusUpdate } from "@/lib/telegram";

type Decision = "complete" | "reject" | "skip";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    const userId = Number(user.id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Некорректный пользователь" }, { status: 400 });
    }

    const taskId = Number(params.id);

    if (!Number.isFinite(taskId)) {
      return NextResponse.json({ error: "Неверный ID задачи" }, { status: 400 });
    }

    const body = await req.json();
    const decision: Decision = body.decision;
    const comment: string = typeof body.comment === "string" ? body.comment : "";

    if (!decision || !["complete", "reject", "skip"].includes(decision)) {
      return NextResponse.json({ error: "Неверное действие" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        document: {
          include: {
            author: true,
            tasks: {
              include: { assignee: true },
              orderBy: { step: "asc" },
            },
          },
        },
        assignee: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
    }

    if (task.assigneeId !== userId) {
      return NextResponse.json({ error: "Вы не назначены на эту задачу" }, { status: 403 });
    }

    if (task.document.currentStep !== task.step) {
      return NextResponse.json({ error: "Эта задача ещё недоступна" }, { status: 403 });
    }

    if (task.status !== "pending") {
      return NextResponse.json({ error: "Задача уже обработана" }, { status: 400 });
    }

    if (decision === "skip" && !task.canSkip) {
      return NextResponse.json({ error: "Этот этап нельзя пропустить" }, { status: 400 });
    }

    if (decision === "complete" && task.commentRequired && !comment.trim()) {
      return NextResponse.json({ error: "Комментарий обязателен" }, { status: 400 });
    }

    const sortedTasks = [...task.document.tasks].sort((a, b) => a.step - b.step);
    const currentIndex = sortedTasks.findIndex((item) => item.id === task.id);
    const nextTask = sortedTasks.slice(currentIndex + 1).find((item) => item.status === "pending");

    const statusByDecision: Record<Decision, string> = {
      complete: "approved",
      reject: "rejected",
      skip: "skipped",
    };

    let nextAssignee: typeof task.assignee | null = null;
    let nextTaskInfo: { id: number; step: number } | null = null;
    let notifyAuthor: { status: "approved" | "rejected"; comment?: string | null } | null = null;

    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: {
          status: statusByDecision[decision],
          comment: comment || null,
          completedAt: new Date(),
        },
      });

      if (decision === "reject") {
        await tx.document.update({
          where: { id: task.documentId },
          data: { status: "rejected" },
        });
        notifyAuthor = { status: "rejected", comment };
        return;
      }

      if (!nextTask) {
        await tx.document.update({
          where: { id: task.documentId },
          data: {
            status: decision === "complete" ? "approved" : task.document.status,
            currentStep: task.step + 1,
          },
        });
        if (decision === "complete") {
          notifyAuthor = { status: "approved" };
        }
        return;
      }

      if (decision === "complete" || decision === "skip") {
        await tx.document.update({
          where: { id: task.documentId },
          data: { currentStep: nextTask.step },
        });
        nextAssignee = nextTask.assignee;
        nextTaskInfo = { id: nextTask.id, step: nextTask.step };
      }
    });

    if (notifyAuthor) {
      const { status, comment: notifyComment } = notifyAuthor;

      await sendDocumentStatusUpdate(
        task.document.author,
        task.document,
        status,
        notifyComment,
      );
    }

    if (nextAssignee && nextTaskInfo) {
      await sendTaskNotification(nextAssignee, task.document, nextTaskInfo);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Task update error:", error);
    return NextResponse.json({ error: "Ошибка обновления задачи" }, { status: 500 });
  }
}
