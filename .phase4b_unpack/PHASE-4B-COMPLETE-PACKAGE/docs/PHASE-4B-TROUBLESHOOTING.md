
# Phase 4B Troubleshooting Guide

## Common Issues & Solutions

### 1. Feature Flags Not Working
**Problem**: Phase 4B features are not accessible even after enabling flags.

**Solution**:
```bash
# Check environment variables
printenv | grep FEATURE_

# Ensure master toggle is enabled
export FEATURE_PHASE4B_ENABLED=true

# Restart your application
npm run build && npm run start
```

### 2. Perplexity API Errors
**Problem**: Topic research failing with API errors.

**Possible Causes**:
- Invalid API key
- Rate limiting
- Network issues

**Solutions**:
```bash
# Verify API key
curl -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  https://api.perplexity.ai/chat/completions \
  -d '{"model":"llama-3.1-sonar-small-128k-online","messages":[{"role":"user","content":"test"}]}'

# Check rate limits in response headers
# Rate limit: 20 requests/minute for standard plan
```

### 3. Database Migration Issues
**Problem**: New tables not created or schema conflicts.

**Solutions**:
```bash
# Apply migration manually
npx prisma db push

# If conflicts exist, backup and reset
npx prisma db seed

# Regenerate Prisma client
npx prisma generate
```

### 4. Content Generation Failures
**Problem**: AI content generation not working.

**Check List**:
- [ ] FEATURE_AUTO_CONTENT_GENERATION enabled
- [ ] AI API keys configured
- [ ] Approved topics exist in database
- [ ] Network connectivity to AI services

**Debug**:
```bash
# Check for approved topics
npx prisma studio
# Navigate to TopicProposal table, filter by status='approved'

# Test API endpoint directly
curl -X POST http://localhost:3000/api/phase4b/content/generate \
  -H "Content-Type: application/json" \
  -d '{"topicId":"your-topic-id","contentType":"article","locale":"en"}'
```

### 5. Cron Jobs Not Running
**Problem**: Scheduled tasks not executing.

**Solutions**:
```javascript
// Check cron manager initialization
import { cronManager } from '@/lib/services/cron-manager';

// In your server startup
await cronManager.initialize();

// Check job status
console.log(cronManager.getJobsStatus());
```

### 6. SEO Audit Failures
**Problem**: SEO audits returning errors or not running.

**Debug Steps**:
1. Check if content exists and has proper structure
2. Verify SEO audit feature flag
3. Test audit API directly

```bash
curl -X POST http://localhost:3000/api/phase4b/seo/audit \
  -H "Content-Type: application/json" \
  -d '{"contentId":"your-content-id","type":"content"}'
```

### 7. Analytics Data Not Refreshing
**Problem**: Analytics snapshots empty or outdated.

**Causes**:
- Google API credentials not configured
- API quota exceeded
- Service account permissions

**Solutions**:
```bash
# Test Google Analytics connection
# Ensure service account has Analytics Viewer role

# Check API quotas in Google Cloud Console
# Analytics Reporting API: 50,000 requests/day default
```

### 8. Performance Issues
**Problem**: Pipeline running slowly or timing out.

**Optimizations**:
```javascript
// Reduce batch sizes
const TOPIC_BATCH_SIZE = 3; // Instead of 10
const CONTENT_GENERATION_LIMIT = 2; // Instead of 5

// Add delays between API calls
await new Promise(resolve => setTimeout(resolve, 1000));
```

### 9. Memory Leaks
**Problem**: High memory usage over time.

**Solutions**:
- Monitor heap usage
- Implement proper cleanup in cron jobs
- Use streaming for large data operations

```javascript
// Add cleanup in cron jobs
process.on('exit', () => {
  cronManager.shutdown();
});
```

### 10. Build Failures
**Problem**: TypeScript or build errors after Phase 4B installation.

**Common Fixes**:
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npx tsc --noEmit

# Update Prisma client
npx prisma generate
```

## Monitoring & Debugging

### Enable Debug Logging
```bash
export LOG_LEVEL=debug
export DEBUG="phase4b:*"
```

### Check System Resources
```bash
# Memory usage
free -h

# CPU usage
top -p $(pgrep node)

# Disk space
df -h
```

### Database Performance
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Getting Help

1. **Check Logs**: Always check application logs first
2. **Feature Flags**: Verify all required flags are enabled
3. **API Keys**: Ensure all external service credentials are valid
4. **Database**: Confirm schema is up to date
5. **Network**: Test connectivity to external APIs

## Emergency Procedures

### Disable Phase 4B Completely
```bash
export FEATURE_PHASE4B_ENABLED=false
# Restart application
```

### Stop All Cron Jobs
```javascript
import { cronManager } from '@/lib/services/cron-manager';
cronManager.shutdown();
```

### Rollback Database Changes
```bash
# Backup current state
pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Remove Phase 4B tables (CAUTION!)
# Only do this if you need to completely reset
```
