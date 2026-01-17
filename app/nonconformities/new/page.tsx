import { isReadOnlyRole, requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NonconformityForm } from "@/components/nonconformities/nonconformity-form";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function NewNonconformityPage({
  searchParams,
}: {
  searchParams?: { documentId?: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);

  if (isReadOnlyRole(user.role)) {
    redirect("/nonconformities");
  }

  const inboxCount = await getInboxCount(userId);
  const documentId = searchParams?.documentId ? Number(searchParams.documentId) : null;

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
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-12">
          <Breadcrumb items={[{ label: "Несоответствия", href: "/nonconformities" }, { label: "Создать несоответствие" }]} />
          <NonconformityForm defaultDocumentId={documentId && !Number.isNaN(documentId) ? documentId : null} />
        </div>
      </main>
    </div>
  );
}
