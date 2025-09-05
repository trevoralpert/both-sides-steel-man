# 🧪 Phase 9 Integration Layer - Comprehensive Testing Guide

This guide provides step-by-step instructions for reviewing and testing the Phase 9 integration layer we've built.

## 📋 **Quick Checklist**

- [ ] Database schema migration
- [ ] Application startup verification
- [ ] Integration module loading
- [ ] External ID Mapping Service
- [ ] Mapping Cache Service
- [ ] REST API endpoints
- [ ] Enhanced Mock Provider
- [ ] Data Sync Engine
- [ ] Performance testing

---

## 🗄️ **1. DATABASE SCHEMA VERIFICATION**

### **Step 1.1: Apply Schema Changes**

```bash
cd both-sides-app/backend

# Generate Prisma client with new schema
npm run db:generate

# Push schema changes to database
npm run db:push

# Optional: Open Prisma Studio to inspect tables
npm run db:studio
```

### **Step 1.2: Verify New Integration Tables**

In Prisma Studio or your database client, verify these new tables exist:
- `integrations` - Core integration provider registry
- `integration_configurations` - Provider settings
- `integration_status_logs` - Health monitoring
- `external_system_mappings` - ID mapping relationships
- `integration_webhooks` - Webhook configuration
- `integration_webhook_events` - Event processing
- `integration_audit_logs` - Audit trail

### **Step 1.3: Check Extended Existing Tables**

Verify these columns were added to existing tables:
- `users`: `external_id`, `external_system_id`, `sync_status`, `last_sync_at`, `sync_version`, `sync_metadata`
- `organizations`: Same fields as users
- `classes`: Same fields as users  
- `enrollments`: Same fields as users

---

## 🚀 **2. APPLICATION STARTUP VERIFICATION**

### **Step 2.1: Start the Application**

```bash
# Start in development mode
npm run start:dev

# Watch for initialization logs:
```

Look for these initialization messages:
```
🔌 Integration Layer Module initialized
📋 Phase 9: Integration Layer & TimeBack Preparation

🎯 Available Features:
  ✅ Integration Registry - Provider lifecycle management
  ✅ Provider Factory - Dynamic provider instantiation
  ✅ Enhanced Mock Provider - Full integration simulation
  ✅ Configuration Schemas - Type-safe configuration validation
  ✅ Database Schema Extensions - Integration management tables
  ✅ External ID Mapping Service - Bidirectional entity mapping
  ✅ Mapping Cache Service - Redis-based high-performance caching
  ✅ REST API Endpoints - Complete CRUD operations for mappings

📝 Default providers registered successfully
🏭 Integration Registry Status:
   • Total Registered: 1
   • Currently Active: 0
   • Enabled Providers: mock
```

### **Step 2.2: Verify No Error Messages**

The application should start without errors. Common issues to check:
- Redis connection (for caching)
- Database connection
- Module import errors

---

## 🧪 **3. SERVICE TESTING**

### **Step 3.1: Integration Module Status**

Create a test endpoint to verify module status:

```bash
# In a new terminal, test the integration module status
curl -X GET http://localhost:3000/integrations/status
```

Or create a temporary test in your application:

```typescript
// In app.controller.ts or create a test endpoint
@Get('integration-test')
async testIntegration() {
  const integrationModule = this.moduleRef.get('INTEGRATION_MODULE_METADATA');
  return integrationModule;
}
```

### **Step 3.2: Enhanced Mock Provider Test**

Test the enhanced mock provider functionality:

```typescript
// Create a test file: src/integration/test/mock-provider.test.ts
import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationModule } from '../integration.module';
import { EnhancedMockRosterProvider } from '../providers/enhanced-mock-roster-provider';
import { MockDataGenerator } from '../../roster/testing/mock-data-generator';

describe('Enhanced Mock Provider', () => {
  let provider: EnhancedMockRosterProvider;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [IntegrationModule],
    }).compile();

    const dataGenerator = new MockDataGenerator();
    provider = new EnhancedMockRosterProvider({
      providerId: 'test-mock',
      providerName: 'Test Mock Provider',
      providerVersion: '1.0.0',
      environment: 'sandbox',
      scenario: 'medium-school',
      dataConfig: { studentCount: 50, teacherCount: 5 },
    }, dataGenerator);

    await provider.initialize({});
  });

  it('should authenticate successfully', async () => {
    const result = await provider.authenticate({ test: 'credentials' });
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
  });

  it('should get organizations with metadata', async () => {
    const orgs = await provider.getOrganizationsWithMetadata();
    expect(orgs.length).toBeGreaterThan(0);
    expect(orgs[0].metadata).toBeDefined();
    expect(orgs[0].metadata.externalId).toBeDefined();
  });

  it('should perform full sync', async () => {
    const context = {
      syncId: 'test-sync-1',
      externalSystemId: 'test-mock',
      startTime: new Date(),
    };
    const result = await provider.performFullSync(context);
    expect(result.success).toBe(true);
    expect(result.summary.totalProcessed).toBeGreaterThan(0);
  });
});
```

Run the test:
```bash
npm test -- --testPathPattern=mock-provider.test.ts
```

---

## 📊 **4. REST API TESTING**

### **Step 4.1: External ID Mapping API**

Test the mapping API endpoints:

```bash
# Base URL for mapping endpoints
BASE_URL="http://localhost:3000/integrations/mock-test-1/mappings"

# 1. Create a test mapping
curl -X PUT "$BASE_URL/user/ext_user_123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "internalId": "internal_user_456",
    "syncStatus": "SYNCED",
    "syncVersion": 1,
    "externalData": {"name": "Test User"},
    "metadata": {"test": true}
  }'

# 2. Get external-to-internal mapping
curl -X GET "$BASE_URL/external-to-internal/user/ext_user_123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. Get internal-to-external mapping  
curl -X GET "$BASE_URL/internal-to-external/user/internal_user_456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. Get complete mapping info
curl -X GET "$BASE_URL/user/ext_user_123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 5. Get mappings by entity type
curl -X GET "$BASE_URL/by-entity-type/user?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 6. Bulk create mappings
curl -X POST "$BASE_URL/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "mappings": [
      {
        "integrationId": "mock-test-1",
        "entityType": "user",
        "externalId": "ext_bulk_1",
        "internalId": "int_bulk_1"
      },
      {
        "integrationId": "mock-test-1", 
        "entityType": "user",
        "externalId": "ext_bulk_2",
        "internalId": "int_bulk_2"
      }
    ]
  }'

# 7. Get mapping statistics
curl -X GET "$BASE_URL/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 8. Get performance metrics
curl -X GET "$BASE_URL/metrics/performance" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 9. Validate mapping integrity
curl -X POST "$BASE_URL/validate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 10. Clear cache
curl -X POST "$BASE_URL/cache/clear" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Step 4.2: Expected API Responses**

Successful responses should look like:

```json
// Mapping creation
{
  "success": true,
  "data": {
    "id": "mapping_id_123",
    "integration_id": "integration_db_id",
    "entity_type": "user",
    "external_id": "ext_user_123", 
    "internal_id": "internal_user_456",
    "sync_status": "SYNCED",
    "created_at": "2024-12-17T...",
    "updated_at": "2024-12-17T..."
  },
  "message": "Mapping created/updated successfully"
}

// ID lookup
{
  "success": true,
  "data": {
    "integrationId": "mock-test-1",
    "entityType": "user", 
    "externalId": "ext_user_123",
    "internalId": "internal_user_456"
  }
}

// Statistics
{
  "success": true,
  "data": {
    "totalMappings": 150,
    "mappingsByEntityType": {
      "user": 100,
      "organization": 25,
      "class": 20,
      "enrollment": 5
    },
    "mappingsBySyncStatus": {
      "SYNCED": 145,
      "PENDING": 3,
      "ERROR": 2
    },
    "averageAge": 5.2,
    "oldestMapping": "2024-12-15T...",
    "newestMapping": "2024-12-17T..."
  }
}
```

---

## ⚡ **5. PERFORMANCE TESTING**

### **Step 5.1: Cache Performance**

Test mapping lookup performance:

```bash
# Install Apache Bench for load testing (macOS)
brew install httpie hey

# Performance test - 1000 requests, 10 concurrent
hey -n 1000 -c 10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/integrations/mock-test-1/mappings/external-to-internal/user/ext_user_123"
```

Expected results:
- **First lookup**: ~50-100ms (database + cache write)
- **Cached lookups**: <10ms consistently  
- **Success rate**: 100%
- **No errors or timeouts**

### **Step 5.2: Bulk Operations Performance**

Test bulk mapping operations:

```typescript
// Create performance test script
// test/performance/bulk-mapping.test.ts

describe('Bulk Mapping Performance', () => {
  it('should handle 1000 mappings in under 5 seconds', async () => {
    const mappings = Array.from({ length: 1000 }, (_, i) => ({
      integrationId: 'perf-test',
      entityType: 'user',
      externalId: `ext_perf_${i}`,
      internalId: `int_perf_${i}`
    }));

    const startTime = Date.now();
    const result = await mappingService.bulkCreateMappings(mappings);
    const duration = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(result.created).toBe(1000);
    expect(duration).toBeLessThan(5000); // Under 5 seconds
  });
});
```

---

## 🔍 **6. DATA VALIDATION**

### **Step 6.1: Database Integrity**

Check that data is properly stored:

```sql
-- Check integration tables have data
SELECT COUNT(*) FROM integrations;
SELECT COUNT(*) FROM external_system_mappings;
SELECT COUNT(*) FROM integration_audit_logs;

-- Verify mapping relationships
SELECT 
  esm.entity_type,
  esm.external_id,
  esm.internal_id,
  esm.sync_status,
  esm.created_at
FROM external_system_mappings esm
WHERE esm.integration_id = 'your_integration_id'
LIMIT 10;

-- Check audit trail
SELECT 
  ial.event_type,
  ial.description,
  ial.severity,
  ial.occurred_at
FROM integration_audit_logs ial
ORDER BY ial.occurred_at DESC
LIMIT 20;
```

### **Step 6.2: Cache Validation**

Verify Redis cache is working:

```bash
# Connect to Redis and check keys
redis-cli

# In Redis CLI:
KEYS mapping:*
GET "mapping:ext_to_int:mock-test-1:user:ext_user_123"
INFO memory
```

---

## 🐛 **7. ERROR SCENARIO TESTING**

### **Step 7.1: Rate Limiting**

Test rate limiting behavior:

```typescript
describe('Rate Limiting', () => {
  it('should enforce rate limits', async () => {
    // Make requests rapidly to trigger rate limiting
    const promises = Array.from({ length: 100 }, () => 
      mappingService.mapExternalToInternal('test-integration', 'user', 'test_user')
    );
    
    const results = await Promise.allSettled(promises);
    const errors = results.filter(r => r.status === 'rejected');
    
    // Should have some rate limit errors
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

### **Step 7.2: Conflict Detection**

Test conflict detection and resolution:

```bash
# Create conflicting mappings
curl -X PUT "$BASE_URL/user/same_external_id" \
  -d '{"internalId": "internal_1"}'

curl -X PUT "$BASE_URL/user/same_external_id" \
  -d '{"internalId": "internal_2"}'

# Check validation catches the conflict
curl -X POST "$BASE_URL/validate"
```

---

## 📈 **8. MONITORING & METRICS**

### **Step 8.1: Service Metrics**

Monitor service health:

```bash
# Get performance metrics
curl -X GET "$BASE_URL/metrics/performance"

# Expected response:
{
  "success": true,
  "data": {
    "totalLookups": 1500,
    "cacheHits": 1200,
    "cacheMisses": 300,
    "cacheHitRate": 80.0,
    "cacheMissRate": 20.0,
    "totalMappingsCreated": 450,
    "totalMappingsUpdated": 75,
    "totalMappingsDeleted": 5
  }
}
```

### **Step 8.2: Integration Status**

Check overall integration health:

```typescript
// Test integration registry status
const stats = await integrationRegistry.getRegistryStats();
console.log('Registry Stats:', stats);

const factoryStats = await providerFactory.getFactoryStats();
console.log('Factory Stats:', factoryStats);
```

---

## ✅ **9. SUCCESS CRITERIA**

The integration layer passes testing if:

- [ ] **Database**: All integration tables created successfully
- [ ] **Module Loading**: Integration module initializes without errors
- [ ] **Mock Provider**: Enhanced mock provider works with all interface methods
- [ ] **API Performance**: Mapping lookups < 100ms (cached < 10ms)
- [ ] **Bulk Operations**: 1000 mappings processed in < 5 seconds
- [ ] **Cache**: Redis caching working with proper hit rates
- [ ] **Rate Limiting**: Properly enforced without system crashes
- [ ] **Error Handling**: Graceful handling of invalid requests
- [ ] **Monitoring**: Metrics and statistics properly tracked
- [ ] **Audit Trail**: All operations logged correctly

---

## 🚨 **10. TROUBLESHOOTING**

### **Common Issues**

1. **Redis Connection Errors**
   ```bash
   # Check Redis is running
   redis-cli ping
   # Should return: PONG
   ```

2. **Database Schema Issues**
   ```bash
   # Reset and regenerate
   npm run db:generate
   npm run db:push --force-reset
   ```

3. **Module Import Errors**
   - Check all imports in `integration.module.ts`
   - Verify all services are properly exported

4. **Authentication Errors**
   - Ensure proper JWT tokens for API testing
   - Check RBAC configurations

5. **Performance Issues**  
   - Monitor Redis memory usage
   - Check database query performance
   - Verify proper indexing

---

## 📚 **Next Steps**

After successful testing:

1. **Continue Development**: Proceed with remaining Phase 9 tasks:
   - Task 9.2.3: Conflict Resolution Framework
   - Task 9.2.4: Sync Status Monitoring & Reporting
   
2. **TimeBack Integration**: Begin implementing actual TimeBack provider

3. **Production Deployment**: Configure production Redis, database, monitoring

---

**Happy Testing! 🧪✨**
