-- AlterTable
ALTER TABLE "QRToken" ADD COLUMN     "failedPinAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinLockedUntil" TIMESTAMPTZ(3);
