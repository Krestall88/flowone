import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("[cleanup] Starting document data cleanup...");

  await prisma.$transaction(async (tx) => {
    // 1. Удаляем назначения на исполнение
    const execDeleted = await tx.executionAssignment.deleteMany();
    console.log(`[cleanup] Deleted execution assignments: ${execDeleted.count}`);

    // 2. Удаляем наблюдателей документов
    const watchersDeleted = await tx.documentWatcher.deleteMany();
    console.log(`[cleanup] Deleted document watchers: ${watchersDeleted.count}`);

    // 3. Удаляем файлы документов
    const filesDeleted = await tx.file.deleteMany();
    console.log(`[cleanup] Deleted files: ${filesDeleted.count}`);

    // 4. Удаляем задачи по документам
    const tasksDeleted = await tx.task.deleteMany();
    console.log(`[cleanup] Deleted tasks: ${tasksDeleted.count}`);

    // 5. Удаляем сами документы
    const docsDeleted = await tx.document.deleteMany();
    console.log(`[cleanup] Deleted documents: ${docsDeleted.count}`);
  });

  console.log("[cleanup] Document-related data cleanup completed.");
}

main()
  .catch((error) => {
    console.error("[cleanup] Error during cleanup:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
