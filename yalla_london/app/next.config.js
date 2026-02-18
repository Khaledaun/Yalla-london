const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Image optimization - ENABLED for better LCP
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      // All configured site domains (multi-site support)
      {
        protocol: 'https',
        hostname: '*.yalla-london.com',
      },
      {
        protocol: 'https',
        hostname: '*.yallalondon.com',
      },
      {
        protocol: 'https',
        hostname: '*.arabaldives.com',
      },
      {
        protocol: 'https',
        hostname: '*.yallariviera.com',
      },
      {
        protocol: 'https',
        hostname: '*.yallaistanbul.com',
      },
      {
        protocol: 'https',
        hostname: '*.yallathailand.com',
      },
    ]
  },
  // Turbopack workspace root — resolves the "couldn't find next/package.json" error
  // when multiple lockfiles exist in the repo
  turbopack: {
    root: __dirname,
  },
  // Moved from experimental.serverComponentsExternalPackages (deprecated in Next 16)
  serverExternalPackages: ['@prisma/client', 'prisma'],
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizeCss: true,
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async headers() {
    // SECURITY: Only allow specific origins, not wildcard
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://yalla-london.com,https://www.yalla-london.com,https://arabaldives.com,https://www.arabaldives.com,https://yallariviera.com,https://www.yallariviera.com,https://yallaistanbul.com,https://www.yallaistanbul.com,https://yallathailand.com,https://www.yallathailand.com').split(',').map(o => o.trim())
    const corsOrigin = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : allowedOrigins[0]

    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: corsOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
      // Static assets - long cache with Cloudflare edge
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Next.js static files
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Public pages - CDN edge caching for Cloudflare (s-maxage)
      {
        source: '/blog/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' },
          { key: 'CDN-Cache-Control', value: 'max-age=600' },
          { key: 'Vary', value: 'Accept-Encoding, x-site-id' },
        ],
      },
      {
        source: '/events/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' },
          { key: 'CDN-Cache-Control', value: 'max-age=600' },
          { key: 'Vary', value: 'Accept-Encoding, x-site-id' },
        ],
      },
      {
        source: '/recommendations/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' },
          { key: 'CDN-Cache-Control', value: 'max-age=600' },
          { key: 'Vary', value: 'Accept-Encoding, x-site-id' },
        ],
      },
      // Static pages (about, contact) - longer edge cache
      {
        source: '/about',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400' },
          { key: 'CDN-Cache-Control', value: 'max-age=3600' },
        ],
      },
      {
        source: '/contact',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400' },
          { key: 'CDN-Cache-Control', value: 'max-age=3600' },
        ],
      },
      // Admin pages - never cache
      {
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      // Public API routes - short edge cache
      {
        source: '/api/blog/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' },
          { key: 'CDN-Cache-Control', value: 'max-age=300' },
          { key: 'Vary', value: 'Accept-Encoding, x-site-id' },
        ],
      },
      {
        source: '/api/events/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' },
          { key: 'CDN-Cache-Control', value: 'max-age=300' },
          { key: 'Vary', value: 'Accept-Encoding, x-site-id' },
        ],
      },
      // Admin API - never cache
      {
        source: '/api/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      // Sitemap & robots - hourly edge cache
      {
        source: '/sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
          { key: 'CDN-Cache-Control', value: 'max-age=3600' },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
          { key: 'CDN-Cache-Control', value: 'max-age=3600' },
        ],
      },
      // SECURITY: Comprehensive security headers on all pages
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://www.google-analytics.com https://*.supabase.co https://api.openai.com https://api.anthropic.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
