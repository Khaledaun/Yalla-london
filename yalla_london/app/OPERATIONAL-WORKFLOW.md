# Unified Admin Dashboard & Website Content Pipeline - Operational Guide

## Overview

This guide documents the complete operational workflow for the Yalla-London unified content pipeline, ensuring real-time sync between the admin dashboard and public website.

## 🎯 Key Features Implemented

### ✅ Real-time Content Sync
- **Single Source of Truth**: All content stored in PostgreSQL database with Prisma ORM
- **Instant Cache Invalidation**: Next.js cache automatically cleared when content changes
- **Real-time Updates**: Public site reflects admin changes within 1-3 seconds
- **Sync Verification**: Built-in testing tools to verify pipeline integrity

### ✅ Database-Driven Content
- **No Demo Data**: All content on public site comes from database
- **Dynamic Homepage**: Latest blog posts fetched from database with caching
- **Blog System**: Fully database-driven with real-time updates
- **Media Management**: All assets stored and served from database records

### ✅ Migration Safety
- **Pre-deployment Backups**: Automatic backups before schema changes
- **Migration Verification**: Safe deployment process with rollback capability
- **Environment Validation**: Comprehensive checks before going live

## 🔄 Content Pipeline Flow

```
Admin Dashboard → Database → Cache Invalidation → Public Site
      ↓               ↓              ↓              ↓
   Create/Edit    Save to DB    Clear Cache    Show Changes
   Blog Post   → PostgreSQL → Next.js Cache → Homepage/Blog
```

## 📋 Operational Procedures

### 1. Creating New Content

**Via Admin Dashboard:**
1. Navigate to `/admin/sync-test` to verify pipeline health
2. Create content through admin forms (implemented APIs)
3. Content automatically saved to database
4. Cache invalidation triggered instantly
5. Public site updates within 1-3 seconds

**API Endpoints:**
- `POST /api/admin/content` - Create new blog post
- `PUT /api/admin/content` - Update existing post
- `DELETE /api/admin/content?id={id}` - Delete post
- All endpoints include automatic cache invalidation

### 2. Testing Real-time Sync

**Using the Sync Test Tool:**
1. Go to `/admin/sync-test`
2. Click "Run Sync Test"
3. Tool creates test content and verifies sync
4. Check results and latency metrics
5. Use "Cleanup" to remove test content

**Manual Verification:**
1. Create content in admin dashboard
2. Immediately check public pages:
   - Homepage (`/`) - should show in latest posts
   - Blog page (`/blog`) - should appear in listings
   - Individual post (`/blog/{slug}`) - should be accessible

### 3. Troubleshooting Sync Issues

**If Sync Fails:**

1. **Check Database Connection**
   ```bash
   # In production/staging
   curl -X GET https://your-domain.com/api/health
   ```

2. **Verify Cache Invalidation**
   ```bash
   # Manually trigger cache clear
   curl -X POST https://your-domain.com/api/cache/invalidate \
     -H "Content-Type: application/json" \
     -d '{"contentType":"all"}'
   ```

3. **Check API Responses**
   ```bash
   # Test public content API
   curl -X GET https://your-domain.com/api/content?limit=1
   ```

4. **Database Integrity Check**
   ```bash
   # Run verification script
   npm run verify-db
   ```

**Common Issues and Solutions:**

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Content not appearing | Created content doesn't show on public site | Check database connection, run sync test |
| Slow sync | Updates take >5 seconds | Check cache invalidation, verify Vercel function performance |
| Migration errors | Deployment fails | Check pre-migration backup, verify schema compatibility |
| Demo data showing | Fallback content appears | Ensure database has real content, check API responses |

### 4. Deployment Process

**Automated Migration Safety:**
1. Pre-deployment backup created automatically
2. Prisma client generation verified
3. Database migrations deployed safely
4. Baseline data ensured (admin user, categories)
5. Deployment verification tests run

**Manual Verification Steps:**
1. Check deployment logs for migration success
2. Verify public site loads correctly
3. Test admin dashboard functionality
4. Run sync test via `/admin/sync-test`
5. Check critical pages load with real content

### 5. Monitoring and Maintenance

**Daily Checks:**
- [ ] Public site loads correctly
- [ ] Admin dashboard accessible
- [ ] Latest content appears on homepage
- [ ] Blog posts load with correct data

**Weekly Checks:**
- [ ] Run comprehensive sync test
- [ ] Verify database backup integrity
- [ ] Check for orphaned content/broken links
- [ ] Review performance metrics

**Monthly Tasks:**
- [ ] Database cleanup (old test content)
- [ ] Backup retention management
- [ ] Performance optimization review
- [ ] Update dependencies and security patches

## 🔧 Technical Details

### Database Schema
- **BlogPost**: Main content table with localization
- **Category**: Content categorization
- **User**: Authors and admin users
- **MediaAsset**: File and image management
- **Cache tags**: `blog-posts`, `homepage-content`, `media-assets`

### API Endpoints
- `/api/content` - Public content listing (cached)
- `/api/admin/content` - Admin CRUD operations (with cache invalidation)
- `/api/cache/invalidate` - Manual cache clearing
- `/api/admin/sync-test` - Pipeline testing

### Cache Strategy
- **ISR (Incremental Static Regeneration)**: 60-second fallback
- **Tag-based Invalidation**: Instant updates via revalidateTag
- **Path-based Invalidation**: Specific page updates

## 🚨 Emergency Procedures

### Rollback Process
1. **If content issues:**
   ```bash
   # Restore from latest backup
   npm run restore-backup <backup-file>
   ```

2. **If migration issues:**
   ```bash
   # Rollback to previous migration
   npx prisma migrate reset
   # Then restore data
   npm run restore-backup <pre-migration-backup>
   ```

3. **If cache issues:**
   ```bash
   # Nuclear option - clear all caches
   curl -X POST /api/cache/invalidate -d '{"contentType":"all"}'
   ```

## 📊 Success Metrics

**Pipeline Health Indicators:**
- ✅ Sync latency < 3 seconds
- ✅ Cache invalidation success rate > 99%
- ✅ Zero demo/hardcoded content on public site
- ✅ Database-driven content load time < 2 seconds
- ✅ Admin actions immediately reflected publicly

**Monitoring Endpoints:**
- `/api/health` - Overall system health
- `/admin/sync-test` - Pipeline integrity testing
- `/api/admin/sync-test` - Programmatic sync verification

## 📞 Support and Escalation

**Self-service:**
1. Use sync test tool for immediate diagnosis
2. Check this operational guide
3. Review deployment logs and API responses

**Escalation:**
1. Document specific error messages
2. Include sync test results
3. Provide timeline of when issue started
4. Include browser/environment details

---

**Last Updated:** Current implementation date
**Version:** 1.0.0
**Review Frequency:** Monthly