/**
 * Content Engine — Agent 4: Analyst
 *
 * Grades published content, identifies performance patterns, and generates
 * feed-forward recommendations that improve the next pipeline run.
 *
 * Pipeline position: Researcher -> Ideator -> Scripter -> **Analyst**
 *
 * Input: pipelineId + site
 * Output: grades, patterns, recommendations, feedForward
 * Persisted to: ContentPipeline.analysisData
 */

import { prisma } from '@/lib/db';
import { generateJSON, isAIAvailable } from '@/lib/ai/provider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalystInput {
  pipelineId: string;
  site: string;
}

export interface AnalystOutput {
  pipelineSummary: {
    totalPieces: number;
    totalImpressions: number;
    totalEngagements: number;
    averageEngagementRate: number;
    bestPerformer: { platform: string; format: string; title: string; score: string };
    worstPerformer: { platform: string; format: string; title: string; score: string };
  };
  contentGrades: {
    contentId: string;
    platform: string;
    format: string;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    engagementRate: number;
    vsAverage: string;
    whyItWorked?: string;
    whyItFailed?: string;
  }[];
  patterns: {
    bestAngleTypes: { type: string; avgEngagement: number }[];
    bestPlatforms: { platform: string; avgEngagement: number }[];
    bestFormats: { format: string; avgEngagement: number }[];
    bestPostingTimes: { platform: string; dayOfWeek: string; hour: number; avgEngagement: number }[];
    bestHookPatterns: { pattern: string; examples: string[]; avgEngagement: number }[];
    topicHeatmap: { topic: string; totalEngagement: number; pipelineCount: number }[];
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: 'format' | 'timing' | 'hook' | 'platform' | 'topic' | 'visual';
    recommendation: string;
    evidence: string;
    actionable: string;
  }[];
  feedForward: {
    preferredFormats: Record<string, string[]>;
    bestPostingTimes: Record<string, string[]>;
    avoidPatterns: string[];
    doubleDownPatterns: string[];
    audienceUpdates: string[];
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[content-engine:analyst]';

interface PerformanceRow {
  id: string;
  pipelineId: string;
  platform: string;
  contentType: string;
  postUrl: string | null;
  publishedAt: Date | null;
  impressions: number;
  engagements: number;
  clicks: number;
  shares: number;
  saves: number;
  comments: number;
  conversionRate: number | null;
  grade: string | null;
  notes: string | null;
}

/**
 * Compute engagement rate for a single performance row.
 * Returns 0 when impressions are 0 to avoid divide-by-zero.
 */
function engagementRate(row: PerformanceRow): number {
  if (row.impressions <= 0) return 0;
  return row.engagements / row.impressions;
}

/**
 * Assign a grade based on where the piece falls relative to all historical
 * engagement rates. Percentile-based: A (top 20%), B (20-40%), C (40-60%),
 * D (60-80%), F (bottom 20%).
 */
function gradeFromPercentile(
  rate: number,
  sortedHistoricalRates: number[],
): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (sortedHistoricalRates.length === 0) return 'C'; // No history — default to average

  // Find the percentile rank of this rate within the sorted array
  let rank = 0;
  for (const hr of sortedHistoricalRates) {
    if (rate > hr) rank++;
    else break;
  }
  const percentile = rank / sortedHistoricalRates.length;

  if (percentile >= 0.8) return 'A';
  if (percentile >= 0.6) return 'B';
  if (percentile >= 0.4) return 'C';
  if (percentile >= 0.2) return 'D';
  return 'F';
}

/**
 * Compute a simple average of an array of numbers.
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Format a rate as a human-readable percentage string.
 */
function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Format a rate relative to a baseline as "+X%" or "-X%".
 */
function vsAverageStr(rate: number, avg: number): string {
  if (avg === 0) return rate > 0 ? '+Inf' : '0%';
  const diff = ((rate - avg) / avg) * 100;
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}%`;
}

/**
 * Group an array by a key function and aggregate values.
 */
function groupBy<T, K extends string>(
  items: T[],
  keyFn: (item: T) => K,
  valueFn: (item: T) => number,
): { key: K; avgValue: number; count: number }[] {
  const map = new Map<K, { sum: number; count: number }>();
  for (const item of items) {
    const k = keyFn(item);
    const existing = map.get(k) || { sum: 0, count: 0 };
    existing.sum += valueFn(item);
    existing.count += 1;
    map.set(k, existing);
  }
  return Array.from(map.entries())
    .map(([key, { sum, count }]) => ({ key, avgValue: sum / count, count }))
    .sort((a, b) => b.avgValue - a.avgValue);
}

/**
 * Build data-only patterns from historical performance rows (no AI needed).
 */
function buildDataPatterns(
  allHistorical: PerformanceRow[],
  pipelineMap: Map<string, { topic?: string }>,
): AnalystOutput['patterns'] {
  const withRates = allHistorical.map((r) => ({ ...r, rate: engagementRate(r) }));

  // Best platforms
  const platformGroups = groupBy(withRates, (r) => r.platform, (r) => r.rate);
  const bestPlatforms = platformGroups.map((g) => ({
    platform: g.key,
    avgEngagement: g.avgValue,
  }));

  // Best formats (contentType)
  const formatGroups = groupBy(withRates, (r) => r.contentType, (r) => r.rate);
  const bestFormats = formatGroups.map((g) => ({
    format: g.key,
    avgEngagement: g.avgValue,
  }));

  // Best posting times
  const bestPostingTimes: AnalystOutput['patterns']['bestPostingTimes'] = [];
  const timeRows = withRates.filter((r) => r.publishedAt);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeGroups = new Map<string, { rates: number[]; platform: string; day: string; hour: number }>();
  for (const r of timeRows) {
    const d = new Date(r.publishedAt!);
    const day = dayNames[d.getUTCDay()];
    const hour = d.getUTCHours();
    const key = `${r.platform}-${day}-${hour}`;
    const existing = timeGroups.get(key) || { rates: [], platform: r.platform, day, hour };
    existing.rates.push(r.rate);
    timeGroups.set(key, existing);
  }
  for (const [, group] of timeGroups) {
    bestPostingTimes.push({
      platform: group.platform,
      dayOfWeek: group.day,
      hour: group.hour,
      avgEngagement: average(group.rates),
    });
  }
  bestPostingTimes.sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Topic heatmap — requires pipeline topic data
  const topicMap = new Map<string, { totalEngagement: number; pipelineIds: Set<string> }>();
  for (const r of allHistorical) {
    const pipelineData = pipelineMap.get(r.pipelineId);
    const topic = pipelineData?.topic || 'unknown';
    const existing = topicMap.get(topic) || { totalEngagement: 0, pipelineIds: new Set() };
    existing.totalEngagement += r.engagements;
    existing.pipelineIds.add(r.pipelineId);
    topicMap.set(topic, existing);
  }
  const topicHeatmap = Array.from(topicMap.entries())
    .map(([topic, data]) => ({
      topic,
      totalEngagement: data.totalEngagement,
      pipelineCount: data.pipelineIds.size,
    }))
    .sort((a, b) => b.totalEngagement - a.totalEngagement);

  return {
    bestAngleTypes: [], // Requires AI analysis of content angles
    bestPlatforms,
    bestFormats,
    bestPostingTimes: bestPostingTimes.slice(0, 20),
    bestHookPatterns: [], // Requires AI analysis of hooks
    topicHeatmap: topicHeatmap.slice(0, 20),
  };
}

/**
 * Build feed-forward recommendations from grades and data patterns.
 */
function buildFeedForward(
  grades: AnalystOutput['contentGrades'],
  patterns: AnalystOutput['patterns'],
): AnalystOutput['feedForward'] {
  // Preferred formats per platform — pick top 2 formats per platform from patterns
  const preferredFormats: Record<string, string[]> = {};
  const platformFormats = new Map<string, Map<string, number[]>>();
  for (const g of grades) {
    if (!platformFormats.has(g.platform)) platformFormats.set(g.platform, new Map());
    const formatMap = platformFormats.get(g.platform)!;
    if (!formatMap.has(g.format)) formatMap.set(g.format, []);
    formatMap.get(g.format)!.push(g.engagementRate);
  }
  for (const [platform, formatMap] of platformFormats) {
    const sorted = Array.from(formatMap.entries())
      .map(([format, rates]) => ({ format, avg: average(rates) }))
      .sort((a, b) => b.avg - a.avg);
    preferredFormats[platform] = sorted.slice(0, 2).map((s) => s.format);
  }

  // Best posting times per platform — top 2 time slots
  const bestPostingTimes: Record<string, string[]> = {};
  for (const t of patterns.bestPostingTimes.slice(0, 10)) {
    if (!bestPostingTimes[t.platform]) bestPostingTimes[t.platform] = [];
    if (bestPostingTimes[t.platform].length < 2) {
      bestPostingTimes[t.platform].push(`${t.dayOfWeek} ${t.hour}:00 UTC`);
    }
  }

  // Avoid patterns — formats/platforms with consistent F grades
  const avoidPatterns: string[] = [];
  const failedFormats = new Map<string, number>();
  for (const g of grades) {
    if (g.grade === 'F') {
      const key = `${g.platform}/${g.format}`;
      failedFormats.set(key, (failedFormats.get(key) || 0) + 1);
    }
  }
  for (const [combo, count] of failedFormats) {
    if (count >= 2) {
      avoidPatterns.push(`${combo} — consistently underperforms (${count} F grades)`);
    }
  }

  // Double down patterns — formats/platforms with consistent A grades
  const doubleDownPatterns: string[] = [];
  const topFormats = new Map<string, number>();
  for (const g of grades) {
    if (g.grade === 'A') {
      const key = `${g.platform}/${g.format}`;
      topFormats.set(key, (topFormats.get(key) || 0) + 1);
    }
  }
  for (const [combo, count] of topFormats) {
    if (count >= 1) {
      doubleDownPatterns.push(`${combo} — strong performer (${count} A grades)`);
    }
  }

  return {
    preferredFormats,
    bestPostingTimes,
    avoidPatterns,
    doubleDownPatterns,
    audienceUpdates: [], // Populated by AI analysis when available
  };
}

// ---------------------------------------------------------------------------
// AI Analysis
// ---------------------------------------------------------------------------

interface AIAnalysisResult {
  patterns: {
    bestAngleTypes: { type: string; avgEngagement: number }[];
    bestHookPatterns: { pattern: string; examples: string[]; avgEngagement: number }[];
  };
  recommendations: AnalystOutput['recommendations'];
  audienceUpdates: string[];
  gradeCommentary: {
    contentId: string;
    whyItWorked?: string;
    whyItFailed?: string;
  }[];
}

async function runAIAnalysis(
  pipelinePerf: PerformanceRow[],
  historicalPerf: PerformanceRow[],
  site: string,
  topic: string | undefined,
  grades: AnalystOutput['contentGrades'],
  dataPatterns: AnalystOutput['patterns'],
): Promise<AIAnalysisResult | null> {
  const aiReady = await isAIAvailable();
  if (!aiReady) {
    console.warn(`${LOG_PREFIX} No AI provider available — returning data-only analysis`);
    return null;
  }

  const gradeSummary = grades.map((g) => ({
    id: g.contentId,
    platform: g.platform,
    format: g.format,
    grade: g.grade,
    engagementRate: fmtPct(g.engagementRate),
    vsAverage: g.vsAverage,
  }));

  const prompt = `You are a content performance analyst for a luxury travel website ("${site}").

Analyze this content pipeline's performance data and provide pattern insights and actionable recommendations.

## Current Pipeline
Topic: ${topic || 'N/A'}
Pieces: ${pipelinePerf.length}
Total impressions: ${pipelinePerf.reduce((s, r) => s + r.impressions, 0)}
Total engagements: ${pipelinePerf.reduce((s, r) => s + r.engagements, 0)}

## Content Grades (this pipeline)
${JSON.stringify(gradeSummary, null, 2)}

## Historical Data Summary
Total historical pieces analyzed: ${historicalPerf.length}
Top platforms by engagement: ${JSON.stringify(dataPatterns.bestPlatforms.slice(0, 5))}
Top formats by engagement: ${JSON.stringify(dataPatterns.bestFormats.slice(0, 5))}
Top topics by engagement: ${JSON.stringify(dataPatterns.topicHeatmap.slice(0, 10))}

## Task
Return a JSON object with EXACTLY this structure:
{
  "patterns": {
    "bestAngleTypes": [{ "type": "string describing the content angle", "avgEngagement": 0.05 }],
    "bestHookPatterns": [{ "pattern": "description of hook pattern", "examples": ["example 1"], "avgEngagement": 0.04 }]
  },
  "recommendations": [
    {
      "priority": "high",
      "category": "format",
      "recommendation": "what to do",
      "evidence": "data supporting this",
      "actionable": "specific next step"
    }
  ],
  "audienceUpdates": ["insight about audience behavior"],
  "gradeCommentary": [
    {
      "contentId": "id from grades above",
      "whyItWorked": "reason (only for A/B grades)",
      "whyItFailed": "reason (only for D/F grades)"
    }
  ]
}

Rules:
- Base all insights on the data provided. Do not fabricate engagement numbers.
- Provide 3-7 recommendations sorted by priority.
- For bestAngleTypes, identify up to 5 recurring content angle patterns (e.g., "insider tips", "luxury comparison", "seasonal guide").
- For bestHookPatterns, identify up to 5 patterns in how top-performing content opens or frames its message.
- For audienceUpdates, provide 1-3 inferences about what the audience responds to.
- For gradeCommentary, only comment on A/B (whyItWorked) and D/F (whyItFailed) grades. Skip C grades.
- categories must be one of: format, timing, hook, platform, topic, visual`;

  try {
    const result = await generateJSON<AIAnalysisResult>(prompt, {
      temperature: 0.4,
      maxTokens: 4096,
      systemPrompt: 'You are a data-driven content performance analyst. Respond only with valid JSON.',
    });

    // Validate essential structure
    if (!result.patterns || !result.recommendations || !Array.isArray(result.recommendations)) {
      console.warn(`${LOG_PREFIX} AI response missing expected fields — discarding`);
      return null;
    }

    return result;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} AI analysis failed, falling back to data-only:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runAnalyst(input: AnalystInput): Promise<AnalystOutput> {
  const { pipelineId, site } = input;
  console.debug(`${LOG_PREFIX} Starting analysis for pipeline=${pipelineId} site=${site}`);

  // 1. Load the ContentPipeline record
  const pipeline = await prisma.contentPipeline.findUnique({
    where: { id: pipelineId },
    include: { performance: true },
  });

  if (!pipeline) {
    throw new Error(`${LOG_PREFIX} ContentPipeline not found: ${pipelineId}`);
  }

  const pipelinePerf: PerformanceRow[] = pipeline.performance as unknown as PerformanceRow[];

  // 2. Query historical ContentPerformance across all pipelines for this site
  const historicalPipelines = await prisma.contentPipeline.findMany({
    where: { site },
    select: { id: true, topic: true },
    orderBy: { createdAt: 'desc' },
    take: 100, // Cap to avoid unbounded queries
  });

  const pipelineIds = historicalPipelines.map((p: { id: string; topic: string | null }) => p.id);
  const pipelineMap = new Map<string, { topic?: string }>(
    historicalPipelines.map((p: { id: string; topic: string | null }) => [p.id, { topic: p.topic ?? undefined }]),
  );

  const allHistorical: PerformanceRow[] = pipelineIds.length > 0
    ? ((await prisma.contentPerformance.findMany({
        where: { pipelineId: { in: pipelineIds } },
        orderBy: { createdAt: 'desc' },
        take: 1000, // Cap to prevent OOM on large datasets
      })) as unknown as PerformanceRow[])
    : [];

  // 3. Calculate metrics
  const historicalRates = allHistorical.map((r) => engagementRate(r)).sort((a, b) => a - b);
  const avgRate = average(historicalRates);

  // Grade each piece in this pipeline
  const contentGrades: AnalystOutput['contentGrades'] = pipelinePerf.map((row) => {
    const rate = engagementRate(row);
    const grade = gradeFromPercentile(rate, historicalRates);
    return {
      contentId: row.id,
      platform: row.platform,
      format: row.contentType,
      grade,
      engagementRate: rate,
      vsAverage: vsAverageStr(rate, avgRate),
    };
  });

  // Update grades in DB
  for (const graded of contentGrades) {
    try {
      await prisma.contentPerformance.update({
        where: { id: graded.contentId },
        data: { grade: graded.grade },
      });
    } catch (error) {
      console.warn(
        `${LOG_PREFIX} Failed to update grade for ${graded.contentId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  // 4. Build data-driven patterns
  const dataPatterns = buildDataPatterns(allHistorical, pipelineMap);

  // 5. Run AI analysis (returns null if AI unavailable)
  const aiResult = await runAIAnalysis(
    pipelinePerf,
    allHistorical,
    site,
    pipeline.topic ?? undefined,
    contentGrades,
    dataPatterns,
  );

  // 6. Merge AI insights into data patterns
  if (aiResult) {
    if (aiResult.patterns.bestAngleTypes?.length) {
      dataPatterns.bestAngleTypes = aiResult.patterns.bestAngleTypes;
    }
    if (aiResult.patterns.bestHookPatterns?.length) {
      dataPatterns.bestHookPatterns = aiResult.patterns.bestHookPatterns;
    }

    // Enrich grade commentary
    for (const commentary of aiResult.gradeCommentary || []) {
      const grade = contentGrades.find((g) => g.contentId === commentary.contentId);
      if (grade) {
        if (commentary.whyItWorked) grade.whyItWorked = commentary.whyItWorked;
        if (commentary.whyItFailed) grade.whyItFailed = commentary.whyItFailed;
      }
    }
  }

  // 7. Build recommendations (AI or data-only fallback)
  const recommendations: AnalystOutput['recommendations'] = aiResult?.recommendations || [];

  // Add data-only recommendations if AI didn't provide enough
  if (recommendations.length < 3) {
    // Recommend top platform if clear leader
    if (dataPatterns.bestPlatforms.length >= 2) {
      const top = dataPatterns.bestPlatforms[0];
      const second = dataPatterns.bestPlatforms[1];
      if (top.avgEngagement > second.avgEngagement * 1.3) {
        recommendations.push({
          priority: 'high',
          category: 'platform',
          recommendation: `Prioritize ${top.platform} — it outperforms the next best platform by ${((top.avgEngagement / (second.avgEngagement || 1) - 1) * 100).toFixed(0)}%`,
          evidence: `${top.platform} avg engagement: ${fmtPct(top.avgEngagement)} vs ${second.platform}: ${fmtPct(second.avgEngagement)}`,
          actionable: `Allocate more content budget and creative effort to ${top.platform}`,
        });
      }
    }

    // Recommend top format if clear leader
    if (dataPatterns.bestFormats.length >= 2) {
      const top = dataPatterns.bestFormats[0];
      recommendations.push({
        priority: 'medium',
        category: 'format',
        recommendation: `Double down on ${top.format} content — highest average engagement`,
        evidence: `${top.format} avg engagement: ${fmtPct(top.avgEngagement)}`,
        actionable: `Increase ${top.format} production in the next pipeline run`,
      });
    }

    // Recommend best posting time
    if (dataPatterns.bestPostingTimes.length > 0) {
      const top = dataPatterns.bestPostingTimes[0];
      recommendations.push({
        priority: 'medium',
        category: 'timing',
        recommendation: `Schedule ${top.platform} posts for ${top.dayOfWeek} at ${top.hour}:00 UTC`,
        evidence: `Best performing time slot with ${fmtPct(top.avgEngagement)} avg engagement`,
        actionable: `Update scheduling rules for ${top.platform} to target this window`,
      });
    }
  }

  // 8. Build feedForward
  const feedForward = buildFeedForward(contentGrades, dataPatterns);

  // Merge AI audience updates
  if (aiResult?.audienceUpdates?.length) {
    feedForward.audienceUpdates = aiResult.audienceUpdates;
  }

  // 9. Build pipeline summary
  const totalImpressions = pipelinePerf.reduce((s, r) => s + r.impressions, 0);
  const totalEngagements = pipelinePerf.reduce((s, r) => s + r.engagements, 0);
  const pipelineAvgRate = totalImpressions > 0 ? totalEngagements / totalImpressions : 0;

  // Find best/worst performers
  const sorted = [...contentGrades].sort((a, b) => b.engagementRate - a.engagementRate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const defaultPerformer = { platform: 'N/A', format: 'N/A', title: 'N/A', score: '0%' };

  const pipelineSummary: AnalystOutput['pipelineSummary'] = {
    totalPieces: pipelinePerf.length,
    totalImpressions,
    totalEngagements,
    averageEngagementRate: pipelineAvgRate,
    bestPerformer: best
      ? { platform: best.platform, format: best.format, title: best.contentId, score: fmtPct(best.engagementRate) }
      : defaultPerformer,
    worstPerformer: worst
      ? { platform: worst.platform, format: worst.format, title: worst.contentId, score: fmtPct(worst.engagementRate) }
      : defaultPerformer,
  };

  // 10. Assemble output
  const output: AnalystOutput = {
    pipelineSummary,
    contentGrades,
    patterns: dataPatterns,
    recommendations,
    feedForward,
  };

  // 11. Save results to ContentPipeline.analysisData
  try {
    await prisma.contentPipeline.update({
      where: { id: pipelineId },
      data: {
        analysisData: output as unknown as Record<string, unknown>,
        status: 'complete',
      },
    });
    console.debug(`${LOG_PREFIX} Analysis saved to pipeline=${pipelineId}, status set to "complete"`);
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to save analysis to pipeline=${pipelineId}:`,
      error instanceof Error ? error.message : error,
    );
    // Don't throw — the output is still valid, just not persisted
  }

  return output;
}

// ---------------------------------------------------------------------------
// Feed-forward retrieval
// ---------------------------------------------------------------------------

/**
 * Retrieve the feedForward data from the most recently completed pipeline for
 * the given site. Returns null if no completed pipeline exists or if the
 * analysisData doesn't contain feedForward.
 */
export async function getLatestFeedForward(
  site: string,
): Promise<AnalystOutput['feedForward'] | null> {
  try {
    const pipeline = await prisma.contentPipeline.findFirst({
      where: {
        site,
        status: 'complete',
        analysisData: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      select: { analysisData: true },
    });

    if (!pipeline?.analysisData) {
      console.debug(`${LOG_PREFIX} No completed pipeline with analysisData found for site=${site}`);
      return null;
    }

    const data = pipeline.analysisData as unknown as AnalystOutput;
    if (!data.feedForward) {
      console.warn(`${LOG_PREFIX} analysisData exists but missing feedForward for site=${site}`);
      return null;
    }

    return data.feedForward;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Failed to retrieve feedForward for site=${site}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
