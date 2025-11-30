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
        name: "Главный бухгалтер",
        email: "accountant@example.com",
        role: "accountant",
        password: passwordHash,
      },
      {
        name: "Руководитель производства",
        email: "head@example.com",
        role: "head",
        password: passwordHash,
      },
      {
        name: "Снабженец 1",
        email: "employee1@example.com",
        role: "employee",
        password: passwordHash,
      },
      {
        name: "Снабженец 2",
        email: "employee2@example.com",
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
