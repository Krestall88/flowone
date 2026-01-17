import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DocumentImportForm } from "@/components/documents/document-import-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function DocumentImportPage() {
  const user = await requireUser();
  const userId = Number(user.id);

  if (isReadOnlyRole(user.role)) {
    redirect("/documents");
  }

  const [users, inboxCount] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    getInboxCount(userId),
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
          <Breadcrumb items={[{ label: "Документы", href: "/documents" }, { label: "Импорт документа" }]} />
          <DocumentImportForm
          users={users}
          currentUser={{
            id: user.id,
            name: user.name ?? null,
            email: user.email ?? null,
            role: user.role,
          }}
        />
        </div>
      </main>
    </div>
  );
}
