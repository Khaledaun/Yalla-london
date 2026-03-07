import { NextResponse } from 'next/server';

/**
 * IndexNow Key Verification Endpoint
 *
 * IndexNow requires the key file to be accessible at /{key}.txt
 * A vercel.json rewrite maps /:key.txt to this API route.
 * Returns the key as plain text for IndexNow verification.
 */
export async function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return new NextResponse('Not configured', { status: 404 });
  }
  return new NextResponse(key, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
