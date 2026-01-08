import { NextRequest, NextResponse } from 'next/server';

/**
 * IndexNow Key Verification Route
 * Serves the IndexNow key file at /{key}.txt
 * Required for IndexNow protocol verification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { indexnow: string } }
) {
  const indexNowKey = process.env.INDEXNOW_KEY;

  if (!indexNowKey) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Check if the request is for the IndexNow key file
  const requestedKey = params.indexnow.replace('.txt', '');

  if (requestedKey === indexNowKey) {
    return new NextResponse(indexNowKey, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // Not an IndexNow key request, return 404
  return new NextResponse('Not Found', { status: 404 });
}
