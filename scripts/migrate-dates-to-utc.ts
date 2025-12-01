/**
 * Скрипт миграции дат журналов к UTC полночи.
 * 
 * Проблема: записи, созданные локально (UTC+3), имеют даты типа 2025-11-29T21:00:00Z,
 * а записи с прода (UTC) — 2025-11-30T00:00:00Z. Это приводит к тому, что
 * dev и prod не видят записи друг друга.
 * 
 * Решение: нормализовать все даты к UTC полночи (00:00:00.000Z).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeToUTCMidnight(date: Date): Date {
  // Берём UTC компоненты даты и создаём новую дату с полночью UTC
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
}

async function main() {
  console.log("=== Миграция дат журналов к UTC полночи ===\n");

  // 1. Миграция HealthCheck
  console.log("Обработка HealthCheck...");
  const healthChecks = await prisma.healthCheck.findMany();
  
  for (const check of healthChecks) {
    const normalized = normalizeToUTCMidnight(check.date);
    
    if (check.date.getTime() !== normalized.getTime()) {
      console.log(`  HealthCheck #${check.id}: ${check.date.toISOString()} -> ${normalized.toISOString()}`);
      
      // Проверяем, нет ли уже записи с такой нормализованной датой для этого пользователя
      const existing = await prisma.healthCheck.findFirst({
        where: {
          userId: check.userId,
          date: normalized,
          id: { not: check.id },
        },
      });

      if (existing) {
        console.log(`    ⚠ Конфликт с записью #${existing.id}, пропускаем (нужно ручное разрешение)`);
        continue;
      }

      await prisma.healthCheck.update({
        where: { id: check.id },
        data: { date: normalized },
      });
      console.log(`    ✓ Обновлено`);
    }
  }

  // 2. Миграция TemperatureEntry
  console.log("\nОбработка TemperatureEntry...");
  const tempEntries = await prisma.temperatureEntry.findMany();
  
  for (const entry of tempEntries) {
    const normalized = normalizeToUTCMidnight(entry.date);
    
    if (entry.date.getTime() !== normalized.getTime()) {
      console.log(`  TempEntry #${entry.id} (eq=${entry.equipmentId}): ${entry.date.toISOString()} -> ${normalized.toISOString()}`);
      
      // Проверяем уникальность по equipmentId + date
      const existing = await prisma.temperatureEntry.findFirst({
        where: {
          equipmentId: entry.equipmentId,
          date: normalized,
          id: { not: entry.id },
        },
      });

      if (existing) {
        console.log(`    ⚠ Конфликт с записью #${existing.id}, пропускаем (нужно ручное разрешение)`);
        continue;
      }

      await prisma.temperatureEntry.update({
        where: { id: entry.id },
        data: { date: normalized },
      });
      console.log(`    ✓ Обновлено`);
    }
  }

  console.log("\n=== Миграция завершена ===");
}

main()
  .catch((e) => {
    console.error("Ошибка миграции:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
