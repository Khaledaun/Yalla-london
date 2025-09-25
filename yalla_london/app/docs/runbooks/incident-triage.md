# Incident Triage Runbook

## Overview
This runbook provides step-by-step procedures for triaging and responding to incidents in the Yalla London platform.

## Alert Severity Levels

### Critical (P0)
- Database connection failures
- Complete service unavailability
- Data corruption or loss
- Security breaches

### Warning (P1)
- High error rates (>2%)
- High latency (>500ms p95)
- High database latency (>200ms p95)
- Rate limiting triggers

### Info (P2)
- High request volume
- Feature flag usage spikes
- Performance degradation

## Initial Response (First 5 Minutes)

### 1. Acknowledge the Alert
- [ ] Acknowledge the alert in monitoring system
- [ ] Post in #yalla-london-incidents Slack channel
- [ ] Assign incident commander if not already assigned

### 2. Assess Impact
- [ ] Check service health dashboard
- [ ] Verify user-facing impact
- [ ] Check error rates and latency metrics
- [ ] Review recent deployments

### 3. Initial Investigation
```bash
# Check service status
curl -f https://yalla-london.vercel.app/api/health

# Check Phase-4 status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://yalla-london.vercel.app/api/phase4/status

# Check recent logs
vercel logs --follow
```

## Common Incident Scenarios

### High Error Rate (>2%)

**Symptoms:**
- Error rate exceeds 2% over 10 minutes
- Users experiencing failures

**Investigation Steps:**
1. Check error types in metrics
2. Review recent deployments
3. Check database connectivity
4. Verify external service dependencies

**Resolution Steps:**
```bash
# Check error breakdown
curl https://yalla-london.vercel.app/api/metrics | grep http_errors_total

# Check database status
npx prisma migrate status

# Check recent deployments
vercel deployments list --limit 5
```

**Rollback Procedure:**
```bash
# Rollback to previous deployment
vercel rollback <previous-deployment-url>

# Verify rollback
curl -f https://yalla-london.vercel.app/api/health
```

### High API Latency (>500ms p95)

**Symptoms:**
- 95th percentile latency exceeds 500ms
- Slow response times for users

**Investigation Steps:**
1. Check database query performance
2. Review external API dependencies
3. Check server resource utilization
4. Analyze slow query logs

**Resolution Steps:**
```bash
# Check database performance
npx prisma studio

# Check query performance
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

# Check external dependencies
curl -w "@curl-format.txt" https://api.external-service.com/health
```

### Database Connection Failures

**Symptoms:**
- Database connection errors
- 500 errors on database operations

**Investigation Steps:**
1. Check database server status
2. Verify connection pool settings
3. Check network connectivity
4. Review database logs

**Resolution Steps:**
```bash
# Check database connectivity
npx prisma db pull

# Check connection pool
SELECT * FROM pg_stat_activity;

# Restart connection pool
# (Implementation depends on hosting provider)
```

**Escalation:**
- Contact database provider support
- Consider failover to backup database

### High Database Latency (>200ms p95)

**Symptoms:**
- Database queries taking >200ms
- Slow page loads

**Investigation Steps:**
1. Check slow query logs
2. Analyze query execution plans
3. Check database resource utilization
4. Review recent schema changes

**Resolution Steps:**
```bash
# Identify slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 200 
ORDER BY mean_time DESC;

# Check database locks
SELECT * FROM pg_locks WHERE NOT granted;

# Analyze query performance
EXPLAIN ANALYZE <slow-query>;
```

## Communication Procedures

### Internal Communication
1. **Slack Channel:** #yalla-london-incidents
2. **Status Page:** Update if user-facing impact
3. **Team Notification:** Alert on-call engineer

### External Communication
1. **Status Page:** Update with incident details
2. **User Notification:** If significant impact
3. **Post-Incident:** Public post-mortem if P0/P1

## Escalation Procedures

### P0 (Critical) - Escalate Immediately
- [ ] Page on-call engineer
- [ ] Notify engineering manager
- [ ] Consider executive notification
- [ ] Prepare for war room

### P1 (Warning) - Escalate if No Progress
- [ ] Escalate after 15 minutes
- [ ] Notify engineering manager
- [ ] Consider additional resources

### P2 (Info) - Monitor and Document
- [ ] Monitor for escalation
- [ ] Document in incident log
- [ ] Review during next team meeting

## Post-Incident Procedures

### Immediate (Within 1 Hour)
- [ ] Verify incident resolution
- [ ] Update status page
- [ ] Notify stakeholders
- [ ] Document initial findings

### Short-term (Within 24 Hours)
- [ ] Conduct incident review
- [ ] Identify root cause
- [ ] Document lessons learned
- [ ] Create action items

### Long-term (Within 1 Week)
- [ ] Implement preventive measures
- [ ] Update runbooks
- [ ] Conduct team retrospective
- [ ] Share learnings with team

## Contact Information

### On-Call Rotation
- **Primary:** [Current on-call engineer]
- **Secondary:** [Backup engineer]
- **Manager:** [Engineering manager]

### External Contacts
- **Vercel Support:** support@vercel.com
- **Database Provider:** [Provider support contact]
- **Monitoring:** [Monitoring service support]

## Tools and Resources

### Monitoring Dashboards
- **Main Dashboard:** [Grafana/Prometheus URL]
- **Error Tracking:** [Sentry URL]
- **Performance:** [Performance monitoring URL]

### Access Credentials
- **Admin Tokens:** Stored in secure password manager
- **Database Access:** Via secure connection strings
- **Monitoring Access:** Via SSO

### Useful Commands
```bash
# Health checks
curl -f https://yalla-london.vercel.app/api/health
curl -H "Authorization: Bearer $TOKEN" https://yalla-london.vercel.app/api/phase4/status

# Database operations
npx prisma migrate status
npx prisma db pull
npx prisma studio

# Deployment operations
vercel deployments list
vercel rollback <deployment-url>
vercel logs --follow

# Metrics and monitoring
curl https://yalla-london.vercel.app/api/metrics
```

## Incident Response Checklist

### Initial Response
- [ ] Acknowledge alert
- [ ] Assess impact
- [ ] Start investigation
- [ ] Communicate status

### Investigation
- [ ] Check service health
- [ ] Review metrics
- [ ] Check recent changes
- [ ] Identify root cause

### Resolution
- [ ] Implement fix
- [ ] Verify resolution
- [ ] Monitor for recurrence
- [ ] Update stakeholders

### Post-Incident
- [ ] Document incident
- [ ] Conduct review
- [ ] Create action items
- [ ] Update runbooks
