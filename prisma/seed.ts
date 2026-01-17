import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Очистка данных журналов (в первую очередь дочерние таблицы)
  await prisma.healthCheckEmployee.deleteMany();
  await prisma.healthCheck.deleteMany();
  await prisma.temperatureEntry.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.location.deleteMany();
  await prisma.employee.deleteMany();

  // Очистка данных документооборота
  await (prisma as any).auditLog.deleteMany();
  await (prisma as any).nonconformity.deleteMany();
  await (prisma as any).registryDocument.deleteMany();
  await prisma.executionAssignment.deleteMany();
  await prisma.documentWatcher.deleteMany();
  await prisma.task.deleteMany();
  await prisma.file.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password", 10);

  await prisma.user.createMany({
    data: [
      {
        name: "Директор",
        email: "director@example.com",
        role: "director",
        password: passwordHash,
      },
      {
        name: "Руководитель производства",
        email: "head@example.com",
        role: "head",
        password: passwordHash,
      },
      {
        name: "Технолог",
        email: "technologist@example.com",
        role: "technologist",
        password: passwordHash,
      },
      {
        name: "Аудитор",
        email: "auditor@example.com",
        role: "auditor",
        password: passwordHash,
      },
      {
        name: "Сотрудник",
        email: "employee@example.com",
        role: "employee",
        password: passwordHash,
      },
      {
        name: "Админ журналов",
        email: "journals-admin@example.com",
        role: "journals_admin",
        password: passwordHash,
      },
    ],
  });

  const [director, head, employee] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "director@example.com" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "head@example.com" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "employee@example.com" } }),
  ]);

  // Тестовые данные для журналов
  const journalsAdmin = await prisma.user.findUniqueOrThrow({
    where: { email: "journals-admin@example.com" },
  });

  // Локации
  const [bakery, warehouse] = await Promise.all([
    prisma.location.create({ data: { name: "Цех выпечки" } }),
    prisma.location.create({ data: { name: "Склад готовой продукции" } }),
  ]);

  // Оборудование с нормами
  const [fridge1, fridge2, freezer, showcase] = await Promise.all([
    prisma.equipment.create({
      data: {
        name: "Холодильник №1 (молочная продукция)",
        locationId: bakery.id,
        targetTemp: 4,
        tolerance: 2,
      },
    }),
    prisma.equipment.create({
      data: {
        name: "Холодильник №2 (тесто)",
        locationId: bakery.id,
        targetTemp: 2,
        tolerance: 2,
      },
    }),
    prisma.equipment.create({
      data: {
        name: "Морозильная камера полуфабрикатов",
        locationId: warehouse.id,
        targetTemp: -18,
        tolerance: 3,
      },
    }),
    prisma.equipment.create({
      data: {
        name: "Витринный холодильник",
        locationId: warehouse.id,
        targetTemp: 6,
        tolerance: 2,
      },
    }),
  ]);

  // Пример записей температур на текущую дату
  await prisma.temperatureEntry.createMany({
    data: [
      {
        equipmentId: fridge1.id,
        userId: journalsAdmin.id,
        morning: 4,
        day: 5,
        evening: 4,
      },
      {
        equipmentId: fridge2.id,
        userId: journalsAdmin.id,
        morning: 1,
        day: 3,
        evening: 2,
      },
      {
        equipmentId: freezer.id,
        userId: journalsAdmin.id,
        morning: -18,
        day: -20,
        evening: -19,
      },
      {
        equipmentId: showcase.id,
        userId: journalsAdmin.id,
        morning: 6,
        day: 7,
        evening: 6,
      },
    ],
  });

  // Справочник сотрудников для журнала здоровья
  await prisma.employee.createMany({
    data: [
      {
        name: "Иван Петров",
      },
      {
        name: "Анна Смирнова",
      },
      {
        name: "Сергей Иванов",
      },
      {
        name: "Мария Кузнецова",
      },
    ],
  });

  const employeesList = await prisma.employee.findMany({ orderBy: { id: "asc" } });

  await prisma.healthCheck.create({
    data: {
      userId: journalsAdmin.id,
      signedAt: new Date(),
      entries: {
        create: employeesList.map((e, index) => ({
          employeeId: e.id,
          status:
            index === 1
              ? "sick" // отстранён
              : index === 2
              ? "vacation"
              : index === 3
              ? "day_off"
              : "healthy",
          note:
            index === 1
              ? "Жалобы на недомогание, отправлен домой"
              : index === 2
              ? "Плановый отпуск"
              : index === 3
              ? "Выходной день по графику"
              : null,
        })),
      },
    },
  });

  const regulationApproved = await prisma.document.create({
    data: {
      title: "Инструкция: мойка и дезинфекция оборудования",
      body: "Порядок мойки, частота, ответственные лица, контрольные точки.",
      content: "Порядок мойки, частота, ответственные лица, контрольные точки.",
      authorId: head.id,
      recipientId: director.id,
      responsibleId: head.id,
      status: "approved",
      currentStep: 2,
      tasks: {
        create: [
          {
            step: 0,
            status: "approved",
            action: "approve",
            assigneeId: head.id,
          },
          {
            step: 1,
            status: "approved",
            action: "sign",
            assigneeId: director.id,
          },
          {
            step: 2,
            status: "approved",
            action: "review",
            assigneeId: employee.id,
          },
        ],
      },
      watchers: {
        create: [{ userId: employee.id }],
      },
    },
  });

  const regulationInProgress = await prisma.document.create({
    data: {
      title: "Регламент: контроль температур холодильников",
      body: "Точки контроля: утро/день/вечер. Допуски по оборудованию. Действия при отклонениях.",
      content: "Точки контроля: утро/день/вечер. Допуски по оборудованию. Действия при отклонениях.",
      authorId: head.id,
      recipientId: director.id,
      responsibleId: head.id,
      status: "in_progress",
      currentStep: 1,
      tasks: {
        create: [
          {
            step: 0,
            status: "approved",
            action: "approve",
            assigneeId: head.id,
          },
          {
            step: 1,
            status: "pending",
            action: "sign",
            assigneeId: director.id,
          },
        ],
      },
    },
  });

  await (prisma as any).registryDocument.createMany({
    data: [
      {
        documentId: regulationApproved.id,
        objectType: "оборудование",
        zone: "Цех выпечки",
        supplier: "Поставщик А",
        expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        documentId: regulationInProgress.id,
        objectType: "сырьё",
        zone: "Склад готовой продукции",
        supplier: "Поставщик Б",
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  await (prisma as any).nonconformity.createMany({
    data: [
      {
        title: "Отклонение температуры (холодильник №1)",
        description: "Фиксация превышения температуры. Требуется корректирующее действие.",
        severity: "critical",
        status: "open",
        createdById: journalsAdmin.id,
        documentId: regulationInProgress.id,
      },
      {
        title: "Замечание по санитарной обработке инвентаря",
        description: "Проведено повторное обучение персонала. Контроль выполнен.",
        severity: "major",
        status: "closed",
        createdById: head.id,
        closedById: head.id,
        closedAt: new Date(),
        documentId: regulationApproved.id,
      },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
