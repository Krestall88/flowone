-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "auditSessionId" INTEGER;

-- CreateTable
CREATE TABLE "AuditSession" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "auditType" TEXT NOT NULL,
    "auditorName" TEXT,
    "auditorOrg" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "initiatedByUserId" INTEGER NOT NULL,
    "comment" TEXT,

    CONSTRAINT "AuditSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_auditSessionId_fkey" FOREIGN KEY ("auditSessionId") REFERENCES "AuditSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditSession" ADD CONSTRAINT "AuditSession_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
