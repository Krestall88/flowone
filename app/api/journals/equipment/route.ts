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

  const { name, locationId, targetTemp, tolerance, type } = (body as {
    name?: unknown;
    locationId?: unknown;
    targetTemp?: unknown;
    tolerance?: unknown;
    type?: unknown;
  }) ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Укажите название оборудования" }, { status: 400 });
  }

  const locId = Number(locationId);
  if (!locId || Number.isNaN(locId)) {
    return NextResponse.json({ error: "Некорректное помещение" }, { status: 400 });
  }

  const target = Number(targetTemp);
  const tol = Number(tolerance);

  if (!Number.isFinite(target) || !Number.isFinite(tol)) {
    return NextResponse.json({ error: "Укажите корректные числовые значения нормы и допуска" }, { status: 400 });
  }

  let equipmentType = "fridge";
  if (typeof type === "string" && type.trim()) {
    equipmentType = type.trim();
  }

  const equipment = await prisma.equipment.create({
    data: {
      name: name.trim(),
      locationId: locId,
      targetTemp: Math.round(target),
      tolerance: Math.round(tol),
      type: equipmentType,
    },
  });

  return NextResponse.json({ equipment });
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

  const { id, name, locationId, targetTemp, tolerance, type } = (body as {
    id?: unknown;
    name?: unknown;
    locationId?: unknown;
    targetTemp?: unknown;
    tolerance?: unknown;
    type?: unknown;
  }) ?? {};

  const eqId = Number(id);
  if (!eqId || Number.isNaN(eqId)) {
    return NextResponse.json({ error: "Некорректный ID оборудования" }, { status: 400 });
  }

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Укажите название оборудования" }, { status: 400 });
  }

  const locId = Number(locationId);
  if (!locId || Number.isNaN(locId)) {
    return NextResponse.json({ error: "Некорректное помещение" }, { status: 400 });
  }

  const target = Number(targetTemp);
  const tol = Number(tolerance);

  if (!Number.isFinite(target) || !Number.isFinite(tol)) {
    return NextResponse.json({ error: "Укажите корректные числовые значения нормы и допуска" }, { status: 400 });
  }

  let equipmentType = "fridge";
  if (typeof type === "string" && type.trim()) {
    equipmentType = type.trim();
  }

  const equipment = await prisma.equipment.update({
    where: { id: eqId },
    data: {
      name: name.trim(),
      locationId: locId,
      targetTemp: Math.round(target),
      tolerance: Math.round(tol),
      type: equipmentType,
    },
  });

  return NextResponse.json({ equipment });
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

  const eqId = Number(id);
  if (!eqId || Number.isNaN(eqId)) {
    return NextResponse.json({ error: "Некорректный ID оборудования" }, { status: 400 });
  }

  // Check if equipment has temperature entries
  const entriesCount = await prisma.temperatureEntry.count({
    where: { equipmentId: eqId },
  });

  if (entriesCount > 0) {
    return NextResponse.json(
      { error: `Невозможно удалить оборудование. Есть записи в журнале температур (${entriesCount} шт.)` },
      { status: 400 }
    );
  }

  await prisma.equipment.delete({
    where: { id: eqId },
  });

  return NextResponse.json({ success: true });
}
