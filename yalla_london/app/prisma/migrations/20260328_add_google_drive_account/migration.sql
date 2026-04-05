-- Google Drive Account model for multi-account Drive integration
CREATE TABLE IF NOT EXISTS "google_drive_accounts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "email" TEXT NOT NULL,
  "displayName" TEXT NOT NULL DEFAULT '',
  "photoUrl" TEXT,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "tokenExpiresAt" TIMESTAMPTZ NOT NULL,
  "rootFolderId" TEXT DEFAULT 'root',
  "siteId" TEXT,
  "label" TEXT,
  "folderMappings" JSONB DEFAULT '{}',
  "lastSyncAt" TIMESTAMPTZ,
  "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "google_drive_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "google_drive_accounts_email_key" ON "google_drive_accounts"("email");
CREATE INDEX IF NOT EXISTS "google_drive_accounts_siteId_idx" ON "google_drive_accounts"("siteId");
