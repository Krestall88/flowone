import { prisma } from "@/lib/prisma";

export async function getInboxCount(userId: number): Promise<number> {
  return prisma.document.count({
    where: {
      AND: [
        {
          tasks: {
            some: {
              assigneeId: userId,
              status: "pending",
            },
          },
        },
        {
          OR: [
            { responsibleId: userId },
            { authorId: userId },
            {
              tasks: {
                some: {
                  assigneeId: userId,
                },
              },
            },
          ],
        },
      ],
    },
  });
}
