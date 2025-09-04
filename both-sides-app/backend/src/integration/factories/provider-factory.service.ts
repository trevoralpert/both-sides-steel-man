/**
 * Phase 9 Task 9.1.3: Provider Factory & Registration System
 * 
 * This service provides a factory pattern for creating and registering different
 * types of integration providers. It handles dependency injection, configuration
 * management, and provider lifecycle.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { 
  IExternalSystemProvider, 
  IRosterProvider,
  IDataSyncProvider,
  IAuthenticationProvider,
  IWebhookProvider,
  IRealtimeProvider,
  IBatchOperationProvider
} from '../interfaces/core-integration.interface';
import { IntegrationConfig, validateProviderConfig } from '../schemas/integration-config.schema';
import { ProviderRegistration } from '../services/integration-registry.service';
import { EnhancedMockRosterProvider, EnhancedMockRosterProviderConfig } from '../providers/enhanced-mock-roster-provider';
import { MockDataGenerator } from '../../roster/testing/mock-data-generator';

/**
 * Provider factory configuration
 */
export interface ProviderFactoryConfig {
  enabledProviders: string[];
  defaultConfigurations: Record<string, any>;
  dependencies: Record<string, string[]>;
}

/**
 * Provider creation context
 */
export interface ProviderCreationContext {
  providerId: string;
  config: IntegrationConfig;
  dependencies: Map<string, any>;
  environment: string;
}

/**
 * Factory service for creating and managing integration providers
 */
@Injectable()
export class ProviderFactory {
  private readonly logger = new Logger(ProviderFactory.name);
  
  // Registry of available provider classes
  private readonly providerClasses = new Map<string, {
    class: new (...args: any[]) => IExternalSystemProvider;
    capabilities: string[];
    dependencies: string[];
  }>();
  
  // Factory configuration
  private readonly factoryConfig: ProviderFactoryConfig;

  constructor(
    private moduleRef: ModuleRef,
    private configService: ConfigService,
    @Inject('MockDataGenerator') private mockDataGenerator: MockDataGenerator
  ) {
    this.factoryConfig = {
      enabledProviders: this.configService.get('INTEGRATION_ENABLED_PROVIDERS', 'mock').split(','),
      defaultConfigurations: this.configService.get('INTEGRATION_DEFAULT_CONFIGS', {}),
      dependencies: this.configService.get('INTEGRATION_DEPENDENCIES', {})
    };
    
    this.registerBuiltInProviders();
    this.logger.log('Provider Factory initialized');
  }

  // ================================================================
  // PROVIDER CLASS REGISTRATION
  // ================================================================

  /**
   * Register a provider class with the factory
   */
  registerProviderClass(
    providerId: string,
    providerClass: new (...args: any[]) => IExternalSystemProvider,
    capabilities: string[],
    dependencies: string[] = []
  ): void {
    this.providerClasses.set(providerId, {
      class: providerClass,
      capabilities,
      dependencies
    });
    
    this.logger.log(`Registered provider class: ${providerId} with capabilities: ${capabilities.join(', ')}`);
  }

  /**
   * Unregister a provider class
   */
  unregisterProviderClass(providerId: string): void {
    if (this.providerClasses.delete(providerId)) {
      this.logger.log(`Unregistered provider class: ${providerId}`);
    }
  }

  /**
   * Get all registered provider classes
   */
  getRegisteredProviderClasses(): string[] {
    return Array.from(this.providerClasses.keys());
  }

  /**
   * Check if a provider class is registered
   */
  isProviderClassRegistered(providerId: string): boolean {
    return this.providerClasses.has(providerId);
  }

  /**
   * Get provider class capabilities
   */
  getProviderClassCapabilities(providerId: string): string[] {
    return this.providerClasses.get(providerId)?.capabilities || [];
  }

  // ================================================================
  // PROVIDER CREATION
  // ================================================================

  /**
   * Create a provider instance from configuration
   */
  async createProvider(config: IntegrationConfig): Promise<IExternalSystemProvider> {
    const { providerId } = config;
    
    this.logger.log(`Creating provider instance: ${providerId}`);
    
    // Validate configuration
    const validatedConfig = this.validateAndEnrichConfig(config);
    
    // Check if provider class is registered
    const providerInfo = this.providerClasses.get(providerId);
    if (!providerInfo) {
      throw new Error(`Provider class not registered: ${providerId}`);
    }
    
    // Resolve dependencies
    const dependencies = await this.resolveDependencies(providerId, providerInfo.dependencies);
    
    // Create context
    const context: ProviderCreationContext = {
      providerId,
      config: validatedConfig,
      dependencies,
      environment: validatedConfig.environment
    };
    
    // Create provider instance
    const provider = await this.instantiateProvider(context, providerInfo.class);
    
    // Initialize provider
    await provider.initialize(validatedConfig);
    
    this.logger.log(`Successfully created provider instance: ${providerId}`);
    return provider;
  }

  /**
   * Create a provider with specific type casting
   */
  async createProviderWithType<T extends IExternalSystemProvider>(
    config: IntegrationConfig,
    expectedType: string
  ): Promise<T> {
    const provider = await this.createProvider(config);
    
    // Verify the provider has the expected capability
    const capabilities = this.getProviderClassCapabilities(config.providerId);
    if (!capabilities.includes(expectedType)) {
      throw new Error(`Provider ${config.providerId} does not support capability: ${expectedType}`);
    }
    
    return provider as T;
  }

  /**
   * Create a roster provider instance
   */
  async createRosterProvider(config: IntegrationConfig): Promise<IRosterProvider> {
    return this.createProviderWithType<IRosterProvider>(config, 'roster');
  }

  /**
   * Create multiple providers from configurations
   */
  async createProviders(configs: IntegrationConfig[]): Promise<Map<string, IExternalSystemProvider>> {
    const providers = new Map<string, IExternalSystemProvider>();
    const creationPromises = configs.map(async (config) => {
      try {
        const provider = await this.createProvider(config);
        providers.set(config.providerId, provider);
      } catch (error) {
        this.logger.error(`Failed to create provider ${config.providerId}:`, error);
      }
    });
    
    await Promise.allSettled(creationPromises);
    
    this.logger.log(`Created ${providers.size} provider instances out of ${configs.length} configurations`);
    return providers;
  }

  // ================================================================
  // PROVIDER REGISTRATION HELPERS
  // ================================================================

  /**
   * Create provider registration from configuration
   */
  createProviderRegistration(config: IntegrationConfig): ProviderRegistration {
    const providerInfo = this.providerClasses.get(config.providerId);
    if (!providerInfo) {
      throw new Error(`Provider class not registered: ${config.providerId}`);
    }
    
    return {
      providerId: config.providerId,
      providerClass: providerInfo.class,
      capabilities: providerInfo.capabilities,
      defaultConfig: config,
      priority: config.priority,
      isEnabled: config.enabled,
      dependencies: providerInfo.dependencies
    };
  }

  /**
   * Create multiple provider registrations
   */
  createProviderRegistrations(configs: IntegrationConfig[]): ProviderRegistration[] {
    return configs.map(config => this.createProviderRegistration(config));
  }

  // ================================================================
  // CONFIGURATION MANAGEMENT
  // ================================================================

  /**
   * Validate and enrich provider configuration
   */
  private validateAndEnrichConfig(config: IntegrationConfig): IntegrationConfig {
    // Validate using Zod schema
    const validatedConfig = validateProviderConfig(config);
    
    // Merge with default configurations
    const defaultConfig = this.factoryConfig.defaultConfigurations[config.providerId] || {};
    
    return {
      ...defaultConfig,
      ...validatedConfig,
      customConfig: {
        ...defaultConfig.customConfig,
        ...validatedConfig.customConfig
      }
    };
  }

  /**
   * Resolve provider dependencies
   */
  private async resolveDependencies(
    providerId: string, 
    dependencyNames: string[]
  ): Promise<Map<string, any>> {
    const dependencies = new Map<string, any>();
    
    for (const dependencyName of dependencyNames) {
      try {
        const dependency = await this.moduleRef.get(dependencyName, { strict: false });
        dependencies.set(dependencyName, dependency);
        this.logger.debug(`Resolved dependency ${dependencyName} for provider ${providerId}`);
      } catch (error) {
        this.logger.warn(`Could not resolve dependency ${dependencyName} for provider ${providerId}:`, error);
      }
    }
    
    return dependencies;
  }

  /**
   * Instantiate provider with proper dependency injection
   */
  private async instantiateProvider(
    context: ProviderCreationContext,
    ProviderClass: new (...args: any[]) => IExternalSystemProvider
  ): Promise<IExternalSystemProvider> {
    const { providerId, config, dependencies } = context;
    
    // Special handling for known provider types
    switch (providerId) {
      case 'mock':
        return this.createMockProvider(config, dependencies);
      
      case 'timeback':
        return this.createTimeBackProvider(config, dependencies);
      
      case 'google-classroom':
        return this.createGoogleClassroomProvider(config, dependencies);
      
      case 'canvas':
        return this.createCanvasProvider(config, dependencies);
      
      default:
        // Generic provider instantiation
        return new ProviderClass(config, dependencies);
    }
  }

  /**
   * Create mock provider instance
   */
  private createMockProvider(
    config: IntegrationConfig,
    dependencies: Map<string, any>
  ): EnhancedMockRosterProvider {
    const mockConfig: EnhancedMockRosterProviderConfig = {
      providerId: config.providerId,
      providerName: config.providerName,
      providerVersion: config.apiVersion || '1.0.0',
      environment: config.environment,
      scenario: config.customConfig?.scenario || 'medium-school',
      dataConfig: {
        studentCount: config.customConfig?.studentCount || 100,
        teacherCount: config.customConfig?.teacherCount || 10,
        classCount: config.customConfig?.classCount || 20
      },
      responseDelay: config.customConfig?.responseDelay || { min: 100, max: 500 },
      failureRate: config.customConfig?.failureRate || 0.02,
      rateLimits: config.rateLimit,
      syncConfig: {
        enableRealTime: config.features?.enableRealTimeSync || false,
        enableWebhooks: config.features?.enableWebhooks || false,
        enableIncremental: config.sync?.enableIncrementalSync || true,
        conflictRate: 0.1,
        batchSize: config.sync?.batchSize || 10
      },
      authConfig: {
        authType: config.authentication.authType,
        tokenExpiry: 3600,
        requiresRefresh: true
      }
    };
    
    return new EnhancedMockRosterProvider(mockConfig, this.mockDataGenerator);
  }

  /**
   * Create TimeBack provider instance (placeholder)
   */
  private createTimeBackProvider(
    config: IntegrationConfig,
    dependencies: Map<string, any>
  ): IExternalSystemProvider {
    // TODO: Implement actual TimeBack provider
    throw new Error('TimeBack provider not yet implemented');
  }

  /**
   * Create Google Classroom provider instance (placeholder)
   */
  private createGoogleClassroomProvider(
    config: IntegrationConfig,
    dependencies: Map<string, any>
  ): IExternalSystemProvider {
    // TODO: Implement Google Classroom provider
    throw new Error('Google Classroom provider not yet implemented');
  }

  /**
   * Create Canvas provider instance (placeholder)
   */
  private createCanvasProvider(
    config: IntegrationConfig,
    dependencies: Map<string, any>
  ): IExternalSystemProvider {
    // TODO: Implement Canvas provider
    throw new Error('Canvas provider not yet implemented');
  }

  // ================================================================
  // BUILT-IN PROVIDER REGISTRATION
  // ================================================================

  /**
   * Register built-in provider classes
   */
  private registerBuiltInProviders(): void {
    // Register Enhanced Mock Provider
    this.registerProviderClass(
      'mock',
      EnhancedMockRosterProvider,
      ['roster', 'sync', 'auth', 'mapping', 'batch'],
      ['MockDataGenerator']
    );
    
    // TODO: Register other built-in providers when implemented
    // this.registerProviderClass('timeback', TimeBackRosterProvider, ['roster', 'sync', 'auth', 'webhooks', 'realtime']);
    // this.registerProviderClass('google-classroom', GoogleClassroomProvider, ['roster', 'sync', 'auth']);
    // this.registerProviderClass('canvas', CanvasProvider, ['roster', 'sync', 'auth', 'webhooks']);
    
    this.logger.log('Built-in providers registered');
  }

  // ================================================================
  // UTILITY METHODS
  // ================================================================

  /**
   * Get factory statistics
   */
  getFactoryStats(): {
    registeredClasses: number;
    enabledProviders: string[];
    availableCapabilities: string[];
    dependencyCount: number;
  } {
    const allCapabilities = new Set<string>();
    let dependencyCount = 0;
    
    Array.from(this.providerClasses.values()).forEach(info => {
      info.capabilities.forEach(cap => allCapabilities.add(cap));
      dependencyCount += info.dependencies.length;
    });
    
    return {
      registeredClasses: this.providerClasses.size,
      enabledProviders: this.factoryConfig.enabledProviders,
      availableCapabilities: Array.from(allCapabilities),
      dependencyCount
    };
  }

  /**
   * Find providers by capability
   */
  findProvidersByCapability(capability: string): string[] {
    const providers: string[] = [];
    
    for (const [providerId, info] of this.providerClasses.entries()) {
      if (info.capabilities.includes(capability)) {
        providers.push(providerId);
      }
    }
    
    return providers;
  }

  /**
   * Check if provider supports capability
   */
  supportsCapability(providerId: string, capability: string): boolean {
    const info = this.providerClasses.get(providerId);
    return info ? info.capabilities.includes(capability) : false;
  }
}
