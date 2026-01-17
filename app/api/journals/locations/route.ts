import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { isAuditModeActive, auditModeLockedResponse } from "@/lib/audit-session";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  if (await isAuditModeActive()) {
    return NextResponse.json(auditModeLockedResponse(), { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный формат запроса" }, { status: 400 });
  }

  const { name } = (body as { name?: unknown }) ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Укажите название помещения" }, { status: 400 });
  }

  const location = await prisma.location.create({
    data: {
      name: name.trim(),
    },
  });

  return NextResponse.json({ location });
}
