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

  // Очистка HACCP данных
  await (prisma as any).cCPAction.deleteMany();
  await (prisma as any).cCP.deleteMany();
  await (prisma as any).labTest.deleteMany();

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

  const nonconformities = await (prisma as any).nonconformity.createMany({
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

  const [nonconformity1] = await (prisma as any).nonconformity.findMany({
    where: { title: "Отклонение температуры (холодильник №1)" },
  });

  // Тестовые данные для HACCP Plan (CCP)
  console.log("Создание тестовых данных для HACCP Plan...");
  
  const ccp1 = await (prisma as any).cCP.create({
    data: {
      process: "Приёмка сырья",
      hazard: "Микробиологическое заражение (сальмонелла, листерия)",
      riskLevel: "high",
      controlMeasures: "Проверка сертификатов качества, визуальный осмотр, контроль температуры при приёмке",
      correctiveActions: "Отказ от приёмки партии, возврат поставщику, уведомление руководства",
      criticalLimits: "Температура охлаждённого сырья: не выше +4°C, замороженного: не выше -18°C",
      monitoringProcedure: "Измерение температуры термометром при каждой приёмке, проверка документов",
      responsiblePerson: "Кладовщик, технолог",
      status: "active",
    },
  });

  const ccp2 = await (prisma as any).cCP.create({
    data: {
      process: "Термообработка (выпечка)",
      hazard: "Выживание патогенных микроорганизмов",
      riskLevel: "high",
      controlMeasures: "Контроль температуры и времени выпечки согласно технологической карте",
      correctiveActions: "Увеличение времени выпечки, повторная термообработка, утилизация партии",
      criticalLimits: "Температура внутри изделия: не ниже +75°C, время выпечки: согласно рецептуре",
      monitoringProcedure: "Измерение температуры пищевым термометром каждые 2 часа",
      responsiblePerson: "Пекарь, технолог",
      status: "active",
      relatedDocumentId: regulationApproved.id,
    },
  });

  const ccp3 = await (prisma as any).cCP.create({
    data: {
      process: "Хранение готовой продукции",
      hazard: "Рост микроорганизмов, порча продукции",
      riskLevel: "high",
      controlMeasures: "Контроль температуры в холодильных камерах 3 раза в день",
      correctiveActions: "Регулировка температуры, перемещение продукции, вызов мастера по ремонту",
      criticalLimits: "Температура: от 0°C до +6°C",
      monitoringProcedure: "Журнал температур (утро/день/вечер), автоматические датчики",
      responsiblePerson: "Кладовщик",
      status: "active",
      relatedNonconformityId: nonconformity1?.id,
    },
  });

  const ccp4 = await (prisma as any).cCP.create({
    data: {
      process: "Мойка и дезинфекция оборудования",
      hazard: "Перекрёстное загрязнение, химическое загрязнение остатками моющих средств",
      riskLevel: "medium",
      controlMeasures: "Использование разрешённых моющих средств, соблюдение инструкций, контроль смывов",
      correctiveActions: "Повторная мойка, замена моющего средства, обучение персонала",
      criticalLimits: "Концентрация моющего раствора согласно инструкции, время экспозиции: не менее 15 минут",
      monitoringProcedure: "Визуальный контроль чистоты, лабораторные смывы 1 раз в месяц",
      responsiblePerson: "Уборщица, технолог",
      status: "active",
      relatedDocumentId: regulationApproved.id,
    },
  });

  const ccp5 = await (prisma as any).cCP.create({
    data: {
      process: "Контроль здоровья персонала",
      hazard: "Заражение продукции от больного персонала",
      riskLevel: "high",
      controlMeasures: "Ежедневный медосмотр перед сменой, наличие медицинских книжек",
      correctiveActions: "Отстранение от работы, направление к врачу, замена на другого сотрудника",
      criticalLimits: "Отсутствие признаков заболевания (температура, кашель, насморк, кожные высыпания)",
      monitoringProcedure: "Журнал здоровья персонала, визуальный осмотр",
      responsiblePerson: "Медработник, руководитель смены",
      status: "active",
    },
  });

  const ccp6 = await (prisma as any).cCP.create({
    data: {
      process: "Контроль качества воды",
      hazard: "Химическое и микробиологическое загрязнение воды",
      riskLevel: "medium",
      controlMeasures: "Лабораторные анализы воды, контроль работы фильтров",
      correctiveActions: "Замена фильтров, дезинфекция системы водоснабжения, использование бутилированной воды",
      criticalLimits: "Соответствие СанПиН 2.1.4.1074-01",
      monitoringProcedure: "Лабораторные анализы 1 раз в квартал",
      responsiblePerson: "Технолог",
      status: "active",
    },
  });

  const ccp7 = await (prisma as any).cCP.create({
    data: {
      process: "Контроль вредителей (дератизация, дезинсекция)",
      hazard: "Заражение продукции от грызунов и насекомых",
      riskLevel: "medium",
      controlMeasures: "Регулярная дератизация и дезинсекция, контроль наличия следов вредителей",
      correctiveActions: "Внеплановая обработка, усиление мер защиты, утилизация заражённой продукции",
      criticalLimits: "Отсутствие следов вредителей (помёт, повреждения упаковки)",
      monitoringProcedure: "Визуальный осмотр помещений ежедневно, профессиональная обработка 1 раз в месяц",
      responsiblePerson: "Руководитель производства",
      status: "active",
    },
  });

  const ccp8 = await (prisma as any).cCP.create({
    data: {
      process: "Упаковка готовой продукции",
      hazard: "Физическое загрязнение (посторонние предметы)",
      riskLevel: "low",
      controlMeasures: "Визуальный контроль, использование металлодетекторов",
      correctiveActions: "Изъятие продукции с дефектами, проверка оборудования",
      criticalLimits: "Отсутствие посторонних предметов, целостность упаковки",
      monitoringProcedure: "Визуальный контроль каждой партии",
      responsiblePerson: "Упаковщик",
      status: "active",
    },
  });

  // Добавляем действия по CCP
  await (prisma as any).cCPAction.createMany({
    data: [
      {
        ccpId: ccp1.id,
        actionType: "check",
        description: "Проверка температуры при приёмке партии молока",
        takenBy: "Кладовщик Петров И.И.",
        result: "Температура +3°C, в пределах нормы",
        takenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        ccpId: ccp2.id,
        actionType: "check",
        description: "Контроль температуры выпечки хлеба",
        takenBy: "Пекарь Смирнова А.А.",
        result: "Температура внутри изделия +78°C, норма",
        takenAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        ccpId: ccp3.id,
        actionType: "corrective",
        description: "Обнаружено превышение температуры в холодильнике №1",
        takenBy: "Технолог Иванов С.С.",
        result: "Вызван мастер, произведена регулировка, температура восстановлена",
        takenAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        ccpId: ccp4.id,
        actionType: "check",
        description: "Проверка чистоты оборудования после мойки",
        takenBy: "Технолог Иванов С.С.",
        result: "Оборудование чистое, остатков моющих средств не обнаружено",
        takenAt: new Date(),
      },
      {
        ccpId: ccp5.id,
        actionType: "corrective",
        description: "Сотрудник Кузнецова М. отстранена от работы (жалобы на недомогание)",
        takenBy: "Руководитель смены",
        result: "Направлена к врачу, замена найдена",
        takenAt: new Date(),
      },
    ],
  });

  console.log("✅ Тестовые данные для HACCP Plan успешно созданы!");
  console.log(`   - Создано ${8} CCP записей`);
  console.log(`   - Создано ${5} действий по CCP`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
