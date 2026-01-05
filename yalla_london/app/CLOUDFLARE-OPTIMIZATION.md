# Cloudflare Optimization Guide for Yalla London

## Quick Setup Checklist

### 1. Speed Optimizations (Dashboard → Speed → Optimization)

| Setting | Value | Impact |
|---------|-------|--------|
| **Auto Minify** | JS, CSS, HTML all ON | -15% file sizes |
| **Brotli** | ON | -20% compression |
| **Early Hints** | ON | Faster resource loading |
| **Rocket Loader** | ON | Async JS loading |
| **Mirage** | ON (Pro) | Image lazy loading |
| **Polish** | Lossy (Pro) | Image compression |

### 2. Caching Configuration (Dashboard → Caching → Configuration)

| Setting | Value |
|---------|-------|
| **Caching Level** | Standard |
| **Browser Cache TTL** | 4 hours |
| **Always Online** | ON |
| **Development Mode** | OFF (production) |

### 3. Page Rules (Dashboard → Rules → Page Rules)

Create these rules in order:

#### Rule 1: Static Assets (Highest Priority)
```
URL: *yalla-london.com/_next/static/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 year
```

#### Rule 2: Images
```
URL: *yalla-london.com/*.jpg
URL: *yalla-london.com/*.png
URL: *yalla-london.com/*.webp
URL: *yalla-london.com/*.avif
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 month
```

#### Rule 3: API Routes (No Cache)
```
URL: *yalla-london.com/api/*
Settings:
  - Cache Level: Bypass
  - Disable Apps: ON
```

#### Rule 4: Admin Dashboard (No Cache)
```
URL: *yalla-london.com/admin/*
Settings:
  - Cache Level: Bypass
  - Security Level: High
```

### 4. Transform Rules (Dashboard → Rules → Transform Rules)

#### Add Security Headers
```
(http.host eq "yalla-london.com")

Add Response Headers:
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 5. Network Settings (Dashboard → Network)

| Setting | Value |
|---------|-------|
| **HTTP/3 (QUIC)** | ON |
| **0-RTT Connection Resumption** | ON |
| **gRPC** | ON |
| **WebSockets** | ON |

### 6. SSL/TLS Settings (Dashboard → SSL/TLS)

| Setting | Value |
|---------|-------|
| **SSL Mode** | Full (strict) |
| **Always Use HTTPS** | ON |
| **Automatic HTTPS Rewrites** | ON |
| **Minimum TLS Version** | TLS 1.2 |
| **TLS 1.3** | ON |

---

## Cache Headers Reference

Add these to your `vercel.json` or `next.config.js`:

```json
{
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/images/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=2592000" }
      ]
    },
    {
      "source": "/fonts/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

---

## Expected Improvements

After implementing these changes:

| Metric | Before | After (Expected) |
|--------|--------|------------------|
| **Cache Rate** | 4.37% | 60-80% |
| **LCP** | 6,860ms | <2,500ms |
| **Page Load** | 3,343ms | <2,000ms |
| **Data Transfer** | 658 MB/month | ~200 MB/month |

---

## Monitoring

### Check Cache Status
```bash
curl -I https://yalla-london.com | grep -i cf-cache-status
# HIT = cached, MISS = not cached, DYNAMIC = not cacheable
```

### Purge Cache (when needed)
Dashboard → Caching → Configuration → Purge Everything

Or selective purge:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://yalla-london.com/specific-page"]}'
```

---

## Cloudflare Workers (Advanced)

For even better performance, consider a Worker for edge caching:

```javascript
// workers/cache-api.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Skip caching for API and admin
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/')) {
    return fetch(request)
  }

  // Check cache first
  const cache = caches.default
  let response = await cache.match(request)

  if (!response) {
    response = await fetch(request)
    // Cache successful responses
    if (response.ok) {
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=3600')
      response = new Response(response.body, { ...response, headers })
      event.waitUntil(cache.put(request, response.clone()))
    }
  }

  return response
}
```

---

**Last Updated:** January 2026
