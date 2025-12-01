import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Сначала очищаем записи по сотрудникам, затем сами журналы здоровья
  await prisma.healthCheckEmployee.deleteMany();
  await prisma.healthCheck.deleteMany();

  // Затем очищаем температурные записи
  await prisma.temperatureEntry.deleteMany();
}

main()
  .catch((e) => {
    console.error("Ошибка при сбросе журналов:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
