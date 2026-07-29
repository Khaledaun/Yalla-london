-- AgentTask: paperclip-inspired additions (goal ancestry + per-task budget).
-- Idempotent: ADD COLUMN IF NOT EXISTS pattern so re-running on a partial
-- environment is safe.

ALTER TABLE "agent_tasks" ADD COLUMN IF NOT EXISTS "parentTaskId" TEXT;
ALTER TABLE "agent_tasks" ADD COLUMN IF NOT EXISTS "budgetUsd" DOUBLE PRECISION;
ALTER TABLE "agent_tasks" ADD COLUMN IF NOT EXISTS "spentUsd" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Self-referential FK with SET NULL on parent delete so deleting a parent
-- task doesn't cascade-destroy its children's history.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agent_tasks_parentTaskId_fkey'
  ) THEN
    ALTER TABLE "agent_tasks"
      ADD CONSTRAINT "agent_tasks_parentTaskId_fkey"
      FOREIGN KEY ("parentTaskId")
      REFERENCES "agent_tasks"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes for tree traversal + approval-queue queries.
CREATE INDEX IF NOT EXISTS "agent_tasks_parentTaskId_idx" ON "agent_tasks"("parentTaskId");
CREATE INDEX IF NOT EXISTS "agent_tasks_status_createdAt_idx" ON "agent_tasks"("status", "createdAt");
