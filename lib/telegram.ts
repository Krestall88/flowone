import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

interface User {
  id: number;
  name: string;
  telegramId: bigint | null;
}

interface Document {
  id: number;
  title: string;
}

interface Task {
  id: number;
  step: number;
}

export async function sendTaskNotification(user: User, document: Document, task: Task) {
  if (!BOT_TOKEN || !user.telegramId) {
    console.warn("TELEGRAM_BOT_TOKEN not configured or user has no telegramId, skipping notification");
    return;
  }

  const chatId = user.telegramId;
  const docUrl = `${BASE_URL}/documents/${document.id}`;
  const message = `📄 *Новая задача*\n\n*Документ:* ${document.title}\n*Шаг:* ${task.step + 1}\n\n[Открыть документ](${docUrl})`;

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.toString(),
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
  }
}

export async function sendDocumentStatusUpdate(
  user: User,
  document: Document,
  status: string,
  comment?: string | null,
) {
  if (!BOT_TOKEN || !user.telegramId) {
    return;
  }

  const statusLabels: Record<string, string> = {
    approved: "✅ Согласован",
    rejected: "❌ Отклонён",
    in_progress: "⏳ На согласовании",
  };

  let message = `📋 *Обновление документа*\n\n*Название:* ${document.title}\n*Статус:* ${statusLabels[status] || status}`;
  
  if (comment) {
    message += `\n*Комментарий:* ${comment}`;
  }

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.telegramId.toString(),
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch (error) {
    console.error("Failed to send status update:", error);
  }
}
