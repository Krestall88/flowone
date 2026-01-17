import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CCPForm } from "@/components/haccp/ccp-form";

export default async function NewCCPPage() {
  const user = await requireUser();
  const userId = Number(user.id);
  const inboxCount = await getInboxCount(userId);

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
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-12">
          <Breadcrumb 
            items={[
              { label: "HACCP Plan", href: "/haccp-plan" }, 
              { label: "Создать CCP" }
            ]} 
          />

          <CCPForm />
        </div>
      </main>
    </div>
  );
}
