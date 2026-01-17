import { prisma } from "@/lib/prisma";

/**
 * Создать уведомление в системе
 */
export async function createNotification({
  type,
  title,
  message,
  priority = "medium",
  entityType,
  entityId,
  userId,
  targetRole,
  expiresAt,
}: {
  type: string;
  title: string;
  message: string;
  priority?: "low" | "medium" | "high";
  entityType?: string;
  entityId?: number;
  userId?: number;
  targetRole?: string;
  expiresAt?: Date;
}) {
  return await (prisma as any).notification.create({
    data: {
      type,
      title,
      message,
      priority,
      entityType,
      entityId,
      userId,
      targetRole,
      expiresAt,
    },
  });
}

/**
 * Уведомление о критическом отклонении температуры
 */
export async function notifyTemperatureDeviation({
  equipmentName,
  temperature,
  targetTemp,
  tolerance,
  date,
}: {
  equipmentName: string;
  temperature: number;
  targetTemp: number;
  tolerance: number;
  date: string;
}) {
  return await createNotification({
    type: "critical_deviation",
    title: "⚠️ Критическое отклонение температуры",
    message: `Оборудование: ${equipmentName}\nТемпература: ${temperature}°C (норма: ${targetTemp}±${tolerance}°C)\nДата: ${date}`,
    priority: "high",
    entityType: "temperature",
    targetRole: "head", // Уведомляем руководителя производства
  });
}

/**
 * Уведомление об отстранении персонала
 */
export async function notifyHealthIssue({
  employeeName,
  status,
  note,
  date,
}: {
  employeeName: string;
  status: string;
  note?: string;
  date: string;
}) {
  return await createNotification({
    type: "critical_deviation",
    title: "⚠️ Отстранение сотрудника",
    message: `Сотрудник: ${employeeName}\nСтатус: ${status}\n${note ? `Примечание: ${note}\n` : ""}Дата: ${date}`,
    priority: "high",
    entityType: "health",
    targetRole: "head",
  });
}

/**
 * Уведомление о high-risk CCP без действий
 */
export async function notifyHighRiskCCP({
  ccpId,
  process,
  hazard,
}: {
  ccpId: number;
  process: string;
  hazard: string;
}) {
  return await createNotification({
    type: "critical_deviation",
    title: "🔴 Критический риск без действий",
    message: `Процесс: ${process}\nОпасность: ${hazard}\nТребуется немедленное принятие корректирующих мер`,
    priority: "high",
    entityType: "ccp",
    entityId: ccpId,
    targetRole: "director",
  });
}

/**
 * Напоминание о просроченных документах
 */
export async function notifyExpiredDocuments(count: number) {
  if (count === 0) return null;

  return await createNotification({
    type: "reminder",
    title: "📋 Просроченные документы",
    message: `Обнаружено ${count} просроченных документов в реестре. Требуется обновление.`,
    priority: "medium",
    targetRole: "head",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Истекает через 24 часа
  });
}

/**
 * Напоминание об истекающих документах (≤30 дней)
 */
export async function notifyExpiringDocuments(count: number) {
  if (count === 0) return null;

  return await createNotification({
    type: "reminder",
    title: "⏰ Документы истекают в ближайшие 30 дней",
    message: `Обнаружено ${count} документов, срок действия которых истекает в течение 30 дней.`,
    priority: "medium",
    targetRole: "head",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Истекает через 7 дней
  });
}

/**
 * Напоминание об открытых несоответствиях
 */
export async function notifyOpenNonconformities(count: number) {
  if (count === 0) return null;

  return await createNotification({
    type: "reminder",
    title: "⚠️ Открытые несоответствия",
    message: `Обнаружено ${count} открытых несоответствий. Требуется принятие корректирующих мер.`,
    priority: "medium",
    targetRole: "head",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

/**
 * Уведомление об отклонении в лабораторных исследованиях
 */
export async function notifyLabTestDeviation({
  labTestId,
  testType,
  supplier,
  batchNumber,
}: {
  labTestId: number;
  testType: string;
  supplier?: string;
  batchNumber?: string;
}) {
  return await createNotification({
    type: "critical_deviation",
    title: "🔬 Отклонение в лабораторных исследованиях",
    message: `Тип анализа: ${testType}\n${supplier ? `Поставщик: ${supplier}\n` : ""}${batchNumber ? `Партия: ${batchNumber}\n` : ""}Автоматически создано несоответствие`,
    priority: "high",
    entityType: "labtest",
    entityId: labTestId,
    targetRole: "head",
  });
}

/**
 * Получить количество непрочитанных уведомлений для пользователя
 */
export async function getUnreadNotificationsCount(userId: number, userRole: string): Promise<number> {
  return await (prisma as any).notification.count({
    where: {
      AND: [
        {
          OR: [
            { userId },
            { userId: null, targetRole: userRole },
            { userId: null, targetRole: null },
          ],
        },
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      ],
      isRead: false,
    },
  });
}

/**
 * Очистить истекшие уведомления (cron job)
 */
export async function cleanupExpiredNotifications() {
  const result = await (prisma as any).notification.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
}
