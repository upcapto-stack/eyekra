-- CreateEnum
CREATE TYPE "PartnerShiftState" AS ENUM ('OFFLINE', 'ONLINE', 'READY', 'IN_FIELD', 'RETURNING');

-- CreateEnum
CREATE TYPE "BookingFieldStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'OTP_VERIFIED', 'SESSION_ACTIVE', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EquipmentEventType" AS ENUM ('CHECKOUT', 'RETURN');

-- CreateEnum
CREATE TYPE "EyeTestStep" AS ENUM ('VISION', 'REFRACTION', 'IOP', 'COLOR_VISION', 'NOTES', 'REVIEW');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "eyeTestSessionId" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "arrivedAt" TIMESTAMP(3),
ADD COLUMN     "assignedPartnerId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "fieldStatus" "BookingFieldStatus" NOT NULL DEFAULT 'ASSIGNED',
ADD COLUMN     "otpVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "sessionStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "shiftState" "PartnerShiftState" NOT NULL,
    "punchInAt" TIMESTAMP(3),
    "punchOutAt" TIMESTAMP(3),
    "punchInGeo" JSONB,
    "punchOutGeo" JSONB,
    "punchInSelfieUrl" TEXT,
    "punchOutSelfieUrl" TEXT,
    "punchInLiveness" BOOLEAN NOT NULL DEFAULT false,
    "punchOutLiveness" BOOLEAN NOT NULL DEFAULT false,
    "deviceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerDeviceBinding" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT,
    "appVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerDeviceBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentAssignment" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "checklist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentEvent" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "type" "EquipmentEventType" NOT NULL,
    "checklist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentDamageReport" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "photoUrl" TEXT,
    "note" TEXT NOT NULL,
    "severity" TEXT DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentDamageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "partnerId" TEXT,
    "fromStatus" "BookingFieldStatus",
    "toStatus" "BookingFieldStatus" NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyTracking" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stoppedAt" TIMESTAMP(3),
    "gpsPath" JSONB,
    "audioUrl" TEXT,
    "recordingActive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "JourneyTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EyeTestSession" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "finalData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EyeTestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EyeTestStepData" (
    "id" TEXT NOT NULL,
    "eyeTestSessionId" TEXT NOT NULL,
    "step" "EyeTestStep" NOT NULL,
    "payload" JSONB NOT NULL,
    "savedByPartnerId" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EyeTestStepData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerEarningLedger" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "orderId" TEXT,
    "earningType" TEXT NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "incentiveAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerEarningLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceLog_partnerId_createdAt_idx" ON "AttendanceLog"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerDeviceBinding_partnerId_isActive_idx" ON "PartnerDeviceBinding"("partnerId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerDeviceBinding_partnerId_deviceId_key" ON "PartnerDeviceBinding"("partnerId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentItem_sku_key" ON "EquipmentItem"("sku");

-- CreateIndex
CREATE INDEX "EquipmentAssignment_partnerId_isActive_idx" ON "EquipmentAssignment"("partnerId", "isActive");

-- CreateIndex
CREATE INDEX "EquipmentAssignment_equipmentId_isActive_idx" ON "EquipmentAssignment"("equipmentId", "isActive");

-- CreateIndex
CREATE INDEX "EquipmentEvent_partnerId_createdAt_idx" ON "EquipmentEvent"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "EquipmentEvent_equipmentId_createdAt_idx" ON "EquipmentEvent"("equipmentId", "createdAt");

-- CreateIndex
CREATE INDEX "EquipmentDamageReport_partnerId_createdAt_idx" ON "EquipmentDamageReport"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_createdAt_idx" ON "BookingEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyTracking_bookingId_key" ON "JourneyTracking"("bookingId");

-- CreateIndex
CREATE INDEX "JourneyTracking_partnerId_startedAt_idx" ON "JourneyTracking"("partnerId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EyeTestSession_bookingId_key" ON "EyeTestSession"("bookingId");

-- CreateIndex
CREATE INDEX "EyeTestSession_partnerId_createdAt_idx" ON "EyeTestSession"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "EyeTestSession_customerId_createdAt_idx" ON "EyeTestSession"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "EyeTestStepData_savedByPartnerId_createdAt_idx" ON "EyeTestStepData"("savedByPartnerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EyeTestStepData_eyeTestSessionId_step_key" ON "EyeTestStepData"("eyeTestSessionId", "step");

-- CreateIndex
CREATE INDEX "PartnerEarningLedger_partnerId_createdAt_idx" ON "PartnerEarningLedger"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerEarningLedger_bookingId_idx" ON "PartnerEarningLedger"("bookingId");

-- CreateIndex
CREATE INDEX "PartnerEarningLedger_orderId_idx" ON "PartnerEarningLedger"("orderId");

-- CreateIndex
CREATE INDEX "Order_eyeTestSessionId_idx" ON "Order"("eyeTestSessionId");

-- CreateIndex
CREATE INDEX "Booking_assignedPartnerId_fieldStatus_idx" ON "Booking"("assignedPartnerId", "fieldStatus");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_eyeTestSessionId_fkey" FOREIGN KEY ("eyeTestSessionId") REFERENCES "EyeTestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assignedPartnerId_fkey" FOREIGN KEY ("assignedPartnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerDeviceBinding" ADD CONSTRAINT "PartnerDeviceBinding_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAssignment" ADD CONSTRAINT "EquipmentAssignment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAssignment" ADD CONSTRAINT "EquipmentAssignment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentEvent" ADD CONSTRAINT "EquipmentEvent_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentEvent" ADD CONSTRAINT "EquipmentEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentEvent" ADD CONSTRAINT "EquipmentEvent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EquipmentAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDamageReport" ADD CONSTRAINT "EquipmentDamageReport_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDamageReport" ADD CONSTRAINT "EquipmentDamageReport_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDamageReport" ADD CONSTRAINT "EquipmentDamageReport_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EquipmentAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyTracking" ADD CONSTRAINT "JourneyTracking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyTracking" ADD CONSTRAINT "JourneyTracking_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EyeTestSession" ADD CONSTRAINT "EyeTestSession_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EyeTestSession" ADD CONSTRAINT "EyeTestSession_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EyeTestSession" ADD CONSTRAINT "EyeTestSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EyeTestStepData" ADD CONSTRAINT "EyeTestStepData_eyeTestSessionId_fkey" FOREIGN KEY ("eyeTestSessionId") REFERENCES "EyeTestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EyeTestStepData" ADD CONSTRAINT "EyeTestStepData_savedByPartnerId_fkey" FOREIGN KEY ("savedByPartnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEarningLedger" ADD CONSTRAINT "PartnerEarningLedger_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEarningLedger" ADD CONSTRAINT "PartnerEarningLedger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEarningLedger" ADD CONSTRAINT "PartnerEarningLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

