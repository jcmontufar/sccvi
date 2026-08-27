-- Prevent duplicate delivery attempts for one campaign recipient and channel.
CREATE UNIQUE INDEX "Notification_campaignRecipientId_channel_key"
ON "Notification"("campaignRecipientId", "channel");
