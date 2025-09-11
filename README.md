# Yalla-london
yalla london website system

## Phase 4B: Content Automation & Perplexity Integration

This repository now includes Phase 4B implementation with automated content generation, topic research via Perplexity API, and comprehensive SEO automation.

### Features Added
- **Topic Research API**: Perplexity-powered topic discovery
- **Content Generation**: AI-powered content creation from approved topics  
- **SEO Automation**: Automated SEO audits and optimization
- **Analytics Integration**: GA4 and Search Console data refresh
- **Publishing Pipeline**: Automated content publishing with quality gates

### Key Files
- `app/api/phase4b/` - Phase 4B API endpoints
- `lib/feature-flags.ts` - Extended feature flag system
- `components/admin/phase4b/` - Admin interface components
- `lib/services/` - Content pipeline and cron management
- `vercel.json` - Vercel deployment configuration
- `.env.example` - Complete environment variable template

### Deployment
See `VERCEL-DEPLOYMENT.md` for complete deployment instructions.

All Phase 4B features are **disabled by default** for safe production deployment.
