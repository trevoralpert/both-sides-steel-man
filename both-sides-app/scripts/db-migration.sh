#!/bin/bash

# Database Migration and Management Script
# Handles PostgreSQL migrations, backups, and maintenance for production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DATABASE_HOST:-production-db.neon.tech}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-bothsides_production}"
DB_USER="${DATABASE_USER:-bothsides_user}"
DB_PASSWORD="${DATABASE_PASSWORD}"
BACKUP_BUCKET="${BACKUP_BUCKET:-bothsides-db-backups}"
BACKUP_PATH="${BACKUP_PATH:-postgresql/production}"

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    log "Checking database migration dependencies..."
    
    local missing_deps=()
    
    if ! command -v psql &> /dev/null; then
        missing_deps+=("postgresql-client")
    fi
    
    if ! command -v pg_dump &> /dev/null; then
        missing_deps+=("postgresql-client")
    fi
    
    if ! command -v aws &> /dev/null; then
        missing_deps+=("awscli")
    fi
    
    if ! command -v yarn &> /dev/null; then
        missing_deps+=("yarn")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        echo "Please install the missing dependencies and try again."
        exit 1
    fi
    
    success "All dependencies are installed"
}

# Check database connection
check_db_connection() {
    log "Checking database connection..."
    
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        error "Cannot connect to database"
        echo "Host: $DB_HOST:$DB_PORT"
        echo "Database: $DB_NAME"
        echo "User: $DB_USER"
        exit 1
    fi
    
    success "Database connection successful"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Check for pending migrations
    log "Checking for pending migrations..."
    
    # In a real implementation, this would use Knex.js or similar
    if yarn knex migrate:status --env production; then
        log "Migration status checked"
    else
        error "Failed to check migration status"
        exit 1
    fi
    
    # Run migrations
    log "Applying pending migrations..."
    if yarn knex migrate:latest --env production; then
        success "Migrations applied successfully"
    else
        error "Migration failed"
        exit 1
    fi
    
    # Load extensions if needed
    log "Loading database extensions..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Update statistics
ANALYZE;

-- Log completion
SELECT 'Extensions loaded successfully' as status;
EOF
    
    success "Database extensions loaded"
}

# Rollback migrations
rollback_migrations() {
    local steps=${1:-1}
    
    warning "Rolling back $steps migration step(s)..."
    
    read -p "Are you sure you want to rollback $steps migration(s)? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Rollback cancelled"
        return 0
    fi
    
    if yarn knex migrate:rollback --env production --step="$steps"; then
        success "Rollback completed successfully"
    else
        error "Rollback failed"
        exit 1
    fi
}

# Create database backup
create_backup() {
    local backup_type=${1:-full}
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_name="bothsides_${backup_type}_${timestamp}"
    local backup_file="${backup_name}.sql"
    local compressed_file="${backup_name}.sql.gz"
    
    log "Creating $backup_type database backup: $backup_name"
    
    # Create backup directory
    mkdir -p ./backups
    
    # Create database dump
    log "Creating database dump..."
    if [ "$backup_type" = "schema" ]; then
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --schema-only \
            --no-owner \
            --no-privileges \
            -f "./backups/$backup_file"
    else
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --no-owner \
            --no-privileges \
            -f "./backups/$backup_file"
    fi
    
    if [ $? -ne 0 ]; then
        error "Database dump failed"
        exit 1
    fi
    
    # Compress backup
    log "Compressing backup..."
    gzip "./backups/$backup_file"
    
    # Upload to S3
    log "Uploading backup to S3..."
    if aws s3 cp "./backups/$compressed_file" "s3://$BACKUP_BUCKET/$BACKUP_PATH/$compressed_file"; then
        success "Backup uploaded to S3: s3://$BACKUP_BUCKET/$BACKUP_PATH/$compressed_file"
    else
        warning "Failed to upload backup to S3, but local backup created"
    fi
    
    # Clean up local backup (optional)
    read -p "Remove local backup file? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "./backups/$compressed_file"
        log "Local backup file removed"
    fi
    
    success "Backup completed: $backup_name"
}

# Restore database from backup
restore_backup() {
    local backup_name="$1"
    
    if [ -z "$backup_name" ]; then
        error "Backup name is required"
        echo "Usage: $0 restore <backup_name>"
        exit 1
    fi
    
    warning "This will restore the database from backup: $backup_name"
    warning "ALL CURRENT DATA WILL BE LOST!"
    
    read -p "Are you absolutely sure you want to continue? (type 'YES' to confirm): " -r
    if [ "$REPLY" != "YES" ]; then
        log "Restore cancelled"
        return 0
    fi
    
    log "Downloading backup from S3..."
    mkdir -p ./backups
    
    if ! aws s3 cp "s3://$BACKUP_BUCKET/$BACKUP_PATH/${backup_name}.sql.gz" "./backups/${backup_name}.sql.gz"; then
        error "Failed to download backup from S3"
        exit 1
    fi
    
    log "Decompressing backup..."
    gunzip "./backups/${backup_name}.sql.gz"
    
    log "Stopping application connections..."
    # In production, you would stop the application here
    
    log "Restoring database..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "./backups/${backup_name}.sql"
    
    if [ $? -eq 0 ]; then
        success "Database restored successfully"
    else
        error "Database restore failed"
        exit 1
    fi
    
    log "Running post-restore tasks..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Update statistics
ANALYZE;

-- Rebuild indexes if needed
REINDEX DATABASE "$DB_NAME";

-- Log completion
SELECT 'Post-restore tasks completed' as status;
EOF
    
    # Clean up
    rm "./backups/${backup_name}.sql"
    
    success "Database restore completed"
}

# Seed production database
seed_database() {
    log "Seeding production database..."
    
    warning "This will add seed data to the production database"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Seeding cancelled"
        return 0
    fi
    
    if yarn knex seed:run --env production; then
        success "Database seeding completed"
    else
        error "Database seeding failed"
        exit 1
    fi
}

# Optimize database performance
optimize_database() {
    log "Optimizing database performance..."
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Update table statistics
ANALYZE;

-- Vacuum tables
VACUUM ANALYZE;

-- Reindex if needed (be careful in production)
-- REINDEX DATABASE "$DB_NAME";

-- Check for unused indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

SELECT 'Database optimization completed' as status;
EOF
    
    success "Database optimization completed"
}

# Check database health
check_database_health() {
    log "Checking database health..."
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Connection info
SELECT 
    'Database Health Check' as check_type,
    current_database() as database,
    current_user as user,
    inet_server_addr() as server_ip,
    inet_server_port() as server_port,
    version() as version;

-- Connection stats
SELECT 
    'Connection Stats' as check_type,
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;

-- Database size
SELECT 
    'Database Size' as check_type,
    pg_database.datname as database_name,
    pg_size_pretty(pg_database_size(pg_database.datname)) as size
FROM pg_database
WHERE datname = current_database();

-- Table stats
SELECT 
    'Table Stats' as check_type,
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 10;

-- Index usage
SELECT 
    'Index Usage' as check_type,
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 10;

-- Slow queries (if enabled)
SELECT 
    'Slow Queries' as check_type,
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 5;
EOF
    
    success "Database health check completed"
}

# List available backups
list_backups() {
    log "Listing available backups..."
    
    if aws s3 ls "s3://$BACKUP_BUCKET/$BACKUP_PATH/" --recursive; then
        success "Backup list retrieved"
    else
        error "Failed to list backups"
        exit 1
    fi
}

# Show help
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Database migration and management script for Both Sides platform"
    echo ""
    echo "Commands:"
    echo "  migrate              Run pending database migrations"
    echo "  rollback [steps]     Rollback migrations (default: 1 step)"
    echo "  backup [type]        Create database backup (full|schema, default: full)"
    echo "  restore <name>       Restore database from backup"
    echo "  seed                 Seed database with initial data"
    echo "  optimize             Optimize database performance"
    echo "  health               Check database health status"
    echo "  list-backups         List available backups"
    echo "  help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 migrate                    # Run migrations"
    echo "  $0 backup full               # Create full backup"
    echo "  $0 backup schema             # Create schema-only backup"
    echo "  $0 restore backup_20231201   # Restore from backup"
    echo "  $0 rollback 2                # Rollback 2 migrations"
    echo ""
    echo "Environment Variables:"
    echo "  DATABASE_HOST        Database host (default: production-db.neon.tech)"
    echo "  DATABASE_PORT        Database port (default: 5432)"
    echo "  DATABASE_NAME        Database name (default: bothsides_production)"
    echo "  DATABASE_USER        Database user (default: bothsides_user)"
    echo "  DATABASE_PASSWORD    Database password (required)"
    echo "  BACKUP_BUCKET        S3 backup bucket (default: bothsides-db-backups)"
    echo "  BACKUP_PATH          S3 backup path (default: postgresql/production)"
}

# Main function
main() {
    local command="${1:-help}"
    
    case "$command" in
        migrate)
            check_dependencies
            check_db_connection
            run_migrations
            ;;
        rollback)
            check_dependencies
            check_db_connection
            rollback_migrations "${2:-1}"
            ;;
        backup)
            check_dependencies
            check_db_connection
            create_backup "${2:-full}"
            ;;
        restore)
            if [ -z "$2" ]; then
                error "Backup name is required for restore"
                show_help
                exit 1
            fi
            check_dependencies
            check_db_connection
            restore_backup "$2"
            ;;
        seed)
            check_dependencies
            check_db_connection
            seed_database
            ;;
        optimize)
            check_dependencies
            check_db_connection
            optimize_database
            ;;
        health)
            check_dependencies
            check_db_connection
            check_database_health
            ;;
        list-backups)
            check_dependencies
            list_backups
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
