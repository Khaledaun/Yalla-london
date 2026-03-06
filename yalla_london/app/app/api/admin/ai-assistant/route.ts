import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

// ── AI Coding Assistant API ─────────────────────────────────────────────────────
// POST → send message with context, get AI response
// Gathers live platform context (cron logs, errors, pipeline, schema)
// Can generate patches and "paste into Claude Code" prompts

const SYSTEM_PROMPT = `You are an AI coding assistant embedded in the Yalla London admin dashboard. You help the operator (Khaled) understand and fix issues with the platform.

You have access to live platform data: cron logs, errors, pipeline status, and schema.

Rules:
1. Explain in plain, non-technical language first, then provide technical details.
2. Never execute shell commands or mutate production data directly.
3. When suggesting fixes, provide specific file paths and code changes.
4. For complex changes, generate a "Paste into Claude Code" prompt that includes: the error, file paths, reproduction steps, fix approach, and test verification.
5. Redact any secrets, API keys, or passwords from your responses.
6. Be concise. The operator works from an iPhone.

When generating patches:
- Use unified diff format
- Reference real file paths from the codebase
- Explain what each change does in plain English
- Note: patches are suggestions only — the operator must confirm before any changes are applied`

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { message, conversationHistory, siteId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    // Gather live context
    const { gatherContext, formatContextForPrompt } = await import("@/lib/ai/assistant-context");
    const context = await gatherContext(siteId);
    const contextText = formatContextForPrompt(context);

    // Build conversation
    const history = Array.isArray(conversationHistory) ? conversationHistory.slice(-10) : [];
    const fullPrompt = `${SYSTEM_PROMPT}

${contextText}

---

${history.length > 0 ? 'Previous messages:\n' + history.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n') + '\n\n---\n\n' : ''}User message: ${message}

Respond helpfully and concisely.`;

    const { generateCompletion } = await import("@/lib/ai/provider");
    const response = await generateCompletion(fullPrompt, {
      taskType: 'coding-assistant',
      calledFrom: 'api/admin/ai-assistant',
      siteId: siteId || undefined,
      timeoutMs: 45000,
    });

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
      },
      patches,
      claudePrompts,
    });
  } catch (err) {
    console.warn("[ai-assistant] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Assistant error" }, { status: 500 });
  }
}
