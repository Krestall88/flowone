import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CCPForm } from "@/components/haccp/ccp-form";
import { notFound } from "next/navigation";

export default async function EditCCPPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const userId = Number(user.id);
  const ccpId = Number(params.id);

  const [inboxCount, ccp] = await Promise.all([
    getInboxCount(userId),
    prisma.cCP.findUnique({
      where: { id: ccpId },
    }),
  ]);

  if (!ccp) {
    notFound();
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
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-12">
          <Breadcrumb 
            items={[
              { label: "HACCP Plan", href: "/haccp-plan" }, 
              { label: `Редактировать: ${ccp.process}` }
            ]} 
          />

          <CCPForm
            initialData={{
              id: ccp.id,
              process: ccp.process,
              hazard: ccp.hazard,
              riskLevel: ccp.riskLevel,
              controlMeasures: ccp.controlMeasures,
              correctiveActions: ccp.correctiveActions,
              criticalLimits: ccp.criticalLimits || undefined,
              monitoringProcedure: ccp.monitoringProcedure || undefined,
              responsiblePerson: ccp.responsiblePerson || undefined,
              relatedDocumentId: ccp.relatedDocumentId || undefined,
              relatedNonconformityId: ccp.relatedNonconformityId || undefined,
            }}
          />
        </div>
      </main>
    </div>
  );
}
