# Phase 4B Troubleshooting Guide

## Common Issues and Solutions

### Build and Deployment Issues

#### 1. TypeScript Compilation Errors
**Problem**: TypeScript errors during build
```
Error: Cannot find module '@/config/feature-flags'
```

**Solution**: 
- Verify all import paths use `@/lib/feature-flags`
- Check tsconfig.json paths configuration
- Run `npx tsc --noEmit` to check for errors

#### 2. Prisma Client Generation Fails
**Problem**: 
```
Error: request to https://binaries.prisma.sh/... failed
```

**Solution**:
- Check internet connectivity
- Try: `npx prisma generate --skip-generate`
- Alternative: `PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x npx prisma generate`

#### 3. Missing Dependencies
**Problem**: Module not found errors for `axios`, `node-cron`

**Solution**:
```bash
yarn add axios node-cron
# or
npm install axios node-cron
```

### API Issues

#### 1. All Phase 4B APIs Return 403 "Feature Disabled"
**Expected Behavior**: This is correct! All features start disabled.

**To Enable**:
```bash
# Set environment variables
FEATURE_PHASE4B_ENABLED=true
FEATURE_TOPIC_RESEARCH=true
# etc.
```

#### 2. Perplexity API Errors
**Problem**: 
```json
{"error": "PERPLEXITY_API_KEY not configured"}
```

**Solution**:
- Set `PERPLEXITY_API_KEY` environment variable
- Verify API key is valid
- Check API quota/billing status

#### 3. Database Connection Errors
**Problem**: 
```
Error: Can't reach database server
```

**Solution**:
- Verify `DATABASE_URL` is correct
- Check database is running and accessible
- For Neon/Supabase: verify connection string format
- Run `npx prisma db push` to apply schema

### Feature Flag Issues

#### 1. Features Not Enabling
**Problem**: Set `FEATURE_TOPIC_RESEARCH=true` but still disabled

**Check**:
1. Is `FEATURE_PHASE4B_ENABLED=true`? (Master toggle)
2. Are environment variables properly loaded?
3. Restart application after changing env vars

#### 2. Environment Variables Not Loading
**Problem**: Process.env values are undefined

**Solution**:
- Check `.env.local` file exists (for local dev)
- For Vercel: Use `vercel env ls` to verify
- Ensure no typos in variable names
- Restart dev server: `npm run dev`

### Content Generation Issues

#### 1. Content Generation Timeouts
**Problem**: API calls timing out

**Solution**:
- Increase Vercel function timeout in `vercel.json`
- Check Perplexity API response times
- Implement request queuing for large batches

#### 2. Invalid JSON Response from Perplexity
**Problem**: 
```
Error: Failed to parse JSON response
```

**Solution**:
- Add better JSON parsing with fallbacks
- Log raw API responses for debugging
- Implement retry logic for malformed responses

### Database Issues

#### 1. Migration Failures
**Problem**: `prisma migrate deploy` fails

**Solution**:
```bash
# Reset database (DEV ONLY)
npx prisma migrate reset --force

# Or apply specific migration
npx prisma db push
```

#### 2. Missing Tables
**Problem**: `Table 'TopicProposal' doesn't exist`

**Solution**:
- Run database migration: `npx prisma migrate deploy`
- Or push schema: `npx prisma db push`
- Regenerate client: `npx prisma generate`

### Vercel Deployment Issues

#### 1. Build Fails on Vercel
**Problem**: Build succeeds locally but fails on Vercel

**Common Causes**:
- Missing environment variables
- Different Node.js versions
- Path case sensitivity (Linux vs Windows)

**Solution**:
- Check Vercel build logs
- Verify all env vars are set: `vercel env ls`
- Test with: `vercel dev`

#### 2. Function Timeout Errors
**Problem**: API routes timing out

**Solution**:
- Increase timeout in `vercel.json`:
```json
{
  "functions": {
    "app/api/phase4b/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

#### 3. Cold Start Issues
**Problem**: First API call is very slow

**Solution**:
- Implement warming functions
- Use Vercel Edge Runtime for faster cold starts
- Cache frequently used data

### Testing Issues

#### 1. Jest Tests Failing
**Problem**: Tests can't find modules

**Solution**:
- Check `jest.config.js` module mapping
- Verify test file paths
- Mock external dependencies properly

#### 2. API Tests Failing
**Problem**: Feature flag mocks not working

**Solution**:
```javascript
jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn().mockReturnValue(false),
}));
```

### Performance Issues

#### 1. Slow API Responses
**Investigation Steps**:
- Check database query performance
- Monitor external API call times (Perplexity)
- Profile function execution

#### 2. High Memory Usage
**Solution**:
- Implement streaming for large responses
- Use database pagination
- Clear unused variables/objects

## Debugging Commands

### Local Development
```bash
# Check TypeScript
npx tsc --noEmit

# Test build
npm run build

# Check dependencies
yarn why package-name

# Database status
npx prisma studio
```

### Vercel Environment
```bash
# Check logs
vercel logs --follow

# Test locally with Vercel
vercel dev

# List environment variables
vercel env ls

# Pull environment to local
vercel env pull .env.local
```

### Database Debugging
```bash
# Check migration status
npx prisma migrate status

# View current schema
npx prisma db pull

# Reset and migrate (DEV ONLY)
npx prisma migrate reset
```

## Getting Help

1. Check Vercel function logs for specific errors
2. Test individual APIs with curl/Postman
3. Use `console.log` extensively during development
4. Check environment variables are loaded correctly
5. Verify feature flags state in admin dashboard

## Emergency Rollback

If Phase 4B causes critical issues:

```bash
# Disable all Phase 4B features immediately
vercel env add FEATURE_PHASE4B_ENABLED false

# Redeploy
vercel --prod

# Or rollback to previous deployment
vercel rollback [deployment-url]
```

The application will continue working with Phase 4B disabled, as all features are backward compatible.