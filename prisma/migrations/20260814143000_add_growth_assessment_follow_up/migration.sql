-- CreateEnum
CREATE TYPE "GrowthMeasurementMethod" AS ENUM ('RECUMBENT_LENGTH', 'STANDING_HEIGHT');

-- AlterTable
ALTER TABLE "GrowthRecord" ADD COLUMN "measurementMethod" "GrowthMeasurementMethod";

-- CreateTable
CREATE TABLE "GrowthFollowUp" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "scheduledByUserId" UUID NOT NULL,
    "sourceGrowthRecordId" UUID NOT NULL,
    "dueDate" DATE NOT NULL,
    "completedAt" TIMESTAMPTZ(3),
    "completedByGrowthRecordId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GrowthFollowUp_pkey" PRIMARY KEY ("id")
);

-- RLS defense in depth: direct anon/authenticated access has no policies.
ALTER TABLE "GrowthFollowUp" ENABLE ROW LEVEL SECURITY;

-- CreateIndex
CREATE UNIQUE INDEX "GrowthFollowUp_sourceGrowthRecordId_key" ON "GrowthFollowUp"("sourceGrowthRecordId");
CREATE INDEX "GrowthFollowUp_childId_dueDate_idx" ON "GrowthFollowUp"("childId", "dueDate");
CREATE INDEX "GrowthFollowUp_completedAt_idx" ON "GrowthFollowUp"("completedAt");
CREATE INDEX "GrowthFollowUp_scheduledByUserId_idx" ON "GrowthFollowUp"("scheduledByUserId");
CREATE INDEX "GrowthFollowUp_completedByGrowthRecordId_idx" ON "GrowthFollowUp"("completedByGrowthRecordId");
CREATE UNIQUE INDEX "Alert_type_sourceType_sourceId_key" ON "Alert"("type", "sourceType", "sourceId");
CREATE UNIQUE INDEX "GrowthReference_standardName_standardVersion_sex_indicator__key" ON "GrowthReference"("standardName", "standardVersion", "sex", "indicator", "ageReference");
CREATE UNIQUE INDEX "Notification_alertId_guardianId_channel_key" ON "Notification"("alertId", "guardianId", "channel");

-- AddForeignKey
ALTER TABLE "GrowthFollowUp" ADD CONSTRAINT "GrowthFollowUp_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GrowthFollowUp" ADD CONSTRAINT "GrowthFollowUp_scheduledByUserId_fkey" FOREIGN KEY ("scheduledByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GrowthFollowUp" ADD CONSTRAINT "GrowthFollowUp_sourceGrowthRecordId_fkey" FOREIGN KEY ("sourceGrowthRecordId") REFERENCES "GrowthRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GrowthFollowUp" ADD CONSTRAINT "GrowthFollowUp_completedByGrowthRecordId_fkey" FOREIGN KEY ("completedByGrowthRecordId") REFERENCES "GrowthRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
