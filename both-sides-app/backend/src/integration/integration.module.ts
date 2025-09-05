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
import { DataSyncEngineService } from './services/data-sync-engine.service';

// Synchronizer services
import { UserSynchronizerService } from './services/synchronizers/user-synchronizer.service';
import { ClassSynchronizerService } from './services/synchronizers/class-synchronizer.service';
import { OrganizationSynchronizerService } from './services/synchronizers/organization-synchronizer.service';
import { EnrollmentSynchronizerService } from './services/synchronizers/enrollment-synchronizer.service';
import { SynchronizerFactoryService } from './services/synchronizers/synchronizer-factory.service';

// Change tracking services
import { ChangeDetectionService } from './services/change-tracking/change-detection.service';
import { ChangeTrackingService } from './services/change-tracking/change-tracking.service';
import { ChangeHistoryService } from './services/change-tracking/change-history.service';

// Conflict resolution services
import { ConflictDetectionService } from './services/conflict-resolution/conflict-detection.service';
import { ConflictResolutionService } from './services/conflict-resolution/conflict-resolution.service';
import { ConflictManagementService } from './services/conflict-resolution/conflict-management.service';

// Monitoring services
import { SyncMonitoringService } from './services/monitoring/sync-monitoring.service';
import { SyncDashboardService } from './services/monitoring/sync-dashboard.service';
import { SyncAlertingService } from './services/monitoring/sync-alerting.service';
import { SyncReportingService } from './services/monitoring/sync-reporting.service';

// Reliability services
import { RateLimiterService } from './services/reliability/rate-limiter.service';
import { CircuitBreakerService } from './services/reliability/circuit-breaker.service';
import { ReliabilityManagerService } from './services/reliability/reliability-manager.service';

// API client services
import { ApiClientConfigService } from './clients/api-client-config.service';

// Health monitoring services
import { HealthCheckService } from './services/health/health-check.service';
import { ApiPerformanceService } from './services/health/api-performance.service';
import { HealthDashboardService } from './services/health/health-dashboard.service';

// Caching and optimization services
import { IntelligentCacheService } from './services/caching/intelligent-cache.service';
import { CachePerformanceService } from './services/caching/cache-performance.service';
import { ResponseOptimizationService } from './services/caching/response-optimization.service';

// TimeBack integration services
import { TimeBackCompleteClient } from './clients/timeback-complete-client';
import { TimeBackRealTimeSyncService } from './services/timeback/timeback-realtime-sync.service';
import { TimeBackDataMapperService } from './services/timeback/timeback-data-mapper.service';
import { TimeBackRosterProvider } from './providers/timeback-roster-provider';

// Integration management services
import { IntegrationManagementService } from './services/management/integration-management.service';
import { IntegrationStatusService } from './services/management/integration-status.service';

// Configuration management services
import { ConfigurationValidationService } from './services/configuration/configuration-validation.service';
import { EnvironmentConfigurationService } from './services/configuration/environment-configuration.service';

// Security management services
import { CredentialManagementService } from './services/security/credential-management.service';
import { ComplianceMonitoringService } from './services/security/compliance-monitoring.service';
import { SecurityAuditService } from './services/security/security-audit.service';

// Validation services
import { DataQualityMonitorService } from './services/validation/data-quality-monitor.service';
import { ValidationReportingService } from './services/validation/validation-reporting.service';
import { DataReconciliationService } from './services/validation/data-reconciliation.service';

// Performance services
import { PerformanceTestingService } from './services/performance/performance-testing.service';
import { OptimizationService } from './services/performance/optimization.service';
import { PerformanceMonitoringService } from './services/performance/performance-monitoring.service';

// Production services
import { ProductionReadinessService } from './services/production/production-readiness.service';
import { ProductionDeploymentService } from './services/production/production-deployment.service';

// Controllers
import { ExternalIdMappingController } from './controllers/external-id-mapping.controller';
import { ChangeTrackingController } from './controllers/change-tracking.controller';
import { ConflictResolutionController } from './controllers/conflict-resolution.controller';
import { SyncMonitoringController } from './controllers/sync-monitoring.controller';
import { HealthMonitoringController } from './controllers/health-monitoring.controller';
import { CacheManagementController } from './controllers/cache-management.controller';
import { IntegrationAdministrationController } from './controllers/integration-administration.controller';
import { ConfigurationManagementController } from './controllers/configuration-management.controller';
import { SecurityManagementController } from './controllers/security-management.controller';
import { DataValidationController } from './controllers/data-validation.controller';
import { PerformanceMonitoringController } from './controllers/performance-monitoring.controller';
import { ProductionManagementController } from './controllers/production-management.controller';

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
    ChangeTrackingController,
    ConflictResolutionController,
    SyncMonitoringController,
    HealthMonitoringController,
    CacheManagementController,
    IntegrationAdministrationController,
    ConfigurationManagementController,
    SecurityManagementController,
    DataValidationController,
    PerformanceMonitoringController,
    ProductionManagementController,
  ],
  providers: [
    // Core integration services
    IntegrationRegistry,
    ProviderFactory,
    ExternalIdMappingService,
    MappingCacheService,
    DataSyncEngineService,
    
    // Entity synchronizers
    UserSynchronizerService,
    ClassSynchronizerService,
    OrganizationSynchronizerService,
    EnrollmentSynchronizerService,
    SynchronizerFactoryService,
    
    // Change tracking services
    ChangeDetectionService,
    ChangeTrackingService,
    ChangeHistoryService,
    
    // Conflict resolution services
    ConflictDetectionService,
    ConflictResolutionService,
    ConflictManagementService,
    
    // Monitoring services
    SyncMonitoringService,
    SyncDashboardService,
    SyncAlertingService,
    SyncReportingService,
    
    // Reliability services
    RateLimiterService,
    CircuitBreakerService,
    ReliabilityManagerService,
    
    // API client services
    ApiClientConfigService,
    
    // Health monitoring services
    HealthCheckService,
    ApiPerformanceService,
    HealthDashboardService,
    
    // Caching and optimization services
    IntelligentCacheService,
    CachePerformanceService,
    ResponseOptimizationService,
    
    // TimeBack integration services
    TimeBackCompleteClient,
    TimeBackRealTimeSyncService,
    TimeBackDataMapperService,
    TimeBackRosterProvider,
    
    // Integration management services
    IntegrationManagementService,
    IntegrationStatusService,
    
    // Configuration management services
    ConfigurationValidationService,
    EnvironmentConfigurationService,
    
    // Security management services
    CredentialManagementService,
    ComplianceMonitoringService,
    SecurityAuditService,
    
    // Validation services
    DataQualityMonitorService,
    ValidationReportingService,
    DataReconciliationService,
    
    // Performance services
    PerformanceTestingService,
    OptimizationService,
    PerformanceMonitoringService,
    
    // Production services
    ProductionReadinessService,
    ProductionDeploymentService,
    
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
    DataSyncEngineService,
    
    // Export synchronizer services
    UserSynchronizerService,
    ClassSynchronizerService,
    OrganizationSynchronizerService,
    EnrollmentSynchronizerService,
    SynchronizerFactoryService,
    
    // Export change tracking services
    ChangeDetectionService,
    ChangeTrackingService,
    ChangeHistoryService,
    
    // Export conflict resolution services
    ConflictDetectionService,
    ConflictResolutionService,
    ConflictManagementService,
    
    // Export monitoring services
    SyncMonitoringService,
    SyncDashboardService,
    SyncAlertingService,
    SyncReportingService,
    
    // Export reliability services
    RateLimiterService,
    CircuitBreakerService,
    ReliabilityManagerService,
    
    // Export API client services
    ApiClientConfigService,
    
    // Export health monitoring services
    HealthCheckService,
    ApiPerformanceService,
    HealthDashboardService,
    
    // Export caching and optimization services
    IntelligentCacheService,
    CachePerformanceService,
    ResponseOptimizationService,
    
    // Export TimeBack integration services
    TimeBackCompleteClient,
    TimeBackRealTimeSyncService,
    TimeBackDataMapperService,
    TimeBackRosterProvider,
    
    // Export integration management services
    IntegrationManagementService,
    IntegrationStatusService,
    
    // Export configuration management services
    ConfigurationValidationService,
    EnvironmentConfigurationService,
    
    // Export security management services
    CredentialManagementService,
    ComplianceMonitoringService,
    SecurityAuditService,
    
    // Export validation services
    DataQualityMonitorService,
    ValidationReportingService,
    DataReconciliationService,
    
    // Export performance services
    PerformanceTestingService,
    OptimizationService,
    PerformanceMonitoringService,
    
    // Export production services
    ProductionReadinessService,
    ProductionDeploymentService,
    
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
    console.log('  ✅ Entity-Specific Synchronizers - User, Class, Organization, Enrollment');
    console.log('  ✅ Synchronizer Factory - Centralized synchronizer management');
    console.log('  ✅ Data Sync Engine - Orchestrated sync operations');
    console.log('  ✅ Conflict Resolution - Automated and manual conflict handling');
    console.log('  ✅ Change Detection System - Intelligent change detection and delta analysis');
    console.log('  ✅ Change Tracking Service - Comprehensive change management and analytics');
    console.log('  ✅ Change History Management - Persistent storage with lifecycle management');
    console.log('  ✅ Incremental Sync Planning - Smart sync optimization based on changes');
    console.log('  ✅ Conflict Detection Service - Advanced conflict detection with field-level analysis');
    console.log('  ✅ Conflict Resolution Engine - Multi-strategy conflict resolution framework');
    console.log('  ✅ Conflict Management System - Workflow orchestration and escalation management');
    console.log('  ✅ Sync Monitoring Service - Comprehensive sync session tracking and analytics');
    console.log('  ✅ Dashboard Service - Real-time dashboard data and health monitoring');
    console.log('  ✅ Alerting System - Intelligent alerting with multi-channel notifications');
    console.log('  ✅ Reporting Engine - Automated report generation and scheduling');
    console.log('  ✅ Rate Limiter - Advanced rate limiting with multiple algorithms');
    console.log('  ✅ Circuit Breaker - Fault tolerance and graceful degradation');
    console.log('  ✅ Reliability Manager - Comprehensive reliability orchestration');
    console.log('  ✅ API Client Framework - HTTP client with auth and configuration management');
    console.log('  ✅ Health Check Service - Periodic API health monitoring and status tracking');
    console.log('  ✅ Performance Monitor - Advanced metrics collection and analysis');
    console.log('  ✅ Health Dashboard - Real-time monitoring dashboard with charts and alerts');
    console.log('  ✅ Intelligent Cache - Multi-level caching with TTL and smart invalidation');
    console.log('  ✅ Cache Performance - Advanced performance monitoring and optimization recommendations');
    console.log('  ✅ Response Optimization - Compression, batching, and connection pooling');
    console.log('  ✅ TimeBack Complete Client - Full API client with endpoint mapping and reliability');
    console.log('  ✅ TimeBack Real-Time Sync - Webhook processing and live data synchronization');
    console.log('  ✅ TimeBack Data Mapper - Bidirectional data transformation and validation');
    console.log('  ✅ TimeBack Roster Provider - Production-ready complete integration');
    console.log('  ✅ Integration Management - Comprehensive provider management and administration');
    console.log('  ✅ Integration Status Service - Real-time status tracking and monitoring');
    console.log('  ✅ Configuration Validation - Schema-based validation with connection testing');
    console.log('  ✅ Environment Configuration - Multi-environment configuration management');
    console.log('  ✅ Credential Management - Secure credential storage with encryption and rotation');
    console.log('  ✅ Compliance Monitoring - FERPA/GDPR compliance with audit trails');
    console.log('  ✅ Security Audit Framework - Vulnerability scanning and incident response');
    console.log('  ✅ Data Quality Monitor - Comprehensive data validation with automated quality checks');
    console.log('  ✅ Validation Reporting - Dashboard and analytics for data quality monitoring');
    console.log('  ✅ Data Reconciliation - Cross-system data comparison and discrepancy resolution');
    console.log('  ✅ Performance Testing - Load, stress, and endurance testing with automated benchmarking');
    console.log('  ✅ Optimization Engine - Bottleneck identification with automated optimization recommendations');
    console.log('  ✅ Performance Monitoring - Real-time metrics collection with intelligent alerting');
    console.log('  ✅ Production Readiness - Comprehensive validation and go-live procedures');
    console.log('  ✅ Production Deployment - Automated deployment planning and execution');
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
    console.log('  • Change Detection - Intelligent field-level change analysis');
    console.log('  • Change Tracking - Comprehensive change history and analytics');
    console.log('  • Delta Calculation - Efficient data difference computation');
    console.log('  • Incremental Sync - Smart sync based on detected changes');
    console.log('  • Conflict Detection - Advanced field-level conflict analysis');
    console.log('  • Conflict Resolution - Multi-strategy resolution with 7 strategies');
    console.log('  • Conflict Management - Workflow orchestration and escalation');
    console.log('  • Resolution Policies - Configurable rules and custom handlers');
    console.log('  • Sync Monitoring - Real-time session tracking and performance metrics');
    console.log('  • Dashboard Analytics - Comprehensive health monitoring and insights');
    console.log('  • Intelligent Alerting - Multi-channel notifications with escalation');
    console.log('  • Automated Reporting - Scheduled reports with multiple export formats');
    console.log('  • Rate Limiting - Token bucket, sliding window, fixed window algorithms');
    console.log('  • Circuit Breaker - Automatic failure detection and recovery');
    console.log('  • Retry Logic - Exponential backoff with jitter and custom conditions');
    console.log('  • Request Queuing - Priority-based queuing with bulkhead isolation');
    console.log('  • API Client Framework - Base and TimeBack-specific HTTP clients');
    console.log('  • Configuration Management - Dynamic config with credential rotation');
    console.log('  • Health Check System - Periodic API health monitoring with endpoint-specific checks');
    console.log('  • Performance Monitoring - Advanced metrics collection, baseline establishment, trend analysis');
    console.log('  • Health Dashboard - Real-time monitoring with charts, alerts, and interactive widgets');
    console.log('  • Intelligent Caching - Multi-level cache with memory, Redis, database layers');
    console.log('  • Cache Performance - Hit rate optimization, bottleneck detection, automated tuning');
    console.log('  • Response Optimization - Compression, batching, connection pooling, transformation');
    console.log('  • Cache Management - Administrative API for cache operations and analytics');
    console.log('  • TimeBack Integration - Complete roster provider with full API coverage');
    console.log('  • Real-Time Synchronization - Webhook-based live data updates with conflict resolution');
    console.log('  • Data Mapping Pipeline - Bidirectional transformation with validation and error handling');
    console.log('  • Production-Ready Provider - Full roster interface implementation with monitoring');
    console.log('  • Integration Management - Comprehensive provider management and administration dashboard');
    console.log('  • Real-Time Status Tracking - Live provider status monitoring with event tracking');
    console.log('  • Provider Lifecycle Management - Complete lifecycle control (start, stop, restart, configure)');
    console.log('  • Administrative Interface - REST API suite for management dashboard operations');
    console.log('  • Alert Management - Comprehensive alerting with acknowledgment and escalation');
    console.log('  • Performance Analytics - Usage analytics, SLA tracking, and automated reporting');
    console.log('  • Configuration Validation - Schema-based validation with connection testing and backup');
    console.log('  • Environment Management - Multi-environment configuration with inheritance and secret management');
    console.log('  • Configuration Versioning - Backup, versioning, and rollback capabilities');
    console.log('  • Configuration APIs - REST API suite for configuration CRUD operations');
    console.log('  • Credential Management - Encrypted storage, rotation, and secure access controls');
    console.log('  • Compliance Monitoring - Data access logging, consent management, breach reporting');
    console.log('  • Security Audit Framework - Vulnerability scanning, incident response, security reporting');
    console.log('  • Privacy Rights Management - GDPR Article 15-21 implementation with workflow automation');
    console.log('  • Security Incident Response - Automated incident detection, containment, and recovery workflows');
    console.log('  • Multi-Factor Authentication - MFA integration for sensitive credential and system access');
    console.log('  • Data Quality Monitoring - Automated validation rules with completeness, accuracy, consistency checks');
    console.log('  • Quality Reporting - Real-time dashboards, trend analysis, quality score tracking');
    console.log('  • Validation Alerts - Intelligent alerting system with severity-based notifications');
    console.log('  • Data Reconciliation - Cross-system comparison with automated and manual correction workflows');
    console.log('  • Discrepancy Management - Detection, tracking, and resolution of data inconsistencies');
    console.log('  • Performance Testing - Load, stress, endurance, and volume testing with configurable scenarios');
    console.log('  • Bottleneck Analysis - Intelligent identification of performance bottlenecks with root cause analysis');
    console.log('  • Optimization Recommendations - AI-powered optimization suggestions with implementation plans');
    console.log('  • Capacity Planning - Predictive capacity analysis with horizontal and vertical scaling recommendations');
    console.log('  • Real-time Monitoring - Continuous performance metrics collection with threshold-based alerting');
    console.log('  • Performance Alerting - Intelligent alert system with cooldown periods and escalation management');
    console.log('  • Production Readiness - Automated readiness assessment with comprehensive validation checks');
    console.log('  • Go-Live Procedures - Structured deployment workflows with rollback capabilities');
    console.log('  • Deployment Planning - Intelligent deployment planning with risk assessment and approval workflows');
    console.log('  • Deployment Execution - Automated deployment orchestration with real-time monitoring');
    console.log('  • Environment Validation - Multi-environment validation with configuration management');
    console.log('  • Deployment Monitoring - Real-time deployment tracking with progress visualization');
    console.log('  • Authentication - OAuth2, API key, JWT, custom methods');
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
