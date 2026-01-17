import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { isAuditModeActive, auditModeLockedResponse } from "@/lib/audit-session";

// Создание нового сотрудника
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  if (await isAuditModeActive()) {
    return NextResponse.json(auditModeLockedResponse(), { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const positionRaw = typeof body?.position === "string" ? body.position.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Укажите ФИО сотрудника" }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: {
      name,
      position: positionRaw || null,
      active: true,
    },
  });

  return NextResponse.json({ employee });
}

// Редактирование ФИО/должности/активности
export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  if (await isAuditModeActive()) {
    return NextResponse.json(auditModeLockedResponse(), { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Некорректный идентификатор сотрудника" }, { status: 400 });
  }

  const updateData: { name?: string; position?: string | null; active?: boolean } = {};

  if (typeof body?.name === "string" && body.name.trim()) {
    updateData.name = body.name.trim();
  }

  if (typeof body?.position === "string") {
    const pos = body.position.trim();
    updateData.position = pos || null;
  }

  if (typeof body?.active === "boolean") {
    updateData.active = body.active;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Нет данных для обновления" }, { status: 400 });
  }

  const employee = await prisma.employee.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ employee });
}

// Полное удаление сотрудника (вместе с его отметками в журнале здоровья)
export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  if (await isAuditModeActive()) {
    return NextResponse.json(auditModeLockedResponse(), { status: 403 });
  }

  const url = new URL(req.url);
  const idParam = url.searchParams.get("id");
  const id = Number(idParam);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Некорректный идентификатор сотрудника" }, { status: 400 });
  }

  // Удаляем записи журнала здоровья, связанные с сотрудником, чтобы не нарушить внешние ключи
  await prisma.healthCheckEmployee.deleteMany({
    where: { employeeId: id },
  });

  await prisma.employee.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
