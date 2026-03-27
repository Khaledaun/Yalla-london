/**
 * Unified Tool Registry for CEO and CTO Agents
 *
 * Central registry for all agent-callable tools. Handles registration,
 * lookup, safety checks, and execution with logging.
 */

import type { ToolDef, ToolContext, ToolResult, AgentId } from "./types";

// ---------------------------------------------------------------------------
// Registry Class
// ---------------------------------------------------------------------------

type ToolHandler = (
  params: Record<string, unknown>,
  ctx: ToolContext,
) => Promise<ToolResult>;

interface RegisteredTool {
  def: ToolDef;
  handler: ToolHandler;
}

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  /** Register a tool definition with its handler */
  register(tool: ToolDef, handler: ToolHandler): void {
    this.tools.set(tool.name, { def: tool, handler });
  }

  /** Get a registered tool by ID */
  get(toolId: string): RegisteredTool | undefined {
    return this.tools.get(toolId);
  }

  /** List tool definitions, optionally filtered by agent or safety level */
  list(options?: {
    agent?: "ceo" | "cto" | "both";
    safety?: ToolDef["safety"];
  }): ToolDef[] {
    const defs: ToolDef[] = [];
    for (const { def } of this.tools.values()) {
      if (options?.agent && options.agent !== "both") {
        if (!def.agents.includes(options.agent as AgentId)) continue;
      }
      if (options?.safety && def.safety !== options.safety) continue;
      defs.push(def);
    }
    return defs;
  }

  /** Get JSON schema for a tool's parameters */
  getSchema(toolId: string): Record<string, unknown> | undefined {
    return this.tools.get(toolId)?.def.inputSchema;
  }

  /** Execute a tool with safety checks, error wrapping, and logging */
  async execute(
    toolId: string,
    params: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const entry = this.tools.get(toolId);
    if (!entry) {
      return { success: false, error: `Tool "${toolId}" not found` };
    }

    const { def, handler } = entry;

    // Safety: admin_only tools require human agent
    if (def.safety === "admin_only" && ctx.agentId !== "human") {
      return {
        success: false,
        error: `Tool "${toolId}" is admin-only and cannot be called by agent "${ctx.agentId}"`,
      };
    }

    // Safety: needs_approval — log warning, approval gate handled by safety.ts
    if (def.safety === "needs_approval") {
      console.warn(
        `[tool-registry] Tool "${toolId}" needs approval — proceeding (gate in safety.ts)`,
      );
    }

    const start = Date.now();
    try {
      const result = await handler(params, ctx);
      const durationMs = Date.now() - start;
      console.log(
        `[tool-registry] ${toolId} completed in ${durationMs}ms — success: ${result.success}`,
      );
      return result;
    } catch (err) {
      const durationMs = Date.now() - start;
      const message =
        err instanceof Error ? err.message : String(err);
      console.warn(
        `[tool-registry] ${toolId} failed in ${durationMs}ms — error: ${message}`,
      );
      return { success: false, error: message };
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Create a new empty ToolRegistry */
export function createRegistry(): ToolRegistry {
  return new ToolRegistry();
}

// ---------------------------------------------------------------------------
// Pre-built Tool Definitions — CEO
// ---------------------------------------------------------------------------

export const CEO_TOOL_DEFS: ToolDef[] = [
  {
    name: "crm_lookup",
    description: "Look up a contact by phone, email, or externalId",
    agents: ["ceo"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        phone: { type: "string", description: "Phone number (E.164)" },
        email: { type: "string", description: "Email address" },
        externalId: { type: "string", description: "Channel-specific ID" },
        siteId: { type: "string" },
      },
      required: [],
    },
    execute: stub("crm_lookup"),
  },
  {
    name: "crm_create_lead",
    description: "Create a new lead in the CRM",
    agents: ["ceo"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        source: { type: "string", enum: ["whatsapp", "email", "web", "manual"] },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["source"],
    },
    execute: stub("crm_create_lead"),
  },
  {
    name: "crm_create_opportunity",
    description: "Create a sales pipeline opportunity for a lead",
    agents: ["ceo"],
    safety: "needs_approval",
    inputSchema: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        title: { type: "string" },
        valueUsd: { type: "number" },
        stage: { type: "string", enum: ["new", "qualifying", "proposal", "negotiation"] },
        notes: { type: "string" },
      },
      required: ["leadId", "title"],
    },
    execute: stub("crm_create_opportunity"),
  },
  {
    name: "crm_update_stage",
    description: "Move an opportunity through the pipeline (needs approval for won/lost)",
    agents: ["ceo"],
    safety: "needs_approval",
    inputSchema: {
      type: "object",
      properties: {
        opportunityId: { type: "string" },
        stage: { type: "string", enum: ["new", "qualifying", "proposal", "negotiation", "won", "lost"] },
        reason: { type: "string" },
      },
      required: ["opportunityId", "stage"],
    },
    execute: stub("crm_update_stage"),
  },
  {
    name: "crm_log_interaction",
    description: "Record a touchpoint (call, message, meeting) with a contact",
    agents: ["ceo"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string" },
        channel: { type: "string", enum: ["whatsapp", "email", "web", "internal"] },
        direction: { type: "string", enum: ["inbound", "outbound"] },
        type: { type: "string" },
        summary: { type: "string" },
        sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
      },
      required: ["contactId", "channel", "direction", "summary"],
    },
    execute: stub("crm_log_interaction"),
  },
  {
    name: "crm_schedule_followup",
    description: "Schedule a follow-up task for a contact",
    agents: ["ceo"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string" },
        description: { type: "string" },
        dueAt: { type: "string", description: "ISO 8601 datetime" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
      },
      required: ["contactId", "description", "dueAt"],
    },
    execute: stub("crm_schedule_followup"),
  },
  {
    name: "get_metrics",
    description: "Get business metrics (traffic, revenue, pipeline) for a site",
    agents: ["ceo"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        siteId: { type: "string" },
        period: { type: "string", enum: ["today", "7d", "30d", "90d"] },
      },
      required: ["siteId"],
    },
    execute: stub("get_metrics"),
  },
  {
    name: "get_articles",
    description: "List recent or popular published articles",
    agents: ["ceo"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        siteId: { type: "string" },
        sort: { type: "string", enum: ["recent", "popular", "clicks"] },
        limit: { type: "number" },
      },
      required: ["siteId"],
    },
    execute: stub("get_articles"),
  },
  {
    name: "get_affiliate_status",
    description: "Get affiliate revenue, clicks, and partner health",
    agents: ["ceo"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        siteId: { type: "string" },
        period: { type: "string", enum: ["today", "7d", "30d"] },
      },
      required: ["siteId"],
    },
    execute: stub("get_affiliate_status"),
  },
  {
    name: "get_site_health",
    description: "Get active alerts, cron health, and pipeline status",
    agents: ["ceo", "cto"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: { siteId: { type: "string" } },
      required: ["siteId"],
    },
    execute: stub("get_site_health"),
  },
  {
    name: "get_finance_summary",
    description: "Get Stripe balance, recent payments, and MRR summary",
    agents: ["ceo"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "7d", "30d"] },
      },
      required: [],
    },
    execute: stub("get_finance_summary"),
  },
  {
    name: "search_knowledge",
    description: "Search published content for answers to customer questions",
    agents: ["ceo"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        siteId: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query", "siteId"],
    },
    execute: stub("search_knowledge"),
  },
  {
    name: "send_email",
    description: "Send an email to a contact via Resend",
    agents: ["ceo"],
    safety: "needs_approval",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string", description: "HTML or plain text body" },
        templateId: { type: "string", description: "Optional React Email template" },
        siteId: { type: "string" },
      },
      required: ["to", "subject", "body"],
    },
    execute: stub("send_email"),
  },
  {
    name: "trigger_retention",
    description: "Start or pause an email retention sequence for a subscriber",
    agents: ["ceo"],
    safety: "needs_approval",
    inputSchema: {
      type: "object",
      properties: {
        subscriberId: { type: "string" },
        action: { type: "string", enum: ["start", "pause", "resume", "cancel"] },
        sequenceId: { type: "string" },
      },
      required: ["subscriberId", "action"],
    },
    execute: stub("trigger_retention"),
  },
  {
    name: "get_design_assets",
    description: "Get brand kit, logos, and design resources for a site",
    agents: ["ceo"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: { siteId: { type: "string" } },
      required: ["siteId"],
    },
    execute: stub("get_design_assets"),
  },
];

// ---------------------------------------------------------------------------
// Pre-built Tool Definitions — CTO
// ---------------------------------------------------------------------------

export const CTO_TOOL_DEFS: ToolDef[] = [
  {
    name: "read_file",
    description: "Read a source file from the codebase",
    agents: ["cto"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute or repo-relative path" },
        startLine: { type: "number" },
        endLine: { type: "number" },
      },
      required: ["path"],
    },
    execute: stub("read_file"),
  },
  {
    name: "search_code",
    description: "Search the codebase for a regex pattern",
    agents: ["cto"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regex pattern" },
        glob: { type: "string", description: "File glob filter (e.g. *.ts)" },
        maxResults: { type: "number" },
      },
      required: ["pattern"],
    },
    execute: stub("search_code"),
  },
  {
    name: "list_files",
    description: "List directory contents with optional glob filter",
    agents: ["cto"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        directory: { type: "string" },
        glob: { type: "string" },
      },
      required: ["directory"],
    },
    execute: stub("list_files"),
  },
  {
    name: "run_typecheck",
    description: "Run TypeScript type checking (tsc --noEmit)",
    agents: ["cto"],
    safety: "auto",
    rateLimit: 6,
    inputSchema: {
      type: "object",
      properties: {
        focus: { type: "string", description: "Optional path to focus on" },
      },
      required: [],
    },
    execute: stub("run_typecheck"),
  },
  {
    name: "run_smoke_tests",
    description: "Run the smoke test suite (scripts/smoke-test.ts)",
    agents: ["cto"],
    safety: "auto",
    rateLimit: 4,
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional test category filter" },
      },
      required: [],
    },
    execute: stub("run_smoke_tests"),
  },
  {
    name: "check_cron_health",
    description: "Check cron job health from CronJobLog",
    agents: ["cto"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        hoursBack: { type: "number", description: "Hours to look back (default 24)" },
        jobName: { type: "string", description: "Optional specific cron name" },
      },
      required: [],
    },
    execute: stub("check_cron_health"),
  },
  {
    name: "check_pipeline_health",
    description: "Check content pipeline health via queue monitor",
    agents: ["cto"],
    safety: "auto",
    inputSchema: {
      type: "object",
      properties: {
        siteId: { type: "string" },
      },
      required: [],
    },
    execute: stub("check_pipeline_health"),
  },
];

// ---------------------------------------------------------------------------
// Stub helper — placeholder execute for pre-built defs
// ---------------------------------------------------------------------------

function stub(
  toolName: string,
): ToolDef["execute"] {
  return async () => ({
    success: false,
    error: `Tool "${toolName}" handler not registered — register from tools/*.ts`,
  });
}
