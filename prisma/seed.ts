import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
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
