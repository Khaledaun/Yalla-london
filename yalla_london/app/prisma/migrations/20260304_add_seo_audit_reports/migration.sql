-- CreateTable
CREATE TABLE IF NOT EXISTS "seo_audit_reports" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "totalFindings" INTEGER NOT NULL DEFAULT 0,
    "criticalCount" INTEGER NOT NULL DEFAULT 0,
    "highCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "lowCount" INTEGER NOT NULL DEFAULT 0,
    "report" JSONB NOT NULL,
    "summary" TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_audit_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "seo_audit_reports_siteId_createdAt_idx" ON "seo_audit_reports"("siteId", "createdAt");
