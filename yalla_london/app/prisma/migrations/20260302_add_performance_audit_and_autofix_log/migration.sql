-- CreateTable
CREATE TABLE "performance_audits" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "strategy" TEXT NOT NULL DEFAULT 'mobile',
    "performanceScore" DOUBLE PRECISION,
    "accessibilityScore" DOUBLE PRECISION,
    "bestPracticesScore" DOUBLE PRECISION,
    "seoScore" DOUBLE PRECISION,
    "lcpMs" DOUBLE PRECISION,
    "clsScore" DOUBLE PRECISION,
    "inpMs" DOUBLE PRECISION,
    "fcpMs" DOUBLE PRECISION,
    "tbtMs" DOUBLE PRECISION,
    "speedIndex" DOUBLE PRECISION,
    "diagnostics" JSONB,
    "runId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_fix_logs" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "fixType" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_fix_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_audits_siteId_createdAt_idx" ON "performance_audits"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "performance_audits_runId_idx" ON "performance_audits"("runId");

-- CreateIndex
CREATE INDEX "performance_audits_url_strategy_idx" ON "performance_audits"("url", "strategy");

-- CreateIndex
CREATE INDEX "auto_fix_logs_siteId_createdAt_idx" ON "auto_fix_logs"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "auto_fix_logs_fixType_idx" ON "auto_fix_logs"("fixType");

-- CreateIndex
CREATE INDEX "auto_fix_logs_targetId_idx" ON "auto_fix_logs"("targetId");
