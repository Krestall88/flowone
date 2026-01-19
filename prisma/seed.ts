import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Вспомогательная функция для создания дат
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("🏭 Создание тестовых данных для пекарни 'Хлебный Дом'...\n");

  // Очистка данных
  console.log("🗑️  Очистка существующих данных...");
  await (prisma as any).masterDataItem.deleteMany();
  await (prisma as any).masterDataCategory.deleteMany();
  await prisma.healthCheckEmployee.deleteMany();
  await prisma.healthCheck.deleteMany();
  await prisma.temperatureEntry.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.location.deleteMany();
  await prisma.employee.deleteMany();
  await (prisma as any).cCPAction.deleteMany();
  await (prisma as any).cCP.deleteMany();
  await (prisma as any).labTest.deleteMany();
  await (prisma as any).notification.deleteMany();
  await (prisma as any).auditLog.deleteMany();
  await (prisma as any).auditSession.deleteMany();
  await (prisma as any).nonconformity.deleteMany();
  await (prisma as any).registryDocument.deleteMany();
  await prisma.executionAssignment.deleteMany();
  await prisma.documentWatcher.deleteMany();
  await prisma.task.deleteMany();
  await prisma.file.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password", 10);

  // ========== ПОЛЬЗОВАТЕЛИ ==========
  console.log("\n👥 Создание пользователей...");
  await prisma.user.createMany({
    data: [
      { name: "Иванов Петр Сергеевич", email: "director@bakery.com", role: "director", password: passwordHash },
      { name: "Смирнова Елена Викторовна", email: "head@bakery.com", role: "head", password: passwordHash },
      { name: "Кузнецов Алексей Иванович", email: "technologist@bakery.com", role: "technologist", password: passwordHash },
      { name: "Волкова Ольга Петровна", email: "auditor@bakery.com", role: "auditor", password: passwordHash },
      { name: "Соколов Дмитрий Андреевич", email: "employee@bakery.com", role: "employee", password: passwordHash },
      { name: "Морозова Анна Сергеевна", email: "journals@bakery.com", role: "journals_admin", password: passwordHash },
    ],
  });

  const [director, head, technologist, auditor, employee, journalsAdmin] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "director@bakery.com" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "head@bakery.com" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "technologist@bakery.com" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "auditor@bakery.com" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "employee@bakery.com" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "journals@bakery.com" } }),
  ]);
  console.log(`   ✅ Создано ${6} пользователей`);

  // ========== ЛОКАЦИИ ==========
  console.log("\n📍 Создание локаций...");
  const [bakeryShop, confectioneryShop, warehouse, rawWarehouse, packagingArea] = await Promise.all([
    prisma.location.create({ data: { name: "Цех выпечки хлеба" } }),
    prisma.location.create({ data: { name: "Кондитерский цех" } }),
    prisma.location.create({ data: { name: "Склад готовой продукции" } }),
    prisma.location.create({ data: { name: "Склад сырья" } }),
    prisma.location.create({ data: { name: "Зона упаковки" } }),
  ]);
  console.log(`   ✅ Создано ${5} локаций`);

  // ========== ОБОРУДОВАНИЕ ==========
  console.log("\n🔧 Создание оборудования...");
  const equipment = await Promise.all([
    // Цех выпечки
    prisma.equipment.create({ data: { name: "Холодильник №1 (молочная продукция)", locationId: bakeryShop.id, type: "fridge", targetTemp: 4, tolerance: 2 } }),
    prisma.equipment.create({ data: { name: "Холодильник №2 (тесто)", locationId: bakeryShop.id, type: "fridge", targetTemp: 2, tolerance: 2 } }),
    prisma.equipment.create({ data: { name: "Печь хлебопекарная №1", locationId: bakeryShop.id, type: "oven", targetTemp: 220, tolerance: 10 } }),
    prisma.equipment.create({ data: { name: "Печь хлебопекарная №2", locationId: bakeryShop.id, type: "oven", targetTemp: 220, tolerance: 10 } }),
    // Кондитерский цех
    prisma.equipment.create({ data: { name: "Холодильник №3 (крем, начинки)", locationId: confectioneryShop.id, type: "fridge", targetTemp: 3, tolerance: 2 } }),
    prisma.equipment.create({ data: { name: "Морозильная камера (полуфабрикаты)", locationId: confectioneryShop.id, type: "freezer", targetTemp: -18, tolerance: 3 } }),
    prisma.equipment.create({ data: { name: "Печь кондитерская", locationId: confectioneryShop.id, type: "oven", targetTemp: 180, tolerance: 10 } }),
    // Склад готовой продукции
    prisma.equipment.create({ data: { name: "Витринный холодильник №1", locationId: warehouse.id, type: "showcase", targetTemp: 6, tolerance: 2 } }),
    prisma.equipment.create({ data: { name: "Витринный холодильник №2", locationId: warehouse.id, type: "showcase", targetTemp: 6, tolerance: 2 } }),
    // Склад сырья
    prisma.equipment.create({ data: { name: "Холодильник №4 (сырьё)", locationId: rawWarehouse.id, type: "fridge", targetTemp: 4, tolerance: 2 } }),
    prisma.equipment.create({ data: { name: "Морозильная камера (сырьё)", locationId: rawWarehouse.id, type: "freezer", targetTemp: -18, tolerance: 3 } }),
  ]);
  console.log(`   ✅ Создано ${equipment.length} единиц оборудования`);

  // ========== СОТРУДНИКИ ==========
  console.log("\n👨‍🍳 Создание справочника сотрудников...");
  await prisma.employee.createMany({
    data: [
      { name: "Петров Иван Иванович", position: "Пекарь", active: true },
      { name: "Смирнова Анна Петровна", position: "Пекарь", active: true },
      { name: "Иванов Сергей Алексеевич", position: "Кондитер", active: true },
      { name: "Кузнецова Мария Дмитриевна", position: "Кондитер", active: true },
      { name: "Сидоров Алексей Викторович", position: "Упаковщик", active: true },
      { name: "Васильева Елена Сергеевна", position: "Кладовщик", active: true },
      { name: "Николаев Дмитрий Петрович", position: "Уборщик", active: true },
      { name: "Федорова Ольга Ивановна", position: "Технолог", active: true },
      { name: "Михайлов Андрей Николаевич", position: "Водитель", active: true },
      { name: "Павлова Татьяна Владимировна", position: "Пекарь", active: false }, // Уволена
    ],
  });
  const employeesList = await prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  console.log(`   ✅ Создано ${employeesList.length} активных сотрудников`);

  // ========== ЖУРНАЛ ТЕМПЕРАТУР (за последние 7 дней) ==========
  console.log("\n🌡️  Создание записей температур за 7 дней...");
  const fridges = equipment.filter(e => e.type === "fridge" || e.type === "showcase" || e.type === "freezer");
  
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = daysAgo(dayOffset);
    for (const eq of fridges) {
      const baseTemp = eq.targetTemp || 0;
      const tolerance = eq.tolerance || 2;
      
      // Генерируем реалистичные температуры с небольшими отклонениями
      const morning = baseTemp + (Math.random() - 0.5) * tolerance * 0.8;
      const day = baseTemp + (Math.random() - 0.5) * tolerance * 0.8;
      const evening = baseTemp + (Math.random() - 0.5) * tolerance * 0.8;
      
      await prisma.temperatureEntry.create({
        data: {
          equipmentId: eq.id,
          userId: journalsAdmin.id,
          date,
          morning: Math.round(morning * 10) / 10,
          day: Math.round(day * 10) / 10,
          evening: Math.round(evening * 10) / 10,
          signedAt: dayOffset > 0 ? date : null, // Сегодняшний день не подписан
        },
      });
    }
  }
  console.log(`   ✅ Создано ${fridges.length * 7} записей температур`);

  // ========== ЖУРНАЛ ЗДОРОВЬЯ (за последние 7 дней) ==========
  console.log("\n🏥 Создание записей здоровья за 7 дней...");
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = daysAgo(dayOffset);
    const healthCheck = await prisma.healthCheck.create({
      data: {
        userId: journalsAdmin.id,
        date,
        signedAt: dayOffset > 0 ? date : null,
      },
    });

    for (const emp of employeesList) {
      let status = "healthy";
      let note = null;

      // Добавляем разнообразие статусов
      if (dayOffset === 2 && emp.name.includes("Кузнецова")) {
        status = "sick";
        note = "Жалобы на недомогание, температура 37.2°C, отстранена от работы";
      } else if (dayOffset === 1 && emp.name.includes("Михайлов")) {
        status = "vacation";
        note = "Плановый отпуск";
      } else if (dayOffset === 0 && emp.name.includes("Николаев")) {
        status = "day_off";
        note = "Выходной по графику";
      }

      await prisma.healthCheckEmployee.create({
        data: {
          checkId: healthCheck.id,
          employeeId: emp.id,
          status,
          note,
        },
      });
    }
  }
  console.log(`   ✅ Создано ${7} записей здоровья`);

  // ========== ДОКУМЕНТЫ И РЕГЛАМЕНТЫ ==========
  console.log("\n📄 Создание документов и регламентов...");
  
  const doc1 = await prisma.document.create({
    data: {
      title: "Инструкция: Мойка и дезинфекция оборудования",
      body: "Порядок проведения мойки и дезинфекции производственного оборудования",
      content: `# Инструкция по мойке и дезинфекции оборудования

## 1. Общие положения
Настоящая инструкция устанавливает порядок проведения мойки и дезинфекции производственного оборудования.

## 2. Периодичность
- Ежедневная мойка после окончания смены
- Генеральная уборка 1 раз в неделю

## 3. Моющие средства
- "Чистодез-Проф" - для мойки поверхностей
- "Санитар-Люкс" - для дезинфекции

## 4. Ответственные лица
- Уборщик производственных помещений
- Контроль: технолог`,
      authorId: technologist.id,
      recipientId: director.id,
      responsibleId: head.id,
      status: "approved",
      currentStep: 2,
      tasks: {
        create: [
          { step: 0, status: "approved", action: "approve", assigneeId: technologist.id, completedAt: daysAgo(10) },
          { step: 1, status: "approved", action: "sign", assigneeId: director.id, completedAt: daysAgo(9) },
          { step: 2, status: "approved", action: "review", assigneeId: head.id, completedAt: daysAgo(8) },
        ],
      },
    },
  });

  const doc2 = await prisma.document.create({
    data: {
      title: "Регламент: Контроль температур холодильного оборудования",
      body: "Порядок контроля температурного режима холодильного оборудования",
      content: `# Регламент контроля температур

## Точки контроля
- Утро: 8:00-9:00
- День: 13:00-14:00
- Вечер: 18:00-19:00

## Допустимые значения
См. паспорта оборудования

## Действия при отклонениях
1. Зафиксировать отклонение
2. Уведомить технолога
3. Вызвать мастера по ремонту
4. Создать несоответствие`,
      authorId: head.id,
      recipientId: director.id,
      responsibleId: technologist.id,
      status: "approved",
      currentStep: 1,
      tasks: {
        create: [
          { step: 0, status: "approved", action: "approve", assigneeId: head.id, completedAt: daysAgo(5) },
          { step: 1, status: "approved", action: "sign", assigneeId: director.id, completedAt: daysAgo(4) },
        ],
      },
    },
  });

  const doc3 = await prisma.document.create({
    data: {
      title: "Инструкция: Приёмка сырья и материалов",
      body: "Порядок приёмки сырья, контроль качества и документов",
      content: `# Инструкция по приёмке сырья

## Обязательные проверки
1. Наличие сертификатов качества
2. Проверка температуры (для охлаждённого/замороженного)
3. Визуальный осмотр упаковки
4. Проверка сроков годности

## Критерии отказа
- Отсутствие документов
- Нарушение температурного режима
- Повреждение упаковки
- Истёкший срок годности`,
      authorId: technologist.id,
      recipientId: director.id,
      responsibleId: head.id,
      status: "in_progress",
      currentStep: 1,
      tasks: {
        create: [
          { step: 0, status: "approved", action: "approve", assigneeId: technologist.id, completedAt: daysAgo(2) },
          { step: 1, status: "pending", action: "sign", assigneeId: director.id },
        ],
      },
    },
  });

  const doc4 = await prisma.document.create({
    data: {
      title: "Технологическая карта: Хлеб пшеничный",
      body: "Технологическая карта производства хлеба пшеничного",
      content: `# Технологическая карта: Хлеб пшеничный

## Рецептура (на 100 кг)
- Мука пшеничная высший сорт: 63 кг
- Вода: 35 л
- Дрожжи прессованные: 1.5 кг
- Соль: 1.5 кг
- Сахар: 2 кг

## Технологический процесс
1. Замес теста: 15 минут
2. Брожение: 3 часа при 28-30°C
3. Формовка
4. Расстойка: 40-50 минут
5. Выпечка: 45 минут при 220-230°C`,
      authorId: technologist.id,
      recipientId: head.id,
      responsibleId: technologist.id,
      status: "approved",
      currentStep: 1,
      tasks: {
        create: [
          { step: 0, status: "approved", action: "approve", assigneeId: technologist.id, completedAt: daysAgo(15) },
          { step: 1, status: "approved", action: "sign", assigneeId: head.id, completedAt: daysAgo(14) },
        ],
      },
    },
  });

  console.log(`   ✅ Создано ${4} документа`);

  // ========== РЕЕСТР ДОКУМЕНТОВ (сертификаты, разрешения) ==========
  console.log("\n📋 Создание записей реестра документов...");
  
  // Создаём дополнительные документы для реестра
  const certDocs = [];
  
  // Сертификаты на сырьё
  for (const supplier of ["ООО 'Мукомол'", "ИП Молочников", "ООО 'СладКо'"]) {
    const certDoc = await prisma.document.create({
      data: {
        title: `Сертификат качества - ${supplier}`,
        body: `Сертификат соответствия продукции требованиям ТР ТС`,
        content: `Сертификат соответствия продукции требованиям ТР ТС`,
        authorId: technologist.id,
        recipientId: head.id,
        status: "approved",
        currentStep: 0,
      },
    });
    certDocs.push(certDoc);
  }

  // Сертификаты на химию
  for (const chemical of ["Чистодез-Проф", "Санитар-Люкс"]) {
    const certDoc = await prisma.document.create({
      data: {
        title: `Сертификат на моющее средство '${chemical}'`,
        body: `Сертификат соответствия моющего средства`,
        content: `Сертификат соответствия моющего средства`,
        authorId: technologist.id,
        recipientId: head.id,
        status: "approved",
        currentStep: 0,
      },
    });
    certDocs.push(certDoc);
  }

  // Медкнижки
  for (let i = 0; i < 5; i++) {
    const medDoc = await prisma.document.create({
      data: {
        title: `Медицинская книжка - ${employeesList[i]?.name || `Сотрудник ${i + 1}`}`,
        body: `Личная медицинская книжка`,
        content: `Личная медицинская книжка`,
        authorId: head.id,
        recipientId: director.id,
        status: "approved",
        currentStep: 0,
      },
    });
    certDocs.push(medDoc);
  }

  // Добавляем записи в реестр
  await (prisma as any).registryDocument.createMany({
    data: [
      // Сырьё
      { documentId: certDocs[0].id, objectType: "сырьё", zone: "Склад сырья", supplier: "ООО 'Мукомол'", expiresAt: daysFromNow(180) },
      { documentId: certDocs[1].id, objectType: "сырьё", zone: "Склад сырья", supplier: "ИП Молочников", expiresAt: daysAgo(5) }, // Просрочен!
      { documentId: certDocs[2].id, objectType: "сырьё", zone: "Склад сырья", supplier: "ООО 'СладКо'", expiresAt: daysFromNow(25) }, // Истекает!
      // Химия
      { documentId: certDocs[3].id, objectType: "chemicals", zone: "Цех выпечки", supplier: "ООО 'ХимПром'", expiresAt: daysFromNow(90) },
      { documentId: certDocs[4].id, objectType: "chemicals", zone: "Кондитерский цех", supplier: "ООО 'ХимПром'", expiresAt: daysFromNow(15) }, // Истекает!
      // Оборудование
      { documentId: doc1.id, objectType: "equipment", zone: "Цех выпечки", supplier: "ООО 'ПечьМаш'", expiresAt: daysFromNow(365) },
      // Персонал
      { documentId: certDocs[5].id, objectType: "personnel", zone: "Цех выпечки", supplier: null, expiresAt: daysFromNow(180) },
      { documentId: certDocs[6].id, objectType: "personnel", zone: "Кондитерский цех", supplier: null, expiresAt: daysAgo(10) }, // Просрочена!
      { documentId: certDocs[7].id, objectType: "personnel", zone: "Склад", supplier: null, expiresAt: daysFromNow(20) }, // Истекает!
      { documentId: certDocs[8].id, objectType: "personnel", zone: "Цех выпечки", supplier: null, expiresAt: daysFromNow(90) },
      { documentId: certDocs[9].id, objectType: "personnel", zone: "Кондитерский цех", supplier: null, expiresAt: daysFromNow(120) },
    ],
  });

  console.log(`   ✅ Создано ${11} записей в реестре`);

  // ========== НЕСООТВЕТСТВИЯ ==========
  console.log("\n⚠️  Создание несоответствий...");
  
  const nonconf1 = await (prisma as any).nonconformity.create({
    data: {
      title: "Превышение температуры в холодильнике №1",
      description: "Обнаружено превышение температуры до +8°C (норма +4°C ±2°C). Возможная причина: неисправность термостата.",
      severity: "critical",
      status: "open",
      createdById: journalsAdmin.id,
      createdAt: daysAgo(3),
      documentId: doc2.id,
    },
  });

  const nonconf2 = await (prisma as any).nonconformity.create({
    data: {
      title: "Просроченный сертификат на молочную продукцию",
      description: "Сертификат качества на молоко от поставщика ИП Молочников истёк 5 дней назад.",
      severity: "critical",
      status: "open",
      createdById: technologist.id,
      createdAt: daysAgo(2),
      documentId: certDocs[1].id,
    },
  });

  const nonconf3 = await (prisma as any).nonconformity.create({
    data: {
      title: "Недостаточная санитарная обработка рабочих поверхностей",
      description: "При проверке обнаружены остатки теста на рабочих поверхностях. Проведено повторное обучение персонала.",
      severity: "major",
      status: "closed",
      createdById: technologist.id,
      closedById: head.id,
      createdAt: daysAgo(7),
      closedAt: daysAgo(5),
      documentId: doc1.id,
    },
  });

  const nonconf4 = await (prisma as any).nonconformity.create({
    data: {
      title: "Нарушение температурного режима при выпечке",
      description: "Температура в печи №2 опустилась до 200°C вместо 220°C. Партия хлеба отправлена на повторную проверку.",
      severity: "major",
      status: "open",
      createdById: journalsAdmin.id,
      createdAt: daysAgo(1),
      documentId: doc4.id,
    },
  });

  const nonconf5 = await (prisma as any).nonconformity.create({
    data: {
      title: "Просроченная медкнижка сотрудника",
      description: "Медицинская книжка кондитера Ивановой С.А. просрочена на 10 дней. Сотрудник отстранён от работы до продления медкнижки.",
      severity: "critical",
      status: "open",
      createdById: head.id,
      createdAt: daysAgo(1),
      documentId: certDocs[6].id,
    },
  });

  console.log(`   ✅ Создано ${5} несоответствий`);

  // ========== HACCP PLAN (CCP) ==========
  console.log("\n🛡️  Создание HACCP Plan (CCP)...");
  
  const ccp1 = await (prisma as any).cCP.create({
    data: {
      process: "Приёмка сырья",
      hazard: "Микробиологическое заражение (сальмонелла, листерия, кишечная палочка)",
      severity: 5,
      probability: 4,
      riskLevel: "high",
      controlMeasures: "Проверка сертификатов качества, визуальный осмотр, контроль температуры при приёмке, проверка целостности упаковки",
      correctiveActions: "Отказ от приёмки партии, возврат поставщику, уведомление руководства, смена поставщика при повторных нарушениях",
      criticalLimits: "Температура охлаждённого сырья: не выше +4°C, замороженного: не выше -18°C. Наличие действующих сертификатов.",
      monitoringProcedure: "Измерение температуры термометром при каждой приёмке, проверка документов, визуальный осмотр",
      responsiblePerson: "Кладовщик Васильева Е.С., контроль: технолог Федорова О.И.",
      status: "active",
      relatedDocumentId: doc3.id,
    },
  });

  const ccp2 = await (prisma as any).cCP.create({
    data: {
      process: "Термообработка (выпечка хлеба)",
      hazard: "Выживание патогенных микроорганизмов, недостаточная пропечка",
      severity: 5,
      probability: 3,
      riskLevel: "high",
      controlMeasures: "Контроль температуры и времени выпечки согласно технологической карте, проверка готовности изделий",
      correctiveActions: "Увеличение времени выпечки, повторная термообработка, утилизация непропечённой партии",
      criticalLimits: "Температура внутри изделия: не ниже +75°C, время выпечки: согласно рецептуре (45 минут при 220-230°C)",
      monitoringProcedure: "Измерение температуры пищевым термометром каждые 2 часа, контроль времени выпечки",
      responsiblePerson: "Пекарь Петров И.И., Смирнова А.П., контроль: технолог",
      status: "active",
      relatedDocumentId: doc4.id,
    },
  });

  const ccp3 = await (prisma as any).cCP.create({
    data: {
      process: "Хранение готовой продукции",
      hazard: "Рост микроорганизмов, порча продукции, плесень",
      severity: 4,
      probability: 4,
      riskLevel: "high",
      controlMeasures: "Контроль температуры в холодильных камерах 3 раза в день, контроль сроков годности",
      correctiveActions: "Регулировка температуры, перемещение продукции в исправное оборудование, вызов мастера по ремонту, утилизация испорченной продукции",
      criticalLimits: "Температура: от 0°C до +6°C для хлебобулочных изделий с кремом, до +25°C для обычного хлеба",
      monitoringProcedure: "Журнал температур (утро/день/вечер), автоматические датчики с сигнализацией",
      responsiblePerson: "Кладовщик Васильева Е.С.",
      status: "active",
      relatedNonconformityId: nonconf1.id,
      relatedDocumentId: doc2.id,
    },
  });

  const ccp4 = await (prisma as any).cCP.create({
    data: {
      process: "Мойка и дезинфекция оборудования",
      hazard: "Перекрёстное загрязнение, химическое загрязнение остатками моющих средств",
      severity: 3,
      probability: 3,
      riskLevel: "medium",
      controlMeasures: "Использование разрешённых моющих средств, соблюдение инструкций, контроль смывов, раздельное хранение инвентаря",
      correctiveActions: "Повторная мойка, замена моющего средства, обучение персонала, лабораторный контроль смывов",
      criticalLimits: "Концентрация моющего раствора согласно инструкции, время экспозиции: не менее 15 минут, полное удаление остатков",
      monitoringProcedure: "Визуальный контроль чистоты ежедневно, лабораторные смывы 1 раз в месяц",
      responsiblePerson: "Уборщик Николаев Д.П., контроль: технолог Федорова О.И.",
      status: "active",
      relatedDocumentId: doc1.id,
      relatedNonconformityId: nonconf3.id,
    },
  });

  const ccp5 = await (prisma as any).cCP.create({
    data: {
      process: "Контроль здоровья персонала",
      hazard: "Заражение продукции от больного персонала (кишечные инфекции, ОРВИ)",
      severity: 5,
      probability: 3,
      riskLevel: "high",
      controlMeasures: "Ежедневный медосмотр перед сменой, наличие действующих медицинских книжек, контроль личной гигиены",
      correctiveActions: "Отстранение от работы, направление к врачу, замена на другого сотрудника, дезинфекция рабочего места",
      criticalLimits: "Отсутствие признаков заболевания (температура, кашель, насморк, кожные высыпания, гнойничковые заболевания)",
      monitoringProcedure: "Журнал здоровья персонала ежедневно, визуальный осмотр, контроль медкнижек 1 раз в квартал",
      responsiblePerson: "Руководитель смены Смирнова Е.В.",
      status: "active",
      relatedNonconformityId: nonconf5.id,
    },
  });

  const ccp6 = await (prisma as any).cCP.create({
    data: {
      process: "Контроль качества воды",
      hazard: "Химическое и микробиологическое загрязнение воды",
      severity: 4,
      probability: 2,
      riskLevel: "medium",
      controlMeasures: "Лабораторные анализы воды, контроль работы фильтров, хлорирование при необходимости",
      correctiveActions: "Замена фильтров, дезинфекция системы водоснабжения, использование бутилированной воды, остановка производства при критических показателях",
      criticalLimits: "Соответствие СанПиН 2.1.4.1074-01 (микробиологические и химические показатели)",
      monitoringProcedure: "Лабораторные анализы 1 раз в квартал, визуальный контроль ежедневно",
      responsiblePerson: "Технолог Федорова О.И.",
      status: "active",
    },
  });

  const ccp7 = await (prisma as any).cCP.create({
    data: {
      process: "Контроль вредителей (дератизация, дезинсекция)",
      hazard: "Заражение продукции от грызунов и насекомых, механическое повреждение упаковки",
      severity: 3,
      probability: 2,
      riskLevel: "medium",
      controlMeasures: "Регулярная дератизация и дезинсекция, контроль наличия следов вредителей, установка ловушек и приманок",
      correctiveActions: "Внеплановая обработка, усиление мер защиты (сетки на окнах, уплотнители на дверях), утилизация заражённой продукции",
      criticalLimits: "Отсутствие следов вредителей (помёт, повреждения упаковки, живые особи)",
      monitoringProcedure: "Визуальный осмотр помещений ежедневно, профессиональная обработка 1 раз в месяц, проверка ловушек еженедельно",
      responsiblePerson: "Руководитель производства Смирнова Е.В.",
      status: "active",
    },
  });

  const ccp8 = await (prisma as any).cCP.create({
    data: {
      process: "Упаковка готовой продукции",
      hazard: "Физическое загрязнение (посторонние предметы, осколки, металлические включения)",
      severity: 2,
      probability: 2,
      riskLevel: "low",
      controlMeasures: "Визуальный контроль, использование металлодетекторов, контроль целостности упаковки",
      correctiveActions: "Изъятие продукции с дефектами, проверка оборудования, замена упаковочного материала",
      criticalLimits: "Отсутствие посторонних предметов, целостность упаковки, правильная маркировка",
      monitoringProcedure: "Визуальный контроль каждой партии, проверка металлодетектором",
      responsiblePerson: "Упаковщик Сидоров А.В.",
      status: "active",
    },
  });

  console.log(`   ✅ Создано ${8} CCP записей`);

  // ========== ДЕЙСТВИЯ ПО CCP ==========
  console.log("\n📝 Создание действий по CCP...");
  await (prisma as any).cCPAction.createMany({
    data: [
      {
        ccpId: ccp1.id,
        actionType: "check",
        description: "Проверка температуры при приёмке партии молока от ИП Молочников",
        takenBy: "Кладовщик Васильева Е.С.",
        result: "Температура +3°C, в пределах нормы. Сертификат качества проверен.",
        takenAt: daysAgo(2),
      },
      {
        ccpId: ccp1.id,
        actionType: "corrective",
        description: "Отказ от приёмки партии муки - повреждена упаковка",
        takenBy: "Кладовщик Васильева Е.С.",
        result: "Партия возвращена поставщику. Составлен акт несоответствия.",
        takenAt: daysAgo(5),
      },
      {
        ccpId: ccp2.id,
        actionType: "check",
        description: "Контроль температуры выпечки хлеба пшеничного",
        takenBy: "Пекарь Петров И.И.",
        result: "Температура внутри изделия +78°C, время выпечки 45 минут - норма",
        takenAt: daysAgo(1),
      },
      {
        ccpId: ccp2.id,
        actionType: "corrective",
        description: "Обнаружено снижение температуры в печи №2 до 200°C",
        takenBy: "Технолог Федорова О.И.",
        result: "Увеличено время выпечки до 55 минут. Вызван мастер для проверки печи. Партия прошла повторный контроль - соответствует.",
        takenAt: daysAgo(1),
      },
      {
        ccpId: ccp3.id,
        actionType: "corrective",
        description: "Превышение температуры в холодильнике №1 до +8°C",
        takenBy: "Технолог Федорова О.И.",
        result: "Продукция перемещена в холодильник №3. Вызван мастер. Обнаружена неисправность термостата. Ремонт выполнен. Создано несоответствие.",
        takenAt: daysAgo(3),
      },
      {
        ccpId: ccp3.id,
        actionType: "check",
        description: "Проверка температуры в витринных холодильниках",
        takenBy: "Кладовщик Васильева Е.С.",
        result: "Холодильник №1: +5°C, Холодильник №2: +6°C - в пределах нормы",
        takenAt: new Date(),
      },
      {
        ccpId: ccp4.id,
        actionType: "check",
        description: "Проверка чистоты оборудования после мойки",
        takenBy: "Технолог Федорова О.И.",
        result: "Оборудование чистое, остатков моющих средств не обнаружено",
        takenAt: new Date(),
      },
      {
        ccpId: ccp4.id,
        actionType: "corrective",
        description: "Обнаружены остатки теста на рабочих поверхностях",
        takenBy: "Технолог Федорова О.И.",
        result: "Проведена повторная мойка. Проведено обучение уборщика. Создано несоответствие.",
        takenAt: daysAgo(7),
      },
      {
        ccpId: ccp5.id,
        actionType: "corrective",
        description: "Сотрудник Кузнецова М.Д. отстранена от работы (жалобы на недомогание, температура 37.2°C)",
        takenBy: "Руководитель смены Смирнова Е.В.",
        result: "Направлена к врачу. Замена найдена - вызван пекарь из резерва.",
        takenAt: daysAgo(2),
      },
      {
        ccpId: ccp5.id,
        actionType: "corrective",
        description: "Обнаружена просроченная медкнижка у кондитера Ивановой С.А.",
        takenBy: "Руководитель производства Смирнова Е.В.",
        result: "Сотрудник отстранён от работы до продления медкнижки. Создано несоответствие.",
        takenAt: daysAgo(1),
      },
      {
        ccpId: ccp6.id,
        actionType: "check",
        description: "Плановый лабораторный анализ воды",
        takenBy: "Технолог Федорова О.И.",
        result: "Все показатели в норме. Протокол анализа №123 от 15.01.2026",
        takenAt: daysAgo(10),
      },
      {
        ccpId: ccp7.id,
        actionType: "check",
        description: "Ежемесячная дератизация и дезинсекция",
        takenBy: "ООО 'СанЭпидемСервис'",
        result: "Обработка проведена. Следов вредителей не обнаружено. Акт выполненных работ №456",
        takenAt: daysAgo(5),
      },
      {
        ccpId: ccp8.id,
        actionType: "check",
        description: "Проверка металлодетектором партии хлеба",
        takenBy: "Упаковщик Сидоров А.В.",
        result: "Металлических включений не обнаружено. Партия допущена к упаковке.",
        takenAt: new Date(),
      },
    ],
  });
  console.log(`   ✅ Создано ${13} действий по CCP`);

  // ========== ЛАБОРАТОРНЫЕ ИССЛЕДОВАНИЯ ==========
  console.log("\n🔬 Создание записей лабораторных исследований...");
  await (prisma as any).labTest.createMany({
    data: [
      {
        date: daysAgo(3),
        testType: "Микробиология",
        batchNumber: "1234",
        supplier: "Собственное производство",
        result: "compliant",
        resultDetails: "Образец: Хлеб пшеничный, партия №1234. КМАФАнМ: 1.2×10³ КОЕ/г (норма до 1×10⁴). Патогенные микроорганизмы не обнаружены.",
        performedBy: "Технолог Федорова О.И.",
        signedAt: daysAgo(3),
      },
      {
        date: daysAgo(5),
        testType: "Химический анализ",
        batchNumber: "5678",
        supplier: "ООО 'Мукомол'",
        result: "compliant",
        resultDetails: "Образец: Мука пшеничная высший сорт. Влажность: 13.5% (норма до 14.5%). Клейковина: 28% (норма 23-40%). Зольность: 0.55% (норма до 0.55%).",
        performedBy: "Технолог Федорова О.И.",
        signedAt: daysAgo(5),
      },
      {
        date: daysAgo(7),
        testType: "Микробиология",
        batchNumber: "9012",
        supplier: "ИП Молочников",
        result: "deviation",
        resultDetails: "Образец: Молоко коровье пастеризованное. Обнаружено превышение КМАФАнМ: 5×10⁵ КОЕ/г (норма до 1×10⁵). Партия забракована.",
        performedBy: "Технолог Федорова О.И.",
        signedAt: daysAgo(7),
        nonconformityId: nonconf2.id,
      },
      {
        date: daysAgo(10),
        testType: "Физические показатели",
        batchNumber: "3456",
        supplier: "Собственное производство",
        result: "compliant",
        resultDetails: "Образец: Хлеб бородинский. Масса: 500±10г. Влажность мякиша: 45% (норма 43-48%). Кислотность: 7° (норма до 12°).",
        performedBy: "Технолог Федорова О.И.",
        signedAt: daysAgo(10),
      },
      {
        date: daysAgo(2),
        testType: "Органолептика",
        batchNumber: "7890",
        supplier: "Собственное производство",
        result: "compliant",
        resultDetails: "Образец: Торт 'Наполеон'. Внешний вид: правильная форма, без деформаций. Вкус и запах: свойственные данному виду изделия. Цвет: равномерный.",
        performedBy: "Технолог Федорова О.И.",
        signedAt: daysAgo(2),
      },
      {
        date: daysAgo(1),
        testType: "Микробиология",
        batchNumber: "СМЫВ-001",
        supplier: null,
        result: "compliant",
        resultDetails: "Образец: Смывы с оборудования (печь №1). БГКП не обнаружены. S.aureus не обнаружен. Санитарное состояние удовлетворительное.",
        performedBy: "Технолог Федорова О.И.",
        signedAt: daysAgo(1),
      },
    ],
  });
  console.log(`   ✅ Создано ${6} лабораторных исследований`);

  // ========== УВЕДОМЛЕНИЯ ==========
  console.log("\n🔔 Создание уведомлений...");
  await (prisma as any).notification.createMany({
    data: [
      {
        userId: director.id,
        type: "task",
        title: "Новая задача: Подписать регламент",
        message: "Требуется подписать документ 'Инструкция: Приёмка сырья и материалов'",
        priority: "high",
        entityType: "document",
        entityId: doc3.id,
        isRead: false,
        createdAt: daysAgo(2),
      },
      {
        userId: head.id,
        type: "critical_deviation",
        title: "Критическое несоответствие",
        message: "Создано несоответствие: Превышение температуры в холодильнике №1",
        priority: "high",
        entityType: "temperature",
        entityId: nonconf1.id,
        isRead: false,
        createdAt: daysAgo(3),
      },
      {
        userId: technologist.id,
        type: "reminder",
        title: "Истекает срок действия сертификата",
        message: "Сертификат качества от ООО 'СладКо' истекает через 25 дней",
        priority: "medium",
        entityType: "document",
        entityId: certDocs[2].id,
        isRead: true,
        createdAt: daysAgo(5),
      },
      {
        userId: journalsAdmin.id,
        type: "reminder",
        title: "Не заполнен журнал температур",
        message: "Журнал температур за сегодня не подписан",
        priority: "medium",
        entityType: "temperature",
        isRead: false,
        createdAt: new Date(),
      },
      {
        userId: head.id,
        type: "critical_deviation",
        title: "Просроченная медкнижка",
        message: "Медицинская книжка кондитера просрочена на 10 дней",
        priority: "high",
        entityType: "document",
        entityId: certDocs[6].id,
        isRead: false,
        createdAt: daysAgo(1),
      },
    ],
  });
  console.log(`   ✅ Создано ${5} уведомлений`);

  // ========== КАТЕГОРИИ СПРАВОЧНИКОВ ==========
  console.log("\n📚 Создание категорий справочников...");
  
  const categories = await Promise.all([
    (prisma as any).masterDataCategory.create({
      data: {
        name: "Сертификаты на сырьё",
        type: "certificate",
        description: "Сертификаты качества на сырьё и ингредиенты",
        color: "#10b981",
        icon: "FileCheck",
        sortOrder: 1,
        active: true,
      },
    }),
    (prisma as any).masterDataCategory.create({
      data: {
        name: "Сертификаты на химию",
        type: "certificate",
        description: "Сертификаты на моющие и дезинфицирующие средства",
        color: "#3b82f6",
        icon: "Droplet",
        sortOrder: 2,
        active: true,
      },
    }),
    (prisma as any).masterDataCategory.create({
      data: {
        name: "Медицинские книжки",
        type: "certificate",
        description: "Медицинские книжки сотрудников",
        color: "#ef4444",
        icon: "Heart",
        sortOrder: 3,
        active: true,
      },
    }),
    (prisma as any).masterDataCategory.create({
      data: {
        name: "Поставщики",
        type: "supplier",
        description: "Список проверенных поставщиков",
        color: "#f59e0b",
        icon: "Truck",
        sortOrder: 4,
        active: true,
      },
    }),
  ]);

  console.log(`   ✅ Создано ${categories.length} категорий`);

  // ========== ЭЛЕМЕНТЫ СПРАВОЧНИКОВ ==========
  console.log("\n📋 Создание элементов справочников...");

  const items = await Promise.all([
    // Сертификаты на сырьё
    (prisma as any).masterDataItem.create({
      data: {
        categoryId: categories[0].id,
        name: "Мука пшеничная высший сорт",
        description: "Сертификат качества на муку от ООО 'Мельник'",
        supplier: "ООО 'Мельник'",
        expiresAt: daysFromNow(45),
        active: true,
        metadata: {
          batchNumber: "МП-2024-001",
          certificateNumber: "СК-12345",
        },
      },
    }),
    (prisma as any).masterDataItem.create({
      data: {
        categoryId: categories[0].id,
        name: "Молоко пастеризованное 3.2%",
        description: "Сертификат качества на молоко от ООО 'Молочный завод'",
        supplier: "ООО 'Молочный завод'",
        expiresAt: daysAgo(5),
        active: true,
        metadata: {
          batchNumber: "МЛ-2024-089",
          certificateNumber: "СК-67890",
        },
      },
    }),
    (prisma as any).masterDataItem.create({
      data: {
        categoryId: categories[0].id,
        name: "Сахар-песок",
        description: "Сертификат качества на сахар от ООО 'Сладкий мир'",
        supplier: "ООО 'Сладкий мир'",
        expiresAt: daysFromNow(120),
        active: true,
        metadata: {
          batchNumber: "СХ-2024-034",
          certificateNumber: "СК-11223",
        },
      },
    }),
    // Сертификаты на химию
    (prisma as any).masterDataItem.create({
      data: {
        categoryId: categories[1].id,
        name: "Моющее средство 'Чистодез'",
        description: "Сертификат на моющее средство для пищевого производства",
        supplier: "ООО 'ХимПром'",
        expiresAt: daysFromNow(90),
        active: true,
        metadata: {
          certificateNumber: "ХМ-45678",
          concentration: "5%",
        },
      },
    }),
    (prisma as any).masterDataItem.create({
      data: {
        categoryId: categories[1].id,
        name: "Дезинфицирующее средство 'Санитар'",
        description: "Сертификат на дезсредство для обработки поверхностей",
        supplier: "ООО 'Санитария'",
        expiresAt: daysFromNow(20),
        active: true,
        metadata: {
          certificateNumber: "ДЗ-98765",
          concentration: "3%",
        },
      },
    }),
    // Медицинские книжки
    (prisma as any).masterDataItem.create({
      data: {
        categoryId: categories[2].id,
        name: "Медкнижка - Петров И.С. (пекарь)",
        description: "Медицинская книжка пекаря Петрова Ивана Сергеевича",
        expiresAt: daysFromNow(180),
        active: true,
        metadata: {
          employeeName: "Петров Иван Сергеевич",
          position: "Пекарь",
          medBookNumber: "МК-123456",
        },
      },
    }),
    (prisma as any).masterDataItem.create({
      data: {
        categoryId: categories[2].id,
        name: "Медкнижка - Сидорова А.В. (кондитер)",
        description: "Медицинская книжка кондитера Сидоровой Анны Владимировны",
        expiresAt: daysAgo(10),
        active: true,
        metadata: {
          employeeName: "Сидорова Анна Владимировна",
          position: "Кондитер",
          medBookNumber: "МК-789012",
        },
      },
    }),
    // Поставщики
    (prisma as any).masterDataItem.create({
      data: {
        categoryId: categories[3].id,
        name: "ООО 'Мельник'",
        description: "Поставщик муки и зерновых продуктов",
        supplier: "ООО 'Мельник'",
        active: true,
        metadata: {
          inn: "7701234567",
          address: "г. Москва, ул. Мельничная, д. 10",
          phone: "+7 (495) 123-45-67",
          contactPerson: "Иванов Петр",
        },
      },
    }),
    (prisma as any).masterDataItem.create({
      data: {
        categoryId: categories[3].id,
        name: "ООО 'Молочный завод'",
        description: "Поставщик молочной продукции",
        supplier: "ООО 'Молочный завод'",
        active: true,
        metadata: {
          inn: "7702345678",
          address: "г. Москва, ул. Молочная, д. 5",
          phone: "+7 (495) 234-56-78",
          contactPerson: "Смирнова Елена",
        },
      },
    }),
  ]);

  console.log(`   ✅ Создано ${items.length} элементов справочников`);

  // ========== ФИНАЛЬНАЯ СТАТИСТИКА ==========
  console.log("\n============================================================");
  console.log("✅ ТЕСТОВЫЕ ДАННЫЕ ДЛЯ ПЕКАРНИ 'ХЛЕБНЫЙ ДОМ' СОЗДАНЫ!");
  console.log("============================================================");
  
  console.log("\n📊 Статистика:");
  console.log(`   👥 Пользователей: 6`);
  console.log(`   📍 Локаций: 5`);
  console.log(`   🔧 Оборудования: 11`);
  console.log(`   👨‍🍳 Сотрудников: 9`);
  console.log(`   🌡️  Записей температур: 56`);
  console.log(`   🏥 Записей здоровья: 7`);
  console.log(`   📄 Документов: ${4 + certDocs.length}`);
  console.log(`   📋 Записей реестра: 11`);
  console.log(`   ⚠️  Несоответствий: 5 (3 открытых, 2 закрытых)`);
  console.log(`   🛡️  CCP записей: 8`);
  console.log(`   📝 Действий по CCP: 13`);
  console.log(`   🔬 Лабораторных исследований: 6`);
  console.log(`   🔔 Уведомлений: 5`);
  console.log(`   📚 Категорий справочников: ${categories.length}`);
  console.log(`   📋 Элементов справочников: ${items.length}`);
  
  console.log("\n🔑 Учётные данные для входа:");
  console.log("   📧 Email: director@bakery.com (или любой другой)");
  console.log("   🔒 Пароль: password");
  
  console.log("\n📌 Что можно протестировать:");
  console.log("   ✅ Журналы температур (7 дней истории)");
  console.log("   ✅ Журналы здоровья (7 дней истории)");
  console.log("   ✅ Лабораторные исследования (с отклонениями)");
  console.log("   ✅ HACCP Plan (8 CCP с действиями)");
  console.log("   ✅ Документы и регламенты (разные статусы)");
  console.log("   ✅ Реестр документов (просроченные и истекающие)");
  console.log("   ✅ Несоответствия (открытые и закрытые)");
  console.log("   ✅ Уведомления");
  console.log("   ✅ Dashboard с метриками");
  console.log("   ✅ Audit Checklist");
  console.log("   ✅ Пакет аудитора");
  console.log("   ✅ Справочники с категориями");
  console.log("\n🎉 Готово к тестированию!\n");
}

main()
  .catch((e) => {
    console.error("❌ Ошибка при создании тестовых данных:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
