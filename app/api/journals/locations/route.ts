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
