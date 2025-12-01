import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== USERS ===");
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
    orderBy: { id: "asc" },
  });
  console.table(users);

  console.log("\n=== HEALTH CHECKS (last 20) ===");
  const healthChecks = await prisma.healthCheck.findMany({
    select: {
      id: true,
      date: true,
      userId: true,
      signedAt: true,
      _count: { select: { entries: true } },
    },
    orderBy: { date: "desc" },
    take: 20,
  });
  console.table(
    healthChecks.map((h) => ({
      id: h.id,
      date: h.date.toISOString(),
      userId: h.userId,
      signedAt: h.signedAt?.toISOString() ?? null,
      entriesCount: h._count.entries,
    }))
  );

  console.log("\n=== TEMPERATURE ENTRIES (last 20) ===");
  const tempEntries = await prisma.temperatureEntry.findMany({
    select: {
      id: true,
      equipmentId: true,
      date: true,
      morning: true,
      evening: true,
      userId: true,
    },
    orderBy: { date: "desc" },
    take: 20,
  });
  console.table(
    tempEntries.map((t) => ({
      id: t.id,
      equipmentId: t.equipmentId,
      date: t.date.toISOString(),
      morning: t.morning,
      evening: t.evening,
      userId: t.userId,
    }))
  );

  // Проверим конкретно даты 29.11, 30.11, 01.12
  console.log("\n=== HEALTH CHECKS for specific dates ===");
  const specificHealthChecks = await prisma.healthCheck.findMany({
    where: {
      date: {
        gte: new Date("2025-11-29"),
        lte: new Date("2025-12-02"),
      },
    },
    include: {
      user: { select: { email: true } },
      entries: { select: { employeeId: true, status: true } },
    },
    orderBy: { date: "asc" },
  });

  for (const check of specificHealthChecks) {
    console.log(`\nHealthCheck #${check.id}:`);
    console.log(`  date: ${check.date.toISOString()}`);
    console.log(`  userId: ${check.userId} (${check.user.email})`);
    console.log(`  entries: ${check.entries.length}`);
  }

  console.log("\n=== TEMPERATURE ENTRIES for specific dates ===");
  const specificTempEntries = await prisma.temperatureEntry.findMany({
    where: {
      date: {
        gte: new Date("2025-11-29"),
        lte: new Date("2025-12-02"),
      },
    },
    include: {
      equipment: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { equipmentId: "asc" }],
  });

  for (const entry of specificTempEntries) {
    console.log(
      `TempEntry #${entry.id}: eq=${entry.equipmentId} (${entry.equipment.name}), date=${entry.date.toISOString()}, m=${entry.morning}, e=${entry.evening}, userId=${entry.userId}`
    );
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
