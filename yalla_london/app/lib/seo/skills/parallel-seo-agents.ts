/**
 * Parallel SEO Agents Skill
 * Adapted from zenobi-us/dotfiles dispatching-parallel-agents methodology
 *
 * Dispatches multiple specialized agents to handle independent SEO tasks concurrently.
 * Each agent focuses on a specific domain without interfering with others.
 */

export interface SEOAgentTask {
  id: string;
  type: SEOAgentType;
  scope: string;
  urls: string[];
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: SEOAgentResult;
}

export interface SEOAgentResult {
  agentId: string;
  agentType: SEOAgentType;
  findings: SEOFinding[];
  recommendations: string[];
  actionsApplied: string[];
  errors: string[];
  completedAt: string;
}

export interface SEOFinding {
  url: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  fixable: boolean;
  suggestedFix?: string;
}

export type SEOAgentType =
  | 'indexing-verifier'
  | 'content-auditor'
  | 'technical-seo'
  | 'keyword-optimizer'
  | 'meta-enhancer'
  | 'internal-linker'
  | 'schema-validator';

/**
 * Agent definitions with their responsibilities
 */
export const SEO_AGENT_DEFINITIONS: Record<SEOAgentType, {
  name: string;
  description: string;
  canFix: boolean;
  dependencies: SEOAgentType[];
}> = {
  'indexing-verifier': {
    name: 'Indexing Verifier Agent',
    description: 'Verifies URLs are indexed in Google/Bing, submits unindexed URLs',
    canFix: true,
    dependencies: [],
  },
  'content-auditor': {
    name: 'Content Auditor Agent',
    description: 'Analyzes content quality, SEO score, keyword usage, readability',
    canFix: false,
    dependencies: [],
  },
  'technical-seo': {
    name: 'Technical SEO Agent',
    description: 'Checks page speed, mobile-friendliness, Core Web Vitals',
    canFix: false,
    dependencies: [],
  },
  'keyword-optimizer': {
    name: 'Keyword Optimizer Agent',
    description: 'Analyzes keyword density, placement, and semantic coverage',
    canFix: true,
    dependencies: ['content-auditor'],
  },
  'meta-enhancer': {
    name: 'Meta Enhancer Agent',
    description: 'Optimizes meta titles, descriptions, and OG tags',
    canFix: true,
    dependencies: ['keyword-optimizer'],
  },
  'internal-linker': {
    name: 'Internal Linker Agent',
    description: 'Suggests and creates internal links between related content',
    canFix: true,
    dependencies: ['content-auditor'],
  },
  'schema-validator': {
    name: 'Schema Validator Agent',
    description: 'Validates and enhances structured data (JSON-LD)',
    canFix: true,
    dependencies: [],
  },
};

/**
 * Parallel SEO Agent Dispatcher
 *
 * Key principles:
 * 1. Independence: Each agent works on its own domain without blocking others
 * 2. Parallelization: Multiple agents run concurrently
 * 3. Focus: Each agent has narrow scope for better results
 * 4. Non-interference: Agents don't edit the same files/data
 */
export class ParallelSEOAgentDispatcher {
  private tasks: Map<string, SEOAgentTask> = new Map();
  private runningAgents: Set<string> = new Set();

  /**
   * Check if tasks can run in parallel (no dependencies conflict)
   */
  canRunInParallel(tasks: SEOAgentTask[]): boolean {
    const types = tasks.map(t => t.type);

    for (const type of types) {
      const deps = SEO_AGENT_DEFINITIONS[type].dependencies;
      if (deps.some(dep => types.includes(dep))) {
        return false; // Has dependency in the same batch
      }
    }

    return true;
  }

  /**
   * Group tasks by parallelizable batches
   */
  groupIntoBatches(tasks: SEOAgentTask[]): SEOAgentTask[][] {
    const batches: SEOAgentTask[][] = [];
    const processed = new Set<string>();

    // First batch: tasks with no dependencies
    const firstBatch = tasks.filter(t =>
      SEO_AGENT_DEFINITIONS[t.type].dependencies.length === 0
    );
    if (firstBatch.length > 0) {
      batches.push(firstBatch);
      firstBatch.forEach(t => processed.add(t.id));
    }

    // Subsequent batches: tasks whose dependencies are met
    while (processed.size < tasks.length) {
      const nextBatch = tasks.filter(t => {
        if (processed.has(t.id)) return false;
        const deps = SEO_AGENT_DEFINITIONS[t.type].dependencies;
        const depTasksComplete = deps.every(dep =>
          tasks.some(dt => dt.type === dep && processed.has(dt.id))
        );
        return deps.length === 0 || depTasksComplete;
      });

      if (nextBatch.length === 0) break; // Prevent infinite loop
      batches.push(nextBatch);
      nextBatch.forEach(t => processed.add(t.id));
    }

    return batches;
  }

  /**
   * Create task for specific SEO agent type
   */
  createTask(
    type: SEOAgentType,
    urls: string[],
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): SEOAgentTask {
    const task: SEOAgentTask = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      scope: SEO_AGENT_DEFINITIONS[type].description,
      urls,
      priority,
      status: 'pending',
    };

    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * Create comprehensive SEO audit tasks for a set of URLs
   */
  createFullAuditTasks(urls: string[]): SEOAgentTask[] {
    const agentTypes: SEOAgentType[] = [
      'indexing-verifier',
      'content-auditor',
      'technical-seo',
      'schema-validator',
    ];

    return agentTypes.map(type => this.createTask(type, urls, 'high'));
  }

  /**
   * Create optimization tasks (run after audit)
   */
  createOptimizationTasks(urls: string[]): SEOAgentTask[] {
    const agentTypes: SEOAgentType[] = [
      'keyword-optimizer',
      'meta-enhancer',
      'internal-linker',
    ];

    return agentTypes.map(type => this.createTask(type, urls, 'medium'));
  }

  /**
   * Get task execution prompt for agent
   */
  getTaskPrompt(task: SEOAgentTask): string {
    const definition = SEO_AGENT_DEFINITIONS[task.type];

    return `
SEO Agent Task: ${definition.name}
Task ID: ${task.id}
Scope: ${definition.description}
Can Apply Fixes: ${definition.canFix ? 'Yes' : 'No'}

URLs to Process:
${task.urls.map(u => `- ${u}`).join('\n')}

Instructions:
1. Analyze each URL for ${task.type} issues
2. Document findings with severity levels (critical/warning/info)
3. ${definition.canFix ? 'Apply fixes where possible and document changes' : 'Provide recommendations without modifying'}
4. Return structured results

Do NOT modify any code or files outside your scope.
Focus ONLY on ${definition.description}.

Return format:
- findings: Array of {url, issue, severity, fixable, suggestedFix}
- recommendations: Array of actionable suggestions
- actionsApplied: Array of changes made (if canFix)
- errors: Array of any errors encountered
`;
  }

  /**
   * Mark task as running
   */
  startTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'running';
      this.runningAgents.add(taskId);
    }
  }

  /**
   * Mark task as completed with results
   */
  completeTask(taskId: string, result: SEOAgentResult): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'completed';
      task.result = result;
      this.runningAgents.delete(taskId);
    }
  }

  /**
   * Mark task as failed
   */
  failTask(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'failed';
      task.result = {
        agentId: taskId,
        agentType: task.type,
        findings: [],
        recommendations: [],
        actionsApplied: [],
        errors: [error],
        completedAt: new Date().toISOString(),
      };
      this.runningAgents.delete(taskId);
    }
  }

  /**
   * Get all tasks
   */
  getAllTasks(): SEOAgentTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: SEOAgentTask['status']): SEOAgentTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === status);
  }

  /**
   * Aggregate results from all completed tasks
   */
  aggregateResults(): {
    totalUrls: number;
    criticalIssues: SEOFinding[];
    warnings: SEOFinding[];
    info: SEOFinding[];
    allRecommendations: string[];
    actionsApplied: string[];
    successRate: number;
  } {
    const completed = this.getTasksByStatus('completed');
    const allUrls = new Set<string>();
    const criticalIssues: SEOFinding[] = [];
    const warnings: SEOFinding[] = [];
    const info: SEOFinding[] = [];
    const allRecommendations: string[] = [];
    const actionsApplied: string[] = [];

    for (const task of completed) {
      task.urls.forEach(u => allUrls.add(u));
      if (task.result) {
        for (const finding of task.result.findings) {
          switch (finding.severity) {
            case 'critical':
              criticalIssues.push(finding);
              break;
            case 'warning':
              warnings.push(finding);
              break;
            case 'info':
              info.push(finding);
              break;
          }
        }
        allRecommendations.push(...task.result.recommendations);
        actionsApplied.push(...task.result.actionsApplied);
      }
    }

    const total = this.tasks.size;
    const failed = this.getTasksByStatus('failed').length;
    const successRate = total > 0 ? ((total - failed) / total) * 100 : 0;

    return {
      totalUrls: allUrls.size,
      criticalIssues,
      warnings,
      info,
      allRecommendations: [...new Set(allRecommendations)],
      actionsApplied,
      successRate,
    };
  }

  /**
   * Clear all tasks
   */
  reset(): void {
    this.tasks.clear();
    this.runningAgents.clear();
  }
}

export const parallelSEODispatcher = new ParallelSEOAgentDispatcher();
