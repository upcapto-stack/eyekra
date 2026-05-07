-- CreateEnum
CREATE TYPE "StockUnitStatus" AS ENUM (
  'IN_STOCK',
  'RESERVED',
  'WITH_PARTNER',
  'WITH_CUSTOMER',
  'IN_LAB',
  'IN_TRANSIT',
  'SOLD',
  'LOST',
  'DAMAGED',
  'RETURNED_TO_VENDOR'
);

-- CreateTable
CREATE TABLE "StockUnit" (
  "id" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "barcode" TEXT,
  "variantId" TEXT,
  "lensBlankId" TEXT,
  "status" "StockUnitStatus" NOT NULL DEFAULT 'IN_STOCK',
  "currentWarehouseId" TEXT,
  "currentPartnerId" TEXT,
  "currentBookingId" TEXT,
  "currentOrderId" TEXT,
  "costPrice" DECIMAL(12,2) NOT NULL,
  "vendorBatchNo" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "soldAt" TIMESTAMP(3),
  "lostAt" TIMESTAMP(3),
  "damagedAt" TIMESTAMP(3),
  "createdFromGrnLineId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StockUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockUnitEvent" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "fromStatus" "StockUnitStatus",
  "toStatus" "StockUnitStatus" NOT NULL,
  "fromWarehouseId" TEXT,
  "toWarehouseId" TEXT,
  "partnerId" TEXT,
  "bookingId" TEXT,
  "orderId" TEXT,
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockUnitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockUnit_serialNumber_key" ON "StockUnit"("serialNumber");
CREATE UNIQUE INDEX "StockUnit_barcode_key" ON "StockUnit"("barcode");
CREATE INDEX "StockUnit_variantId_status_idx" ON "StockUnit"("variantId", "status");
CREATE INDEX "StockUnit_lensBlankId_status_idx" ON "StockUnit"("lensBlankId", "status");
CREATE INDEX "StockUnit_currentWarehouseId_status_idx" ON "StockUnit"("currentWarehouseId", "status");
CREATE INDEX "StockUnit_status_idx" ON "StockUnit"("status");
CREATE INDEX "StockUnit_currentPartnerId_status_idx" ON "StockUnit"("currentPartnerId", "status");
CREATE INDEX "StockUnit_currentOrderId_idx" ON "StockUnit"("currentOrderId");
CREATE INDEX "StockUnit_currentBookingId_idx" ON "StockUnit"("currentBookingId");
CREATE INDEX "StockUnitEvent_unitId_createdAt_idx" ON "StockUnitEvent"("unitId", "createdAt");
CREATE INDEX "StockUnitEvent_toStatus_idx" ON "StockUnitEvent"("toStatus");

-- AddForeignKey
ALTER TABLE "StockUnit" ADD CONSTRAINT "StockUnit_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockUnit" ADD CONSTRAINT "StockUnit_lensBlankId_fkey" FOREIGN KEY ("lensBlankId") REFERENCES "LensBlank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockUnit" ADD CONSTRAINT "StockUnit_currentWarehouseId_fkey" FOREIGN KEY ("currentWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockUnit" ADD CONSTRAINT "StockUnit_currentPartnerId_fkey" FOREIGN KEY ("currentPartnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockUnit" ADD CONSTRAINT "StockUnit_currentBookingId_fkey" FOREIGN KEY ("currentBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockUnit" ADD CONSTRAINT "StockUnit_currentOrderId_fkey" FOREIGN KEY ("currentOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockUnitEvent" ADD CONSTRAINT "StockUnitEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "StockUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockUnitEvent" ADD CONSTRAINT "StockUnitEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
