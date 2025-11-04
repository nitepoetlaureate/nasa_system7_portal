#!/bin/bash
# NASA System 7 Portal - Staging Deployment Script
# Automated deployment to staging environment with health checks

set -euo pipefail

# Configuration
STAGING_ENVIRONMENT="staging"
DEPLOYMENT_TIMEOUT=300
HEALTH_CHECK_TIMEOUT=60
ROLLBACK_ENABLED=true

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
    log "🔍 Running pre-deployment checks..."

    # Check if required environment variables are set
    required_vars=("STAGING_URL" "STAGING_TOKEN")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        error "Docker is not available"
        exit 1
    fi

    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not available"
        exit 1
    fi

    success "Pre-deployment checks passed"
}

# Build and tag images
build_images() {
    log "🏗️ Building Docker images..."

    # Build server image
    docker build -t nasa-system7-server:staging ./server
    if [[ $? -ne 0 ]]; then
        error "Failed to build server image"
        exit 1
    fi

    # Build client image
    docker build -t nasa-system7-client:staging ./client
    if [[ $? -ne 0 ]]; then
        error "Failed to build client image"
        exit 1
    fi

    success "Docker images built successfully"
}

# Deploy to staging
deploy_staging() {
    log "🚀 Deploying to staging environment..."

    # Create staging docker-compose override
    cat > docker-compose.staging.yml << EOF
version: '3.8'
services:
  server:
    image: nasa-system7-server:staging
    environment:
      NODE_ENV: staging
      LOG_LEVEL: info
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  client:
    image: nasa-system7-client:staging
    environment:
      REACT_APP_ENVIRONMENT: staging
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.3'
          memory: 256M
        reservations:
          cpus: '0.15'
          memory: 128M
EOF

    # Deploy with staging configuration
    docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
    if [[ $? -ne 0 ]]; then
        error "Failed to start staging deployment"
        exit 1
    fi

    success "Staging deployment initiated"
}

# Health check
health_check() {
    log "🔍 Performing health checks..."

    local health_url="${STAGING_URL}/health"
    local max_attempts=12
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt of $max_attempts..."

        if curl -f -s "$health_url" > /dev/null; then
            success "Health check passed on attempt $attempt"
            return 0
        fi

        log "Health check failed, waiting 10 seconds..."
        sleep 10
        ((attempt++))
    done

    error "Health check failed after $max_attempts attempts"

    if [[ "$ROLLBACK_ENABLED" == "true" ]]; then
        log "🔄 Initiating rollback due to health check failure..."
        rollback_deployment
    fi

    exit 1
}

# Integration tests
integration_tests() {
    log "🧪 Running integration tests against staging..."

    # Run API tests
    if command -v newman &> /dev/null; then
        newman run tests/api/nasa-system7-api.postman_collection.json \
            --environment tests/api/staging.postman_environment.json \
            --reporters cli,junit \
            --reporter-junit-export test-results.xml
    else
        warning "Newman not available, skipping API integration tests"
    fi

    success "Integration tests completed"
}

# Rollback function
rollback_deployment() {
    log "🔄 Rolling back deployment..."

    # Stop current deployment
    docker-compose -f docker-compose.yml -f docker-compose.staging.yml down

    # Restore previous deployment (simplified - in production, use proper versioning)
    docker-compose up -d

    success "Rollback completed"
}

# Cleanup
cleanup() {
    log "🧹 Cleaning up deployment artifacts..."

    # Remove staging docker-compose file
    rm -f docker-compose.staging.yml

    # Clean up unused Docker images
    docker image prune -f

    success "Cleanup completed"
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
}

# Main deployment flow
main() {
    log "🚀 Starting NASA System 7 Portal staging deployment..."

    # Trap for cleanup
    trap cleanup EXIT

    # Pre-deployment checks
    pre_deployment_checks

    # Build images
    build_images

    # Deploy
    deploy_staging

    # Wait for services to be ready
    log "⏳ Waiting for services to be ready..."
    sleep 30

    # Health check
    health_check

    # Integration tests
    integration_tests

    success "🎉 Staging deployment completed successfully!"
    notify_slack "🚀 NASA System 7 Portal deployed to staging successfully" "success"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi