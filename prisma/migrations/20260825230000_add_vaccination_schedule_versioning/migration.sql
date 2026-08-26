-- AlterTable
ALTER TABLE "Vaccine"
ADD COLUMN "officialCode" TEXT;

-- CreateTable
CREATE TABLE "VaccineScheduleVersion" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "publishedAt" DATE NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "sourceUrl" TEXT NOT NULL,
    "sourceSha256" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VaccineScheduleVersion_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "VaccineSchedule"
ADD COLUMN "scheduleVersionId" UUID,
ADD COLUMN "doseCode" TEXT,
ADD COLUMN "doseName" TEXT,
ADD COLUMN "timingNote" TEXT,
ADD COLUMN "recommendedAgeMonths" INTEGER,
ADD COLUMN "minimumAgeMonths" INTEGER,
ADD COLUMN "maximumAgeMonths" INTEGER,
ADD COLUMN "maximumAgeExclusive" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Vaccine_officialCode_key" ON "Vaccine"("officialCode");

-- CreateIndex
CREATE UNIQUE INDEX "VaccineScheduleVersion_code_key" ON "VaccineScheduleVersion"("code");

-- CreateIndex
CREATE INDEX "VaccineScheduleVersion_effectiveFrom_effectiveTo_idx" ON "VaccineScheduleVersion"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "VaccineSchedule_scheduleVersionId_doseCode_key" ON "VaccineSchedule"("scheduleVersionId", "doseCode");

-- CreateIndex
CREATE INDEX "VaccineSchedule_scheduleVersionId_idx" ON "VaccineSchedule"("scheduleVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vaccination_childId_vaccineScheduleId_key" ON "Vaccination"("childId", "vaccineScheduleId");

-- AddForeignKey
ALTER TABLE "VaccineSchedule"
ADD CONSTRAINT "VaccineSchedule_scheduleVersionId_fkey"
FOREIGN KEY ("scheduleVersionId") REFERENCES "VaccineScheduleVersion"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
