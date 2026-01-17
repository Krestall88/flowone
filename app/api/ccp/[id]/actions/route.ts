import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isReadOnlyRole } from "@/lib/session";
import { logAuditAction } from "@/lib/audit-log";

// POST /api/ccp/[id]/actions - Добавить действие по CCP
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  
  if (isReadOnlyRole(user.role)) {
    return NextResponse.json({ error: "Роль только для просмотра" }, { status: 403 });
  }

  const ccpId = Number(params.id);
  const body = await req.json();
  const { actionType, description, result } = body;

  if (!actionType || !description) {
    return NextResponse.json(
      { error: "Обязательные поля: actionType, description" },
      { status: 400 }
    );
  }

  const action = await prisma.cCPAction.create({
    data: {
      ccpId,
      actionType,
      description,
      takenBy: user.name || user.email,
      result,
    },
  });

  // Логируем действие
  await logAuditAction({
    userId: Number(user.id),
    action: "add_ccp_action",
    entityType: "ccp",
    entityId: ccpId,
    meta: { actionType, description },
  });

  return NextResponse.json(action, { status: 201 });
}
