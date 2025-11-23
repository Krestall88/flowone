-- Add Telegram binding fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramFirstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramLastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramBindingCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramBindingExpiry" TIMESTAMP(3);
