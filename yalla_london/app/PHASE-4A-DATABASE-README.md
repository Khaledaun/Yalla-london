# Phase 4A Database Schema Extensions

This document outlines the database schema extensions implemented for Phase 4A content automation features.

## Overview

Phase 4A introduces additive-only database schema changes to support:
- Content topic proposals and keyword research
- Content generation rule management
- Page type templates and recipes
- Place-based content management
- SEO audit and analytics tracking
- White-label multi-site scaffolding

**Important**: All changes are additive-only. No existing tables, columns, or data are modified or removed.

## New Models

### Content Automation Models

#### `TopicProposal`
Stores content topic suggestions with keyword research and intent analysis.

```prisma
model TopicProposal {
  id                    String   @id @default(cuid())
  locale                String   // en, ar
  primaryKeyword        String
  longtails             Json     // Array of longtail keywords
  featuredLongtails     Json     // Featured longtail keywords
  questions             Json     // Array of questions
  authorityLinks        Json     // Array of {url, title, domain}
  intent                String   // informational, commercial, navigational, transactional
  suggestedPageType     String   // guide, place, event, list, faq, news, itinerary
  suggestedWindowStart  DateTime?
  suggestedWindowEnd    DateTime?
  sourceWeights         Json     // Weighting for different sources
  status                String   @default("pending") // pending, approved, rejected, used
  // ... timestamps

  @@index([locale, status])
}
```

#### `RulebookVersion`
Manages content generation rules, scoring weights, and AI prompts.

```prisma
model RulebookVersion {
  id                    String   @id @default(cuid())
  version               String   @unique // e.g., "2024.09.1"
  changelog             String   @db.Text
  weights               Json     // Scoring weights for content evaluation
  schemaRequirements    Json     // Schema.org requirements per page type
  prompts               Json     // AI prompts and templates
  isActive              Boolean  @default(false)
  // ... timestamps
}
```

#### `PageTypeRecipe`
Defines content templates and requirements for different page types.

```prisma
model PageTypeRecipe {
  id                    String   @id @default(cuid())
  type                  String   @unique // guide, place, event, list, faq, news, itinerary
  requiredBlocks        Json     // Required content blocks
  optionalBlocks        Json     // Optional content blocks
  schemaPlan            Json     // Schema.org structure plan
  minWordCount          Int      @default(800)
  // ... timestamps
}
```

### Content Management Models

#### `Place`
Stores information about London places (attractions, restaurants, hotels, etc.).

```prisma
model Place {
  id                    String   @id @default(cuid())
  slug                  String   @unique
  name                  String
  category              String   // attraction, restaurant, hotel, etc.
  address               String?
  latitude              Float?
  longitude             Float?
  description           String?  @db.Text
  website               String?
  phone                 String?
  openingHours          Json?    // Operating hours structure
  priceRange            String?  // £, ££, £££, ££££
  rating                Float?
  images                String[] // Array of image URLs
  tags                  String[] // Array of tags
  metadata              Json?    // Additional place-specific data
  status                String   @default("active") // active, inactive, pending
  // ... timestamps and relations
}
```

#### `ImageAsset` & `VideoAsset`
Manage multimedia assets with optional place associations.

### Analytics & SEO Models

#### `AnalyticsSnapshot`
Stores periodic analytics data from Google Analytics and Search Console.

```prisma
model AnalyticsSnapshot {
  id                    String   @id @default(cuid())
  date                  DateTime
  range                 String   // 7d, 28d
  ga                    Json     // Google Analytics data
  gsc                   Json     // Google Search Console data
  indexedPages          Int      // Number of indexed pages
  // ... timestamps

  @@unique([date, range])
}
```

#### `SeoAuditResult`
Tracks SEO audit results for content.

```prisma
model SeoAuditResult {
  id                    String   @id @default(cuid())
  contentId             String   // ID of the content being audited
  contentType           String   // blog_post, scheduled_content, etc.
  score                 Int      // SEO score 0-100
  breakdown             Json     // Detailed scoring breakdown
  suggestions           Json     // Array of improvement suggestions
  // ... timestamps

  @@index([contentId, contentType])
}
```

### White-label Models

#### `Site`, `SiteTheme`, `SiteMember`
Basic scaffolding for multi-site white-label functionality.

## Extended Models

### `BlogPost` Extensions
Added Phase 4A fields for enhanced content management:

```prisma
// Phase 4A extensions
pageType     String?  // guide, place, event, list, faq, news, itinerary
keywordsJson Json?    // SEO keywords data
questionsJson Json?   // FAQ/questions data
seoScore     Int?     // SEO audit score 0-100
ogImageId    String?  // Open Graph image reference
placeId      String?  // Related place reference

// New relations
ogImage      ImageAsset? @relation("BlogPostOGImage", fields: [ogImageId], references: [id])
place        Place?   @relation(fields: [placeId], references: [id])
```

### `ScheduledContent` Extensions
Same Phase 4A fields as BlogPost for consistency.

## Seeding Scripts

### `scripts/seed-phase4a-initial.ts`
Idempotent seeding script that populates:

- **7 PageType recipes**: Templates for guide, place, event, list, faq, news, itinerary
- **1 Rulebook version**: Initial version 2024.09.1 with scoring weights and prompts
- **30 London places**: Mix of attractions, restaurants, hotels, parks, and districts

### Usage

```bash
# Run Phase 4A seeding (safe to run multiple times)
npm run tsx scripts/seed-phase4a-initial.ts

# Test schema validity
npm run tsx scripts/test-phase4a-schema.ts
```

## Migration Strategy

1. **Additive Only**: No existing data is modified
2. **Optional Fields**: All new fields are nullable to maintain backward compatibility
3. **Default Values**: Appropriate defaults for status fields and flags
4. **Indexed Fields**: Strategic indexing for performance (e.g., `TopicProposal` by locale and status)

## Feature Flag Integration

While this PR focuses on database schema, the content automation features will be:
- **Gated by feature flags** (defaults OFF)
- **Non-breaking** when flags are disabled
- **Incrementally enabled** in subsequent PRs

## Validation

The schema has been designed to:
- ✅ Maintain all existing functionality
- ✅ Support both English and Arabic content
- ✅ Enable future content automation features
- ✅ Provide proper indexing for performance
- ✅ Follow existing codebase patterns (cuid IDs, Json fields)

## Next Steps

This database schema sets the foundation for:
1. **PR 2**: Feature flags and environment configuration
2. **PR 3**: Core APIs, Perplexity integration, and automation pipeline
3. **PR 4**: Tests and documentation

All subsequent features will be properly feature-flagged and default to OFF to ensure zero regression risk.