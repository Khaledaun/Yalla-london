import { generateCompletion } from './provider'
import { getDefaultSiteId } from '@/config/sites'

// ── AI Task Runner ──────────────────────────────────────────────────────────────
// Structured task execution with JSON outputs, retry, and "explain" capability.

export interface TaskDefinition {
  id: string
  name: string
  description: string
  category: 'content' | 'seo' | 'commerce' | 'analysis' | 'legal' | 'general'
  /** System prompt prefix */
  systemPrefix?: string
  /** Default timeout in ms */
  timeoutMs?: number
  /** Max retries */
  maxRetries?: number
}

export interface TaskInput {
  taskId: string
  prompt: string
  siteId?: string
  context?: Record<string, unknown>
}

export interface TaskOutput {
  taskId: string
  runId: string
  input: TaskInput
  status: 'success' | 'error'
  result?: string
  structuredOutput?: Record<string, unknown>
  error?: string
  provider?: string
  timestamps: {
    started: string
    completed: string
    durationMs: number
  }
  retryInfo?: {
    attempts: number
    lastError?: string
  }
}

// ── Task Registry ───────────────────────────────────────────────────────────────

export const TASK_REGISTRY: TaskDefinition[] = [
  {
    id: 'content-suggest',
    name: 'Suggest Improvements',
    description: 'Analyze article content and suggest specific improvements',
    category: 'content',
    systemPrefix: 'You are an expert content editor. Analyze the content and provide specific, actionable improvement suggestions. Return your response as JSON with keys: suggestions (array of {area, current, recommendation, priority}), overallScore (1-100), summary.',
  },
  {
    id: 'seo-diagnose',
    name: 'Diagnose SEO Issues',
    description: 'Analyze a URL or content for SEO problems',
    category: 'seo',
    systemPrefix: 'You are an SEO specialist. Diagnose issues and provide fixes. Return JSON with keys: issues (array of {type, severity, description, fix}), score (1-100), quickWins (array of strings).',
  },
  {
    id: 'meta-generate',
    name: 'Generate Meta Tags',
    description: 'Create optimized meta title and description for content',
    category: 'seo',
    systemPrefix: 'You are an SEO meta tag specialist. Generate optimal meta tags. Return JSON with keys: metaTitle (50-60 chars), metaDescription (120-160 chars), focusKeyword, alternativeTitles (array of 3).',
  },
  {
    id: 'affiliate-suggest',
    name: 'Suggest Affiliate Links',
    description: 'Recommend affiliate placements for article content',
    category: 'commerce',
    systemPrefix: 'You are an affiliate marketing specialist for luxury travel content. Suggest affiliate link placements. Return JSON with keys: placements (array of {position, anchorText, suggestedProgram, expectedCTR}), summary.',
  },
  {
    id: 'product-description',
    name: 'Product Description',
    description: 'Generate product descriptions for e-commerce listings',
    category: 'commerce',
    systemPrefix: 'You are a luxury product copywriter. Write compelling descriptions. Return JSON with keys: title, shortDescription, longDescription, bulletPoints (array), tags (array).',
  },
  {
    id: 'content-expand',
    name: 'Expand Section',
    description: 'Expand a thin content section with more detail',
    category: 'content',
    systemPrefix: 'You are a luxury travel content writer. Expand the given section with rich, first-hand-style detail. Include sensory descriptions and insider tips. Return the expanded HTML content directly.',
  },
  {
    id: 'legal-review',
    name: 'Legal Page Review',
    description: 'Review legal page content for completeness',
    category: 'legal',
    systemPrefix: 'You are a legal content reviewer. Analyze the legal page for compliance. Return JSON with keys: missingClauses (array), riskyLanguage (array of {text, concern, suggestion}), complianceScore (1-100), recommendation.',
  },
  {
    id: 'general-ask',
    name: 'Ask AI',
    description: 'General question to the AI about the platform or content',
    category: 'general',
  },
]

// ── Run Task ────────────────────────────────────────────────────────────────────

export async function runTask(input: TaskInput): Promise<TaskOutput> {
  const started = new Date()
  const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  const task = TASK_REGISTRY.find(t => t.id === input.taskId)
  const siteId = input.siteId || getDefaultSiteId()

  let attempts = 0
  const maxRetries = task?.maxRetries || 1
  let lastError = ''

  while (attempts < maxRetries) {
    attempts++
    try {
      const fullPrompt = task?.systemPrefix
        ? `${task.systemPrefix}\n\n---\n\nUser request:\n${input.prompt}`
        : input.prompt

      const aiResult = await generateCompletion(
        [{ role: 'user', content: fullPrompt }],
        {
          taskType: `task-runner-${input.taskId}`,
          calledFrom: 'lib/ai/task-runner',
          siteId,
          timeoutMs: task?.timeoutMs || 30000,
        }
      )
      const result = aiResult.content || ''

      const completed = new Date()

      // Try to parse as JSON
      let structuredOutput: Record<string, unknown> | undefined
      try {
        const jsonMatch = result.match(/```json\n?([\s\S]*?)```/) || result.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0]
          structuredOutput = JSON.parse(jsonStr)
        }
      } catch {
        // Not JSON — that's fine for some tasks
      }

      return {
        taskId: input.taskId,
        runId,
        input,
        status: 'success',
        result,
        structuredOutput,
        timestamps: {
          started: started.toISOString(),
          completed: completed.toISOString(),
          durationMs: completed.getTime() - started.getTime(),
        },
        retryInfo: attempts > 1 ? { attempts, lastError } : undefined,
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if (attempts >= maxRetries) {
        const completed = new Date()
        return {
          taskId: input.taskId,
          runId,
          input,
          status: 'error',
          error: lastError,
          timestamps: {
            started: started.toISOString(),
            completed: completed.toISOString(),
            durationMs: completed.getTime() - started.getTime(),
          },
          retryInfo: { attempts, lastError },
        }
      }
    }
  }

  // Should never reach here
  const completed = new Date()
  return {
    taskId: input.taskId,
    runId,
    input,
    status: 'error',
    error: 'Max retries exceeded',
    timestamps: {
      started: started.toISOString(),
      completed: completed.toISOString(),
      durationMs: completed.getTime() - started.getTime(),
    },
    retryInfo: { attempts, lastError },
  }
}

// ── Explain Result ──────────────────────────────────────────────────────────────

export async function explainResult(output: TaskOutput): Promise<string> {
  const prompt = `Explain the following AI task result in plain, non-technical English that a business owner with no coding background can understand. Be concise (3-5 sentences). Focus on what matters and what action to take.

Task: ${output.taskId}
Status: ${output.status}
${output.error ? `Error: ${output.error}` : ''}
${output.structuredOutput ? `Result: ${JSON.stringify(output.structuredOutput, null, 2)}` : `Result: ${output.result?.substring(0, 2000)}`}
Duration: ${output.timestamps.durationMs}ms`

  const res = await generateCompletion(
    [{ role: 'user', content: prompt }],
    {
      taskType: 'task-runner-explain',
      calledFrom: 'lib/ai/task-runner',
      siteId: output.input.siteId || getDefaultSiteId(),
      timeoutMs: 15000,
    }
  )
  return res.content || ''
}
