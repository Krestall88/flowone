import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = parseInt(params.id);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        author: {
          select: { name: true, email: true },
        },
        recipient: {
          select: { name: true, email: true },
        },
        tasks: {
          include: {
            assignee: {
              select: { name: true, email: true },
            },
          },
          orderBy: { step: "asc" },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check access
    const hasAccess =
      document.authorId === Number(user.id) ||
      document.recipientId === Number(user.id) ||
      document.tasks.some((task) => task.assigneeId === Number(user.id));

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Generate simple HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${document.title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: #1e293b;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
    }
    .meta {
      color: #64748b;
      font-size: 14px;
      margin: 20px 0;
    }
    .content {
      margin: 30px 0;
      line-height: 1.6;
    }
    .tasks {
      margin-top: 30px;
    }
    .task {
      border: 1px solid #e2e8f0;
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
    }
    .task-header {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-left: 10px;
    }
    .status-approved {
      background: #dcfce7;
      color: #166534;
    }
    .status-rejected {
      background: #fee2e2;
      color: #991b1b;
    }
    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }
  </style>
</head>
<body>
  <h1>${document.title}</h1>
  
  <div class="meta">
    <p><strong>От:</strong> ${document.author.name} (${document.author.email})</p>
    <p><strong>Кому:</strong> ${document.recipient.name} (${document.recipient.email})</p>
    <p><strong>Дата создания:</strong> ${new Date(document.createdAt).toLocaleDateString("ru-RU")}</p>
    <p><strong>Статус:</strong> ${document.status}</p>
  </div>
  
  <div class="content">
    <h2>Содержание</h2>
    <p>${document.body.replace(/\n/g, "<br>")}</p>
  </div>
  
  <div class="tasks">
    <h2>История согласования</h2>
    ${document.tasks
      .map(
        (task) => `
      <div class="task">
        <div class="task-header">
          Шаг ${task.step + 1}: ${task.assignee?.name || "Не назначен"}
          <span class="status status-${task.status}">
            ${task.status === "approved" ? "Согласовано" : task.status === "rejected" ? "Отклонено" : "Ожидает"}
          </span>
        </div>
        <p><strong>Email:</strong> ${task.assignee?.email || "—"}</p>
        ${task.comment ? `<p><strong>Комментарий:</strong> ${task.comment}</p>` : ""}
        ${task.completedAt ? `<p><strong>Дата:</strong> ${new Date(task.completedAt).toLocaleString("ru-RU")}</p>` : ""}
      </div>
    `,
      )
      .join("")}
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="document-${documentId}.html"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
