import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import crypto from "crypto";

// GET - получить статус привязки
export async function GET() {
  try {
    const user = await requireUser();

    const userData = await prisma.user.findUnique({
      where: { id: parseInt(user.id) },
      select: {
        telegramChatId: true,
        telegramUsername: true,
        telegramFirstName: true,
        telegramLastName: true,
      },
    });

    const isBound = !!userData?.telegramChatId;

    return NextResponse.json({
      isBound,
      telegram: isBound
        ? {
            username: userData.telegramUsername,
            firstName: userData.telegramFirstName,
            lastName: userData.telegramLastName,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching telegram binding:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки данных" },
      { status: 500 }
    );
  }
}

// POST - сгенерировать код привязки
export async function POST() {
  try {
    const user = await requireUser();

    // Генерируем уникальный код
    const bindingCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

    // Сохраняем код в БД
    await prisma.user.update({
      where: { id: parseInt(user.id) },
      data: {
        telegramBindingCode: bindingCode,
        telegramBindingExpiry: expiresAt,
      },
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "your_bot";

    return NextResponse.json({
      bindingCode,
      expiresAt: expiresAt.toISOString(),
      botUsername,
      instructions: `Отправьте боту @${botUsername} команду:\n/bind ${bindingCode}`,
    });
  } catch (error) {
    console.error("Error generating binding code:", error);
    return NextResponse.json(
      { error: "Ошибка генерации кода" },
      { status: 500 }
    );
  }
}

// DELETE - отвязать Telegram
export async function DELETE() {
  try {
    const user = await requireUser();

    await prisma.user.update({
      where: { id: parseInt(user.id) },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramFirstName: null,
        telegramLastName: null,
        telegramBindingCode: null,
        telegramBindingExpiry: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unbinding telegram:", error);
    return NextResponse.json(
      { error: "Ошибка отвязки" },
      { status: 500 }
    );
  }
}
