/**
 * Perplexity API Client
 *
 * Rate-limited, retry-capable client for Perplexity's sonar-pro model.
 * Used by the public SEO audit system for deep research with citations.
 */

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const RATE_LIMIT_DELAY_MS = 2_000; // Courtesy delay; 429 retry handles actual rate limits
const MAX_RETRIES = 3;

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityCitation {
  url: string;
  title?: string;
}

export interface PerplexityResponse {
  content: string;
  citations: PerplexityCitation[];
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

let lastCallTime = 0;

async function rateLimitWait() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < RATE_LIMIT_DELAY_MS && lastCallTime > 0) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_DELAY_MS - elapsed)
    );
  }
  lastCallTime = Date.now();
}

export async function queryPerplexity(
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: "sonar-pro" | "sonar";
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<PerplexityResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY || process.env.PPLX_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const model = options.model || "sonar-pro";
  const maxTokens = options.maxTokens || 4096;
  const temperature = options.temperature ?? 0.2;

  const messages: PerplexityMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await rateLimitWait();

    try {
      const response = await fetch(PERPLEXITY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          return_citations: true,
        }),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("retry-after") || "30",
          10
        );
        console.warn(
          `[perplexity] Rate limited, waiting ${retryAfter}s (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, retryAfter * 1000)
        );
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Perplexity API error ${response.status}: ${errorText.slice(0, 200)}`
        );
      }

      const data = await response.json();

      const choice = data.choices?.[0];
      if (!choice) {
        throw new Error("No choices in Perplexity response");
      }

      // Extract citations from response
      const citations: PerplexityCitation[] = (data.citations || []).map(
        (url: string) => ({ url })
      );

      return {
        content: choice.message?.content || "",
        citations,
        model: data.model || model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES - 1) {
        const backoff = Math.pow(2, attempt + 1) * 1000;
        console.warn(
          `[perplexity] Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${backoff / 1000}s`
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw lastError || new Error("Perplexity API call failed after all retries");
}

/**
 * Log Perplexity API usage to the ApiUsageLog table.
 */
export async function logPerplexityUsage(
  usage: PerplexityResponse["usage"],
  siteId: string,
  taskType: string,
  calledFrom: string,
  success: boolean,
  errorMessage?: string
) {
  try {
    const { prisma } = await import("@/lib/db");

    // sonar-pro pricing: $3/1M input, $15/1M output (approx Feb 2026)
    const inputCost = (usage.promptTokens / 1_000_000) * 3;
    const outputCost = (usage.completionTokens / 1_000_000) * 15;
    const estimatedCostUsd = inputCost + outputCost;

    await prisma.apiUsageLog.create({
      data: {
        siteId,
        provider: "perplexity",
        model: "sonar-pro",
        taskType,
        calledFrom,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        estimatedCostUsd,
        success,
        errorMessage: errorMessage || null,
      },
    });
  } catch (e) {
    console.warn(
      "[perplexity] Failed to log usage:",
      e instanceof Error ? e.message : e
    );
  }
}
