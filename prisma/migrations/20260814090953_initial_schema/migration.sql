-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'HEALTH_STAFF', 'CENTER_MANAGER', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'TELEGRAM', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "GrowthIndicator" AS ENUM ('WEIGHT_FOR_AGE', 'HEIGHT_FOR_AGE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('GROWTH', 'VACCINATION', 'MISSED_FOLLOW_UP');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('PREVENTIVE', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignRecipientStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "HealthCenter" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "HealthCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "authUserId" UUID NOT NULL,
    "healthCenterId" UUID,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" UUID NOT NULL,
    "healthCenterId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "estimatedFamilies" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "userId" UUID,
    "fullName" TEXT NOT NULL,
    "identification" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "preferredNotificationChannel" "NotificationChannel",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "sex" "Sex" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildGuardian" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "relationshipType" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ChildGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthRecord" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "measuredByUserId" UUID NOT NULL,
    "measurementDate" DATE NOT NULL,
    "weightKg" DECIMAL(6,3) NOT NULL,
    "heightCm" DECIMAL(6,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GrowthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthAssessment" (
    "id" UUID NOT NULL,
    "growthRecordId" UUID NOT NULL,
    "indicator" "GrowthIndicator" NOT NULL,
    "zScore" DECIMAL(7,4),
    "percentile" DECIMAL(6,3),
    "classification" TEXT,
    "standardName" TEXT NOT NULL,
    "standardVersion" TEXT NOT NULL,
    "calculatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GrowthAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthReference" (
    "id" UUID NOT NULL,
    "standardName" TEXT NOT NULL,
    "standardVersion" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "indicator" "GrowthIndicator" NOT NULL,
    "ageReference" DECIMAL(8,3) NOT NULL,
    "parameterL" DECIMAL(14,10),
    "parameterM" DECIMAL(14,10),
    "parameterS" DECIMAL(14,10),
    "additionalParameters" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccine" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Vaccine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaccineSchedule" (
    "id" UUID NOT NULL,
    "vaccineId" UUID NOT NULL,
    "doseNumber" INTEGER NOT NULL,
    "recommendedAgeDays" INTEGER,
    "minimumAgeDays" INTEGER,
    "maximumAgeDays" INTEGER,
    "minimumIntervalDays" INTEGER,
    "scheduleName" TEXT NOT NULL,
    "scheduleVersion" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VaccineSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccination" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "vaccineScheduleId" UUID NOT NULL,
    "administeredByUserId" UUID NOT NULL,
    "applicationDate" DATE NOT NULL,
    "nextDoseDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewedByUserId" UUID,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolvedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "guardianId" UUID,
    "alertId" UUID,
    "campaignRecipientId" UUID,
    "channel" "NotificationChannel" NOT NULL,
    "destination" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "segmentation" JSONB,
    "scheduledAt" TIMESTAMPTZ(3),
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "status" "CampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRToken" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "pinHash" TEXT,
    "expiresAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "lastUsedAt" TIMESTAMPTZ(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "QRToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthCenter_code_key" ON "HealthCenter"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

-- CreateIndex
CREATE INDEX "User_healthCenterId_idx" ON "User"("healthCenterId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Community_healthCenterId_idx" ON "Community"("healthCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "Community_healthCenterId_name_key" ON "Community"("healthCenterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_userId_key" ON "Guardian"("userId");

-- CreateIndex
CREATE INDEX "Guardian_communityId_idx" ON "Guardian"("communityId");

-- CreateIndex
CREATE INDEX "Child_communityId_idx" ON "Child"("communityId");

-- CreateIndex
CREATE INDEX "ChildGuardian_childId_idx" ON "ChildGuardian"("childId");

-- CreateIndex
CREATE INDEX "ChildGuardian_guardianId_idx" ON "ChildGuardian"("guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildGuardian_childId_guardianId_key" ON "ChildGuardian"("childId", "guardianId");

-- CreateIndex
CREATE INDEX "GrowthRecord_childId_idx" ON "GrowthRecord"("childId");

-- CreateIndex
CREATE INDEX "GrowthRecord_measurementDate_idx" ON "GrowthRecord"("measurementDate");

-- CreateIndex
CREATE INDEX "GrowthRecord_measuredByUserId_idx" ON "GrowthRecord"("measuredByUserId");

-- CreateIndex
CREATE INDEX "GrowthAssessment_growthRecordId_idx" ON "GrowthAssessment"("growthRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthAssessment_growthRecordId_indicator_standardVersion_key" ON "GrowthAssessment"("growthRecordId", "indicator", "standardVersion");

-- CreateIndex
CREATE INDEX "GrowthReference_standardName_standardVersion_idx" ON "GrowthReference"("standardName", "standardVersion");

-- CreateIndex
CREATE INDEX "GrowthReference_sex_indicator_ageReference_idx" ON "GrowthReference"("sex", "indicator", "ageReference");

-- CreateIndex
CREATE UNIQUE INDEX "Vaccine_name_key" ON "Vaccine"("name");

-- CreateIndex
CREATE INDEX "VaccineSchedule_vaccineId_idx" ON "VaccineSchedule"("vaccineId");

-- CreateIndex
CREATE UNIQUE INDEX "VaccineSchedule_vaccineId_doseNumber_scheduleVersion_key" ON "VaccineSchedule"("vaccineId", "doseNumber", "scheduleVersion");

-- CreateIndex
CREATE INDEX "Vaccination_childId_idx" ON "Vaccination"("childId");

-- CreateIndex
CREATE INDEX "Vaccination_applicationDate_idx" ON "Vaccination"("applicationDate");

-- CreateIndex
CREATE INDEX "Vaccination_vaccineScheduleId_idx" ON "Vaccination"("vaccineScheduleId");

-- CreateIndex
CREATE INDEX "Vaccination_administeredByUserId_idx" ON "Vaccination"("administeredByUserId");

-- CreateIndex
CREATE INDEX "Alert_childId_idx" ON "Alert"("childId");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "Alert_reviewedByUserId_idx" ON "Alert"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "Alert_resolvedByUserId_idx" ON "Alert"("resolvedByUserId");

-- CreateIndex
CREATE INDEX "Notification_guardianId_idx" ON "Notification"("guardianId");

-- CreateIndex
CREATE INDEX "Notification_alertId_idx" ON "Notification"("alertId");

-- CreateIndex
CREATE INDEX "Notification_campaignRecipientId_idx" ON "Notification"("campaignRecipientId");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Campaign_createdByUserId_idx" ON "Campaign"("createdByUserId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_guardianId_idx" ON "CampaignRecipient"("guardianId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_status_idx" ON "CampaignRecipient"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_guardianId_key" ON "CampaignRecipient"("campaignId", "guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "QRToken_tokenHash_key" ON "QRToken"("tokenHash");

-- CreateIndex
CREATE INDEX "QRToken_childId_idx" ON "QRToken"("childId");

-- CreateIndex
CREATE INDEX "QRToken_createdByUserId_idx" ON "QRToken"("createdByUserId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_healthCenterId_fkey" FOREIGN KEY ("healthCenterId") REFERENCES "HealthCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_healthCenterId_fkey" FOREIGN KEY ("healthCenterId") REFERENCES "HealthCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildGuardian" ADD CONSTRAINT "ChildGuardian_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildGuardian" ADD CONSTRAINT "ChildGuardian_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthRecord" ADD CONSTRAINT "GrowthRecord_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthRecord" ADD CONSTRAINT "GrowthRecord_measuredByUserId_fkey" FOREIGN KEY ("measuredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthAssessment" ADD CONSTRAINT "GrowthAssessment_growthRecordId_fkey" FOREIGN KEY ("growthRecordId") REFERENCES "GrowthRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineSchedule" ADD CONSTRAINT "VaccineSchedule_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "Vaccine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_vaccineScheduleId_fkey" FOREIGN KEY ("vaccineScheduleId") REFERENCES "VaccineSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_administeredByUserId_fkey" FOREIGN KEY ("administeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_campaignRecipientId_fkey" FOREIGN KEY ("campaignRecipientId") REFERENCES "CampaignRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRToken" ADD CONSTRAINT "QRToken_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRToken" ADD CONSTRAINT "QRToken_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
