# Phase 4B Automation Implementation

This implementation provides comprehensive topic automation and admin dashboard improvements for Yalla-London.

## Features Implemented

### 1. Perplexity-powered Topic Generation ✅
- **30 topics weekly**: 15 date-relevant + 15 evergreen topics
- **Comprehensive JSON format**: All required fields including authorityLinks, picanticDescription, longtails, questions
- **SEO/AEO optimization**: Prompts request optimized content with keywords and search intent
- **Multi-language support**: Both English and Arabic topic generation
- **Schema extensibility**: Future-proof design allows additional fields

### 2. Automated Scheduling ✅
- **Weekly topic generation**: Automated cron job runs Sundays
- **Low-backlog trigger**: Auto-generates when pending topics < 10
- **Daily publishing**: Publishes 1 general + 1 date-relevant topic daily
- **Priority ordering**: Topics published based on confidence score and approval order

### 3. Enhanced Admin Dashboard ✅
- **Status management**: Filter by pending, published, deleted
- **Manual CRUD operations**: Add, edit, delete, reorder topics
- **Reason enforcement**: Required reason for consecutive same-category approvals (10-30 chars)
- **Published URL tracking**: Shows article URLs for backlink suggestions
- **Real-time stats**: Live dashboard with topic counts by status

### 4. Status Management ✅
- **Clear status values**: proposed, approved, rejected, used
- **Automatic transitions**: Status updates during publishing workflow
- **URL storage**: Published articles tracked with full URLs
- **Audit trail**: Complete history of status changes with reasons

## API Endpoints

### Topic Management
- `POST /api/phase4b/topics/research` - Generate topics via Perplexity
- `GET /api/phase4b/topics/research` - Fetch topics with filtering
- `POST /api/phase4b/topics/manage` - CRUD operations
- `DELETE /api/phase4b/topics/manage` - Delete topics
- `POST /api/phase4b/topics/reorder` - Reorder topics

### Automation
- `POST /api/cron/weekly-topics` - Weekly topic generation
- `POST /api/cron/daily-publish` - Daily publishing automation

## Setup Instructions

### 1. Environment Variables
Copy the example environment variables:
```bash
cp .env.phase4b.example .env.local
```

Configure required variables:
- `PERPLEXITY_API_KEY`: Your Perplexity AI API key
- `CRON_SECRET`: Secure secret for cron job authentication
- `FEATURE_PHASE4B_ENABLED=true`: Enable Phase 4B features

### 2. Database Migration
The Phase 4A database schema is already in place with all required models:
- `TopicProposal`: Stores generated topics with metadata
- `ScheduledContent`: Tracks published content with URLs
- `SeoAuditResult`: SEO audit results for quality control

### 3. Cron Job Setup
Configure your hosting platform to call these endpoints:

**Weekly Topic Generation** (Sundays at 6 AM):
```bash
curl -X POST https://your-domain.com/api/cron/weekly-topics \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

**Daily Publishing** (Daily at 9 AM):
```bash
curl -X POST https://your-domain.com/api/cron/daily-publish \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### 4. Admin Dashboard Access
1. Navigate to `/admin` in your application
2. Authenticate with admin credentials
3. Click the "Topics" tab to access Phase 4B topic management

## Usage Guide

### Topic Generation
1. **Manual Generation**: Click "Generate Weekly Topics" in admin dashboard
2. **Automatic**: System auto-generates every Sunday or when backlog < 10 topics
3. **Categories**: Supports mixed weekly content plus specific categories (events, travel, football, etc.)

### Topic Management
1. **Review Pending**: View all proposed topics with details
2. **Approve/Reject**: Manually approve or reject topics
3. **Reason Required**: System enforces reason for consecutive same-category approvals
4. **Reorder**: Drag and drop to reorder topic priorities

### Publishing Workflow
1. **Automatic**: System publishes 2 approved topics daily
2. **Priority Order**: Date-relevant topics prioritized, then by confidence score
3. **URL Tracking**: Published articles automatically tracked with URLs
4. **Status Updates**: Topics marked as "used" after publishing

## Technical Details

### Data Flow
1. **Perplexity API** → Generate 30 topics with comprehensive metadata
2. **Database Storage** → Save to `TopicProposal` with full field mapping
3. **Admin Review** → Manual approval/rejection workflow
4. **Publishing** → Automatic daily publishing with URL tracking
5. **Analytics** → Track performance and backlink opportunities

### Schema Design
The implementation uses the existing Phase 4A schema with proper field mapping:
- `primary_keyword`: Topic title/main keyword
- `longtails`: Array of long-tail keywords
- `authority_links_json`: Authority source links
- `source_weights_json`: Extensible metadata storage
- `scheduled_content`: Relationship to published articles

### Error Handling
- **API Failures**: Graceful degradation with error logging
- **Rate Limiting**: Respects Perplexity API limits
- **Data Validation**: Comprehensive input validation
- **Rollback**: Safe failure handling with transaction support

## Monitoring & Maintenance

### Health Checks
Each cron endpoint provides health check via GET request:
- `/api/cron/weekly-topics` - Shows pending topic count and next run
- `/api/cron/daily-publish` - Shows daily quota and available topics

### Performance Monitoring
- Topic generation success rates
- Publishing automation reliability  
- Admin dashboard usage analytics
- SEO performance of published content

### Logs & Debugging
All operations are logged with detailed error messages. Check your application logs for:
- Topic generation attempts
- Publishing workflow status
- API failures and retries
- Admin actions and reasons

## Future Extensibility

The implementation is designed for easy extension:
- **Additional Fields**: Add new fields to `source_weights_json`
- **New Categories**: Extend topic categories in prompts
- **Publishing Rules**: Modify daily publishing logic
- **Quality Gates**: Add SEO audit integration
- **Multi-language**: Expand beyond English/Arabic

## Troubleshooting

### Common Issues
1. **No topics generated**: Check Perplexity API key and feature flags
2. **Publishing not working**: Verify approved topics exist and cron setup
3. **Admin dashboard errors**: Check database connection and feature flags
4. **Cron jobs failing**: Verify CRON_SECRET and endpoint URLs

### Support
For issues or questions, check the logs and verify:
1. Environment variables are correctly set
2. Database schema is up to date
3. Feature flags are enabled
4. API keys are valid and have quota remaining