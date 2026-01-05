const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Image optimization - ENABLED for better LCP
  images: {
    unoptimized: false, // Enable Next.js image optimization
    formats: ['image/avif', 'image/webp'], // Modern formats for smaller sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048], // Responsive breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Icon sizes
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
    domains: [
      'localhost',
      'yalla-london.com',
      'yallalondon.com',
      'www.yalla-london.com',
      'vercel.app',
      'supabase.co',
      'example.com',
      'images.unsplash.com',
      'cdn.yalla-london.com'
    ],
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
      }
    ]
  },
  // Compression
  compress: true,
  // Power optimizations
  poweredByHeader: false,
  // Strict mode for better performance
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    optimizeCss: true, // CSS optimization
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Enhanced headers for caching and performance
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      // Static assets - long cache
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
      // HTML pages - shorter cache with revalidation
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
