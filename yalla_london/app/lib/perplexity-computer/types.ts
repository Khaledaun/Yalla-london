// ── Perplexity Computer Integration Types ────────────────────────────────────

export type TaskCategory =
  | 'registration'     // #1: Form filling, affiliate signups
  | 'email'           // #2: Email marketing setup
  | 'social'          // #3: Social media management
  | 'seo'             // #4: SEO/AIO/GEO systems
  | 'development'     // #5: Dev action items
  | 'design'          // #6: Design & UX review
  | 'content'         // #7: Content quality audit
  | 'intelligence'    // #8: Business intelligence
  | 'ai-monitoring'   // #9: AI revolution monitoring
  | 'strategy'        // #10: Tourism media house strategy

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

export type TaskStatus = 'queued' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface TaskTemplate {
  id: string
  category: TaskCategory
  taskType: string
  title: string
  promptTemplate: string // supports {{siteId}}, {{siteDomain}}, {{articleSlug}}, etc.
  priority: TaskPriority
  estimatedCredits: number
  tags: string[]
  requiresSiteId: boolean
  schedule?: string // cron expression for recurring tasks
  variables: string[] // template variables this prompt expects
  description: string
  expectedOutput: string
  roiRating: number // 1-10, from our analysis
}

export interface TaskCreateInput {
  templateId?: string
  category: TaskCategory
  taskType: string
  title: string
  prompt: string
  siteId?: string
  priority?: TaskPriority
  scheduledFor?: Date
  parentTaskId?: string
  tags?: string[]
  estimatedCredits?: number
  metadata?: Record<string, unknown>
}

export interface TaskResult {
  taskId: string
  status: TaskStatus
  resultSummary: string | null
  resultData: Record<string, unknown> | null
  completedAt: Date | null
  actualCredits: number | null
  durationMs: number | null
}

export interface ScheduleCreateInput {
  category: TaskCategory
  taskType: string
  title: string
  promptTemplate: string
  cronExpression: string
  siteId?: string
  priority?: TaskPriority
  estimatedCredits?: number
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface PerplexityDashboardData {
  summary: {
    totalTasks: number
    queued: number
    running: number
    completed24h: number
    failed24h: number
    creditsUsed7d: number
    creditsEstimatedQueued: number
    successRate7d: number
    avgDurationMs: number
  }
  recentTasks: Array<{
    id: string
    title: string
    category: TaskCategory
    status: TaskStatus
    priority: TaskPriority
    createdAt: string
    completedAt: string | null
    resultSummary: string | null
    estimatedCredits: number
    actualCredits: number | null
  }>
  schedules: Array<{
    id: string
    title: string
    category: string
    cronExpression: string
    enabled: boolean
    lastRunAt: string | null
    nextRunAt: string | null
    runCount: number
  }>
  categoryBreakdown: Record<string, { total: number; completed: number; failed: number; credits: number }>
  upcomingTasks: Array<{
    id: string
    title: string
    scheduledFor: string
    priority: TaskPriority
  }>
}

export interface PerplexityContextData {
  tasksQueued: number
  tasksRunning: number
  tasksFailed24h: number
  tasksCompleted24h: number
  creditsUsed7d: number
  successRate7d: number
  nextScheduledTask: string | null
  activeSchedules: number
}
