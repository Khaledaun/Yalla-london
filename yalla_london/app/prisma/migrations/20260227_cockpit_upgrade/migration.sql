-- Cockpit Upgrade: DevTask + SystemDiagnostic models
-- Feb 27, 2026

-- Persistent development/operational tasks with "Do Now" actions
CREATE TABLE IF NOT EXISTS "dev_tasks" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceRef" TEXT,
    "actionLabel" TEXT,
    "actionApi" TEXT,
    "actionPayload" JSONB,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "dev_tasks_siteId_status_idx" ON "dev_tasks"("siteId", "status");
CREATE INDEX IF NOT EXISTS "dev_tasks_priority_status_idx" ON "dev_tasks"("priority", "status");
CREATE INDEX IF NOT EXISTS "dev_tasks_dueDate_idx" ON "dev_tasks"("dueDate");
CREATE INDEX IF NOT EXISTS "dev_tasks_source_sourceRef_idx" ON "dev_tasks"("source", "sourceRef");

-- Persistent system diagnostic run results
CREATE TABLE IF NOT EXISTS "system_diagnostics" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "runId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "groups" TEXT[],
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "passed" INTEGER NOT NULL DEFAULT 0,
    "warnings" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "verdict" TEXT NOT NULL DEFAULT 'unknown',
    "results" JSONB NOT NULL,
    "envStatus" JSONB,
    "recommendations" JSONB,
    "fixesAttempted" INTEGER NOT NULL DEFAULT 0,
    "fixesSucceeded" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "ranBy" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_diagnostics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_diagnostics_runId_key" ON "system_diagnostics"("runId");
CREATE INDEX IF NOT EXISTS "system_diagnostics_siteId_created_at_idx" ON "system_diagnostics"("siteId", "created_at");
CREATE INDEX IF NOT EXISTS "system_diagnostics_verdict_idx" ON "system_diagnostics"("verdict");
