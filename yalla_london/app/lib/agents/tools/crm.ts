/**
 * CRM Tool Handlers — wraps contact-resolver + Prisma for CEO Agent.
 *
 * Tools: crm_lookup, crm_create_lead, crm_create_opportunity,
 *        crm_update_stage, crm_log_interaction, crm_schedule_followup
 */

import { prisma } from "@/lib/db";
import { resolveContact, ensureContact } from "../crm/contact-resolver";
import { scoreAndUpdateLead } from "../crm/lead-scoring";
import type { ToolContext, ToolResult } from "../types";

// ---------------------------------------------------------------------------
// crm_lookup
// ---------------------------------------------------------------------------

export async function crmLookup(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const contact = await resolveContact({
    phone: params.phone as string | undefined,
    email: params.email as string | undefined,
    externalId: params.externalId as string | undefined,
    siteId: ctx.siteId,
  });

  if (!contact) {
    return {
      success: true,
      data: null,
      summary: "No contact found matching those identifiers.",
    };
  }

  return {
    success: true,
    data: contact,
    summary: `Found ${contact.name || "unnamed contact"} (score: ${contact.score}, status: ${contact.status}, ${contact.totalInteractions} interactions).`,
  };
}

// ---------------------------------------------------------------------------
// crm_create_lead
// ---------------------------------------------------------------------------

export async function crmCreateLead(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const contact = await ensureContact({
    siteId: ctx.siteId,
    email: params.email as string | undefined,
    phone: params.phone as string | undefined,
    name: params.name as string | undefined,
    source: (params.source as string) || "agent",
  });

  return {
    success: true,
    data: { leadId: contact.leadId, subscriberId: contact.subscriberId },
    summary: `Contact ensured: ${contact.name || "unknown"} (leadId: ${contact.leadId || "none"}).`,
  };
}

// ---------------------------------------------------------------------------
// crm_create_opportunity
// ---------------------------------------------------------------------------

export async function crmCreateOpportunity(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const leadId = params.leadId as string;
  const title = params.title as string;

  // Verify lead exists
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return { success: false, error: `Lead "${leadId}" not found.` };
  }

  const opportunity = await prisma.crmOpportunity.create({
    data: {
      siteId: ctx.siteId,
      leadId,
      contactName: lead.name || "Unknown",
      contactEmail: lead.email,
      contactPhone: lead.phone,
      stage: (params.stage as string) || "new",
      value: params.valueUsd ? Number(params.valueUsd) : null,
      source: "agent",
      assignedTo: "ceo-agent",
      metadata: params.notes ? { notes: params.notes } : undefined,
    },
  });

  return {
    success: true,
    data: { opportunityId: opportunity.id, stage: opportunity.stage },
    summary: `Opportunity "${title}" created for ${lead.name || lead.email} (stage: ${opportunity.stage}).`,
  };
}

// ---------------------------------------------------------------------------
// crm_update_stage
// ---------------------------------------------------------------------------

export async function crmUpdateStage(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const opportunityId = params.opportunityId as string;
  const newStage = params.stage as string;

  const opp = await prisma.crmOpportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opp) {
    return { success: false, error: `Opportunity "${opportunityId}" not found.` };
  }

  const oldStage = opp.stage;

  const updateData: Record<string, unknown> = { stage: newStage };
  if (newStage === "won" || newStage === "lost") {
    updateData.closedAt = new Date();
  }
  if (newStage === "lost" && params.reason) {
    updateData.lostReason = params.reason;
  }

  await prisma.crmOpportunity.update({
    where: { id: opportunityId },
    data: updateData,
  });

  // Update lead score after stage change
  if (opp.leadId) {
    await scoreAndUpdateLead(opp.leadId).catch((err) =>
      console.warn("[crm-tools] Failed to rescore lead:", err),
    );
  }

  return {
    success: true,
    data: { opportunityId, oldStage, newStage },
    summary: `Opportunity moved from "${oldStage}" to "${newStage}".`,
  };
}

// ---------------------------------------------------------------------------
// crm_log_interaction
// ---------------------------------------------------------------------------

export async function crmLogInteraction(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const log = await prisma.interactionLog.create({
    data: {
      siteId: ctx.siteId,
      leadId: params.contactId as string | undefined,
      opportunityId: params.opportunityId as string | undefined,
      conversationId: ctx.conversationId || undefined,
      channel: params.channel as string,
      direction: params.direction as string,
      interactionType: (params.type as string) || "message",
      summary: params.summary as string,
      sentiment: params.sentiment as string | undefined,
      agentId: ctx.agentId,
    },
  });

  // Rescore lead after interaction
  if (params.contactId) {
    await scoreAndUpdateLead(params.contactId as string).catch((err) =>
      console.warn("[crm-tools] Failed to rescore lead after interaction:", err),
    );
  }

  return {
    success: true,
    data: { interactionId: log.id },
    summary: `Interaction logged: ${params.direction} ${params.channel} — "${(params.summary as string).slice(0, 60)}..."`,
  };
}

// ---------------------------------------------------------------------------
// crm_schedule_followup
// ---------------------------------------------------------------------------

export async function crmScheduleFollowup(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const dueAt = new Date(params.dueAt as string);

  if (isNaN(dueAt.getTime())) {
    return { success: false, error: "Invalid dueAt date." };
  }

  const task = await prisma.agentTask.create({
    data: {
      agentType: "ceo",
      taskType: "follow_up",
      priority: (params.priority as string) || "medium",
      status: "pending",
      description: params.description as string,
      siteId: ctx.siteId,
      assignedTo: "ceo",
      dueAt,
      conversationId: ctx.conversationId || undefined,
      input: {
        contactId: params.contactId,
        channel: params.channel || "whatsapp",
      },
    },
  });

  return {
    success: true,
    data: { taskId: task.id, dueAt: dueAt.toISOString() },
    summary: `Follow-up scheduled for ${dueAt.toLocaleDateString()}: "${(params.description as string).slice(0, 60)}"`,
  };
}
