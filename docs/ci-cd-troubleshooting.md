# CI/CD Troubleshooting Guide

Complete troubleshooting guide for GitHub Actions workflows in the Yalla London project.

## 🔍 Quick Diagnostics

### Check Workflow Status
1. Go to **Actions** tab in GitHub repository
2. Click on the failed workflow run
3. Review job summaries for quick status overview
4. Look for debug steps showing secret availability

### Common Workflow Patterns
- ✅ **Success**: All steps completed without errors
- ⚠️ **Warning**: Job completed with warnings (non-blocking)
- ❌ **Failure**: Job failed and blocked workflow
- ⏭️ **Skipped**: Job was skipped due to conditions

## 🚨 Critical Issues and Solutions

### 1. Missing Required Secrets

**Symptoms:**
```
❌ DATABASE_URL secret not configured for production!
Migration deployment requires production database access.
```

**Solution:**
1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Add missing secrets:
   ```
   DATABASE_URL = postgresql://username:password@host:port/database
   NEXTAUTH_SECRET = your-32-character-secret
   ABACUSAI_API_KEY = your-api-key
   ```

### 2. Migration Deployment Failures

**Symptoms:**
```
❌ Migration deployment failed in production
🔧 Manual intervention may be required
```

**Solution:**
1. Check the migration deployment job logs
2. Verify database connectivity
3. Review migration files for syntax errors
4. Check backup identifier for rollback if needed

### 3. Build Failures Due to Environment Issues

**Symptoms:**
```
❌ Build failed due to missing environment variables
TypeScript compilation failed
```

**Solution:**
1. Review debug steps for missing secrets
2. Check environment variable fallbacks
3. Verify all required secrets are configured
4. Re-run workflow after adding missing secrets

### 4. Security Scan Failures

**Symptoms:**
```
🚨 Critical vulnerabilities detected
RBAC tests failed
```

**Solution:**
1. Review security scan artifacts
2. Update vulnerable dependencies: `npm audit fix`
3. Fix RBAC permission issues
4. Address code security warnings

## 🔧 Debugging Steps

### Enable Debug Logging
Add these environment variables to workflow runs:
```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

### Check Secret Availability
Each workflow includes debug steps showing secret status:
```bash
🔐 Checking required secrets availability...
DATABASE_URL: ✅ yes
NEXTAUTH_SECRET: ✅ yes
ABACUSAI_API_KEY: ❌ no (using fallback)
```

### Validate Environment Configuration
```bash
# Test database connectivity
pg_isready -h your-db-host -p 5432 -U your-user

# Verify environment variables
echo $DATABASE_URL | grep -o "postgresql://[^@]*@[^/]*"

# Check Node.js and dependency versions
node --version
npm --version
```

## 📊 Workflow-Specific Issues

### Main CI Pipeline (`ci.yml`)

**Common Issues:**
- **Lint failures**: Fix ESLint and TypeScript errors
- **Test failures**: Review test logs and coverage reports
- **Migration validation**: Ensure shadow database is configured
- **Build timeouts**: Check for memory issues or dependency conflicts

**Debug Commands:**
```bash
# Local testing
yarn lint
yarn tsc --noEmit
yarn test --coverage
yarn build
```

### Staging CI Pipeline (`staging-ci.yml`)

**Common Issues:**
- **Staging configuration warnings**: Add staging-specific secrets
- **Build differences**: Verify staging environment flags
- **Security warnings**: Review debug flags and test credentials

**Debug Commands:**
```bash
# Test staging configuration
NODE_ENV=production yarn build
```

### Security Automation (`security-automation.yml`)

**Common Issues:**
- **SAST scan failures**: Review ESLint security plugin results
- **RBAC test failures**: Check permission matrix validation
- **Dependency vulnerabilities**: Update packages with security issues
- **DAST scan timeouts**: Verify application startup

**Debug Commands:**
```bash
# Run security tests locally
yarn test tests/rbac.spec.ts tests/security-automation.spec.ts
npm audit --audit-level=moderate
```

## 🔐 Secrets Management Issues

### Secret Not Available in Workflow

**Symptoms:**
```
❌ no (using fallback)
```

**Debugging Steps:**
1. Check secret name spelling (case-sensitive)
2. Verify secret exists in repository settings
3. Confirm secret has a value (not empty)
4. Check if running from a fork (secrets unavailable)

### Production vs Staging Secrets

**Organization:**
```bash
# Production (required for main branch)
DATABASE_URL
NEXTAUTH_SECRET
ABACUSAI_API_KEY

# Staging (optional, with fallbacks)
STAGING_DATABASE_URL
STAGING_NEXTAUTH_URL
STAGING_ABACUSAI_API_KEY
```

### Secret Rotation Best Practices

1. **Regular Rotation**: Rotate secrets every 90 days
2. **Secure Storage**: Never commit secrets to code
3. **Access Control**: Limit who can view/edit secrets
4. **Monitoring**: Watch for unauthorized access attempts

## 🚀 Performance Issues

### Workflow Taking Too Long

**Common Causes:**
- **Dependency installation**: Large package.json
- **Database connections**: Slow network to database
- **Build processes**: Complex TypeScript compilation
- **Test suites**: Comprehensive test coverage

**Solutions:**
```yaml
# Optimize dependency installation
- run: yarn install --frozen-lockfile --network-timeout 300000

# Use caching
- uses: actions/setup-node@v4
  with:
    cache: 'yarn'
    cache-dependency-path: yarn.lock

# Parallel job execution
needs: [lint-and-typecheck] # Run after dependencies
```

### Memory Issues

**Symptoms:**
```
❌ Build failed due to out of memory
ENOSPC: no space left on device
```

**Solutions:**
1. Increase Node.js memory limit:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" yarn build
   ```
2. Optimize build process
3. Use smaller dependency installations

## 📝 Workflow Artifacts and Logs

### Download Artifacts for Analysis

1. Go to failed workflow run
2. Scroll to **Artifacts** section
3. Download relevant reports:
   - `test-results-*`: Test execution logs
   - `coverage-report-*`: Code coverage data
   - `security-scan-*`: Security analysis reports
   - `migration-check-*`: Database migration logs

### Log Analysis Patterns

**Look for these patterns in logs:**

**Network Issues:**
```
ENOTFOUND, ECONNREFUSED, ETIMEDOUT
```

**Permission Issues:**
```
EACCES, permission denied
```

**Resource Issues:**
```
ENOSPC, out of memory
```

**Dependency Issues:**
```
Cannot resolve dependency, peer dependency warnings
```

## 🆘 Emergency Procedures

### Workflow Completely Broken

1. **Immediate Actions:**
   - Check if it's a GitHub Actions outage
   - Verify recent changes to workflow files
   - Look for missing required secrets

2. **Rollback Strategy:**
   ```bash
   # Revert workflow changes
   git revert <commit-hash>
   git push origin main
   ```

3. **Manual Deployment:**
   - Deploy manually if critical
   - Document manual steps taken
   - Fix workflows before next deployment

### Database Migration Failures

1. **Check backup identifier** from migration job logs
2. **Contact database administrator** if manual intervention needed
3. **Review migration rollback procedures**
4. **Test migration on staging** before retrying

### Security Alert in Production

1. **Immediate response:**
   - Review security scan results
   - Check for compromised secrets
   - Audit recent code changes

2. **Containment:**
   - Rotate affected secrets
   - Update vulnerable dependencies
   - Deploy security fixes

3. **Recovery:**
   - Verify fixes in staging
   - Deploy to production
   - Monitor for continued issues

## 📞 Getting Help

### Internal Resources
- **Enterprise Playbook**: `docs/enterprise-playbook.md`
- **Environment Variables Guide**: `yalla_london/app/ENVIRONMENT-VARIABLES.md`
- **Workflow Files**: `.github/workflows/`

### External Resources
- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **Prisma Troubleshooting**: https://www.prisma.io/docs/guides/other/troubleshooting
- **Next.js Deployment Issues**: https://nextjs.org/docs/deployment

### Creating Support Issues

When creating issues for workflow failures:

1. **Include workflow run URL**
2. **Attach relevant artifacts**
3. **Describe recent changes**
4. **Include error messages**
5. **Mention attempted solutions**

**Issue Template:**
```markdown
## Workflow Failure Report

**Workflow:** [Main CI / Staging CI / Security Automation]
**Run URL:** https://github.com/owner/repo/actions/runs/XXXXX
**Branch:** main/staging/feature-branch
**Commit:** abc123

**Error Summary:**
[Brief description of the failure]

**Error Details:**
[Full error message from logs]

**Recent Changes:**
[Any recent changes that might be related]

**Attempted Solutions:**
[What have you tried already]

**Debug Information:**
[Output from debug steps showing secret availability]
```