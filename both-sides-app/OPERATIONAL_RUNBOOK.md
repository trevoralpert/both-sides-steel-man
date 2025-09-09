# 📚 Operational Runbook - Both Sides Platform

**Version**: 1.0  
**Last Updated**: December 2024  
**Owner**: Platform Engineering Team  
**Emergency Contact**: +1-XXX-XXX-XXXX

---

## 🚨 Emergency Procedures

### **Immediate Response (P0 - Critical)**

**If the platform is completely down or experiencing critical issues:**

1. **Alert the On-Call Engineer**
   - Slack: `@oncall-engineer` in `#incidents`
   - Phone: +1-XXX-XXX-XXXX (24/7 hotline)
   - PagerDuty: Automatic escalation after 5 minutes

2. **Create Incident**
   ```bash
   # Create incident in Slack
   /incident create "Platform Down - [Brief Description]"
   
   # Or via API
   curl -X POST https://api.bothsides.app/incidents \
     -H "Authorization: Bearer $INCIDENT_TOKEN" \
     -d '{"title":"Platform Down","severity":"critical"}'
   ```

3. **Initial Assessment (< 5 minutes)**
   - Check status page: https://status.bothsides.app
   - Review monitoring dashboards
   - Verify external service status

4. **Communication**
   - Update status page immediately
   - Notify stakeholders via pre-configured channels
   - Post updates every 15 minutes until resolved

### **Quick Health Checks**

```bash
# Frontend Health
curl -f https://bothsides.app/api/health

# Backend Health  
curl -f https://api.bothsides.app/api/health

# Database Connectivity
curl -f https://api.bothsides.app/api/health/database

# Cache Status
curl -f https://api.bothsides.app/api/health/cache
```

---

## 🏗️ System Architecture Overview

### **Service Map**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Users/CDN     │    │   Monitoring    │    │   External      │
│   (Vercel)      │    │   (Custom)      │    │   Services      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Alerting      │    │   OpenAI API    │
│   (Next.js)     │◄──►│   (Multi-ch)    │    │   Clerk Auth    │
└─────────┬───────┘    └─────────────────┘    │   Ably RT       │
          │                                   │   TimeBack      │
          ▼                                   └─────────────────┘
┌─────────────────┐    ┌─────────────────┐
│   Backend API   │◄──►│   Cache Layer   │
│   (NestJS)      │    │   (Redis)       │
└─────────┬───────┘    └─────────────────┘
          │
          ▼
┌─────────────────┐
│   Database      │
│   (PostgreSQL)  │
└─────────────────┘
```

### **Critical Dependencies**
- **Frontend**: Vercel Edge Network, Next.js Runtime
- **Backend**: Railway Infrastructure, NestJS Application
- **Database**: Neon PostgreSQL, Connection Pooling
- **Cache**: Upstash Redis, Session Storage
- **Auth**: Clerk Authentication Service
- **AI**: OpenAI GPT-4 API
- **Realtime**: Ably WebSocket Service

---

## 📊 Monitoring & Alerting

### **Key Metrics to Monitor**

| Metric | Normal Range | Warning Threshold | Critical Threshold |
|--------|--------------|-------------------|-------------------|
| **Response Time** | <500ms | >1s | >2s |
| **Error Rate** | <1% | >5% | >10% |
| **CPU Usage** | <70% | >80% | >90% |
| **Memory Usage** | <80% | >85% | >95% |
| **Database Connections** | <50 | >80 | >95 |
| **Cache Hit Rate** | >90% | <80% | <70% |

### **Dashboard URLs**
- **Executive Dashboard**: https://dashboards.bothsides.app/executive
- **Technical Dashboard**: https://dashboards.bothsides.app/technical  
- **Security Dashboard**: https://dashboards.bothsides.app/security
- **Business Metrics**: https://dashboards.bothsides.app/business

### **Alert Channels**
- **Slack**: `#alerts` (all alerts), `#critical` (P0/P1 only)
- **Email**: alerts@bothsides.app
- **PagerDuty**: Critical incidents only
- **SMS**: On-call engineer for P0 incidents

---

## 🔧 Common Operations

### **Deployment Operations**

#### **Standard Deployment**
```bash
# Trigger deployment via GitHub Actions
git push origin main

# Monitor deployment
gh workflow view "CI/CD Pipeline" --web

# Verify deployment
curl -f https://bothsides.app/api/health
```

#### **Rollback Procedure**
```bash
# Automatic rollback (if health checks fail)
# Manual rollback via Vercel CLI
vercel rollback --token $VERCEL_TOKEN

# Manual rollback via Railway CLI  
railway rollback --service bothsides-backend

# Verify rollback
curl -f https://bothsides.app/api/health
```

#### **Database Migrations**
```bash
# Run migrations
yarn prisma migrate deploy

# Verify migration status
yarn prisma migrate status

# Rollback migration (if needed)
yarn prisma migrate reset --force
```

### **Cache Operations**

#### **Cache Management**
```bash
# Clear all cache
redis-cli -u $REDIS_URL FLUSHALL

# Clear specific cache pattern
redis-cli -u $REDIS_URL --scan --pattern "user:*" | xargs redis-cli -u $REDIS_URL DEL

# Check cache stats
redis-cli -u $REDIS_URL INFO memory
```

#### **Cache Warming**
```bash
# Warm critical caches
curl -X POST https://api.bothsides.app/cache/warm \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Warm specific cache
curl -X POST https://api.bothsides.app/cache/warm/debates \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### **Database Operations**

#### **Database Health**
```bash
# Check connection status
psql $DATABASE_URL -c "SELECT 1;"

# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('bothsides_prod'));"
```

#### **Performance Monitoring**
```bash
# Check slow queries
psql $DATABASE_URL -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Check table sizes
psql $DATABASE_URL -c "
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;"
```

---

## 🚨 Incident Response Procedures

### **Incident Classification**

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **P0 - Critical** | Complete service outage | <5 minutes | Platform down, data breach |
| **P1 - High** | Major functionality impacted | <15 minutes | Login failures, payment issues |
| **P2 - Medium** | Minor functionality impacted | <1 hour | Feature degradation, slow performance |
| **P3 - Low** | Cosmetic or minor issues | <4 hours | UI bugs, minor feature issues |

### **Incident Response Steps**

#### **1. Detection & Initial Response**
```bash
# Check if incident is already known
curl -s https://api.bothsides.app/incidents/active

# Create new incident
curl -X POST https://api.bothsides.app/incidents \
  -H "Authorization: Bearer $INCIDENT_TOKEN" \
  -d '{
    "title": "Brief description",
    "severity": "critical|high|medium|low",
    "description": "Detailed description",
    "affectedServices": ["frontend", "backend", "database"]
  }'
```

#### **2. Assessment & Triage**
- Determine scope and impact
- Identify affected users/services
- Estimate business impact
- Assign incident commander

#### **3. Investigation & Resolution**
```bash
# Check recent deployments
gh api repos/both-sides/platform/deployments \
  --jq '.[] | select(.created_at > "2024-12-01") | {id, sha, environment, created_at}'

# Check error logs
kubectl logs -f deployment/bothsides-backend --tail=100

# Check database performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

#### **4. Communication**
- Update status page every 15 minutes
- Notify stakeholders via Slack/email
- Provide ETA for resolution
- Post resolution confirmation

#### **5. Post-Incident**
- Conduct post-mortem within 48 hours
- Document lessons learned
- Create action items for prevention
- Update runbooks and procedures

---

## 🔒 Security Procedures

### **Security Incident Response**

#### **Suspected Security Breach**
1. **Immediate Actions**
   - Isolate affected systems
   - Preserve evidence
   - Contact security team
   - Notify legal counsel

2. **Investigation**
   ```bash
   # Check authentication logs
   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://api.bothsides.app/audit/auth-events?hours=24

   # Check access patterns
   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://api.bothsides.app/audit/access-patterns?suspicious=true
   ```

3. **Containment**
   - Revoke compromised credentials
   - Block suspicious IP addresses
   - Implement additional monitoring

#### **Security Monitoring**
```bash
# Check failed login attempts
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.bothsides.app/security/failed-logins?hours=1

# Check privilege escalations
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.bothsides.app/security/privilege-changes?hours=24

# Check data access patterns
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.bothsides.app/security/data-access?anomalies=true
```

### **Compliance Procedures**

#### **FERPA Compliance Checks**
```bash
# Verify student data access
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.bothsides.app/compliance/ferpa/access-log

# Check consent status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.bothsides.app/compliance/ferpa/consent-status

# Generate compliance report
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.bothsides.app/compliance/ferpa/report
```

---

## 📈 Performance Optimization

### **Performance Monitoring**

#### **Frontend Performance**
```bash
# Lighthouse audit
npx lighthouse https://bothsides.app --output=json --quiet

# Core Web Vitals
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://bothsides.app&category=performance"
```

#### **Backend Performance**
```bash
# API response times
curl -w "@curl-format.txt" -s -o /dev/null https://api.bothsides.app/api/health

# Database query performance
psql $DATABASE_URL -c "
SELECT query, total_time, mean_time, calls, rows
FROM pg_stat_statements
WHERE calls > 100
ORDER BY total_time DESC
LIMIT 10;"
```

### **Scaling Operations**

#### **Auto-Scaling Configuration**
```bash
# Check current scaling metrics
curl -H "Authorization: Bearer $RAILWAY_TOKEN" \
  https://backboard.railway.app/graphql/v2 \
  -d '{"query": "{ project(id: \"PROJECT_ID\") { services { nodes { name replicas } } } }"}'

# Manual scaling (if needed)
railway scale --replicas 3 --service bothsides-backend
```

#### **Cache Scaling**
```bash
# Check Redis memory usage
redis-cli -u $REDIS_URL INFO memory | grep used_memory_human

# Scale Redis instance (via Upstash dashboard)
# https://console.upstash.com/redis/PROJECT_ID
```

---

## 🛠️ Maintenance Procedures

### **Scheduled Maintenance**

#### **Weekly Maintenance (Sundays 2-4 AM UTC)**
```bash
# 1. Database maintenance
psql $DATABASE_URL -c "VACUUM ANALYZE;"
psql $DATABASE_URL -c "REINDEX DATABASE bothsides_prod;"

# 2. Cache cleanup
redis-cli -u $REDIS_URL --scan --pattern "temp:*" | xargs redis-cli -u $REDIS_URL DEL

# 3. Log rotation
curl -X POST https://api.bothsides.app/admin/logs/rotate \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 4. Security updates
yarn audit --audit-level moderate
yarn upgrade --latest

# 5. Backup verification
curl -X POST https://api.bothsides.app/admin/backups/verify \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### **Monthly Maintenance (First Sunday)**
```bash
# 1. Certificate renewal check
curl -s https://bothsides.app | openssl s_client -connect bothsides.app:443 -servername bothsides.app 2>/dev/null | openssl x509 -noout -dates

# 2. Dependency updates
yarn upgrade-interactive --latest

# 3. Performance review
yarn load-test

# 4. Security audit
yarn security:full

# 5. Compliance review
curl -X POST https://api.bothsides.app/compliance/monthly-review \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### **Backup Procedures**

#### **Database Backups**
```bash
# Manual backup
pg_dump $DATABASE_URL | gzip > "backup_$(date +%Y%m%d_%H%M%S).sql.gz"

# Verify backup
gunzip -c backup_*.sql.gz | head -20

# Restore from backup (DANGER - Production)
# gunzip -c backup_YYYYMMDD_HHMMSS.sql.gz | psql $DATABASE_URL
```

#### **Configuration Backups**
```bash
# Backup environment variables
env | grep -E "(DATABASE_URL|REDIS_URL|CLERK_|OPENAI_)" > env_backup_$(date +%Y%m%d).txt

# Backup deployment configurations
cp vercel.json "vercel_backup_$(date +%Y%m%d).json"
cp railway.json "railway_backup_$(date +%Y%m%d).json"
```

---

## 📞 Contact Information

### **Emergency Contacts**

| Role | Name | Phone | Email | Slack |
|------|------|-------|-------|-------|
| **On-Call Engineer** | Rotation | +1-XXX-XXX-XXXX | oncall@bothsides.app | @oncall-engineer |
| **Platform Lead** | [Name] | +1-XXX-XXX-XXXX | platform@bothsides.app | @platform-lead |
| **Security Officer** | [Name] | +1-XXX-XXX-XXXX | security@bothsides.app | @security-officer |
| **Legal Counsel** | [Name] | +1-XXX-XXX-XXXX | legal@bothsides.app | @legal-counsel |

### **Service Providers**

| Service | Support Contact | Status Page |
|---------|----------------|-------------|
| **Vercel** | support@vercel.com | https://www.vercel-status.com |
| **Railway** | team@railway.app | https://status.railway.app |
| **Neon** | support@neon.tech | https://status.neon.tech |
| **Upstash** | support@upstash.com | https://status.upstash.com |
| **Clerk** | support@clerk.dev | https://status.clerk.com |
| **OpenAI** | support@openai.com | https://status.openai.com |

### **Escalation Matrix**

| Incident Severity | Initial Response | Escalation (15 min) | Escalation (30 min) |
|------------------|------------------|-------------------|-------------------|
| **P0 - Critical** | On-Call Engineer | Platform Lead | CTO + CEO |
| **P1 - High** | On-Call Engineer | Platform Lead | Engineering Manager |
| **P2 - Medium** | On-Call Engineer | Platform Lead | - |
| **P3 - Low** | On-Call Engineer | - | - |

---

## 📚 Additional Resources

### **Documentation Links**
- **Architecture Documentation**: https://docs.bothsides.app/architecture
- **API Documentation**: https://api.bothsides.app/docs
- **Security Policies**: https://docs.bothsides.app/security
- **Compliance Documentation**: https://docs.bothsides.app/compliance

### **Tools & Dashboards**
- **Monitoring**: https://dashboards.bothsides.app
- **Incident Management**: https://incidents.bothsides.app
- **Status Page**: https://status.bothsides.app
- **Admin Panel**: https://admin.bothsides.app

### **Runbook Updates**
This runbook should be updated:
- After each incident (lessons learned)
- Monthly during maintenance windows
- When new services are added
- When procedures change

**Last Updated**: December 2024  
**Next Review**: January 2025  
**Version**: 1.0
