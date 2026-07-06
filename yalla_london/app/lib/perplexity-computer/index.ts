// ── Perplexity Computer Integration — Public API ─────────────────────────────
export { TASK_TEMPLATES, getTemplateById, getTemplatesByCategory, fillTemplate, getCategorySummary } from './templates'
export { createTask, updateTaskStatus, getTask, listTasks, cancelTask, retryTask, createSchedule, toggleSchedule, listSchedules, processDueSchedules, getDashboardData, getContextData } from './task-manager'
export { executeTask, processReadyTasks } from './executor'
export type { TaskCategory, TaskPriority, TaskStatus, TaskTemplate, TaskCreateInput, TaskResult, ScheduleCreateInput, PerplexityDashboardData, PerplexityContextData } from './types'
