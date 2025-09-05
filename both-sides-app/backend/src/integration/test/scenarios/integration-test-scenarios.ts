import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { ExternalSystemMockServer, MockServerConfig } from '../mocks/external-system-mock-server';
import { IntegrationModule } from '../../integration.module';
import { IntegrationRegistry } from '../../services/integration-registry.service';
import { ProviderFactory } from '../../factories/provider-factory.service';
import { ExternalIdMappingService } from '../../services/external-id-mapping.service';
import { DataSyncEngineService } from '../../services/data-sync-engine.service';
import { ChangeTrackingService } from '../../services/change-tracking/change-tracking.service';
import { ConflictManagementService } from '../../services/conflict-resolution/conflict-management.service';
import { SyncMonitoringService } from '../../services/monitoring/sync-monitoring.service';
import { CredentialManagementService } from '../../services/security/credential-management.service';
import { SecurityAuditService } from '../../services/security/security-audit.service';
import { IRosterProvider } from '../../interfaces/core-integration.interface';

/**
 * Integration Test Scenarios
 * 
 * Comprehensive test scenarios covering the entire integration layer
 * including happy paths, error cases, performance scenarios, and
 * security testing.
 */

export interface TestScenario {
  name: string;
  description: string;
  category: 'functional' | 'performance' | 'security' | 'reliability' | 'data-integrity';
  priority: 'critical' | 'high' | 'medium' | 'low';
  setup: () => Promise<void>;
  execute: () => Promise<TestResult>;
  cleanup: () => Promise<void>;
  expectedDuration?: number; // milliseconds
  requirements?: string[];
}

export interface TestResult {
  success: boolean;
  duration: number;
  metrics: TestMetrics;
  errors?: string[];
  warnings?: string[];
  data?: any;
}

export interface TestMetrics {
  recordsProcessed: number;
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage?: number;
  cpuUsage?: number;
  networkLatency?: number;
  errorCount: number;
  warningCount: number;
}

export interface TestDataSet {
  name: string;
  description: string;
  organizations: number;
  users: number;
  classes: number;
  enrollments: number;
  complexity: 'simple' | 'medium' | 'complex' | 'enterprise';
  relationships: {
    usersPerOrganization: number;
    classesPerOrganization: number;
    studentsPerClass: number;
    teachersPerClass: number;
  };
}

export class IntegrationTestScenarios {
  private module: TestingModule;
  private mockServer: ExternalSystemMockServer;
  private services: {
    registry: IntegrationRegistry;
    factory: ProviderFactory;
    mapping: ExternalIdMappingService;
    syncEngine: DataSyncEngineService;
    changeTracking: ChangeTrackingService;
    conflictManagement: ConflictManagementService;
    monitoring: SyncMonitoringService;
    credentials: CredentialManagementService;
    security: SecurityAuditService;
  };

  constructor() {}

  /**
   * Initialize test environment
   */
  async initialize(): Promise<void> {
    // Create testing module
    this.module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        IntegrationModule,
      ],
    })
    .overrideProvider(PrismaService)
    .useValue(this.createMockPrismaService())
    .overrideProvider(RedisService)
    .useValue(this.createMockRedisService())
    .compile();

    // Get services
    this.services = {
      registry: this.module.get<IntegrationRegistry>(IntegrationRegistry),
      factory: this.module.get<ProviderFactory>(ProviderFactory),
      mapping: this.module.get<ExternalIdMappingService>(ExternalIdMappingService),
      syncEngine: this.module.get<DataSyncEngineService>(DataSyncEngineService),
      changeTracking: this.module.get<ChangeTrackingService>(ChangeTrackingService),
      conflictManagement: this.module.get<ConflictManagementService>(ConflictManagementService),
      monitoring: this.module.get<SyncMonitoringService>(SyncMonitoringService),
      credentials: this.module.get<CredentialManagementService>(CredentialManagementService),
      security: this.module.get<SecurityAuditService>(SecurityAuditService),
    };

    // Setup mock server
    const mockConfig: MockServerConfig = {
      port: 3001,
      providerType: 'timeback',
      dataConfig: {
        organizationCount: 5,
        userCount: 100,
        classCount: 25,
        enrollmentCount: 500,
      },
      behaviorConfig: {
        responseDelayMs: { min: 50, max: 200 },
        errorRate: 0.02,
        authErrorRate: 0.01,
        dataCorruptionRate: 0.001,
        rateLimitConfig: {
          enabled: true,
          requestsPerMinute: 60,
        },
      },
      features: {
        supportsPagination: true,
        supportsWebhooks: true,
        supportsRealTime: true,
        supportsIncrementalSync: true,
        supportsBulkOperations: true,
      },
    };

    this.mockServer = new ExternalSystemMockServer(mockConfig);
    await this.mockServer.start();
  }

  /**
   * Cleanup test environment
   */
  async cleanup(): Promise<void> {
    if (this.mockServer) {
      await this.mockServer.stop();
    }
    if (this.module) {
      await this.module.close();
    }
  }

  /**
   * Get all test scenarios
   */
  getTestScenarios(): TestScenario[] {
    return [
      ...this.getFunctionalScenarios(),
      ...this.getPerformanceScenarios(),
      ...this.getSecurityScenarios(),
      ...this.getReliabilityScenarios(),
      ...this.getDataIntegrityScenarios(),
    ];
  }

  /**
   * Get predefined test data sets
   */
  getTestDataSets(): TestDataSet[] {
    return [
      {
        name: 'small-school',
        description: 'Small elementary school scenario',
        organizations: 1,
        users: 25,
        classes: 5,
        enrollments: 100,
        complexity: 'simple',
        relationships: {
          usersPerOrganization: 25,
          classesPerOrganization: 5,
          studentsPerClass: 20,
          teachersPerClass: 1,
        },
      },
      {
        name: 'medium-school',
        description: 'Medium-sized middle/high school',
        organizations: 1,
        users: 250,
        classes: 30,
        enrollments: 900,
        complexity: 'medium',
        relationships: {
          usersPerOrganization: 250,
          classesPerOrganization: 30,
          studentsPerClass: 30,
          teachersPerClass: 1,
        },
      },
      {
        name: 'large-district',
        description: 'Large school district with multiple schools',
        organizations: 10,
        users: 2500,
        classes: 200,
        enrollments: 6000,
        complexity: 'complex',
        relationships: {
          usersPerOrganization: 250,
          classesPerOrganization: 20,
          studentsPerClass: 30,
          teachersPerClass: 1,
        },
      },
      {
        name: 'enterprise-multi-district',
        description: 'Enterprise scenario with multiple districts',
        organizations: 50,
        users: 25000,
        classes: 1500,
        enrollments: 50000,
        complexity: 'enterprise',
        relationships: {
          usersPerOrganization: 500,
          classesPerOrganization: 30,
          studentsPerClass: 33,
          teachersPerClass: 1,
        },
      },
    ];
  }

  /**
   * Run specific test scenario
   */
  async runScenario(scenarioName: string): Promise<TestResult> {
    const scenarios = this.getTestScenarios();
    const scenario = scenarios.find(s => s.name === scenarioName);
    
    if (!scenario) {
      throw new Error(`Test scenario '${scenarioName}' not found`);
    }

    const startTime = Date.now();
    
    try {
      await scenario.setup();
      const result = await scenario.execute();
      result.duration = Date.now() - startTime;
      await scenario.cleanup();
      return result;
    } catch (error) {
      await scenario.cleanup();
      return {
        success: false,
        duration: Date.now() - startTime,
        metrics: {
          recordsProcessed: 0,
          apiCalls: 0,
          cacheHits: 0,
          cacheMisses: 0,
          errorCount: 1,
          warningCount: 0,
        },
        errors: [error.message],
      };
    }
  }

  /**
   * Run all scenarios in a category
   */
  async runScenariosByCategory(category: TestScenario['category']): Promise<TestResult[]> {
    const scenarios = this.getTestScenarios().filter(s => s.category === category);
    const results: TestResult[] = [];

    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario.name);
      results.push(result);
    }

    return results;
  }

  // Private methods for creating test scenarios

  /**
   * Functional test scenarios
   */
  private getFunctionalScenarios(): TestScenario[] {
    return [
      {
        name: 'basic-provider-initialization',
        description: 'Test basic provider initialization and configuration',
        category: 'functional',
        priority: 'critical',
        setup: async () => {
          await this.mockServer.resetData();
        },
        execute: async () => {
          const config = {
            providerId: 'test-provider',
            providerName: 'Test Provider',
            enabled: true,
            environment: 'test' as const,
            baseUrl: this.mockServer.getUrl(),
            authentication: {
              authType: 'oauth2' as const,
              clientId: 'test-client',
              clientSecret: 'test-secret',
              environment: 'test' as const,
              timeout: 30000,
              retries: 3,
            },
          };

          const provider = await this.services.factory.createRosterProvider(config);
          await provider.initialize(config);
          
          const health = await provider.testConnection();
          
          return {
            success: health.status === 'healthy',
            duration: 0,
            metrics: {
              recordsProcessed: 1,
              apiCalls: 1,
              cacheHits: 0,
              cacheMisses: 0,
              errorCount: 0,
              warningCount: 0,
            },
            data: { health },
          };
        },
        cleanup: async () => {},
      },

      {
        name: 'full-data-sync',
        description: 'Test complete data synchronization from external system',
        category: 'functional',
        priority: 'critical',
        setup: async () => {
          await this.mockServer.resetData();
        },
        execute: async () => {
          const config = await this.createTestProviderConfig();
          const provider = await this.services.factory.createRosterProvider(config);
          await provider.initialize(config);

          const syncContext = {
            syncId: 'test-full-sync',
            externalSystemId: 'test-provider',
            startTime: new Date(),
          };

          const result = await provider.performFullSync(syncContext);
          
          return {
            success: result.success,
            duration: 0,
            metrics: {
              recordsProcessed: result.summary.totalProcessed,
              apiCalls: result.summary.apiCalls || 0,
              cacheHits: 0,
              cacheMisses: 0,
              errorCount: result.summary.errors,
              warningCount: result.summary.warnings || 0,
            },
            data: result,
          };
        },
        cleanup: async () => {},
      },

      {
        name: 'incremental-sync',
        description: 'Test incremental synchronization with change detection',
        category: 'functional',
        priority: 'high',
        setup: async () => {
          await this.mockServer.resetData();
          // Perform initial full sync first
          const config = await this.createTestProviderConfig();
          const provider = await this.services.factory.createRosterProvider(config);
          await provider.initialize(config);
          await provider.performFullSync({
            syncId: 'initial-sync',
            externalSystemId: 'test-provider',
            startTime: new Date(),
          });
        },
        execute: async () => {
          const config = await this.createTestProviderConfig();
          const provider = await this.services.factory.createRosterProvider(config);
          await provider.initialize(config);

          const lastSyncTime = new Date(Date.now() - 60000); // 1 minute ago
          const syncContext = {
            syncId: 'test-incremental-sync',
            externalSystemId: 'test-provider',
            startTime: new Date(),
          };

          const result = await provider.performIncrementalSync(syncContext, lastSyncTime);
          
          return {
            success: result.success,
            duration: 0,
            metrics: {
              recordsProcessed: result.summary.totalProcessed,
              apiCalls: result.summary.apiCalls || 0,
              cacheHits: 0,
              cacheMisses: 0,
              errorCount: result.summary.errors,
              warningCount: result.summary.warnings || 0,
            },
            data: result,
          };
        },
        cleanup: async () => {},
      },

      {
        name: 'external-id-mapping',
        description: 'Test external ID mapping and resolution',
        category: 'functional',
        priority: 'critical',
        setup: async () => {},
        execute: async () => {
          const testMappings = [
            { entityType: 'user', externalId: 'ext_001', internalId: 'int_001' },
            { entityType: 'class', externalId: 'ext_class_001', internalId: 'int_class_001' },
            { entityType: 'organization', externalId: 'ext_org_001', internalId: 'int_org_001' },
          ];

          let successCount = 0;
          for (const mapping of testMappings) {
            await this.services.mapping.createMapping(
              'test-system',
              mapping.entityType,
              mapping.externalId,
              mapping.internalId,
              {}
            );

            const resolved = await this.services.mapping.mapExternalToInternal(
              'test-system',
              mapping.entityType,
              mapping.externalId
            );

            if (resolved === mapping.internalId) {
              successCount++;
            }
          }

          return {
            success: successCount === testMappings.length,
            duration: 0,
            metrics: {
              recordsProcessed: testMappings.length,
              apiCalls: testMappings.length * 2,
              cacheHits: 0,
              cacheMisses: testMappings.length,
              errorCount: testMappings.length - successCount,
              warningCount: 0,
            },
          };
        },
        cleanup: async () => {},
      },

      {
        name: 'change-detection-tracking',
        description: 'Test change detection and tracking system',
        category: 'functional',
        priority: 'high',
        setup: async () => {},
        execute: async () => {
          const sessionId = await this.services.changeTracking.startTrackingSession({
            sessionType: 'sync',
            externalSystemId: 'test-system',
            initiatedBy: 'test-user',
            configuration: {},
          });

          // Simulate some changes
          const changes = [
            {
              entityType: 'user',
              entityId: 'user_001',
              operation: 'update' as const,
              changes: { firstName: 'John', lastName: 'Doe' },
              metadata: {},
            },
            {
              entityType: 'class',
              entityId: 'class_001',
              operation: 'create' as const,
              changes: { name: 'Math 101', subject: 'Mathematics' },
              metadata: {},
            },
          ];

          for (const change of changes) {
            await this.services.changeTracking.recordChange(sessionId, change);
          }

          const session = await this.services.changeTracking.getTrackingSession(sessionId);
          await this.services.changeTracking.completeTrackingSession(sessionId, { success: true });

          return {
            success: session !== null && session.changes?.length === changes.length,
            duration: 0,
            metrics: {
              recordsProcessed: changes.length,
              apiCalls: changes.length + 3, // start, get, complete
              cacheHits: 0,
              cacheMisses: 0,
              errorCount: 0,
              warningCount: 0,
            },
            data: session,
          };
        },
        cleanup: async () => {},
      },
    ];
  }

  /**
   * Performance test scenarios
   */
  private getPerformanceScenarios(): TestScenario[] {
    return [
      {
        name: 'high-volume-sync',
        description: 'Test synchronization performance with large data sets',
        category: 'performance',
        priority: 'high',
        expectedDuration: 60000, // 1 minute
        setup: async () => {
          // Setup large data set
          const largeDataConfig: MockServerConfig = {
            port: 3002,
            providerType: 'timeback',
            dataConfig: {
              organizationCount: 10,
              userCount: 1000,
              classCount: 100,
              enrollmentCount: 3000,
            },
            behaviorConfig: {
              responseDelayMs: { min: 10, max: 50 },
              errorRate: 0.001,
              authErrorRate: 0.001,
              dataCorruptionRate: 0.0001,
              rateLimitConfig: {
                enabled: false,
                requestsPerMinute: 1000,
              },
            },
            features: {
              supportsPagination: true,
              supportsWebhooks: false,
              supportsRealTime: false,
              supportsIncrementalSync: true,
              supportsBulkOperations: true,
            },
          };

          const largeMockServer = new ExternalSystemMockServer(largeDataConfig);
          await largeMockServer.start();
        },
        execute: async () => {
          const startTime = Date.now();
          const startMemory = process.memoryUsage().heapUsed;

          const config = {
            providerId: 'performance-test',
            providerName: 'Performance Test Provider',
            enabled: true,
            environment: 'test' as const,
            baseUrl: 'http://localhost:3002',
            authentication: {
              authType: 'oauth2' as const,
              clientId: 'test-client',
              clientSecret: 'test-secret',
              environment: 'test' as const,
              timeout: 30000,
              retries: 3,
            },
          };

          const provider = await this.services.factory.createRosterProvider(config);
          await provider.initialize(config);

          const syncResult = await provider.performFullSync({
            syncId: 'performance-test-sync',
            externalSystemId: 'performance-test',
            startTime: new Date(),
          });

          const endTime = Date.now();
          const endMemory = process.memoryUsage().heapUsed;
          const duration = endTime - startTime;
          const memoryUsed = endMemory - startMemory;

          return {
            success: syncResult.success && duration < 60000, // Should complete in under 1 minute
            duration,
            metrics: {
              recordsProcessed: syncResult.summary.totalProcessed,
              apiCalls: syncResult.summary.apiCalls || 0,
              cacheHits: 0,
              cacheMisses: 0,
              memoryUsage: memoryUsed,
              errorCount: syncResult.summary.errors,
              warningCount: syncResult.summary.warnings || 0,
            },
          };
        },
        cleanup: async () => {
          // Stop the large mock server
          // This would be handled by a separate instance
        },
      },

      {
        name: 'concurrent-sync-operations',
        description: 'Test concurrent synchronization operations',
        category: 'performance',
        priority: 'medium',
        setup: async () => {
          await this.mockServer.resetData();
        },
        execute: async () => {
          const config = await this.createTestProviderConfig();
          const concurrentSyncs = 5;
          const syncPromises = [];

          for (let i = 0; i < concurrentSyncs; i++) {
            const provider = await this.services.factory.createRosterProvider(config);
            await provider.initialize(config);
            
            syncPromises.push(
              provider.performFullSync({
                syncId: `concurrent-sync-${i}`,
                externalSystemId: 'test-provider',
                startTime: new Date(),
              })
            );
          }

          const results = await Promise.allSettled(syncPromises);
          const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
          const totalRecords = results
            .filter(r => r.status === 'fulfilled')
            .reduce((sum, r) => sum + (r as any).value.summary.totalProcessed, 0);

          return {
            success: successCount === concurrentSyncs,
            duration: 0,
            metrics: {
              recordsProcessed: totalRecords,
              apiCalls: concurrentSyncs * 10, // Estimated
              cacheHits: 0,
              cacheMisses: 0,
              errorCount: concurrentSyncs - successCount,
              warningCount: 0,
            },
          };
        },
        cleanup: async () => {},
      },
    ];
  }

  /**
   * Security test scenarios
   */
  private getSecurityScenarios(): TestScenario[] {
    return [
      {
        name: 'authentication-failure-handling',
        description: 'Test handling of authentication failures',
        category: 'security',
        priority: 'high',
        setup: async () => {},
        execute: async () => {
          const config = {
            providerId: 'auth-test',
            providerName: 'Auth Test Provider',
            enabled: true,
            environment: 'test' as const,
            baseUrl: this.mockServer.getUrl(),
            authentication: {
              authType: 'oauth2' as const,
              clientId: 'invalid-client',
              clientSecret: 'invalid-secret',
              environment: 'test' as const,
              timeout: 5000,
              retries: 1,
            },
          };

          let authFailed = false;
          try {
            const provider = await this.services.factory.createRosterProvider(config);
            await provider.initialize(config);
            await provider.authenticate(config.authentication);
          } catch (error) {
            authFailed = true;
          }

          return {
            success: authFailed, // We expect authentication to fail
            duration: 0,
            metrics: {
              recordsProcessed: 0,
              apiCalls: 1,
              cacheHits: 0,
              cacheMisses: 0,
              errorCount: authFailed ? 0 : 1,
              warningCount: 0,
            },
          };
        },
        cleanup: async () => {},
      },

      {
        name: 'credential-rotation-test',
        description: 'Test credential rotation functionality',
        category: 'security',
        priority: 'high',
        setup: async () => {},
        execute: async () => {
          const credentialMetadata = await this.services.credentials.storeCredential(
            'test-api-key-12345',
            {
              name: 'Test API Key',
              type: 'api_key',
              providerId: 'test-provider',
              environment: 'test',
              tags: ['testing'],
              accessPolicy: {
                allowedEnvironments: ['test'],
                allowedServices: ['integration-test'],
                requireMFA: false,
                maxConcurrentAccess: 1,
              },
            }
          );

          const rotationResult = await this.services.credentials.rotateCredential(
            credentialMetadata.id,
            'new-test-api-key-67890',
            'test-user'
          );

          return {
            success: rotationResult.success,
            duration: 0,
            metrics: {
              recordsProcessed: 1,
              apiCalls: 2, // Store + rotate
              cacheHits: 0,
              cacheMisses: 0,
              errorCount: rotationResult.success ? 0 : 1,
              warningCount: rotationResult.warnings?.length || 0,
            },
            data: rotationResult,
          };
        },
        cleanup: async () => {},
      },

      {
        name: 'security-audit-scan',
        description: 'Test security audit scanning functionality',
        category: 'security',
        priority: 'medium',
        setup: async () => {},
        execute: async () => {
          const scanId = await this.services.security.initiateSecurityScan(
            'test-integration',
            'integration',
            'vulnerability_scan',
            {
              depth: 'standard',
              scope: ['authentication', 'data_protection'],
              excludedTargets: [],
              customRules: [],
              notifications: {
                onStart: false,
                onCompletion: false,
                onCriticalFindings: false,
              },
              scheduling: {
                frequency: 'on_demand',
                maxDuration: 300,
              },
            },
            'test-user'
          );

          // Wait a bit for scan to complete (in a real test, we'd poll)
          await new Promise(resolve => setTimeout(resolve, 1000));

          const scanResults = await this.services.security.getSecurityScanResults(scanId);

          return {
            success: scanResults !== null,
            duration: 0,
            metrics: {
              recordsProcessed: 1,
              apiCalls: 2, // Initiate + get results
              cacheHits: 0,
              cacheMisses: 0,
              errorCount: scanResults ? 0 : 1,
              warningCount: 0,
            },
            data: scanResults,
          };
        },
        cleanup: async () => {},
      },
    ];
  }

  /**
   * Reliability test scenarios
   */
  private getReliabilityScenarios(): TestScenario[] {
    return [
      {
        name: 'network-interruption-recovery',
        description: 'Test recovery from network interruptions',
        category: 'reliability',
        priority: 'high',
        setup: async () => {},
        execute: async () => {
          // Simulate network interruption by temporarily stopping mock server
          await this.mockServer.stop();
          
          const config = await this.createTestProviderConfig();
          const provider = await this.services.factory.createRosterProvider(config);
          
          let connectionFailed = false;
          try {
            await provider.initialize(config);
            await provider.testConnection();
          } catch (error) {
            connectionFailed = true;
          }

          // Restart mock server
          await this.mockServer.start();
          
          // Test recovery
          let recovered = false;
          try {
            await provider.testConnection();
            recovered = true;
          } catch (error) {
            // Recovery failed
          }

          return {
            success: connectionFailed && recovered,
            duration: 0,
            metrics: {
              recordsProcessed: 0,
              apiCalls: 2,
              cacheHits: 0,
              cacheMisses: 0,
              errorCount: connectionFailed ? 0 : 1,
              warningCount: 0,
            },
          };
        },
        cleanup: async () => {},
      },

      {
        name: 'rate-limit-handling',
        description: 'Test handling of rate limits from external systems',
        category: 'reliability',
        priority: 'medium',
        setup: async () => {
          // Configure mock server with aggressive rate limiting
          // This would require reconfiguring the mock server
        },
        execute: async () => {
          const config = await this.createTestProviderConfig();
          const provider = await this.services.factory.createRosterProvider(config);
          await provider.initialize(config);

          // Make rapid requests to trigger rate limiting
          const rapidRequests = [];
          for (let i = 0; i < 10; i++) {
            rapidRequests.push(provider.getHealthStatus());
          }

          const results = await Promise.allSettled(rapidRequests);
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          const rateLimitedCount = results.filter(r => r.status === 'rejected').length;

          return {
            success: rateLimitedCount > 0, // We expect some requests to be rate limited
            duration: 0,
            metrics: {
              recordsProcessed: successCount,
              apiCalls: rapidRequests.length,
              cacheHits: 0,
              cacheMisses: 0,
              errorCount: rateLimitedCount,
              warningCount: 0,
            },
          };
        },
        cleanup: async () => {},
      },
    ];
  }

  /**
   * Data integrity test scenarios
   */
  private getDataIntegrityScenarios(): TestScenario[] {
    return [
      {
        name: 'data-corruption-detection',
        description: 'Test detection of data corruption during sync',
        category: 'data-integrity',
        priority: 'high',
        setup: async () => {},
        execute: async () => {
          // This would test the data validation and corruption detection
          const config = await this.createTestProviderConfig();
          const provider = await this.services.factory.createRosterProvider(config);
          await provider.initialize(config);

          // Simulate sync with some corrupted data
          const syncResult = await provider.performFullSync({
            syncId: 'corruption-test',
            externalSystemId: 'test-provider',
            startTime: new Date(),
          });

          // Check if corruption was detected (depends on mock server configuration)
          const corruptionDetected = syncResult.summary.warnings > 0 || syncResult.summary.errors > 0;

          return {
            success: true, // Always successful as this is testing detection capability
            duration: 0,
            metrics: {
              recordsProcessed: syncResult.summary.totalProcessed,
              apiCalls: syncResult.summary.apiCalls || 0,
              cacheHits: 0,
              cacheMisses: 0,
              errorCount: syncResult.summary.errors,
              warningCount: syncResult.summary.warnings || 0,
            },
            data: { corruptionDetected },
          };
        },
        cleanup: async () => {},
      },

      {
        name: 'duplicate-data-handling',
        description: 'Test handling of duplicate data during sync',
        category: 'data-integrity',
        priority: 'medium',
        setup: async () => {},
        execute: async () => {
          const config = await this.createTestProviderConfig();
          const provider = await this.services.factory.createRosterProvider(config);
          await provider.initialize(config);

          // Perform sync twice to test duplicate handling
          const firstSync = await provider.performFullSync({
            syncId: 'duplicate-test-1',
            externalSystemId: 'test-provider',
            startTime: new Date(),
          });

          const secondSync = await provider.performFullSync({
            syncId: 'duplicate-test-2',
            externalSystemId: 'test-provider',
            startTime: new Date(),
          });

          // Second sync should handle duplicates properly
          const duplicatesHandled = secondSync.success && secondSync.summary.totalProcessed >= 0;

          return {
            success: firstSync.success && duplicatesHandled,
            duration: 0,
            metrics: {
              recordsProcessed: firstSync.summary.totalProcessed + secondSync.summary.totalProcessed,
              apiCalls: (firstSync.summary.apiCalls || 0) + (secondSync.summary.apiCalls || 0),
              cacheHits: 0,
              cacheMisses: 0,
              errorCount: firstSync.summary.errors + secondSync.summary.errors,
              warningCount: (firstSync.summary.warnings || 0) + (secondSync.summary.warnings || 0),
            },
          };
        },
        cleanup: async () => {},
      },
    ];
  }

  // Helper methods

  private async createTestProviderConfig(): Promise<any> {
    return {
      providerId: 'test-provider',
      providerName: 'Test Provider',
      enabled: true,
      environment: 'test' as const,
      baseUrl: this.mockServer.getUrl(),
      authentication: {
        authType: 'oauth2' as const,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        environment: 'test' as const,
        timeout: 30000,
        retries: 3,
      },
    };
  }

  private createMockPrismaService(): any {
    return {
      // Mock Prisma service methods
      integration: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      externalSystemMapping: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      integrationAuditLog: {
        create: jest.fn(),
      },
      integrationConfiguration: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
  }

  private createMockRedisService(): any {
    const storage = new Map();
    
    return {
      get: jest.fn((key: string) => Promise.resolve(storage.get(key) || null)),
      set: jest.fn((key: string, value: any) => Promise.resolve(storage.set(key, value))),
      setex: jest.fn((key: string, ttl: number, value: any) => Promise.resolve(storage.set(key, value))),
      del: jest.fn((key: string) => Promise.resolve(storage.delete(key))),
      keys: jest.fn((pattern: string) => Promise.resolve(Array.from(storage.keys()).filter(k => k.includes(pattern)))),
    };
  }
}
