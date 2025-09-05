/**
 * Phase 9 Integration Layer - Standalone Test Suite
 * 
 * This test validates our integration layer components in isolation,
 * without external dependencies like Prisma or Redis.
 */

import { EnhancedMockRosterProvider } from './providers/enhanced-mock-roster-provider';
import { MockDataGenerator } from '../roster/testing/mock-data-generator';
import { validateProviderConfig, validateSystemConfig } from './schemas/integration-config.schema';

describe('🚀 Phase 9 Integration Layer - Standalone Tests', () => {
  describe('🔧 Enhanced Mock Provider', () => {
    let mockProvider: EnhancedMockRosterProvider;
    let mockDataGenerator: MockDataGenerator;

    beforeEach(() => {
      mockDataGenerator = new MockDataGenerator();
      
      const config = {
        providerId: 'test-mock',
        providerName: 'Test Mock Provider',
        providerVersion: '1.0.0',
        environment: 'sandbox' as const,
        scenario: 'medium-school' as const,
        dataConfig: {
          studentCount: 25,
          teacherCount: 3,
          classCount: 5,
        },
      };

      mockProvider = new EnhancedMockRosterProvider(config, mockDataGenerator);
    });

    it('✅ should create successfully with valid configuration', () => {
      expect(mockProvider).toBeDefined();
      expect(mockProvider.providerId).toBe('test-mock');
      expect(mockProvider.providerName).toBe('Test Mock Provider');
      expect(mockProvider.providerVersion).toBe('1.0.0');
      expect(mockProvider.environment).toBe('sandbox');
    });

    it('✅ should initialize without errors', async () => {
      await expect(mockProvider.initialize({})).resolves.not.toThrow();
      expect(mockProvider.isInitialized).toBe(true);
    });

    it('✅ should test connection and return health status', async () => {
      await mockProvider.initialize({});
      const health = await mockProvider.testConnection();
      
      expect(health).toBeDefined();
      expect(health.status).toBeOneOf(['connected', 'healthy']);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.capabilities).toContain('roster');
      expect(health.capabilities).toContain('sync');
      expect(health.capabilities).toContain('auth');
    });

    it('✅ should authenticate successfully', async () => {
      await mockProvider.initialize({});
      const result = await mockProvider.authenticate({ test: 'credentials' });
      
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('✅ should get organizations with external metadata', async () => {
      await mockProvider.initialize({});
      const organizations = await mockProvider.getOrganizationsWithMetadata();
      
      expect(organizations.length).toBeGreaterThan(0);
      
      const org = organizations[0];
      expect(org).toHaveProperty('name');
      expect(org).toHaveProperty('metadata');
      expect(org.metadata.externalId).toBeDefined();
      expect(org.metadata.externalSystemId).toBe('test-mock');
      expect(org.metadata.entityType).toBe('organization');
    });

    it('✅ should get users with role and metadata', async () => {
      await mockProvider.initialize({});
      const users = await mockProvider.getUsersWithMetadata();
      
      expect(users.length).toBeGreaterThan(0);
      
      const user = users[0];
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('metadata');
      expect(user.metadata.externalId).toBeDefined();
      expect(user.metadata.entityType).toBe('user');
      expect(['student', 'teacher']).toContain(user.role);
    });

    it('✅ should get classes with enrollment metadata', async () => {
      await mockProvider.initialize({});
      const classes = await mockProvider.getClassesWithMetadata();
      
      expect(classes.length).toBeGreaterThan(0);
      
      const classEntity = classes[0];
      expect(classEntity).toHaveProperty('name');
      expect(classEntity).toHaveProperty('metadata');
      expect(classEntity.metadata.externalId).toBeDefined();
      expect(classEntity.metadata.entityType).toBe('class');
    });

    it('✅ should perform full sync with proper results', async () => {
      await mockProvider.initialize({});
      
      const syncContext = {
        syncId: 'test-full-sync-1',
        externalSystemId: 'test-mock',
        startTime: new Date(),
      };
      
      const result = await mockProvider.performFullSync(syncContext);
      
      expect(result.success).toBe(true);
      expect(result.syncId).toBe('test-full-sync-1');
      expect(result.summary.totalProcessed).toBeGreaterThan(0);
      expect(result.summary.successCount).toBeGreaterThan(0);
      expect(result.summary.errorCount).toBe(0);
      expect(result.results.length).toBeGreaterThan(0);
      
      // Verify different entity types were synced
      const entityTypes = result.results.map(r => r.entityType);
      expect(entityTypes).toContain('organization');
      expect(entityTypes).toContain('user');
      expect(entityTypes).toContain('class');
    });

    it('✅ should perform incremental sync with change detection', async () => {
      await mockProvider.initialize({});
      
      const syncContext = {
        syncId: 'test-incremental-sync-1',
        externalSystemId: 'test-mock',
        startTime: new Date(),
      };
      
      const lastSyncTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const result = await mockProvider.performIncrementalSync(syncContext, lastSyncTime);
      
      expect(result.success).toBe(true);
      expect(result.syncId).toBe('test-incremental-sync-1');
      expect(result.summary).toBeDefined();
      // Incremental sync might have fewer or no changes
      expect(result.summary.totalProcessed).toBeGreaterThanOrEqual(0);
    });

    it('✅ should handle ID mapping operations correctly', async () => {
      await mockProvider.initialize({});
      
      // Test creating a mapping
      await mockProvider.createIdMapping('user', 'ext_user_123', 'int_user_456', { 
        created: new Date().toISOString(),
        test: true 
      });
      
      // Test mapping external to internal
      const internalId = await mockProvider.mapExternalToInternal('user', 'ext_user_123');
      expect(internalId).toBe('int_user_456');
      
      // Test mapping internal to external
      const externalId = await mockProvider.mapInternalToExternal('user', 'int_user_456');
      expect(externalId).toBe('ext_user_123');
      
      // Test non-existent mapping
      const notFound = await mockProvider.mapExternalToInternal('user', 'nonexistent');
      expect(notFound).toBeNull();
    });

    it('✅ should handle bulk ID mapping operations', async () => {
      await mockProvider.initialize({});
      
      const bulkMappings = [
        { entityType: 'user', externalId: 'ext_bulk_1', internalId: 'int_bulk_1' },
        { entityType: 'user', externalId: 'ext_bulk_2', internalId: 'int_bulk_2' },
        { entityType: 'class', externalId: 'ext_class_1', internalId: 'int_class_1' },
        { entityType: 'class', externalId: 'ext_class_2', internalId: 'int_class_2' },
      ];
      
      await mockProvider.bulkCreateIdMappings(bulkMappings);
      
      // Verify all mappings were created
      for (const mapping of bulkMappings) {
        const result = await mockProvider.mapExternalToInternal(
          mapping.entityType, 
          mapping.externalId
        );
        expect(result).toBe(mapping.internalId);
      }
    });

    it('✅ should validate and process webhook events', async () => {
      await mockProvider.initialize({});
      
      const webhookEvent = {
        id: 'webhook_123',
        event: 'user.updated',
        timestamp: new Date(),
        data: {
          userId: 'ext_user_999',
          changes: { email: 'newemail@example.com' }
        },
        source: 'test-mock'
      };
      
      const result = await mockProvider.processWebhookEvent(webhookEvent);
      
      expect(result.success).toBe(true);
      expect(result.eventId).toBe('webhook_123');
      expect(result.processed).toBe(true);
    });

    it('✅ should handle provider cleanup gracefully', async () => {
      await mockProvider.initialize({});
      
      // Should not throw errors
      await expect(mockProvider.cleanup()).resolves.not.toThrow();
      
      // Should mark as not initialized
      expect(mockProvider.isInitialized).toBe(false);
    });

    it('✅ should provide comprehensive health status', async () => {
      await mockProvider.initialize({});
      
      const health = await mockProvider.getHealthStatus();
      
      expect(health.status).toBeOneOf(['healthy', 'degraded', 'unhealthy']);
      expect(health.checks).toBeDefined();
      expect(health.checks.database).toBeDefined();
      expect(health.checks.authentication).toBeDefined();
      expect(health.checks.external_api).toBeDefined();
      expect(health.lastChecked).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
    });
  });

  describe('🛡️ Configuration Validation', () => {
    it('✅ should validate correct provider configuration', () => {
      const validConfig = {
        providerId: 'timeback',
        providerName: 'TimeBack Integration',
        enabled: true,
        environment: 'production',
        baseUrl: 'https://api.timeback.io',
        authentication: {
          authType: 'oauth2',
          clientId: 'client123',
          clientSecret: 'secret456',
          scope: 'roster:read user:read',
          authUrl: 'https://auth.timeback.io/oauth',
          tokenUrl: 'https://auth.timeback.io/token',
          environment: 'production',
          timeout: 30000,
          retries: 3,
        },
        sync: {
          batchSize: 100,
          concurrency: 3,
          retryAttempts: 3,
          retryDelay: 5000,
          timeout: 120000,
        },
        webhooks: {
          enabled: true,
          secret: 'webhook_secret_key',
          events: ['user.created', 'user.updated', 'enrollment.changed'],
        },
        rateLimit: {
          requestsPerSecond: 10,
          burstLimit: 50,
          strategy: 'token_bucket',
        },
      };

      expect(() => validateProviderConfig(validConfig)).not.toThrow();
    });

    it('✅ should validate correct system configuration', () => {
      const validSystemConfig = {
        enabled: true,
        providers: [
          {
            providerId: 'mock',
            providerName: 'Mock Provider',
            enabled: true,
            environment: 'sandbox',
            baseUrl: 'https://mock.example.com',
            authentication: {
              authType: 'custom',
              customParams: {},
              environment: 'sandbox',
              timeout: 30000,
              retries: 3,
            },
          },
        ],
        security: {
          encryptCredentials: true,
          credentialRotationInterval: 2592000,
          requireHttps: true,
          validateCertificates: true,
          allowSelfSignedCerts: false,
        },
        database: {
          enableConnectionPooling: true,
          maxConnections: 20,
          connectionTimeout: 5000,
          queryTimeout: 30000,
        },
        jobs: {
          concurrency: 5,
          maxAttempts: 3,
          backoffDelay: 5000,
          removeOnComplete: 100,
          removeOnFail: 50,
        },
        monitoring: {
          enableHealthChecks: true,
          healthCheckInterval: 60000,
          logLevel: 'info',
          enableMetrics: true,
          metricsRetention: 604800,
        },
      };

      expect(() => validateSystemConfig(validSystemConfig)).not.toThrow();
    });

    it('✅ should reject invalid provider configuration', () => {
      const invalidConfig = {
        providerId: '', // Invalid: empty string
        enabled: true,
        // Missing required fields
      };

      expect(() => validateProviderConfig(invalidConfig)).toThrow();
    });

    it('✅ should reject invalid system configuration', () => {
      const invalidConfig = {
        enabled: 'yes', // Invalid: should be boolean
        providers: 'invalid', // Invalid: should be array
      };

      expect(() => validateSystemConfig(invalidConfig)).toThrow();
    });
  });

  describe('📊 Data Generation and Scenarios', () => {
    let mockDataGenerator: MockDataGenerator;

    beforeEach(() => {
      mockDataGenerator = new MockDataGenerator();
    });

    it('✅ should generate consistent mock data', () => {
      const scenario = 'small-school';
      const data1 = mockDataGenerator.generateScenarioData(scenario);
      const data2 = mockDataGenerator.generateScenarioData(scenario);

      // Should generate same structure
      expect(data1.organizations.length).toBe(data2.organizations.length);
      expect(data1.classes.length).toBe(data2.classes.length);
    });

    it('✅ should generate different data for different scenarios', () => {
      const smallSchool = mockDataGenerator.generateScenarioData('small-school');
      const mediumSchool = mockDataGenerator.generateScenarioData('medium-school');
      const largeSchool = mockDataGenerator.generateScenarioData('large-school');

      expect(smallSchool.users.length).toBeLessThan(mediumSchool.users.length);
      expect(mediumSchool.users.length).toBeLessThan(largeSchool.users.length);
      
      expect(smallSchool.classes.length).toBeLessThan(largeSchool.classes.length);
    });

    it('✅ should generate valid external IDs', () => {
      const data = mockDataGenerator.generateScenarioData('medium-school');
      
      // Check that all entities have valid external IDs
      data.organizations.forEach(org => {
        expect(org.externalId).toBeDefined();
        expect(org.externalId).toMatch(/^org_/);
      });

      data.users.forEach(user => {
        expect(user.externalId).toBeDefined();
        expect(user.externalId).toMatch(/^user_/);
      });

      data.classes.forEach(cls => {
        expect(cls.externalId).toBeDefined();
        expect(cls.externalId).toMatch(/^class_/);
      });
    });
  });

  describe('🎯 Phase 9 Success Criteria Validation', () => {
    it('✅ Core integration abstractions are implemented', () => {
      // Verify key interfaces exist by trying to import them
      expect(() => require('./interfaces/core-integration.interface')).not.toThrow();
    });

    it('✅ Provider-agnostic design allows multiple integrations', () => {
      const config1 = {
        providerId: 'provider1',
        providerName: 'Provider 1',
        providerVersion: '1.0.0',
        environment: 'sandbox' as const,
        scenario: 'small-school' as const,
        dataConfig: {},
      };

      const config2 = {
        providerId: 'provider2',
        providerName: 'Provider 2',
        providerVersion: '2.0.0',
        environment: 'production' as const,
        scenario: 'large-school' as const,
        dataConfig: {},
      };

      const generator = new MockDataGenerator();
      const provider1 = new EnhancedMockRosterProvider(config1, generator);
      const provider2 = new EnhancedMockRosterProvider(config2, generator);

      expect(provider1.providerId).not.toBe(provider2.providerId);
      expect(provider1.environment).not.toBe(provider2.environment);
      
      // Both should implement the same interface
      expect(typeof provider1.initialize).toBe('function');
      expect(typeof provider2.initialize).toBe('function');
    });

    it('✅ Configuration validation prevents invalid setups', () => {
      const invalidConfigs = [
        { providerId: '' }, // Missing required fields
        { providerId: 'test', authentication: { authType: 'invalid' } }, // Invalid auth type
        { providerId: 'test', sync: { batchSize: -1 } }, // Invalid batch size
      ];

      invalidConfigs.forEach(config => {
        expect(() => validateProviderConfig(config)).toThrow();
      });
    });

    it('✅ Mock provider simulates realistic external system behavior', async () => {
      const config = {
        providerId: 'realistic-test',
        providerName: 'Realistic Test Provider',
        providerVersion: '1.0.0',
        environment: 'sandbox' as const,
        scenario: 'medium-school' as const,
        dataConfig: { studentCount: 100, teacherCount: 8, classCount: 15 },
      };

      const provider = new EnhancedMockRosterProvider(config, new MockDataGenerator());
      await provider.initialize({});

      // Simulate realistic delays and responses
      const startTime = Date.now();
      const organizations = await provider.getOrganizationsWithMetadata();
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThan(10); // Should have some realistic delay
      expect(organizations.length).toBeGreaterThan(0);
      
      // Should have realistic data variety
      const users = await provider.getUsersWithMetadata();
      const teachers = users.filter(u => u.role === 'teacher');
      const students = users.filter(u => u.role === 'student');
      
      expect(teachers.length).toBeGreaterThan(0);
      expect(students.length).toBeGreaterThan(teachers.length); // More students than teachers
    });
  });

  describe('🔄 Integration Workflow Tests', () => {
    it('✅ Complete integration workflow succeeds', async () => {
      const provider = new EnhancedMockRosterProvider(
        {
          providerId: 'workflow-test',
          providerName: 'Workflow Test',
          providerVersion: '1.0.0',
          environment: 'sandbox',
          scenario: 'small-school',
          dataConfig: {},
        },
        new MockDataGenerator()
      );

      // 1. Initialize
      await provider.initialize({});
      expect(provider.isInitialized).toBe(true);

      // 2. Test connection
      const health = await provider.testConnection();
      expect(health.status).toBeOneOf(['connected', 'healthy']);

      // 3. Authenticate
      const auth = await provider.authenticate({ test: 'credentials' });
      expect(auth.success).toBe(true);

      // 4. Perform sync
      const syncResult = await provider.performFullSync({
        syncId: 'workflow-test-sync',
        externalSystemId: 'workflow-test',
        startTime: new Date(),
      });
      expect(syncResult.success).toBe(true);
      expect(syncResult.summary.totalProcessed).toBeGreaterThan(0);

      // 5. Cleanup
      await provider.cleanup();
      expect(provider.isInitialized).toBe(false);
    });
  });
});
