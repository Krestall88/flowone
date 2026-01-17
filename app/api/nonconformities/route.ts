import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit-log";

export async function GET(req: NextRequest) {
  await requireUser();
  const prismaAny = prisma as any;

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") ?? "open").trim();

  const items = await prismaAny.nonconformity.findMany({
    where: {
      ...(status === "open" ? { status: "open" } : status === "closed" ? { status: "closed" } : {}),
    },
    include: {
      createdBy: { select: { name: true } },
      closedBy: { select: { name: true } },
      document: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }
  const prismaAny = prisma as any;

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const severityRaw = typeof body?.severity === "string" ? body.severity.trim() : "critical";
  const documentIdRaw = body?.documentId;

  if (!title) {
    return NextResponse.json({ error: "Укажите название несоответствия" }, { status: 400 });
  }

  const severity = severityRaw || "critical";

  const documentId =
    typeof documentIdRaw === "number"
      ? documentIdRaw
      : typeof documentIdRaw === "string" && documentIdRaw.trim()
        ? Number(documentIdRaw)
        : null;

  const created = await prismaAny.nonconformity.create({
    data: {
      title,
      description: description || null,
      severity,
      status: "open",
      createdById: Number(user.id),
      documentId: documentId && !Number.isNaN(documentId) ? documentId : null,
    },
  });

  await logAudit({
    actorId: Number(user.id),
    action: "nonconformity.create",
    entityType: "nonconformity",
    entityId: created.id,
    meta: {
      severity: created.severity,
      documentId: created.documentId,
    },
  });

  return NextResponse.json({ item: created });
}
