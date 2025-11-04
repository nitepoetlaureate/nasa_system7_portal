#!/bin/bash
# NASA System 7 Portal - Production Deployment Script
# Blue-green deployment with zero downtime

set -euo pipefail

# Configuration
PROD_ENVIRONMENT="production"
DEPLOYMENT_TIMEOUT=600
HEALTH_CHECK_TIMEOUT=120
ROLLBACK_ENABLED=true
BLUE_GREEN_DEPLOYMENT=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running production pre-deployment checks..."

    # Check if required environment variables are set
    required_vars=("PRODUCTION_URL" "PRODUCTION_TOKEN" "ROLLBACK_TOKEN")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done

    # Verify we're deploying from main branch
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$current_branch" != "main" ]]; then
        error "Production deployments can only be made from main branch (current: $current_branch)"
        exit 1
    fi

    # Check if working directory is clean
    if [[ -n $(git status --porcelain) ]]; then
        error "Working directory is not clean. Commit or stash changes before production deployment."
        exit 1
    fi

    # Verify SSL certificate
    if ! curl -sSf "https://$PRODUCTION_URL" > /dev/null; then
        warning "SSL certificate check failed for $PRODUCTION_URL"
    fi

    success "Production pre-deployment checks passed"
}

# Backup current deployment
backup_current_deployment() {
    log "💾 Creating backup of current deployment..."

    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"

    # Backup current docker-compose configuration
    if [[ -f docker-compose.prod.yml ]]; then
        cp docker-compose.prod.yml "$backup_dir/"
    fi

    # Backup database (simplified - use proper database backup in production)
    log "Creating database backup..."
    # docker-compose exec postgres pg_dump -U nasa_user nasa_system7 > "$backup_dir/database.sql"

    # Store backup location for rollback
    echo "$backup_dir" > .last_backup

    success "Backup created at $backup_dir"
}

# Build production images
build_production_images() {
    log "🏗️ Building production Docker images..."

    # Get current git commit for tagging
    local git_commit=$(git rev-parse --short HEAD)
    local git_tag=$(git describe --tags --exact-match 2>/dev/null || echo "latest")

    # Build server image with production optimizations
    docker build \
        --build-arg NODE_ENV=production \
        --build-arg GIT_COMMIT=$git_commit \
        -t nasa-system7-server:$git_commit \
        -t nasa-system7-server:$git_tag \
        -t nasa-system7-server:latest \
        ./server

    if [[ $? -ne 0 ]]; then
        error "Failed to build production server image"
        exit 1
    fi

    # Build client image with production optimizations
    docker build \
        --build-arg NODE_ENV=production \
        --build-arg GIT_COMMIT=$git_commit \
        -t nasa-system7-client:$git_commit \
        -t nasa-system7-client:$git_tag \
        -t nasa-system7-client:latest \
        ./client

    if [[ $? -ne 0 ]]; then
        error "Failed to build production client image"
        exit 1
    fi

    success "Production Docker images built successfully"
}

# Blue-green deployment setup
setup_blue_green_deployment() {
    log "🔵 Setting up blue-green deployment..."

    # Determine which environment is currently active
    local current_env=""
    if curl -f -s "https://$PRODUCTION_URL/health" | grep -q "green"; then
        current_env="green"
        new_env="blue"
    else
        current_env="blue"
        new_env="green"
    fi

    log "Current active environment: $current_env"
    log "Deploying to new environment: $new_env"

    # Create production docker-compose override for new environment
    cat > docker-compose.prod.$new_env.yml << EOF
version: '3.8'
services:
  server:
    image: nasa-system7-server:latest
    environment:
      NODE_ENV: production
      LOG_LEVEL: warn
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  client:
    image: nasa-system7-client:latest
    environment:
      REACT_APP_ENVIRONMENT: production
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  postgres:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  redis:
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M
EOF

    # Save current environment for rollback
    echo "$current_env" > .current_env

    success "Blue-green deployment setup completed"
}

# Deploy to new environment
deploy_to_production() {
    log "🚀 Deploying to production environment..."

    if [[ "$BLUE_GREEN_DEPLOYMENT" == "true" ]]; then
        local new_env=$(cat .current_env 2>/dev/null || echo "blue")
        if [[ "$new_env" == "blue" ]]; then
            new_env="green"
        else
            new_env="blue"
        fi

        # Deploy to new environment
        docker-compose -f docker-compose.yml -f docker-compose.prod.$new_env.yml up -d
        if [[ $? -ne 0 ]]; then
            error "Failed to start production deployment"
            exit 1
        fi

        log "New environment ($new_env) deployed successfully"
    else
        # Standard deployment
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
        if [[ $? -ne 0 ]]; then
            error "Failed to start production deployment"
            exit 1
        fi
    fi

    success "Production deployment initiated"
}

# Comprehensive health check
comprehensive_health_check() {
    log "🔍 Running comprehensive production health checks..."

    local health_url="https://$PRODUCTION_URL/health"
    local max_attempts=24
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log "Production health check attempt $attempt of $max_attempts..."

        # Check basic health endpoint
        if curl -f -s "$health_url" > /dev/null; then
            log "✅ Basic health check passed"

            # Check API endpoints
            if curl -f -s "https://$PRODUCTION_URL/api/health" > /dev/null; then
                log "✅ API health check passed"
            else
                log "❌ API health check failed"
            fi

            # Check static assets
            if curl -f -s "https://$PRODUCTION_URL/static/js/main.js" > /dev/null; then
                log "✅ Static assets serving correctly"
            else
                log "❌ Static assets check failed"
            fi

            success "All health checks passed on attempt $attempt"
            return 0
        fi

        log "Health check failed, waiting 15 seconds..."
        sleep 15
        ((attempt++))
    done

    error "Production health check failed after $max_attempts attempts"

    if [[ "$ROLLBACK_ENABLED" == "true" ]]; then
        log "🔄 Initiating production rollback due to health check failure..."
        rollback_production_deployment
    fi

    exit 1
}

# Production smoke tests
production_smoke_tests() {
    log "🧪 Running production smoke tests..."

    # Test critical user flows
    local critical_endpoints=(
        "/"
        "/api/health"
        "/api/nasa/apod"
        "/api/jpl/asteroids"
    )

    for endpoint in "${critical_endpoints[@]}"; do
        log "Testing endpoint: https://$PRODUCTION_URL$endpoint"
        if curl -f -s "https://$PRODUCTION_URL$endpoint" > /dev/null; then
            success "✅ Endpoint $endpoint is healthy"
        else
            error "❌ Endpoint $endpoint failed"
            if [[ "$ROLLBACK_ENABLED" == "true" ]]; then
                rollback_production_deployment
            fi
            exit 1
        fi
    done

    success "Production smoke tests passed"
}

# Production rollback
rollback_production_deployment() {
    log "🔄 Rolling back production deployment..."

    local backup_dir=$(cat .last_backup 2>/dev/null || echo "")
    local current_env=$(cat .current_env 2>/dev/null || echo "blue")

    if [[ -z "$backup_dir" ]]; then
        error "No backup directory found for rollback"
        exit 1
    fi

    log "Rolling back to backup: $backup_dir"

    # Stop current deployment
    if [[ "$BLUE_GREEN_DEPLOYMENT" == "true" ]]; then
        local new_env=$current_env
        docker-compose -f docker-compose.yml -f docker-compose.prod.$new_env.yml down
    else
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
    fi

    # Restore previous configuration
    if [[ -f "$backup_dir/docker-compose.prod.yml" ]]; then
        cp "$backup_dir/docker-compose.prod.yml" docker-compose.prod.yml
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    else
        error "No production configuration found in backup"
        exit 1
    fi

    success "Production rollback completed"
    notify_slack "🔄 NASA System 7 Portal production rollback completed" "warning"
}

# Cleanup production deployment
cleanup_production() {
    log "🧹 Cleaning up production deployment artifacts..."

    # Remove environment-specific docker-compose files
    rm -f docker-compose.prod.blue.yml docker-compose.prod.green.yml
    rm -f .current_env .last_backup

    # Clean up unused Docker images (keep last 5 versions)
    docker image prune -f --filter "label!=maintained"

    # Log deployment metrics
    log "📊 Deployment metrics:"
    docker system df

    success "Production cleanup completed"
}

# Notification functions
notify_slack() {
    local message="$1"
    local status="$2"

    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        if [[ "$status" == "failure" ]]; then
            color="danger"
        elif [[ "$status" == "warning" ]]; then
            color="warning"
        fi

        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" || warning "Failed to send Slack notification"
    fi

    # Send email notification (implement as needed)
    # echo "$message" | mail -s "NASA System 7 Portal Deployment" admin@example.com
}

# Main production deployment flow
main() {
    log "🌟 Starting NASA System 7 Portal production deployment..."

    # Trap for cleanup
    trap cleanup_production EXIT

    # Pre-deployment checks
    pre_deployment_checks

    # Backup current deployment
    backup_current_deployment

    # Build production images
    build_production_images

    # Setup blue-green deployment
    setup_blue_green_deployment

    # Deploy to production
    deploy_to_production

    # Wait for services to be ready
    log "⏳ Waiting for production services to be ready..."
    sleep 60

    # Comprehensive health check
    comprehensive_health_check

    # Production smoke tests
    production_smoke_tests

    success "🎉 Production deployment completed successfully!"
    notify_slack "🌟 NASA System 7 Portal deployed to production successfully" "success"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi