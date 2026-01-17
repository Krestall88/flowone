import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NonconformitiesList } from "@/components/nonconformities/nonconformities-list";

export default async function NonconformitiesPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);

  const status = (searchParams?.status ?? "open").trim();

  const [inboxCount, items] = await Promise.all([
    getInboxCount(userId),
    (prisma as any).nonconformity.findMany({
      where: {
        ...(status === "open" ? { status: "open" } : status === "closed" ? { status: "closed" } : {}),
      },
      include: {
        createdBy: { select: { name: true } },
        closedBy: { select: { name: true } },
        document: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <AppSidebar
        user={{
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          role: user.role,
        }}
        inboxCount={inboxCount}
      />

      <main className="lg:ml-64">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
          <NonconformitiesList
            status={status === "closed" ? "closed" : "open"}
            currentUserRole={user.role}
            items={(items as any[]).map((i: any) => ({
              id: i.id,
              title: i.title,
              description: i.description,
              severity: i.severity,
              status: i.status,
              createdAt: i.createdAt.toISOString(),
              closedAt: i.closedAt ? i.closedAt.toISOString() : null,
              createdBy: { name: i.createdBy.name },
              closedBy: i.closedBy ? { name: i.closedBy.name } : null,
              document: i.document ? { id: i.document.id, title: i.document.title } : null,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
