# NASA System 7 Portal - Deployment Runbook

## 🚀 Overview

This runbook provides comprehensive guidance for deploying the NASA System 7 Portal across different environments with automated quality gates, security scanning, and rollback procedures.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Process](#deployment-process)
4. [Monitoring & Health Checks](#monitoring--health-checks)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting](#troubleshooting)
7. [Security Considerations](#security-considerations)

## 🔧 Prerequisites

### Required Tools
- Docker & Docker Compose
- Node.js 18+
- Git
- Access to container registry (GitHub Container Registry)
- SSL certificates for production

### Required Secrets
Configure these secrets in your GitHub repository settings:

```bash
# Application Secrets
NASA_API_KEY=your_nasa_api_key
JPL_API_KEY=your_jpl_api_key
JWT_SECRET=your_jwt_secret_minimum_32_characters
SESSION_SECRET=your_session_secret_key

# Database Secrets
DB_PASSWORD=your_secure_database_password
REDIS_PASSWORD=your_secure_redis_password

# Deployment Secrets
STAGING_URL=https://staging.nasa-system7.example.com
STAGING_TOKEN=your_staging_deployment_token
PRODUCTION_URL=https://nasa-system7.example.com
PRODUCTION_TOKEN=your_production_deployment_token
ROLLBACK_TOKEN=authorized_rollback_token

# Monitoring Secrets
SLACK_WEBHOOK_URL=your_slack_webhook_url
GRAFANA_PASSWORD=your_grafana_admin_password
SENTRY_DSN=your_sentry_dsn
SNIK_TOKEN=your_snyk_token
```

## 🌍 Environment Configuration

### Development Environment
```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop environment
docker-compose down
```

### Staging Environment
```bash
# Deploy to staging
./scripts/deployment/deploy-staging.sh

# Check staging health
curl https://staging.nasa-system7.example.com/health
```

### Production Environment
```bash
# Deploy to production (only from main branch)
./scripts/deployment/deploy-production.sh

# Check production health
curl https://nasa-system7.example.com/health
```

## 🚀 Deployment Process

### Automated CI/CD Pipeline

The pipeline automatically triggers on:
- Push to `main`, `develop`, or feature branches
- Pull requests to `main` or `develop`
- Release creation

### Pipeline Stages

1. **Code Quality & Security**
   - Linting and formatting checks
   - Security vulnerability scanning
   - Unit test execution (80%+ coverage required)
   - Code quality gates enforcement

2. **Integration Testing**
   - API integration tests
   - Database integration tests
   - Service interaction validation

3. **End-to-End Testing**
   - Full user workflow validation
   - Critical path testing
   - UI component testing

4. **Build & Package**
   - Docker image creation
   - Security scanning of images
   - Artifact packaging

5. **Performance Testing**
   - Lighthouse performance audit
   - Bundle size validation
   - Performance budget enforcement

6. **Deployment**
   - Automated deployment to staging (develop branch)
   - Blue-green deployment to production (releases)
   - Health check validation
   - Rollback on failure

### Manual Deployment

For emergency deployments or maintenance:

```bash
# Emergency staging deployment
./scripts/deployment/deploy-staging.sh

# Emergency production deployment (with caution)
./scripts/deployment/deploy-production.sh
```

## 🏥 Monitoring & Health Checks

### Health Check Endpoints

- **Server Health**: `GET /health`
- **API Health**: `GET /api/health`
- **Database Health**: Included in server health response
- **Cache Health**: Included in server health response

### Monitoring Stack

- **Prometheus**: Metrics collection (http://localhost:9090)
- **Grafana**: Visualization and dashboards (http://localhost:3002)
- **AlertManager**: Alert routing and notification

### Key Metrics to Monitor

1. **Application Metrics**
   - Request rate and response times
   - Error rates and status codes
   - Active user sessions
   - API response times

2. **Infrastructure Metrics**
   - CPU and memory usage
   - Disk space and I/O
   - Network latency and throughput
   - Container resource usage

3. **Business Metrics**
   - NASA API call success rates
   - JPL API response times
   - User engagement metrics
   - Data freshness indicators

## 🔄 Rollback Procedures

### Automatic Rollback

The pipeline automatically rolls back if:
- Health checks fail
- Performance thresholds are exceeded
- Critical user flows are broken

### Manual Rollback

For emergency rollbacks:

```bash
# Quick rollback to last known good state
./scripts/deployment/rollback.sh

# Verify rollback success
curl https://nasa-system7.example.com/health
```

### Rollback Verification Steps

1. **Health Check Validation**
   ```bash
   curl -f https://nasa-system7.example.com/health
   ```

2. **Critical Endpoint Testing**
   ```bash
   curl -f https://nasa-system7.example.com/api/health
   curl -f https://nasa-system7.example.com/
   ```

3. **Database Connectivity**
   ```bash
   docker-compose exec postgres pg_isready
   ```

4. **Cache Connectivity**
   ```bash
   docker-compose exec redis redis-cli ping
   ```

## 🔧 Troubleshooting

### Common Issues

#### Deployment Fails to Start
```bash
# Check container logs
docker-compose logs server
docker-compose logs client

# Check resource usage
docker stats

# Restart services
docker-compose restart
```

#### Health Check Failures
```bash
# Check service status
docker-compose ps

# Debug health endpoint
curl -v http://localhost:3001/health

# Check database connectivity
docker-compose exec server npm run db:check
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Analyze bundle size
cd client && npm run analyze

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/health
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl s_client -connect nasa-system7.example.com:443 -servername nasa-system7.example.com

# Test SSL configuration
curl -I https://nasa-system7.example.com
```

### Emergency Procedures

#### Complete Service Outage
1. **Assess Impact**
   ```bash
   # Check all services
   docker-compose ps

   # Check recent deployments
   git log --oneline -10
   ```

2. **Immediate Rollback**
   ```bash
   ./scripts/deployment/rollback.sh
   ```

3. **Verify Recovery**
   ```bash
   # Health checks
   curl -f https://nasa-system7.example.com/health

   # User testing
   # Test critical user flows manually
   ```

4. **Communicate**
   - Notify team via Slack
   - Update status page if public
   - Document incident

#### Database Issues
```bash
# Check database status
docker-compose exec postgres pg_isready

# Check database connections
docker-compose exec server npm run db:check

# Database recovery (last resort)
docker-compose exec postgres pg_dump -U nasa_user nasa_system7 > backup.sql
```

#### Cache Issues
```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# Clear cache if needed
docker-compose exec redis redis-cli FLUSHALL

# Restart cache service
docker-compose restart redis
```

## 🔒 Security Considerations

### Security Checklist

- [ ] All secrets are properly configured
- [ ] SSL certificates are valid and renewed
- [ ] Security scans pass
- [ ] API keys are rotated regularly
- [ ] Database access is restricted
- [ ] Firewall rules are configured
- [ ] Backup encryption is enabled
- [ ] Audit logging is enabled

### Security Monitoring

Monitor these security events:
- Failed authentication attempts
- Unusual API usage patterns
- SQL injection attempts
- Cross-site scripting attempts
- Resource exhaustion attacks

### Incident Response

For security incidents:
1. **Contain**: Isolate affected systems
2. **Assess**: Determine impact and scope
3. **Eradicate**: Remove threats and vulnerabilities
4. **Recover**: Restore secure operations
5. **Learn**: Document and improve procedures

## 📞 Support Contacts

### Primary Contacts
- **DevOps Lead**: [Contact Information]
- **Security Team**: [Contact Information]
- **Development Team**: [Contact Information]

### Escalation Path
1. **Level 1**: Development team
2. **Level 2**: DevOps lead
3. **Level 3**: Security team
4. **Level 4**: Management

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [NASA API Documentation](https://api.nasa.gov/)
- [JPL API Documentation](https://ssd-api.jpl.nasa.gov/)

## 📝 Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-11-04 | 1.0.0 | Initial deployment runbook | CI/CD Pipeline Team |

---

> 🚀 **NASA System 7 Portal** - Bringing the cosmos to your desktop with enterprise-grade reliability and security.