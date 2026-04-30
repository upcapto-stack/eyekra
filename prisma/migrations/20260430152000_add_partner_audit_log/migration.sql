-- CreateTable
CREATE TABLE "PartnerAuditLog" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerAuditLog_partnerId_createdAt_idx" ON "PartnerAuditLog"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerAuditLog_action_createdAt_idx" ON "PartnerAuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "PartnerAuditLog" ADD CONSTRAINT "PartnerAuditLog_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
