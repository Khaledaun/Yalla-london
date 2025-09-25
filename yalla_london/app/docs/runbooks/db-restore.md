# Database Restore Runbook

## Overview
This runbook provides procedures for restoring the Yalla London database from backups in case of data loss, corruption, or disaster recovery scenarios.

## Prerequisites

### Required Tools
- `pg_dump` - PostgreSQL backup utility
- `psql` - PostgreSQL command-line client
- `npx prisma` - Prisma CLI for schema management
- Access to source and target databases

### Required Access
- Source database connection string
- Target database connection string
- Database admin privileges
- Backup storage access

## Backup and Restore Procedures

### 1. Automated Backup and Restore Drill

The automated drill script tests the complete backup and restore process:

```bash
# Run complete drill
./scripts/backup-restore-drill.sh

# Run backup only
./scripts/backup-restore-drill.sh backup-only

# Run restore only (requires backup file)
./scripts/backup-restore-drill.sh restore-only /path/to/backup.sql

# Run verification only
./scripts/backup-restore-drill.sh verify-only
```

### 2. Manual Backup Creation

```bash
# Create timestamped backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Create compressed backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Create backup with specific options
pg_dump \
  --verbose \
  --clean \
  --no-owner \
  --no-privileges \
  $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Manual Database Restore

```bash
# Restore from backup file
psql $RESTORE_DB_URL < backup_file.sql

# Restore from compressed backup
gunzip -c backup_file.sql.gz | psql $RESTORE_DB_URL

# Restore with specific options
psql \
  --verbose \
  --single-transaction \
  $RESTORE_DB_URL < backup_file.sql
```

## Disaster Recovery Scenarios

### Scenario 1: Complete Database Loss

**Symptoms:**
- Database connection failures
- "Database does not exist" errors
- Complete data unavailability

**Recovery Steps:**

1. **Assess the situation**
   ```bash
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check database existence
   psql $POSTGRES_URL -c "\l"
   ```

2. **Locate latest backup**
   ```bash
   # List available backups
   ls -la backups/
   
   # Find most recent backup
   ls -t backups/backup_*.sql | head -1
   ```

3. **Restore database**
   ```bash
   # Extract database name from URL
   DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
   BASE_URL=$(echo $DATABASE_URL | sed 's/\/[^/]*$//')
   POSTGRES_URL="${BASE_URL}/postgres"
   
   # Drop and recreate database
   psql $POSTGRES_URL -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
   psql $POSTGRES_URL -c "CREATE DATABASE \"$DB_NAME\";"
   
   # Restore from backup
   psql $DATABASE_URL < latest_backup.sql
   ```

4. **Verify restoration**
   ```bash
   # Check connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check migration status
   npx prisma migrate status
   
   # Run data integrity checks
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM blog_posts;"
   ```

### Scenario 2: Partial Data Corruption

**Symptoms:**
- Specific tables inaccessible
- Data inconsistencies
- Application errors on specific operations

**Recovery Steps:**

1. **Identify affected tables**
   ```bash
   # Check table accessibility
   psql $DATABASE_URL -c "\dt"
   
   # Test specific tables
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM blog_posts;"
   ```

2. **Restore specific tables**
   ```bash
   # Create backup of current state
   pg_dump $DATABASE_URL > pre_restore_backup.sql
   
   # Restore specific table from backup
   pg_restore \
     --data-only \
     --table=users \
     backup_file.sql | psql $DATABASE_URL
   ```

3. **Verify data integrity**
   ```bash
   # Check table row counts
   psql $DATABASE_URL -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;"
   
   # Run application health checks
   curl -f https://yalla-london.vercel.app/api/health
   ```

### Scenario 3: Schema Corruption

**Symptoms:**
- Migration failures
- Schema validation errors
- Table structure issues

**Recovery Steps:**

1. **Check migration status**
   ```bash
   npx prisma migrate status
   ```

2. **Reset and reapply migrations**
   ```bash
   # Reset migration history
   npx prisma migrate reset --force
   
   # Reapply all migrations
   npx prisma migrate deploy
   ```

3. **Restore data if needed**
   ```bash
   # If data was lost during reset
   psql $DATABASE_URL < data_backup.sql
   ```

## Verification Procedures

### 1. Connectivity Verification
```bash
# Basic connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check database version
psql $DATABASE_URL -c "SELECT version();"

# Check connection info
psql $DATABASE_URL -c "SELECT current_database(), current_user, inet_server_addr(), inet_server_port();"
```

### 2. Schema Verification
```bash
# Check migration status
npx prisma migrate status

# Verify table structure
psql $DATABASE_URL -c "\dt"

# Check indexes
psql $DATABASE_URL -c "\di"

# Check constraints
psql $DATABASE_URL -c "\d+"
```

### 3. Data Integrity Verification
```bash
# Check row counts
psql $DATABASE_URL -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;"

# Check for orphaned records
psql $DATABASE_URL -c "SELECT COUNT(*) FROM blog_posts WHERE user_id NOT IN (SELECT id FROM users);"

# Check data consistency
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users WHERE created_at > updated_at;"
```

### 4. Application Verification
```bash
# Health check
curl -f https://yalla-london.vercel.app/api/health

# Phase-4 status
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://yalla-london.vercel.app/api/phase4/status

# Test critical endpoints
curl -f https://yalla-london.vercel.app/api/admin/articles
```

## Monitoring and Alerting

### Key Metrics to Monitor
- Database connection count
- Query performance
- Error rates
- Backup success/failure
- Restore operation status

### Alert Conditions
- Database connection failures
- High query latency
- Backup failures
- Data inconsistency detection

## Prevention Measures

### Regular Backups
- Automated daily backups
- Weekly full backups
- Monthly archive backups
- Backup verification tests

### Monitoring
- Database health monitoring
- Performance monitoring
- Error rate monitoring
- Capacity monitoring

### Testing
- Regular restore drills
- Disaster recovery testing
- Performance testing
- Data integrity testing

## Emergency Contacts

### Database Team
- **Primary DBA:** [Contact Information]
- **Secondary DBA:** [Contact Information]
- **Database Provider Support:** [Contact Information]

### Application Team
- **On-call Engineer:** [Contact Information]
- **Engineering Manager:** [Contact Information]
- **DevOps Team:** [Contact Information]

## Recovery Time Objectives (RTO)

- **Critical Systems:** 1 hour
- **Important Systems:** 4 hours
- **Standard Systems:** 24 hours

## Recovery Point Objectives (RPO)

- **Critical Data:** 15 minutes
- **Important Data:** 1 hour
- **Standard Data:** 24 hours

## Post-Recovery Procedures

### Immediate (0-1 hour)
- [ ] Verify system functionality
- [ ] Notify stakeholders
- [ ] Document recovery actions
- [ ] Monitor system stability

### Short-term (1-24 hours)
- [ ] Conduct root cause analysis
- [ ] Update monitoring alerts
- [ ] Review backup procedures
- [ ] Test disaster recovery procedures

### Long-term (1-7 days)
- [ ] Implement preventive measures
- [ ] Update documentation
- [ ] Conduct team review
- [ ] Share lessons learned
