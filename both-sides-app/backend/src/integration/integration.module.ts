/**
 * Phase 9 Task 9.1: Integration Layer Module
 * 
 * This module provides the complete integration layer infrastructure for external
 * system integrations. It includes provider registry, factory services, configuration
 * management, and all the necessary components for integration management.
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { CommonModule } from '../common/common.module';

// Services
import { IntegrationRegistry } from './services/integration-registry.service';
import { ProviderFactory } from './factories/provider-factory.service';
import { ExternalIdMappingService } from './services/external-id-mapping.service';
import { MappingCacheService } from './services/mapping-cache.service';

// Controllers
import { ExternalIdMappingController } from './controllers/external-id-mapping.controller';

// Mock data generator (for enhanced mock provider)
import { MockDataGenerator } from '../roster/testing/mock-data-generator';

// Enhanced providers
import { EnhancedMockRosterProvider } from './providers/enhanced-mock-roster-provider';

/**
 * Integration module configuration interface
 */
export interface IntegrationModuleConfig {
  registry: {
    enabledProviders: string[];
    defaultProvider?: string;
    healthCheckInterval: number;
    providerTimeout: number;
    maxRetries: number;
    enableAutoReconnect: boolean;
  };
  factory: {
    enabledProviders: string[];
    defaultConfigurations: Record<string, any>;
  };
  security: {
    encryptCredentials: boolean;
    credentialRotationInterval: number;
    requireHttps: boolean;
    validateCertificates: boolean;
  };
  database: {
    enableConnectionPooling: boolean;
    maxConnections: number;
    connectionTimeout: number;
    queryTimeout: number;
  };
}

/**
 * Default configuration for the integration module
 */
export const DEFAULT_INTEGRATION_CONFIG: IntegrationModuleConfig = {
  registry: {
    enabledProviders: ['mock'],
    defaultProvider: 'mock',
    healthCheckInterval: 300000, // 5 minutes
    providerTimeout: 30000, // 30 seconds
    maxRetries: 3,
    enableAutoReconnect: true,
  },
  factory: {
    enabledProviders: ['mock'],
    defaultConfigurations: {},
  },
  security: {
    encryptCredentials: true,
    credentialRotationInterval: 2592000, // 30 days
    requireHttps: true,
    validateCertificates: true,
  },
  database: {
    enableConnectionPooling: true,
    maxConnections: 20,
    connectionTimeout: 5000,
    queryTimeout: 30000,
  },
};

/**
 * Global integration module that provides integration services across the application
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    CommonModule,
  ],
  controllers: [
    ExternalIdMappingController,
  ],
  providers: [
    // Core integration services
    IntegrationRegistry,
    ProviderFactory,
    ExternalIdMappingService,
    MappingCacheService,
    
    // Mock data generator for enhanced mock provider
    {
      provide: 'MockDataGenerator',
      useClass: MockDataGenerator,
    },
    
    // Enhanced mock provider (can be injected directly)
    {
      provide: 'EnhancedMockRosterProvider',
      useFactory: (factory: ProviderFactory) => {
        // This is a factory method that creates configured instances
        return (config: any) => factory.createRosterProvider(config);
      },
      inject: [ProviderFactory],
    },
    
    // Integration configuration provider
    {
      provide: 'INTEGRATION_CONFIG',
      useFactory: () => DEFAULT_INTEGRATION_CONFIG,
    },
    
    // Integration module metadata
    {
      provide: 'INTEGRATION_MODULE_METADATA',
      useValue: {
        version: '1.0.0',
        phase: 'Phase 9',
        description: 'Integration Layer & TimeBack Preparation',
        supportedProviders: ['mock', 'timeback', 'google-classroom', 'canvas'],
        capabilities: ['roster', 'sync', 'auth', 'webhooks', 'realtime', 'batch', 'mapping'],
      },
    },
  ],
  exports: [
    // Export core services for use in other modules
    IntegrationRegistry,
    ProviderFactory,
    ExternalIdMappingService,
    MappingCacheService,
    'MockDataGenerator',
    'EnhancedMockRosterProvider',
    'INTEGRATION_CONFIG',
    'INTEGRATION_MODULE_METADATA',
  ],
})
export class IntegrationModule {
  constructor(
    private integrationRegistry: IntegrationRegistry,
    private providerFactory: ProviderFactory
  ) {
    this.logInitialization();
    this.registerDefaultProviders();
  }

  /**
   * Log module initialization details
   */
  private logInitialization(): void {
    console.log('');
    console.log('🔌 Integration Layer Module initialized');
    console.log('📋 Phase 9: Integration Layer & TimeBack Preparation');
    console.log('');
    console.log('🎯 Available Features:');
    console.log('  ✅ Integration Registry - Provider lifecycle management');
    console.log('  ✅ Provider Factory - Dynamic provider instantiation');
    console.log('  ✅ Enhanced Mock Provider - Full integration simulation');
    console.log('  ✅ Configuration Schemas - Type-safe configuration validation');
    console.log('  ✅ Database Schema Extensions - Integration management tables');
    console.log('  ✅ External ID Mapping Service - Bidirectional entity mapping');
    console.log('  ✅ Mapping Cache Service - Redis-based high-performance caching');
    console.log('  ✅ REST API Endpoints - Complete CRUD operations for mappings');
    console.log('  ✅ Sync Status Tracking - Real-time sync monitoring');
    console.log('  ✅ Audit Logging - Comprehensive integration logging');
    console.log('  ✅ Webhook Support - Real-time event processing');
    console.log('');
    console.log('🔧 Supported Providers:');
    console.log('  ✅ Mock Provider - Complete simulation for testing');
    console.log('  🚧 TimeBack Provider - Ready for implementation');
    console.log('  🚧 Google Classroom - Ready for implementation');
    console.log('  🚧 Canvas LMS - Ready for implementation');
    console.log('');
    console.log('🎛️ Core Capabilities:');
    console.log('  • Roster Management - Organizations, classes, users, enrollments');
    console.log('  • Data Synchronization - Full and incremental sync');
    console.log('  • Authentication - OAuth2, API key, JWT, custom methods');
    console.log('  • Conflict Resolution - Automated and manual conflict handling');
    console.log('  • Real-time Updates - Webhook and subscription support');
    console.log('  • Batch Operations - High-performance bulk operations');
    console.log('  • Health Monitoring - Provider status and performance tracking');
    console.log('  • Rate Limiting - Configurable request throttling');
    console.log('  • Caching - Multi-level response caching');
    console.log('  • Security - Encrypted credentials and secure communications');
    console.log('');
  }

  /**
   * Register default providers with the registry
   */
  private registerDefaultProviders(): void {
    // Register the enhanced mock provider
    this.integrationRegistry.registerProvider({
      providerId: 'mock',
      providerClass: EnhancedMockRosterProvider,
      capabilities: ['roster', 'sync', 'auth', 'mapping', 'batch', 'conflict-resolution'],
      defaultConfig: {
        providerId: 'mock',
        providerName: 'Enhanced Mock Educational System',
        enabled: true,
        priority: 50,
        environment: 'sandbox',
        baseUrl: 'https://mock.bothsides.ai/api',
        apiVersion: 'v1',
        authentication: {
          authType: 'custom',
          customParams: {},
          environment: 'sandbox',
          timeout: 30000,
          retries: 3,
        },
        sync: {
          enableFullSync: true,
          enableIncrementalSync: true,
          fullSyncSchedule: '0 2 * * *',
          incrementalSyncInterval: 300,
          batchSize: 100,
          maxConcurrentSyncs: 3,
        },
        features: {
          enableRealTimeSync: false,
          enableWebhooks: false,
          enableBatchOperations: true,
          enableConflictResolution: true,
          enableDataValidation: true,
          enableMetricsCollection: true,
        },
        customConfig: {
          scenario: 'medium-school',
          studentCount: 100,
          teacherCount: 10,
          classCount: 20,
          responseDelay: { min: 100, max: 500 },
          failureRate: 0.02,
          enableRealTimeUpdates: false,
        },
      },
      priority: 50,
      isEnabled: true,
      dependencies: ['MockDataGenerator'],
    });

    console.log('📝 Default providers registered successfully');
    
    // Log registry statistics
    const stats = this.integrationRegistry.getRegistryStats();
    console.log(`🏭 Integration Registry Status:`);
    console.log(`   • Total Registered: ${stats.totalRegistered}`);
    console.log(`   • Currently Active: ${stats.totalActive}`);
    console.log(`   • Enabled Providers: ${stats.enabledProviders.join(', ')}`);
    
    // Log factory statistics
    const factoryStats = this.providerFactory.getFactoryStats();
    console.log(`🏭 Provider Factory Status:`);
    console.log(`   • Registered Classes: ${factoryStats.registeredClasses}`);
    console.log(`   • Available Capabilities: ${factoryStats.availableCapabilities.join(', ')}`);
    console.log(`   • Total Dependencies: ${factoryStats.dependencyCount}`);
    console.log('');
  }

  /**
   * Create a ready-to-use mock provider instance
   */
  async createMockProvider(customConfig?: any): Promise<EnhancedMockRosterProvider> {
    const config = {
      providerId: 'mock',
      providerName: 'Enhanced Mock Educational System',
      enabled: true,
      priority: 50,
      environment: 'sandbox' as const,
      baseUrl: 'https://mock.bothsides.ai/api',
      apiVersion: 'v1',
      authentication: {
        authType: 'custom' as const,
        customParams: {},
        environment: 'sandbox' as const,
        timeout: 30000,
        retries: 3,
      },
      ...customConfig,
    };

    return await this.providerFactory.createRosterProvider(config) as EnhancedMockRosterProvider;
  }

  /**
   * Get integration module status
   */
  getModuleStatus(): {
    initialized: boolean;
    registryStats: any;
    factoryStats: any;
    enabledProviders: string[];
  } {
    return {
      initialized: true,
      registryStats: this.integrationRegistry.getRegistryStats(),
      factoryStats: this.providerFactory.getFactoryStats(),
      enabledProviders: this.providerFactory.getRegisteredProviderClasses(),
    };
  }
}
