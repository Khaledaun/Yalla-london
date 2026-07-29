-- Add first_name and last_name to Subscriber for email personalization (merge tags)
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "first_name" TEXT;
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "last_name" TEXT;
