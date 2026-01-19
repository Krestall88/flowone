import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getInboxCount } from "@/lib/inbox-count";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MasterDataManager } from "@/components/master-data/master-data-manager";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export default async function MasterDataPage() {
  const user = await requireUser();
  const userId = Number(user.id);

  const [inboxCount, employees, locations, equipment] = await Promise.all([
    getInboxCount(userId),
    prisma.employee.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.equipment.findMany({ include: { location: true }, orderBy: { name: "asc" } }),
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
          <Breadcrumb items={[{ label: "Справочники" }]} />
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                Справочники
              </h1>
              <InfoTooltip
                content={
                  <div className="space-y-2">
                    <p className="font-semibold">Базовые данные системы</p>
                    <p className="text-xs">Управление основными справочниками:</p>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li>Сотрудники (имя, должность, статус)</li>
                      <li>Локации (цеха, склады, зоны)</li>
                      <li>Оборудование (холодильники, печи)</li>
                    </ul>
                    <p className="text-xs text-slate-300 mt-2">
                      <strong>Примечание:</strong> Сертификаты хранятся в Реестре документов (/registry), а не здесь. В будущем планируется добавить управление категориями сертификатов.
                    </p>
                  </div>
                }
              />
            </div>
            <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
              Единый экран для управления сотрудниками, помещениями и оборудованием.
            </p>
          </div>

          <MasterDataManager
            employees={employees.map((e) => ({
              id: e.id,
              name: e.name,
              position: e.position,
              active: e.active,
            }))}
            locations={locations.map((l) => ({ id: l.id, name: l.name }))}
            equipment={equipment.map((eq) => ({
              id: eq.id,
              name: eq.name,
              locationId: eq.locationId,
              locationName: eq.location.name,
              type: eq.type,
              targetTemp: eq.targetTemp,
              tolerance: eq.tolerance,
            }))}
            currentUserRole={user.role}
          />
        </div>
      </main>
    </div>
  );
}
