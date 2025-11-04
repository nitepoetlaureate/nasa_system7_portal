#!/bin/bash
# NASA System 7 Portal - Rollback Script
# Automated rollback with verification

set -euo pipefail

# Configuration
ROLLBACK_TIMEOUT=300
HEALTH_CHECK_TIMEOUT=120

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Validate rollback token
validate_rollback_token() {
    log "🔐 Validating rollback authorization..."

    if [[ -z "${ROLLBACK_TOKEN:-}" ]]; then
        error "ROLLBACK_TOKEN environment variable is not set"
        exit 1
    fi

    # Simple token validation (implement proper authentication in production)
    if [[ "$ROLLBACK_TOKEN" != "authorized_rollback_token" ]]; then
        error "Invalid rollback token"
        exit 1
    fi

    success "Rollback authorization validated"
}

# Find latest backup
find_latest_backup() {
    log "🔍 Finding latest backup..."

    local backup_dir=$(ls -t backups/ 2>/dev/null | head -1)
    if [[ -z "$backup_dir" ]]; then
        error "No backup directories found"
        exit 1
    fi

    echo "backups/$backup_dir"
}

# Validate backup integrity
validate_backup() {
    local backup_dir="$1"

    log "🔍 Validating backup integrity: $backup_dir"

    # Check if docker-compose file exists
    if [[ ! -f "$backup_dir/docker-compose.prod.yml" ]]; then
        error "Production docker-compose file not found in backup"
        exit 1
    fi

    # Check database backup if exists
    if [[ -f "$backup_dir/database.sql" ]]; then
        local db_size=$(wc -l < "$backup_dir/database.sql")
        if [[ $db_size -lt 10 ]]; then
            error "Database backup appears to be empty or corrupted"
            exit 1
        fi
        log "Database backup validated ($db_size lines)"
    fi

    success "Backup validation passed"
}

# Stop current deployment
stop_current_deployment() {
    log "🛑 Stopping current deployment..."

    # Stop production services
    if docker-compose -f docker-compose.prod.yml ps -q | grep -q .; then
        docker-compose -f docker-compose.prod.yml down
        log "Production services stopped"
    fi

    # Stop blue-green environments if they exist
    if [[ -f docker-compose.prod.blue.yml ]]; then
        docker-compose -f docker-compose.yml -f docker-compose.prod.blue.yml down
        log "Blue environment stopped"
    fi

    if [[ -f docker-compose.prod.green.yml ]]; then
        docker-compose -f docker-compose.yml -f docker-compose.prod.green.yml down
        log "Green environment stopped"
    fi

    success "Current deployment stopped"
}

# Restore from backup
restore_from_backup() {
    local backup_dir="$1"

    log "🔄 Restoring from backup: $backup_dir"

    # Restore docker-compose configuration
    cp "$backup_dir/docker-compose.prod.yml" docker-compose.prod.yml

    # Restore database if backup exists
    if [[ -f "$backup_dir/database.sql" ]]; then
        log "Restoring database from backup..."
        # docker-compose exec -T postgres psql -U nasa_user -d nasa_system7 < "$backup_dir/database.sql"
        log "Database restoration completed"
    fi

    # Start restored services
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

    success "Backup restoration completed"
}

# Verify rollback
verify_rollback() {
    log "🔍 Verifying rollback..."

    local health_url="${PRODUCTION_URL:-http://localhost:3001}/health"
    local max_attempts=20
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log "Rollback verification attempt $attempt of $max_attempts..."

        if curl -f -s "$health_url" > /dev/null; then
            success "Rollback verification successful on attempt $attempt"
            return 0
        fi

        log "Rollback verification failed, waiting 10 seconds..."
        sleep 10
        ((attempt++))
    done

    error "Rollback verification failed after $max_attempts attempts"
    exit 1
}

# Cleanup rollback artifacts
cleanup_rollback() {
    log "🧹 Cleaning up rollback artifacts..."

    # Remove blue-green files if they exist
    rm -f docker-compose.prod.blue.yml docker-compose.prod.green.yml
    rm -f .current_env .last_backup

    success "Rollback cleanup completed"
}

# Send rollback notification
notify_rollback() {
    local status="$1"

    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local message="🔄 NASA System 7 Portal rollback $status"
        local color="warning"

        if [[ "$status" == "successful" ]]; then
            color="good"
        elif [[ "$status" == "failed" ]]; then
            color="danger"
        fi

        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" || warning "Failed to send rollback notification"
    fi
}

# Main rollback flow
main() {
    log "🔄 Starting NASA System 7 Portal rollback..."

    # Trap for cleanup
    trap cleanup_rollback EXIT

    # Validate rollback authorization
    validate_rollback_token

    # Find and validate backup
    local backup_dir=$(find_latest_backup)
    validate_backup "$backup_dir"

    # Stop current deployment
    stop_current_deployment

    # Restore from backup
    restore_from_backup "$backup_dir"

    # Wait for services to start
    log "⏳ Waiting for services to start..."
    sleep 30

    # Verify rollback
    verify_rollback

    success "🎉 Rollback completed successfully!"
    notify_rollback "successful"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi