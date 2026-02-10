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
    process.env.FEATURE_AUTO_CONTENT_GENERATION === 'true';

  if (!enabled) return j(403, { error: 'disabled', feature: 'auto_content_generation' });

  const payload = await request.json().catch(() => ({}));
  const reqId = rid();
  logj({ evt: 'phase4b.generate.req', reqId, method: 'POST', path: '/api/phase4b/content/generate' });

  const result = await withTiming('p4b.generate.stub', async () => {
    return { ok: true, message: 'stub content generation route up', payload };
  }, { reqId });

  logj({ evt: 'phase4b.generate.done', reqId });
  return j(200, result);
}

export async function GET() {
  return j(405, { error: 'method_not_allowed', allow: 'POST' });
}
