#!/bin/bash

# Backup and Restore Drill Script
# Tests backup and restore procedures for disaster recovery

set -e

# Configuration
SOURCE_DB_URL=${DATABASE_URL}
RESTORE_DB_URL=${RESTORE_DB_URL}
BACKUP_DIR=${BACKUP_DIR:-"./backups"}
LOG_FILE="backup-restore.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if [ -z "$SOURCE_DB_URL" ]; then
        log_error "SOURCE_DB_URL environment variable is required"
        exit 1
    fi
    
    if [ -z "$RESTORE_DB_URL" ]; then
        log_error "RESTORE_DB_URL environment variable is required"
        exit 1
    fi
    
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump is not installed or not in PATH"
        exit 1
    fi
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        log_error "psql is not installed or not in PATH"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create backup directory
create_backup_dir() {
    log "Creating backup directory..."
    mkdir -p "$BACKUP_DIR"
    log_success "Backup directory created: $BACKUP_DIR"
}

# Create database backup
create_backup() {
    log "Creating database backup..."
    
    local backup_file="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Create backup using pg_dump
    if pg_dump "$SOURCE_DB_URL" > "$backup_file" 2>> "$LOG_FILE"; then
        log_success "Backup created successfully: $backup_file"
        echo "$backup_file"
    else
        log_error "Failed to create backup"
        exit 1
    fi
}

# Restore database from backup
restore_database() {
    local backup_file="$1"
    
    log "Restoring database from backup: $backup_file"
    
    # Drop and recreate the restore database
    log "Dropping and recreating restore database..."
    
    # Extract database name from URL
    local db_name=$(echo "$RESTORE_DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    local base_url=$(echo "$RESTORE_DB_URL" | sed 's/\/[^/]*$//')
    
    # Connect to postgres database to drop/recreate
    local postgres_url="${base_url}/postgres"
    
    # Drop database if it exists
    psql "$postgres_url" -c "DROP DATABASE IF EXISTS \"$db_name\";" 2>> "$LOG_FILE" || true
    
    # Create new database
    psql "$postgres_url" -c "CREATE DATABASE \"$db_name\";" 2>> "$LOG_FILE"
    
    # Restore from backup
    if psql "$RESTORE_DB_URL" < "$backup_file" 2>> "$LOG_FILE"; then
        log_success "Database restored successfully"
    else
        log_error "Failed to restore database"
        exit 1
    fi
}

# Verify restore database
verify_restore() {
    log "Verifying restored database..."
    
    # Check database connectivity
    if psql "$RESTORE_DB_URL" -c "SELECT 1;" > /dev/null 2>> "$LOG_FILE"; then
        log_success "Database connectivity verified"
    else
        log_error "Database connectivity failed"
        exit 1
    fi
    
    # Check migration status
    log "Checking migration status..."
    if PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma migrate status --schema prisma/schema.prisma 2>> "$LOG_FILE"; then
        log_success "Migration status check passed"
    else
        log_warning "Migration status check failed (this may be expected for restored database)"
    fi
    
    # Run read probe
    log "Running read probe..."
    if psql "$RESTORE_DB_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" > /dev/null 2>> "$LOG_FILE"; then
        log_success "Read probe passed"
    else
        log_error "Read probe failed"
        exit 1
    fi
    
    # Check for critical tables
    log "Checking for critical tables..."
    local tables=("users" "blog_posts" "media_assets")
    for table in "${tables[@]}"; do
        if psql "$RESTORE_DB_URL" -c "SELECT 1 FROM \"$table\" LIMIT 1;" > /dev/null 2>> "$LOG_FILE"; then
            log_success "Table $table is accessible"
        else
            log_warning "Table $table is not accessible or empty"
        fi
    done
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    # Remove backup file if specified
    if [ -n "$CLEANUP_BACKUP" ] && [ -f "$CLEANUP_BACKUP" ]; then
        rm -f "$CLEANUP_BACKUP"
        log_success "Backup file cleaned up"
    fi
    
    # Remove log file if specified
    if [ "$CLEANUP_LOG" = "true" ]; then
        rm -f "$LOG_FILE"
        log_success "Log file cleaned up"
    fi
}

# Main execution
main() {
    log "Starting backup and restore drill..."
    log "Source DB: ${SOURCE_DB_URL:0:20}..."
    log "Restore DB: ${RESTORE_DB_URL:0:20}..."
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Execute drill steps
    check_prerequisites
    create_backup_dir
    backup_file=$(create_backup)
    restore_database "$backup_file"
    verify_restore
    
    log_success "Backup and restore drill completed successfully"
    
    # Summary
    log "=== DRILL SUMMARY ==="
    log "Backup file: $backup_file"
    log "Log file: $LOG_FILE"
    log "Source DB: ${SOURCE_DB_URL:0:20}..."
    log "Restore DB: ${RESTORE_DB_URL:0:20}..."
    log "Status: SUCCESS"
    log "===================="
}

# Handle command line arguments
case "${1:-}" in
    "backup-only")
        check_prerequisites
        create_backup_dir
        backup_file=$(create_backup)
        log_success "Backup-only operation completed: $backup_file"
        ;;
    "restore-only")
        if [ -z "$2" ]; then
            log_error "Backup file path required for restore-only operation"
            exit 1
        fi
        check_prerequisites
        restore_database "$2"
        verify_restore
        log_success "Restore-only operation completed"
        ;;
    "verify-only")
        check_prerequisites
        verify_restore
        log_success "Verify-only operation completed"
        ;;
    "cleanup")
        CLEANUP_BACKUP="$2"
        CLEANUP_LOG="$3"
        cleanup
        ;;
    *)
        main
        ;;
esac
