import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    const where = categoryId ? { categoryId: parseInt(categoryId) } : {};

    const items = await (prisma as any).masterDataItem.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "director" && role !== "head" && role !== "technologist") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { categoryId, name, description, metadata, documentId, expiresAt, supplier, active } = body;

    if (!categoryId || !name) {
      return NextResponse.json({ error: "CategoryId and name are required" }, { status: 400 });
    }

    const item = await (prisma as any).masterDataItem.create({
      data: {
        categoryId: parseInt(categoryId),
        name,
        description: description || null,
        metadata: metadata || null,
        documentId: documentId ? parseInt(documentId) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        supplier: supplier || null,
        active: active !== undefined ? active : true,
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

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
