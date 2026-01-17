import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { serializeDocumentContent } from "@/lib/document-content";
import { TASK_ACTIONS } from "@/lib/workflow";
import { uploadDocumentFile } from "@/lib/supabase";
import { logAudit } from "@/lib/audit-log";
import { auditModeLockedResponse, isAuditModeActive } from "@/lib/audit-session";

const stageActions = TASK_ACTIONS.length > 0 ? TASK_ACTIONS : ["approve", "sign", "review"];

const importSchema = z.object({
  mode: z.enum(["archive", "workflow"]),
  titlePrefix: z.string().optional().default(""),
  responsibleId: z.number().int().optional(),
  stages: z
    .array(
      z.object({
        assigneeId: z.number().int(),
        action: z.enum(stageActions as [string, ...string[]]),
      }),
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  const sessionUser = await requireUser();
  if (isReadOnlyRole(sessionUser.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  if (await isAuditModeActive()) {
    return NextResponse.json(auditModeLockedResponse("В режиме проверки запрещено импортировать документы"), { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Ожидается multipart/form-data" }, { status: 400 });
  }

  const formData = await request.formData();

  const modeRaw = formData.get("mode")?.toString() ?? "archive";
  const titlePrefix = formData.get("titlePrefix")?.toString() ?? "";
  const responsibleIdRaw = formData.get("responsibleId")?.toString();
  const stagesRaw = formData.get("stages")?.toString();

  let stagesParsed: unknown = undefined;
  if (stagesRaw) {
    try {
      stagesParsed = JSON.parse(stagesRaw);
    } catch {
      stagesParsed = undefined;
    }
  }

  const parsed = importSchema.safeParse({
    mode: modeRaw,
    titlePrefix,
    responsibleId: responsibleIdRaw ? Number(responsibleIdRaw) : undefined,
    stages: stagesParsed,
  });

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const authorId = Number(sessionUser.id);
  const { mode, responsibleId, stages } = parsed.data;

  const fileEntries = formData.getAll("files");
  const files = fileEntries.filter(
    (value): value is File =>
      typeof value === "object" &&
      value !== null &&
      "arrayBuffer" in value &&
      "name" in (value as any),
  );

  if (files.length === 0) {
    return NextResponse.json({ error: "Добавьте хотя бы один файл" }, { status: 400 });
  }

  if (mode === "workflow") {
    if (!responsibleId || !Number.isFinite(responsibleId)) {
      return NextResponse.json({ error: "Нужен ответственный исполнитель" }, { status: 400 });
    }
    if (!stages || stages.length === 0) {
      return NextResponse.json({ error: "Нужен хотя бы один этап маршрута" }, { status: 400 });
    }
  }

  const created: { id: number; title: string }[] = [];

  for (const file of files) {
    const originalName = file.name?.trim() || "Документ";
    const cleanName = originalName.replace(/\.[a-z0-9]+$/i, "");
    const title = titlePrefix ? `${titlePrefix}: ${cleanName}` : cleanName;

    // Загружаем файл в Storage до транзакции
    const uploaded = await uploadDocumentFile(file, `documents/${authorId}/import`);

    const result = await prisma.$transaction(async (tx) => {
      if (mode === "archive") {
        // Архив: сразу как утвержденный, без задач и без маршрута
        const doc = await tx.document.create({
          data: {
            title,
            body: "Импортировано (оцифровка)",
            content: serializeDocumentContent({ body: "Импортировано (оцифровка)", recipientId: authorId }),
            authorId,
            recipientId: authorId,
            responsibleId: authorId,
            status: "approved",
            currentStep: 0,
          },
        });

        await tx.file.create({
          data: {
            documentId: doc.id,
            url: uploaded.url,
            name: uploaded.name,
            size: uploaded.size,
          },
        });

        return doc;
      }

      // workflow
      const firstAssigneeId = stages![0]!.assigneeId;
      const doc = await tx.document.create({
        data: {
          title,
          body: "Импортировано (оцифровка)",
          content: serializeDocumentContent({ body: "Импортировано (оцифровка)", recipientId: firstAssigneeId }),
          authorId,
          recipientId: firstAssigneeId,
          responsibleId: responsibleId!,
          status: "in_progress",
          currentStep: 1,
        },
      });

      // Инициатор (step 0)
      await tx.task.create({
        data: {
          documentId: doc.id,
          step: 0,
          assigneeId: authorId,
          status: "approved",
          completedAt: new Date(),
        },
      });

      for (let i = 0; i < stages!.length; i++) {
        const stage = stages![i]!;
        await tx.task.create({
          data: {
            documentId: doc.id,
            step: i + 1,
            assigneeId: stage.assigneeId,
            status: "pending",
            action: stage.action,
            visibleAfterStep: Math.max(0, i),
          },
        });
      }

      await tx.file.create({
        data: {
          documentId: doc.id,
          url: uploaded.url,
          name: uploaded.name,
          size: uploaded.size,
        },
      });

      return doc;
    });

    await logAudit({
      actorId: authorId,
      action: mode === "archive" ? "document.import.archive" : "document.import.workflow",
      entityType: "document",
      entityId: result.id,
      meta: {
        fileName: uploaded.name,
        fileUrl: uploaded.url,
        mode,
        stagesCount: mode === "workflow" ? stages?.length ?? 0 : 0,
      },
    });

    created.push({ id: result.id, title: result.title });
  }

  return NextResponse.json({ created });
}
