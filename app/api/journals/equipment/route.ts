import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  await requireUser();

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
