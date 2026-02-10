export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { logj, rid, withTiming } from '@/lib/obs';
import { aiLimiter } from '@/lib/rate-limit';

const j = (status: number, body: any) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest) {
  const blocked = aiLimiter(request);
  if (blocked) return blocked;

  const enabled =
    process.env.FEATURE_PHASE4B_ENABLED === 'true' &&
    process.env.FEATURE_TOPIC_RESEARCH === 'true';

  if (!enabled) return j(403, { error: 'disabled', feature: 'topic_research' });

  const key = process.env.PPLX_API_KEY || process.env.PERPLEXITY_API_KEY;
  if (!key) return j(503, { error: 'missing_api_key', provider: 'perplexity' });

  const payload = await request.json().catch(() => ({} as any));
  const { category = 'london_travel', locale = 'en' } = payload;
  const reqId = rid();
  logj({ evt: 'phase4b.research.req', reqId, category, locale, method: 'POST', path: '/api/phase4b/topics/research' });

  const prompt = `You are a London-local editor. Suggest 5 timely article topics for "${category}"
in locale "${locale}" with short slugs and 1-2 authority sources each (domain only).
Return strict JSON array with objects: {title, slug, rationale, sources: string[]}`;

  const apiUrl = 'https://api.perplexity.ai/chat/completions';
  const body = {
    model: 'sonar',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 800,
    temperature: 0.3,
  };

  const topics = await withTiming('p4b.research.call', async () => {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`perplexity_http_${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const content: string =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.delta?.content ??
      '';

    // Try to parse strict JSON array; otherwise fallback to empty.
    let parsed: any[] = [];
    try {
      const maybe = JSON.parse(content);
      if (Array.isArray(maybe)) parsed = maybe;
    } catch { /* ignore */ }

    return parsed.slice(0, 5);
  }, { reqId });

  logj({ evt: 'phase4b.research.done', reqId, size: topics.length });
  return j(200, { ok: true, topics, reqId });
}

export async function GET() {
  return j(405, { error: 'method_not_allowed', allow: 'POST' });
}
