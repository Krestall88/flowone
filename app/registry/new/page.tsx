import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
import { isReadOnlyRole, requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { RegistryDocumentForm } from "@/components/registry/registry-document-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function NewRegistryDocumentPage({
  searchParams,
}: {
  searchParams?: { documentId?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);

  if (isReadOnlyRole(user.role)) {
    redirect("/registry");
  }

  const documentId = searchParams?.documentId ? Number(searchParams.documentId) : null;
  if (!documentId || Number.isNaN(documentId)) {
    redirect("/registry");
  }

  const [inboxCount, document, existingRegistry] = await Promise.all([
    getInboxCount(userId),
    prisma.document.findUnique({
      where: { id: documentId },
    }),
    (prisma as any).registryDocument.findUnique({
      where: { documentId },
      select: { id: true },
    }),
  ]);

  if (!document) {
    redirect("/registry");
  }

  if (existingRegistry) {
    redirect(`/registry?documentId=${documentId}`);
  }

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
          <Breadcrumb items={[{ label: "Реестр", href: "/registry" }, { label: "Добавить в реестр" }]} />
          <RegistryDocumentForm documentId={documentId} documentTitle={document.title} currentUserRole={user.role} />
        </div>
      </main>
    </div>
  );
}
