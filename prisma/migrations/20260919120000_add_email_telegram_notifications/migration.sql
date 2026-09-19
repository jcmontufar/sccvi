-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "deliveryClaimedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "GuardianTelegramConnection" (
    "id" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "chatId" TEXT,
    "linkedAt" TIMESTAMPTZ(3),
    "consentedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GuardianTelegramConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramLinkToken" (
    "id" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_providerMessageId_idx" ON "Notification"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_alertId_guardianId_key" ON "Notification"("alertId", "guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianTelegramConnection_guardianId_key" ON "GuardianTelegramConnection"("guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianTelegramConnection_chatId_key" ON "GuardianTelegramConnection"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkToken_tokenHash_key" ON "TelegramLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_guardianId_createdAt_idx" ON "TelegramLinkToken"("guardianId", "createdAt");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_expiresAt_idx" ON "TelegramLinkToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "GuardianTelegramConnection" ADD CONSTRAINT "GuardianTelegramConnection_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
