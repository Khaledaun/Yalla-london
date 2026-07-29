import { NextRequest, NextResponse } from "next/server";

/**
 * IndexNow Key Verification Endpoint
 *
 * IndexNow engines (Bing, Yandex, api.indexnow.org) verify key ownership by
 * fetching /{key}.txt from the host. The Vercel rewrite in vercel.json maps
 * /:key.txt → /api/indexnow-key?key=:key so this route handles verification.
 *
 * Requirements for IndexNow engines to accept the key:
 * - Response must be exactly the key string (no HTML, no JSON)
 * - Content-Type must be text/plain
 * - No Set-Cookie headers (middleware must skip this path)
 * - HTTP 200 status
 */
export async function GET(request: NextRequest) {
  const indexNowKey = process.env.INDEXNOW_KEY;
  if (!indexNowKey) {
    return new NextResponse("Not configured", { status: 404 });
  }

  // The rewrite passes the requested key as ?key=<value>
  // If no query param, just return the key (backward compat with old rewrite)
  const requestedKey = request.nextUrl.searchParams.get("key");

  if (requestedKey) {
    // Strip .txt extension if the rewrite passed it through
    const cleanKey = requestedKey.replace(/\.txt$/, "");
    if (cleanKey !== indexNowKey) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  return new NextResponse(indexNowKey, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      // Prevent any compression/encoding that might confuse engines
      "X-Content-Type-Options": "nosniff",
    },
  });
}
