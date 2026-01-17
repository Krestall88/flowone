-- CreateTable
CREATE TABLE "Nonconformity" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'critical',
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "closedById" INTEGER,
    "documentId" INTEGER,

    CONSTRAINT "Nonconformity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Nonconformity" ADD CONSTRAINT "Nonconformity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nonconformity" ADD CONSTRAINT "Nonconformity_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nonconformity" ADD CONSTRAINT "Nonconformity_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
