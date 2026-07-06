-- CreateTable
CREATE TABLE IF NOT EXISTS "site_settings" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "site_settings_siteId_idx" ON "site_settings"("siteId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "site_settings_siteId_category_key" ON "site_settings"("siteId", "category");
