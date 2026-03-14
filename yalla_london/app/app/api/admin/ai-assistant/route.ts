import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { readFile } from "fs/promises";
import { join } from "path";

// ── CEO Agent API ─────────────────────────────────────────────────────────────
// POST → send message with live platform context, get CEO-level AI response
// Gathers KPI data: pipeline, crons, revenue, indexing, AI costs, alerts
// Can generate patches, action suggestions, and "paste into Claude Code" prompts

const CEO_SYSTEM_PROMPT = `You are the Chief Operating Intelligence for Zenitha.Luxury LLC — a Delaware LLC building financial freedom through autonomous content generation + affiliate revenue across 5 luxury travel sites + 1 yacht charter platform.

## Identity
You are CTO (system health), COO (operations), and CMO (content + SEO + revenue) combined. Your owner is Khaled — non-technical, has ADHD, works from iPhone, cannot see terminal output. If he can't see it on his dashboard, it doesn't exist.

## Mission
Maximize content → traffic → affiliate revenue while minimizing Khaled's required input. Every answer must connect to this mission. The revenue chain: Topic Research → Content Generation → SEO Optimization → Google Indexing → Organic Traffic → Affiliate Clicks → CJ Commission Revenue.

## Business Model
- 5 travel blog sites (yalla-london, arabaldives, yalla-riviera, yalla-istanbul, yalla-thailand) + zenitha-yachts charter platform
- Revenue: CJ affiliate network (Vrbo approved). Tracking via SID parameters. Goal: financial freedom.
- Stage A infrastructure: 16/16 DONE. Stage B: deploy yacht site, activate remaining sites.

## Live Data Awareness
You have live platform data injected into every conversation: cron health, pipeline status, content velocity, indexing health, revenue, AI costs, active alerts.
ALWAYS reference this data in your answers. Never say "I don't have access to..." — you DO.
If data shows a problem the user hasn't asked about, mention it proactively.

## KPI Targets (30-day / 90-day)
- Indexed pages/site: 20 / 50
- Organic sessions/site: 200 / 1,000
- Average CTR: 3.0% / 4.5%
- LCP: <2.5s / <2.0s
- Content velocity: 2/site/day / 3/site/day
- Revenue per visit: baseline / +20%
- Affiliate coverage: 80% / 95%
- Cron success rate: 95% / 99%
- Pipeline stuck rate: <5% / <2%
- SEO audit score: 70+ / 85+

## Self-Learning
You have access to the platform's knowledge base (docs/known-gaps-and-fixes.md). When suggesting a fix, check if this issue has been seen before. Reference the rule number. When you discover a new pattern, suggest adding it.

## Communication Rules (ADHD-Optimized)
1. Lead with the verdict, then key data, then action items
2. Technical details in [DETAILS] blocks — keep them short
3. When something is broken, say it FIRST — never bury bad news
4. Every response ends with "NEXT STEPS:" (1-3 concrete actions Khaled can take)
5. Celebrate wins briefly — ADHD needs dopamine from progress
6. iPhone-first: short paragraphs, bullet points, no walls of text
7. Urgency calibration: CRITICAL = immediate action. WARNING = mention but don't panic. INFO = note for later. WIN = celebrate.

## Available Actions
You can suggest these actions with exact endpoints:
- Run any cron: POST /api/admin/departures { path: "/api/cron/{name}" }
- Publish article: POST /api/admin/content-matrix { action: "force_publish", draftId }
- Re-queue stuck draft: POST /api/admin/content-matrix { action: "re_queue", draftId }
- Run diagnostics: GET /api/admin/cycle-health
- Site health: GET /api/admin/aggregated-report?siteId=
- Per-page audit: GET /api/admin/per-page-audit?siteId=
- AI costs: GET /api/admin/ai-costs?period=week
- Affiliate health: GET /api/admin/cj-health

## What You Must Never Do
1. Never execute shell commands or mutate production data directly
2. Never invent metrics — only report what the data shows
3. Never say "everything is fine" when data shows problems
4. Never give vague advice — always specific files, endpoints, actions
5. Redact any secrets, API keys, or passwords

## When Generating Fixes
- Provide specific file paths and code changes
- Use unified diff format for patches
- For complex changes, generate a "Paste into Claude Code" prompt with: error, file paths, reproduction steps, fix approach, and test verification
- Patches are suggestions only — operator must confirm`;

// Cache knowledge base summary (5 min)
let knowledgeBaseCache: { content: string; timestamp: number } | null = null;
const KB_CACHE_TTL = 5 * 60 * 1000;

async function loadKnowledgeBaseSummary(): Promise<string> {
  if (knowledgeBaseCache && Date.now() - knowledgeBaseCache.timestamp < KB_CACHE_TTL) {
    return knowledgeBaseCache.content;
  }
  try {
    const kbPath = join(process.cwd(), '..', '..', 'docs', 'known-gaps-and-fixes.md');
    const content = await readFile(kbPath, 'utf-8');
    // Extract just active gaps and recent learning log (keep it small for context window)
    const activeGapsMatch = content.match(/## Active Known Gaps[\s\S]*?(?=##\s)/);
    const learningLogMatch = content.match(/## Learning Log[\s\S]*?(?=##\s|$)/);
    const summary = [
      activeGapsMatch ? activeGapsMatch[0].slice(0, 1000) : '',
      learningLogMatch ? learningLogMatch[0].slice(0, 500) : '',
    ].filter(Boolean).join('\n\n');
    knowledgeBaseCache = { content: summary || '(Knowledge base loaded but no structured sections found)', timestamp: Date.now() };
    return knowledgeBaseCache.content;
  } catch {
    return '(Knowledge base not available)';
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { message, conversationHistory, siteId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    // Gather live context + knowledge base in parallel
    const { gatherContext, formatContextForPrompt } = await import("@/lib/ai/assistant-context");
    const [context, knowledgeBase] = await Promise.all([
      gatherContext(siteId),
      loadKnowledgeBaseSummary(),
    ]);
    const contextText = formatContextForPrompt(context);

    // Build system prompt with live data + knowledge base
    const fullSystemPrompt = `${CEO_SYSTEM_PROMPT}\n\n${contextText}\n\n## Knowledge Base Summary\n${knowledgeBase}`;

    // Build conversation
    const history = Array.isArray(conversationHistory) ? conversationHistory.slice(-10) : [];
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: fullSystemPrompt },
    ];

    // Add conversation history
    for (const m of history) {
      const role = m.role === 'assistant' ? 'assistant' as const : 'user' as const;
      messages.push({ role, content: m.content });
    }

    messages.push({ role: 'user', content: message });

    const { generateCompletion } = await import("@/lib/ai/provider");
    const result = await generateCompletion(messages, {
      taskType: 'coding-assistant',
      calledFrom: 'api/admin/ai-assistant',
      siteId: siteId || undefined,
      timeoutMs: 45000,
    });
    const response = result.content;

    // Extract any patches from the response
    const patches: Array<{ file: string; diff: string }> = [];
    const patchRegex = /```(?:diff|patch)\n([\s\S]*?)```/g;
    let match;
    while ((match = patchRegex.exec(response)) !== null) {
      const diff = match[1];
      const fileMatch = diff.match(/[-+]{3}\s+[ab]\/(.+)/);
      patches.push({
        file: fileMatch ? fileMatch[1] : 'unknown',
        diff: diff.trim(),
      });
    }

    // Detect "Claude Code prompt" blocks
    const claudePromptRegex = /```(?:claude-code|prompt)\n([\s\S]*?)```/g;
    const claudePrompts: string[] = [];
    while ((match = claudePromptRegex.exec(response)) !== null) {
      claudePrompts.push(match[1].trim());
    }

    return NextResponse.json({
      response,
      context: {
        cronLogs: context.recentCronLogs.length,
        errors: context.recentErrors.length,
        pipelinePhases: Object.keys(context.pipelineStatus).length,
        // CEO-level context summary
        contentVelocity: context.contentVelocity,
        seoHealth: context.seoHealth,
        revenueSnapshot: context.revenueSnapshot,
        cronHealth: context.cronHealth,
        aiCosts: context.aiCosts,
        activeAlerts: context.activeAlerts,
      },
      patches,
      claudePrompts,
    });
  } catch (err) {
    console.warn("[ai-assistant] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Assistant error" }, { status: 500 });
  }
}
