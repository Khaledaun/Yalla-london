/**
 * CEO Brain — Core Agent Loop
 *
 * Processes a CEOEvent through the full pipeline:
 *   1. Resolve contact (CRM lookup)
 *   2. Build CEOContext (contact, history, brand, permissions)
 *   3. AI tool-calling loop (multi-turn, max 5 rounds)
 *   4. Produce CEOActionResult (response, actions taken, follow-ups)
 *
 * The brain uses generateCompletion() with tool definitions from the
 * ToolRegistry. It calls tools as the AI requests them, feeds results
 * back, and returns the final response.
 */

import type {
  CEOEvent,
  CEOContext,
  CEOActionResult,
  ToolDef,
  ToolContext,
  ToolResult,
  ResolvedContact,
  CRMAction,
  ScheduledFollowUp,
} from "./types";
import { DEFAULT_SAFETY_CONFIG } from "./types";
import {
  ToolRegistry,
  createRegistry,
  CEO_TOOL_DEFS,
} from "./tool-registry";
import { resolveContact } from "./crm/contact-resolver";
import { checkToolSafety, filterPII, checkConfidence } from "./safety";
import { generateCompletion, type AIMessage } from "@/lib/ai/provider";
import { getSiteConfig } from "@/config/sites";

// Tool handler imports — wired into registry at initialization
import { crmLookup, crmCreateLead, crmCreateOpportunity, crmUpdateStage, crmLogInteraction, crmScheduleFollowup } from "./tools/crm";
import { getMetrics, getArticles, searchKnowledge } from "./tools/analytics";
import { getContentPipelineStatus, getRecentTopics } from "./tools/content";
import { getSiteHealth, checkCronHealth, checkPipelineHealth } from "./tools/seo";
import { getAffiliateStatus } from "./tools/affiliate";
import { getFinanceSummary } from "./tools/finance";
import { sendEmail, triggerRetention } from "./tools/email-send";
import { getDesignAssets } from "./tools/design";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum tool-calling rounds before forcing a final response */
const MAX_TOOL_ROUNDS = 5;

/** Maximum conversation messages in context window */
const MAX_HISTORY_MESSAGES = 20;

// ---------------------------------------------------------------------------
// Registry Initialization — singleton, created once
// ---------------------------------------------------------------------------

let _registry: ToolRegistry | null = null;

/** Map tool names to their real handlers */
const HANDLER_MAP: Record<string, (params: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>> = {
  crm_lookup: crmLookup,
  crm_create_lead: crmCreateLead,
  crm_create_opportunity: crmCreateOpportunity,
  crm_update_stage: crmUpdateStage,
  crm_log_interaction: crmLogInteraction,
  crm_schedule_followup: crmScheduleFollowup,
  get_metrics: getMetrics,
  get_articles: getArticles,
  search_knowledge: searchKnowledge,
  get_site_health: getSiteHealth,
  check_cron_health: checkCronHealth,
  check_pipeline_health: checkPipelineHealth,
  get_affiliate_status: getAffiliateStatus,
  get_finance_summary: getFinanceSummary,
  send_email: sendEmail,
  trigger_retention: triggerRetention,
  get_design_assets: getDesignAssets,
  // Content tools use different names in the registry vs handler
  get_content_pipeline_status: getContentPipelineStatus,
  get_recent_topics: getRecentTopics,
};

function getRegistry(): ToolRegistry {
  if (_registry) return _registry;

  _registry = createRegistry();

  // Register CEO tools with real handlers
  for (const def of CEO_TOOL_DEFS) {
    const handler = HANDLER_MAP[def.name];
    if (handler) {
      _registry.register(def, handler);
    } else {
      // Keep the stub for tools without handlers yet
      _registry.register(def, def.execute);
    }
  }

  return _registry;
}

// ---------------------------------------------------------------------------
// Context Builder
// ---------------------------------------------------------------------------

async function buildContext(
  event: CEOEvent,
): Promise<CEOContext> {
  // Resolve contact from CRM
  let contact: ResolvedContact | null = null;
  try {
    contact = await resolveContact({
      phone: event.externalId.includes("@") ? undefined : event.externalId,
      email: event.externalId.includes("@") ? event.externalId : undefined,
      siteId: event.siteId,
    });
  } catch (err) {
    console.warn(
      "[ceo-brain] Contact resolution failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  // Load site config for brand context
  const siteConfig = getSiteConfig(event.siteId);

  // Build conversation history (placeholder — will be populated from DB in Phase 3)
  const conversationHistory: CEOContext["conversationHistory"] = [];

  // Permissions based on contact status
  const permissions: CEOContext["permissions"] = {
    canAutoReply: true,
    canCreateLead: true,
    canSendEmail: contact !== null,
    requiresApproval: false,
    maxDailyMessages: 100,
  };

  return {
    event,
    siteId: event.siteId,
    contact,
    conversationHistory,
    conversationId: (event.metadata?.conversationId as string) || null,
    brandContext: {
      siteName: siteConfig?.name || "the site",
      domain: siteConfig?.domain || "",
      locale: siteConfig?.locale || "en",
      destination: siteConfig?.destination || "",
    },
    permissions,
  };
}

// ---------------------------------------------------------------------------
// System Prompt Builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(ctx: CEOContext): string {
  const brandName = ctx.brandContext.siteName;
  const brandDomain = ctx.brandContext.domain;
  const contactInfo = ctx.contact
    ? `Known contact: ${ctx.contact.name || "Unknown"} (${ctx.contact.leadId ? "existing lead" : "new visitor"}).`
    : "Unknown contact — first interaction.";

  return `You are the CEO AI Agent for ${brandName} (${brandDomain}), a luxury travel platform.

ROLE: You handle customer inquiries, manage the sales pipeline, oversee operations, and report business metrics. You are warm, professional, and knowledgeable about luxury travel.

CONTEXT:
- ${contactInfo}
- Channel: ${ctx.event.channel}
- Site: ${ctx.siteId}

RULES:
1. Be concise and helpful. Answer customer questions using published content (search_knowledge tool).
2. For new inquiries about travel/hotels/experiences, create a lead (crm_create_lead) and log the interaction.
3. For pricing/booking requests, create an opportunity (crm_create_opportunity) — these need approval.
4. Never share customer PII in responses. Use first names only.
5. For complaints or sensitive topics, acknowledge empathy and escalate: "Let me connect you with our team."
6. If you don't have the answer, say so honestly — don't fabricate information.
7. For operational questions (site health, metrics, pipeline), use the relevant tools.

AVAILABLE TOOLS: You can call tools by name with JSON parameters. I'll provide the results back to you.

RESPONSE FORMAT: Respond naturally in the language the customer used. Keep responses under 300 words unless detailed information was specifically requested.`;
}

// ---------------------------------------------------------------------------
// Tool Calling — Convert ToolDefs to AI-compatible format
// ---------------------------------------------------------------------------

function buildToolDescriptions(registry: ToolRegistry): string {
  const tools = registry.list({ agent: "ceo" });
  const lines = tools.map((t) => {
    const params = t.inputSchema?.properties
      ? Object.entries(t.inputSchema.properties as Record<string, { type: string; description?: string }>)
          .map(([k, v]) => `${k}: ${v.type}${v.description ? ` (${v.description})` : ""}`)
          .join(", ")
      : "none";
    const required = (t.inputSchema?.required as string[]) || [];
    return `- ${t.name}: ${t.description}\n  Parameters: {${params}}\n  Required: [${required.join(", ")}]`;
  });

  return `TOOLS:\n${lines.join("\n\n")}\n\nTo call a tool, respond with EXACTLY this format on its own line:\nTOOL_CALL: {"tool":"<name>","params":{<json params>}}\n\nYou may call multiple tools. After I provide results, continue your response.`;
}

/** Parse tool calls from AI response text */
function parseToolCalls(
  text: string,
): Array<{ tool: string; params: Record<string, unknown> }> {
  const calls: Array<{ tool: string; params: Record<string, unknown> }> = [];
  const regex = /TOOL_CALL:\s*(\{[\s\S]*?\})\s*$/gm;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.tool && typeof parsed.tool === "string") {
        calls.push({
          tool: parsed.tool,
          params: parsed.params || {},
        });
      }
    } catch {
      // Malformed JSON — skip this call
    }
  }
  return calls;
}

// ---------------------------------------------------------------------------
// Main Processing Loop
// ---------------------------------------------------------------------------

/**
 * Process a CEOEvent through the full agent pipeline.
 *
 * @param event - Normalized inbound event
 * @returns CEOActionResult with response text, tools used, and follow-up actions
 */
export async function processCEOEvent(
  event: CEOEvent,
): Promise<CEOActionResult> {
  const startMs = Date.now();
  const registry = getRegistry();
  const toolsUsed: string[] = [];
  const toolResults: Record<string, ToolResult> = {};

  // 1. Build context
  const ctx = await buildContext(event);

  // 2. Build system prompt with tool descriptions
  const systemPrompt =
    buildSystemPrompt(ctx) + "\n\n" + buildToolDescriptions(registry);

  // Filter PII from user content before sending to AI
  const safeContent = filterPII(event.content);

  // 3. Initialize conversation messages
  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: safeContent },
  ];

  // Add conversation history (most recent first, up to limit)
  if (ctx.conversationHistory.length > 0) {
    const historyMessages: AIMessage[] = ctx.conversationHistory
      .slice(-MAX_HISTORY_MESSAGES)
      .map((msg) => ({
        role: (msg.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
        content: msg.content,
      }));
    // Insert history before the current user message
    messages.splice(1, 0, ...historyMessages);
  }

  // 4. Tool-calling loop
  let finalResponse = "";
  let confidence = 0.8;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await generateCompletion(messages, {
      maxTokens: 1000,
      taskType: "agent-response",
      calledFrom: "ceo-brain",
      siteId: event.siteId,
      timeoutMs: 30_000,
    });

    const responseText = result?.content || "";

    // Parse tool calls from response
    const calls = parseToolCalls(responseText);

    if (calls.length === 0) {
      // No tool calls — this is the final response
      finalResponse = responseText.replace(/TOOL_CALL:.*$/gm, "").trim();
      break;
    }

    // Execute each tool call
    const toolResultsForRound: string[] = [];

    for (const call of calls) {
      // Safety check
      const safetyCheck = checkToolSafety(call.tool, call.params, DEFAULT_SAFETY_CONFIG);
      if (!safetyCheck.allowed) {
        toolResultsForRound.push(
          `Tool ${call.tool}: BLOCKED — ${safetyCheck.reason}`,
        );
        continue;
      }

      // Build tool context
      const toolCtx: ToolContext = {
        siteId: event.siteId,
        agentId: "ceo",
        conversationId: event.metadata?.conversationId as string | undefined,
      };

      // Execute tool
      const toolResult = await registry.execute(call.tool, call.params, toolCtx);
      toolsUsed.push(call.tool);
      toolResults[call.tool] = toolResult;

      toolResultsForRound.push(
        `Tool ${call.tool}: ${toolResult.success ? "SUCCESS" : "FAILED"}\n${
          toolResult.summary || toolResult.error || JSON.stringify(toolResult.data || {}).slice(0, 500)
        }`,
      );
    }

    // Extract any text before tool calls as partial response
    const partialText = responseText
      .replace(/TOOL_CALL:.*$/gm, "")
      .trim();

    // Feed tool results back to AI
    if (partialText) {
      messages.push({ role: "assistant", content: partialText });
    }
    messages.push({
      role: "user",
      content: `[Tool Results]\n${toolResultsForRound.join("\n\n")}`,
    });
  }

  // If we exhausted rounds without a final response, use the last partial
  if (!finalResponse) {
    finalResponse =
      "I've gathered the information. Let me know if you need anything else.";
  }

  // 5. Confidence check — escalate if too low
  const confidenceCheck = checkConfidence(confidence, DEFAULT_SAFETY_CONFIG);
  const needsEscalation = confidenceCheck.shouldEscalate;

  // 6. Build result
  const durationMs = Date.now() - startMs;

  const actionResult: CEOActionResult = {
    success: true,
    responseText: finalResponse,
    responseType: "text",
    toolsUsed,
    confidence,
    needsApproval: needsEscalation,
    crmActions: [],
    followUps: [],
    error: needsEscalation ? confidenceCheck.reason : undefined,
  };

  console.log(
    `[ceo-brain] Processed event in ${durationMs}ms — tools: [${toolsUsed.join(", ")}], confidence: ${confidence}`,
  );

  return actionResult;
}

// ---------------------------------------------------------------------------
// Status & Health
// ---------------------------------------------------------------------------

export interface CEOAgentStatus {
  initialized: boolean;
  registeredTools: number;
  ceoTools: number;
}

export function getAgentStatus(): CEOAgentStatus {
  const registry = getRegistry();
  const allTools = registry.list();
  const ceoTools = registry.list({ agent: "ceo" });

  return {
    initialized: true,
    registeredTools: allTools.length,
    ceoTools: ceoTools.length,
  };
}
