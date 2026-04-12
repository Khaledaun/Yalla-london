-- CreateTable: audit_runs
CREATE TABLE "audit_runs" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mode" TEXT NOT NULL DEFAULT 'full',
    "triggeredBy" TEXT NOT NULL DEFAULT 'scheduled',
    "totalUrls" INTEGER NOT NULL DEFAULT 0,
    "processedUrls" INTEGER NOT NULL DEFAULT 0,
    "currentBatch" INTEGER NOT NULL DEFAULT 0,
    "totalBatches" INTEGER NOT NULL DEFAULT 0,
    "urlInventory" JSONB,
    "crawlResults" JSONB,
    "sitemapXml" TEXT,
    "totalIssues" INTEGER NOT NULL DEFAULT 0,
    "p0Count" INTEGER NOT NULL DEFAULT 0,
    "p1Count" INTEGER NOT NULL DEFAULT 0,
    "p2Count" INTEGER NOT NULL DEFAULT 0,
    "healthScore" INTEGER,
    "hardGatesPassed" BOOLEAN,
    "hardGatesJson" JSONB,
    "softGatesJson" JSONB,
    "reportMarkdown" TEXT,
    "fixPlanMarkdown" TEXT,
    "configSnapshot" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "audit_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_issues
CREATE TABLE "audit_issues" (
    "id" TEXT NOT NULL,
    "auditRunId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB,
    "suggestedFix" JSONB,
    "status" TEXT NOT NULL DEFAULT 'open',
    "ignoredAt" TIMESTAMP(3),
    "ignoredBy" TEXT,
    "fixedAt" TIMESTAMP(3),
    "fixedInRunId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectionCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_runs_siteId_status_idx" ON "audit_runs"("siteId", "status");
CREATE INDEX "audit_runs_siteId_startedAt_idx" ON "audit_runs"("siteId", "startedAt");

CREATE INDEX "audit_issues_siteId_status_idx" ON "audit_issues"("siteId", "status");
CREATE INDEX "audit_issues_auditRunId_idx" ON "audit_issues"("auditRunId");
CREATE INDEX "audit_issues_fingerprint_idx" ON "audit_issues"("fingerprint");
CREATE INDEX "audit_issues_siteId_category_idx" ON "audit_issues"("siteId", "category");
CREATE INDEX "audit_issues_siteId_severity_idx" ON "audit_issues"("siteId", "severity");

-- AddForeignKey
ALTER TABLE "audit_issues" ADD CONSTRAINT "audit_issues_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "audit_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
