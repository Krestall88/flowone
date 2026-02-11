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

export async function PATCH(req: NextRequest) {
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

  const { id, name } = (body as { id?: unknown; name?: unknown }) ?? {};

  const locId = Number(id);
  if (!locId || Number.isNaN(locId)) {
    return NextResponse.json({ error: "Некорректный ID помещения" }, { status: 400 });
  }

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Укажите название помещения" }, { status: 400 });
  }

  const location = await prisma.location.update({
    where: { id: locId },
    data: { name: name.trim() },
  });

  return NextResponse.json({ location });
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  if (await isAuditModeActive()) {
    return NextResponse.json(auditModeLockedResponse(), { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  const locId = Number(id);
  if (!locId || Number.isNaN(locId)) {
    return NextResponse.json({ error: "Некорректный ID помещения" }, { status: 400 });
  }

  // Check if location has equipment
  const equipmentCount = await prisma.equipment.count({
    where: { locationId: locId },
  });

  if (equipmentCount > 0) {
    return NextResponse.json(
      { error: `Невозможно удалить помещение. К нему привязано оборудование (${equipmentCount} шт.)` },
      { status: 400 }
    );
  }

  await prisma.location.delete({
    where: { id: locId },
  });

  return NextResponse.json({ success: true });
}
