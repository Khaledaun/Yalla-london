# Release Standard Operating Procedures (SOP)

## Overview
This document outlines the standard operating procedures for releasing code to production, including canary deployments, promotion gates, and rollback procedures.

## Release Process Overview

### 1. Pre-Release Checklist
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Security scan passed
- [ ] Performance tests passed
- [ ] Documentation updated
- [ ] Feature flags configured
- [ ] Database migrations ready

### 2. Release Types

#### Hotfix Release
- **Purpose**: Critical bug fixes or security patches
- **Process**: Direct to production with minimal testing
- **Approval**: Engineering manager + Security team
- **Rollback**: Immediate if issues detected

#### Feature Release
- **Purpose**: New features or significant improvements
- **Process**: Canary → Staging → Production
- **Approval**: Engineering manager + Product team
- **Rollback**: Gradual if issues detected

#### Maintenance Release
- **Purpose**: Infrastructure updates, dependencies, etc.
- **Process**: Staging → Production
- **Approval**: Engineering manager + DevOps team
- **Rollback**: Immediate if issues detected

## Canary Deployment Process

### 1. Canary Environment Setup
```bash
# Deploy to canary environment
vercel --target preview

# Verify deployment
curl -f https://yalla-london-git-main-khaledauns-projects.vercel.app/api/health
```

### 2. Canary Testing
```bash
# Run canary tests
./scripts/canary.sh https://yalla-london-git-main-khaledauns-projects.vercel.app

# Check test results
cat canary.out
```

### 3. Canary Validation Criteria
- [ ] Health check passes
- [ ] Authentication works
- [ ] Phase-4 status endpoint accessible
- [ ] Article creation/fetch/deletion works
- [ ] Rate limiting functions
- [ ] Security headers present
- [ ] No critical errors in logs

### 4. Canary Decision Gate
- **Pass**: Proceed to staging deployment
- **Fail**: Block deployment, investigate issues
- **Partial**: Review specific failures, decide on mitigation

## Staging Deployment Process

### 1. Staging Environment Setup
```bash
# Deploy to staging
vercel --target staging

# Verify deployment
curl -f https://staging.yalla-london.vercel.app/api/health
```

### 2. Staging Testing
```bash
# Run comprehensive tests
yarn test:e2e
yarn test:smoke
yarn test:security

# Run load tests
k6 run perf/k6/save-and-list.js --env BASE_URL=https://staging.yalla-london.vercel.app
```

### 3. Staging Validation Criteria
- [ ] All automated tests pass
- [ ] Load test thresholds met
- [ ] Security scan passes
- [ ] Performance benchmarks met
- [ ] User acceptance testing completed
- [ ] Database migrations successful

## Production Deployment Process

### 1. Pre-Production Checklist
- [ ] Canary tests passed
- [ ] Staging tests passed
- [ ] Feature flags configured
- [ ] Database migrations ready
- [ ] Monitoring alerts configured
- [ ] Rollback plan prepared
- [ ] Team notified

### 2. Production Deployment
```bash
# Deploy to production
vercel --prod

# Verify deployment
curl -f https://yalla-london.vercel.app/api/health
```

### 3. Post-Deployment Verification
```bash
# Run production canary tests
./scripts/canary.sh https://yalla-london.vercel.app

# Check monitoring dashboards
# Verify error rates
# Check performance metrics
```

### 4. Production Validation Criteria
- [ ] Health check passes
- [ ] Canary tests pass
- [ ] Error rates within acceptable limits
- [ ] Performance metrics within thresholds
- [ ] No critical alerts
- [ ] User-facing functionality works

## Promotion Gates

### 1. Automated Gates
- **CI/CD Pipeline**: All tests must pass
- **Canary Tests**: Critical functionality must work
- **Security Scan**: No high-severity vulnerabilities
- **Performance Tests**: Thresholds must be met

### 2. Manual Gates
- **Code Review**: Approved by senior engineer
- **Security Review**: Approved by security team
- **Product Review**: Approved by product team
- **Operations Review**: Approved by DevOps team

### 3. Gate Failure Handling
- **Block Deployment**: If any gate fails
- **Investigate Issues**: Root cause analysis
- **Fix Issues**: Address problems
- **Re-run Gates**: Verify fixes
- **Document Lessons**: Update procedures

## Rollback Procedures

### 1. Automatic Rollback Triggers
- Error rate > 5% for 5 minutes
- Response time > 2 seconds for 5 minutes
- Database connection failures
- Critical security alerts

### 2. Manual Rollback Process
```bash
# Identify last known good deployment
vercel deployments list

# Rollback to previous deployment
vercel rollback <deployment-url>

# Verify rollback
curl -f https://yalla-london.vercel.app/api/health
```

### 3. Rollback Validation
- [ ] Health check passes
- [ ] Error rates return to normal
- [ ] Performance metrics improve
- [ ] User functionality restored
- [ ] No data loss

### 4. Post-Rollback Actions
- [ ] Notify stakeholders
- [ ] Document rollback reason
- [ ] Investigate root cause
- [ ] Plan fix for next release
- [ ] Update monitoring alerts

## Feature Flag Management

### 1. Feature Flag Lifecycle
- **Development**: Feature flag OFF
- **Testing**: Feature flag ON for test users
- **Staging**: Feature flag ON for staging
- **Production**: Feature flag OFF initially
- **Gradual Rollout**: Enable for percentage of users
- **Full Rollout**: Enable for all users
- **Cleanup**: Remove feature flag code

### 2. Feature Flag Controls
```bash
# Check current flag status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://yalla-london.vercel.app/api/phase4/status

# Enable feature flag
export FEATURE_AI_SEO_AUDIT=1

# Disable feature flag
export FEATURE_AI_SEO_AUDIT=0
```

### 3. Emergency Feature Disable
```bash
# Disable all feature flags
export FEATURE_AI_SEO_AUDIT=0
export FEATURE_CONTENT_PIPELINE=0
export FEATURE_WP_CONNECTOR=0
export FEATURE_WHITE_LABEL=0
export FEATURE_BACKLINK_OFFERS=0

# Redeploy with flags disabled
vercel --prod
```

## Monitoring and Alerting

### 1. Key Metrics to Monitor
- Error rates
- Response times
- Database performance
- User engagement
- Feature flag usage

### 2. Alert Thresholds
- **Error Rate**: > 2% for 10 minutes
- **Response Time**: > 500ms p95 for 10 minutes
- **Database Latency**: > 200ms p95 for 10 minutes
- **Feature Flag Usage**: Unusual spikes

### 3. Alert Response
- **P0 (Critical)**: Immediate response, 15-minute SLA
- **P1 (High)**: 1-hour response, 4-hour resolution
- **P2 (Medium)**: 4-hour response, 24-hour resolution
- **P3 (Low)**: 24-hour response, 72-hour resolution

## Communication Procedures

### 1. Release Notifications
- **Pre-Release**: Notify team 24 hours in advance
- **Release Start**: Notify team when deployment begins
- **Release Complete**: Notify team when deployment completes
- **Issues**: Notify team immediately if problems occur

### 2. Stakeholder Communication
- **Engineering Team**: Slack #yalla-london-releases
- **Product Team**: Email notification
- **Users**: Status page updates
- **Management**: Executive summary

### 3. Incident Communication
- **Internal**: Slack #yalla-london-incidents
- **External**: Status page updates
- **Post-Incident**: Public post-mortem

## Emergency Procedures

### 1. Critical Issues
- **Immediate Rollback**: If system is down
- **Feature Disable**: If specific feature is problematic
- **Traffic Routing**: If partial system failure
- **Database Restore**: If data corruption

### 2. Emergency Contacts
- **On-Call Engineer**: [Contact Information]
- **Engineering Manager**: [Contact Information]
- **DevOps Team**: [Contact Information]
- **Security Team**: [Contact Information]

### 3. Emergency Escalation
- **Level 1**: On-call engineer
- **Level 2**: Engineering manager
- **Level 3**: CTO
- **Level 4**: CEO

## Post-Release Procedures

### 1. Immediate (0-1 hour)
- [ ] Monitor system health
- [ ] Verify key functionality
- [ ] Check error rates
- [ ] Review performance metrics

### 2. Short-term (1-24 hours)
- [ ] Monitor user feedback
- [ ] Review business metrics
- [ ] Check feature flag usage
- [ ] Update documentation

### 3. Long-term (1-7 days)
- [ ] Conduct release retrospective
- [ ] Update release procedures
- [ ] Share lessons learned
- [ ] Plan next release

## Release Checklist Template

### Pre-Release
- [ ] Code review completed
- [ ] Tests passing
- [ ] Security scan passed
- [ ] Performance tests passed
- [ ] Documentation updated
- [ ] Feature flags configured
- [ ] Database migrations ready
- [ ] Monitoring alerts configured
- [ ] Rollback plan prepared
- [ ] Team notified

### Release
- [ ] Canary deployment successful
- [ ] Canary tests passed
- [ ] Staging deployment successful
- [ ] Staging tests passed
- [ ] Production deployment successful
- [ ] Production verification passed
- [ ] Monitoring dashboards updated
- [ ] Stakeholders notified

### Post-Release
- [ ] System health monitored
- [ ] Error rates checked
- [ ] Performance metrics reviewed
- [ ] User feedback collected
- [ ] Business metrics analyzed
- [ ] Release retrospective scheduled
- [ ] Documentation updated
- [ ] Lessons learned documented
