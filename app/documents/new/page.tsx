import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DocumentCreationForm } from "@/components/documents/document-creation-form";
import { getInboxCount } from "@/lib/inbox-count";

export default async function NewDocumentPage() {
  const user = await requireUser();
  const userId = Number(user.id);

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
        <DocumentCreationForm 
          users={users} 
          currentUser={{
            id: user.id,
            name: user.name ?? null,
            email: user.email ?? null,
            role: user.role,
          }} 
        />
      </main>
    </div>
  );
}
