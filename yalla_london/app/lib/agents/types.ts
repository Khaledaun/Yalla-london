/**
 * CEO + CTO Agent Platform — Core Type Definitions
 *
 * All interfaces for the agent event system, tool registry,
 * channel adapters, CRM pipeline, and safety layer.
 */

// ---------------------------------------------------------------------------
// Channel & Event Types
// ---------------------------------------------------------------------------

export type Channel = "whatsapp" | "email" | "web" | "internal";
export type AgentId = "ceo" | "cto" | "human";
export type Direction = "inbound" | "outbound";
export type Sentiment = "positive" | "neutral" | "negative";

/**
 * Normalized event from any channel — the single input to the CEO Brain.
 * Every inbound message, form submission, webhook, or system event
 * is converted to this shape before processing.
 */
export interface CEOEvent {
  id: string;
  channel: Channel;
  direction: Direction;
  /** Raw message text or structured payload */
  content: string;
  contentType: "text" | "image" | "document" | "template" | "system";
  /** Channel-specific sender ID (phone number, email, session ID) */
  externalId: string;
  senderName?: string;
  /** Media attachments (WhatsApp images, email attachments) */
  mediaUrls?: string[];
  /** Site this event belongs to */
  siteId: string;
  /** ISO timestamp */
  timestamp: string;
  /** Raw channel-specific metadata (WhatsApp message object, email headers, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * Full context built for the CEO Brain before processing an event.
 * Includes resolved contact, conversation history, brand info, and permissions.
 */
export interface CEOContext {
  event: CEOEvent;
  siteId: string;
  /** Resolved contact profile (from CRM lookup) */
  contact: ResolvedContact | null;
  /** Recent conversation messages (last N) */
  conversationHistory: ConversationMessage[];
  /** Active conversation ID (if continuing) */
  conversationId: string | null;
  /** Brand profile for this site */
  brandContext: {
    siteName: string;
    domain: string;
    locale: string;
    destination: string;
  };
  /** Safety permissions for this contact/channel */
  permissions: {
    canAutoReply: boolean;
    canCreateLead: boolean;
    canSendEmail: boolean;
    requiresApproval: boolean;
    maxDailyMessages: number;
  };
}

/**
 * Result of CEO Brain processing — what happened and what to send back.
 */
export interface CEOActionResult {
  /** Whether processing succeeded */
  success: boolean;
  /** Response to send back through the channel */
  responseText?: string;
  /** Content type of response */
  responseType?: "text" | "template" | "media";
  /** Tools that were invoked during processing */
  toolsUsed: string[];
  /** AI confidence in the response (0-1) */
  confidence: number;
  /** Whether response needs human review before sending */
  needsApproval: boolean;
  /** CRM actions taken (lead created, opportunity updated, etc.) */
  crmActions: CRMAction[];
  /** Follow-up tasks scheduled */
  followUps: ScheduledFollowUp[];
  /** Error message if processing failed */
  error?: string;
}

// ---------------------------------------------------------------------------
// CRM Types
// ---------------------------------------------------------------------------

/**
 * Unified contact profile — merges Lead, Subscriber, CharterInquiry,
 * and CrmOpportunity into a single view for the CEO Brain.
 */
export interface ResolvedContact {
  /** Best display name found */
  name: string | null;
  email: string | null;
  phone: string | null;
  /** Linked records */
  leadId: string | null;
  subscriberId: string | null;
  inquiryId: string | null;
  opportunityId: string | null;
  /** Lead score (0-100) */
  score: number;
  /** Lead status */
  status: string;
  /** Subscriber status */
  subscriberStatus: string | null;
  /** Tags/interests */
  tags: string[];
  /** Recent interaction summaries */
  recentInteractions: InteractionSummary[];
  /** Total lifetime interactions */
  totalInteractions: number;
  /** Channel preferences */
  preferredChannel: Channel | null;
  /** GDPR consent status */
  hasMarketingConsent: boolean;
  /** First seen timestamp */
  firstSeen: string;
  /** Last interaction timestamp */
  lastSeen: string | null;
}

export interface InteractionSummary {
  id: string;
  channel: Channel;
  direction: Direction;
  type: string;
  summary: string;
  sentiment?: Sentiment;
  timestamp: string;
}

export interface CRMAction {
  type:
    | "lead_created"
    | "lead_updated"
    | "opportunity_created"
    | "opportunity_stage_changed"
    | "interaction_logged"
    | "followup_scheduled"
    | "subscriber_created";
  entityId: string;
  details: Record<string, unknown>;
}

export interface ScheduledFollowUp {
  description: string;
  dueAt: string;
  priority: "low" | "medium" | "high" | "critical";
  assignedTo: AgentId;
}

// ---------------------------------------------------------------------------
// Opportunity Pipeline Types
// ---------------------------------------------------------------------------

export type OpportunityStage =
  | "new"
  | "qualifying"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export const OPPORTUNITY_STAGE_ORDER: OpportunityStage[] = [
  "new",
  "qualifying",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

// ---------------------------------------------------------------------------
// Conversation Types
// ---------------------------------------------------------------------------

export interface ConversationMessage {
  id: string;
  direction: Direction;
  content: string;
  senderName?: string;
  agentId?: AgentId;
  toolsUsed?: string[];
  confidence?: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Channel Adapter Interface
// ---------------------------------------------------------------------------

/**
 * Every channel (WhatsApp, email, web, internal) implements this interface.
 * Adapters normalize inbound messages to CEOEvent and send outbound responses.
 */
export interface ChannelAdapter {
  readonly channel: Channel;

  /** Parse raw request into a normalized CEOEvent */
  parseInbound(rawPayload: unknown): Promise<CEOEvent | null>;

  /** Send a response back through this channel */
  sendResponse(
    externalId: string,
    content: string,
    options?: SendOptions,
  ): Promise<SendResult>;

  /** Verify webhook signature (for WhatsApp, Stripe, etc.) */
  verifySignature?(request: Request): Promise<boolean>;
}

export interface SendOptions {
  contentType?: "text" | "template" | "media";
  templateName?: string;
  templateParams?: Record<string, string>;
  mediaUrl?: string;
  mediaCaption?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Tool Registry Types
// ---------------------------------------------------------------------------

/**
 * A tool definition — describes a capability the CEO/CTO agent can invoke.
 * Tools wrap existing lib/ functions with JSON schema for AI tool-calling.
 */
export interface ToolDef {
  name: string;
  description: string;
  /** Which agents can use this tool */
  agents: AgentId[];
  /** JSON Schema for input parameters */
  inputSchema: Record<string, unknown>;
  /** The actual function to execute */
  execute: (
    params: Record<string, unknown>,
    context: ToolContext,
  ) => Promise<ToolResult>;
  /** Safety classification */
  safety: "auto" | "needs_approval" | "admin_only";
  /** Rate limit: max calls per hour */
  rateLimit?: number;
}

export interface ToolContext {
  siteId: string;
  agentId: AgentId;
  conversationId?: string;
  contactId?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  /** Human-readable summary for conversation response */
  summary?: string;
}

// ---------------------------------------------------------------------------
// CTO Agent Types
// ---------------------------------------------------------------------------

export type CTOTaskType =
  | "maintenance"
  | "security_review"
  | "performance_audit"
  | "dependency_check"
  | "code_quality"
  | "documentation";

export type CTOTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "needs_approval";

export interface CTOAgentTask {
  id: string;
  taskType: CTOTaskType;
  priority: "low" | "medium" | "high" | "critical";
  status: CTOTaskStatus;
  description: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  /** Files inspected or changed */
  changes: string[];
  /** Tests executed */
  testsRun: string[];
  /** Issues found */
  findings: string[];
  /** Suggested next steps */
  followUps: string[];
  /** Duration in milliseconds */
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

/**
 * CTO maintenance loop phase.
 */
export type CTOPhase =
  | "scan"
  | "browse"
  | "propose"
  | "execute"
  | "report";

export interface CTOMaintenanceResult {
  phase: CTOPhase;
  durationMs: number;
  findings: CTOFinding[];
  actionsPerformed: CTOAction[];
  errors: string[];
}

export interface CTOFinding {
  severity: "info" | "low" | "medium" | "high" | "critical";
  category: string;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
  autoFixable: boolean;
}

export interface CTOAction {
  type: "auto_fix" | "proposal" | "info_only";
  description: string;
  file?: string;
  testsPassed: boolean;
}

// ---------------------------------------------------------------------------
// Safety & Guardrails Types
// ---------------------------------------------------------------------------

export interface SafetyConfig {
  /** Max outbound messages per channel per day */
  maxDailyMessagesPerChannel: number;
  /** Max AI calls per hour */
  maxAICallsPerHour: number;
  /** Confidence threshold below which to escalate */
  escalationConfidenceThreshold: number;
  /** Topics that always escalate to human */
  escalationTopics: string[];
  /** Money actions (refund, billing) require approval above this USD amount */
  moneyApprovalThresholdUsd: number;
  /** Opportunity stage transitions that require notification */
  notifyOnStageChanges: OpportunityStage[];
}

export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  maxDailyMessagesPerChannel: 100,
  maxAICallsPerHour: 20,
  escalationConfidenceThreshold: 0.6,
  escalationTopics: ["complaint", "legal", "dispute", "refund", "gdpr"],
  moneyApprovalThresholdUsd: 100,
  notifyOnStageChanges: ["won", "lost"],
};

export interface SafetyCheckResult {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
  escalateTo?: "khaled" | "admin";
}

// ---------------------------------------------------------------------------
// Retention Types
// ---------------------------------------------------------------------------

export interface RetentionStep {
  delayHours: number;
  templateId: string;
  subject: string;
  /** Optional condition — e.g., "subscriber.engagement_score > 50" */
  condition?: string;
}

export interface RetentionStatus {
  sequenceId: string;
  sequenceName: string;
  subscriberId: string;
  currentStep: number;
  totalSteps: number;
  status: "active" | "completed" | "paused" | "unsubscribed";
  lastSentAt: string | null;
  nextSendAt: string | null;
}

// ---------------------------------------------------------------------------
// Finance Event Types
// ---------------------------------------------------------------------------

export type FinanceEventType =
  | "payment_succeeded"
  | "payment_failed"
  | "dispute_created"
  | "dispute_resolved"
  | "payout_completed"
  | "refund_created"
  | "invoice_paid";

export type FinanceSource = "stripe" | "mercury" | "manual";

export interface FinanceEventData {
  source: FinanceSource;
  eventType: FinanceEventType;
  externalId?: string;
  amount?: number;
  currency?: string;
  contactEmail?: string;
  metadata?: Record<string, unknown>;
}
