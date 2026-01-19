import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "director" && role !== "head" && role !== "technologist") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const { categoryId, name, description, metadata, documentId, expiresAt, supplier, active } = body;

    const item = await (prisma as any).masterDataItem.update({
      where: { id },
      data: {
        ...(categoryId !== undefined && { categoryId: parseInt(categoryId) }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(metadata !== undefined && { metadata }),
        ...(documentId !== undefined && { documentId: documentId ? parseInt(documentId) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(supplier !== undefined && { supplier }),
        ...(active !== undefined && { active }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true,
            icon: true,
          },
        },
      },
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("Error updating item:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "director" && role !== "head") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await (prisma as any).masterDataItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting item:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
