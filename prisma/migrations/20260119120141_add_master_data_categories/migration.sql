-- CreateTable
CREATE TABLE "CCP" (
    "id" SERIAL NOT NULL,
    "process" TEXT NOT NULL,
    "hazard" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "controlMeasures" TEXT NOT NULL,
    "correctiveActions" TEXT NOT NULL,
    "criticalLimits" TEXT,
    "monitoringProcedure" TEXT,
    "responsiblePerson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "relatedDocumentId" INTEGER,
    "relatedNonconformityId" INTEGER,

    CONSTRAINT "CCP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CCPAction" (
    "id" SERIAL NOT NULL,
    "ccpId" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takenBy" TEXT,
    "result" TEXT,

    CONSTRAINT "CCPAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "testType" TEXT NOT NULL,
    "batchNumber" TEXT,
    "supplier" TEXT,
    "result" TEXT NOT NULL DEFAULT 'compliant',
    "resultDetails" TEXT,
    "reportFileUrl" TEXT,
    "reportFileName" TEXT,
    "performedBy" TEXT,
    "signedAt" TIMESTAMP(3),
    "registryDocumentId" INTEGER,
    "nonconformityId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "entityType" TEXT,
    "entityId" INTEGER,
    "userId" INTEGER,
    "targetRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterDataCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'certificate',
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterDataCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterDataItem" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "documentId" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "supplier" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterDataItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CCP" ADD CONSTRAINT "CCP_relatedDocumentId_fkey" FOREIGN KEY ("relatedDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CCP" ADD CONSTRAINT "CCP_relatedNonconformityId_fkey" FOREIGN KEY ("relatedNonconformityId") REFERENCES "Nonconformity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CCPAction" ADD CONSTRAINT "CCPAction_ccpId_fkey" FOREIGN KEY ("ccpId") REFERENCES "CCP"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_registryDocumentId_fkey" FOREIGN KEY ("registryDocumentId") REFERENCES "RegistryDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_nonconformityId_fkey" FOREIGN KEY ("nonconformityId") REFERENCES "Nonconformity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterDataItem" ADD CONSTRAINT "MasterDataItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MasterDataCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
