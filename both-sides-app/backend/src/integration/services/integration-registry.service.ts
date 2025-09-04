/**
 * Phase 9 Task 9.1.1: Integration Registry Service
 * 
 * This service manages the registration, discovery, and lifecycle of all external
 * system integration providers. It acts as the central registry for all providers
 * and handles provider factory instantiation and cleanup.
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { 
  IExternalSystemProvider, 
  IDataSyncProvider, 
  IRosterProvider,
  IAuthenticationProvider,
  IWebhookProvider,
  IRealtimeProvider,
  IBatchOperationProvider,
  IntegrationHealth,
  IntegrationStatus
} from '../interfaces/core-integration.interface';

/**
 * Provider registration metadata
 */
export interface ProviderRegistration {
  providerId: string;
  providerClass: new (...args: any[]) => IExternalSystemProvider;
  capabilities: string[];
  defaultConfig: Record<string, any>;
  priority: number;
  isEnabled: boolean;
  dependencies?: string[];
}

/**
 * Provider instance tracking
 */
export interface ProviderInstance {
  providerId: string;
  provider: IExternalSystemProvider;
  status: IntegrationStatus;
  lastHealth?: IntegrationHealth;
  registeredAt: Date;
  lastActivity?: Date;
  config: Record<string, any>;
}

/**
 * Integration registry configuration
 */
export interface IntegrationRegistryConfig {
  enabledProviders: string[];
  defaultProvider?: string;
  healthCheckInterval: number;
  providerTimeout: number;
  maxRetries: number;
  enableAutoReconnect: boolean;
  providerConfigs: Record<string, Record<string, any>>;
}

/**
 * Central registry service for managing all integration providers
 */
@Injectable()
export class IntegrationRegistry implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IntegrationRegistry.name);
  
  // Provider registrations (class definitions)
  private registrations = new Map<string, ProviderRegistration>();
  
  // Active provider instances
  private instances = new Map<string, ProviderInstance>();
  
  // Health check interval
  private healthCheckInterval?: NodeJS.Timeout;
  
  // Registry configuration
  private config: IntegrationRegistryConfig;

  constructor(
    private moduleRef: ModuleRef,
    private configService: ConfigService
  ) {
    this.config = {
      enabledProviders: this.configService.get('INTEGRATION_ENABLED_PROVIDERS', 'mock').split(','),
      defaultProvider: this.configService.get('INTEGRATION_DEFAULT_PROVIDER', 'mock'),
      healthCheckInterval: this.configService.get('INTEGRATION_HEALTH_CHECK_INTERVAL', 300000), // 5 minutes
      providerTimeout: this.configService.get('INTEGRATION_PROVIDER_TIMEOUT', 30000), // 30 seconds
      maxRetries: this.configService.get('INTEGRATION_MAX_RETRIES', 3),
      enableAutoReconnect: this.configService.get('INTEGRATION_AUTO_RECONNECT', 'true') === 'true',
      providerConfigs: {}
    };
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Integration Registry');
    
    // Start health check monitoring
    if (this.config.healthCheckInterval > 0) {
      this.startHealthCheckMonitoring();
    }
    
    this.logger.log(`Integration Registry initialized with ${this.registrations.size} registered providers`);
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Integration Registry');
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Cleanup all provider instances
    await this.cleanupAllProviders();
    
    this.logger.log('Integration Registry shutdown complete');
  }

  // ================================================================
  // PROVIDER REGISTRATION METHODS
  // ================================================================

  /**
   * Register a provider class with the registry
   */
  registerProvider(registration: ProviderRegistration): void {
    const { providerId } = registration;
    
    if (this.registrations.has(providerId)) {
      this.logger.warn(`Provider ${providerId} is already registered, overwriting`);
    }
    
    this.registrations.set(providerId, registration);
    this.logger.log(`Registered provider: ${providerId} with capabilities: ${registration.capabilities.join(', ')}`);
  }

  /**
   * Unregister a provider from the registry
   */
  async unregisterProvider(providerId: string): Promise<void> {
    // Clean up instance if it exists
    if (this.instances.has(providerId)) {
      await this.destroyProvider(providerId);
    }
    
    // Remove registration
    this.registrations.delete(providerId);
    this.logger.log(`Unregistered provider: ${providerId}`);
  }

  /**
   * Get all registered provider IDs
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Get provider registration details
   */
  getProviderRegistration(providerId: string): ProviderRegistration | null {
    return this.registrations.get(providerId) || null;
  }

  /**
   * Find providers by capability
   */
  findProvidersByCapability(capability: string): ProviderRegistration[] {
    return Array.from(this.registrations.values())
      .filter(reg => reg.capabilities.includes(capability));
  }

  // ================================================================
  // PROVIDER INSTANCE MANAGEMENT
  // ================================================================

  /**
   * Create and initialize a provider instance
   */
  async createProvider(
    providerId: string, 
    config?: Record<string, any>
  ): Promise<IExternalSystemProvider> {
    const registration = this.registrations.get(providerId);
    if (!registration) {
      throw new Error(`Provider ${providerId} is not registered`);
    }

    if (!registration.isEnabled) {
      throw new Error(`Provider ${providerId} is disabled`);
    }

    // Check if instance already exists
    if (this.instances.has(providerId)) {
      this.logger.warn(`Provider ${providerId} instance already exists, returning existing`);
      return this.instances.get(providerId)!.provider;
    }

    try {
      // Merge configuration
      const finalConfig = {
        ...registration.defaultConfig,
        ...this.config.providerConfigs[providerId] || {},
        ...config || {}
      };

      // Create provider instance
      const providerInstance = new registration.providerClass();
      
      // Initialize the provider
      await providerInstance.initialize(finalConfig);
      
      // Test initial connection
      const health = await providerInstance.testConnection();
      
      // Store instance
      const instance: ProviderInstance = {
        providerId,
        provider: providerInstance,
        status: health.status,
        lastHealth: health,
        registeredAt: new Date(),
        lastActivity: new Date(),
        config: finalConfig
      };
      
      this.instances.set(providerId, instance);
      
      this.logger.log(`Created and initialized provider instance: ${providerId}`);
      return providerInstance;
      
    } catch (error) {
      this.logger.error(`Failed to create provider ${providerId}:`, error);
      throw new Error(`Failed to create provider ${providerId}: ${error.message}`);
    }
  }

  /**
   * Get an existing provider instance or create it if it doesn't exist
   */
  async getProvider(providerId: string): Promise<IExternalSystemProvider | null> {
    const instance = this.instances.get(providerId);
    if (instance) {
      // Update last activity
      instance.lastActivity = new Date();
      return instance.provider;
    }

    // Try to create the provider if it's registered and enabled
    const registration = this.registrations.get(providerId);
    if (registration && registration.isEnabled && this.config.enabledProviders.includes(providerId)) {
      return await this.createProvider(providerId);
    }

    return null;
  }

  /**
   * Get provider with specific capability casting
   */
  async getProviderWithCapability<T extends IExternalSystemProvider>(
    providerId: string,
    capability: string
  ): Promise<T | null> {
    const registration = this.registrations.get(providerId);
    if (!registration || !registration.capabilities.includes(capability)) {
      return null;
    }

    const provider = await this.getProvider(providerId);
    return provider as T | null;
  }

  /**
   * Get the default roster provider
   */
  async getDefaultRosterProvider(): Promise<IRosterProvider | null> {
    const defaultId = this.config.defaultProvider;
    if (!defaultId) {
      this.logger.warn('No default provider configured');
      return null;
    }

    return await this.getProviderWithCapability<IRosterProvider>(defaultId, 'roster');
  }

  /**
   * Get all active provider instances
   */
  getActiveProviders(): ProviderInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Destroy a provider instance
   */
  async destroyProvider(providerId: string): Promise<void> {
    const instance = this.instances.get(providerId);
    if (!instance) {
      return;
    }

    try {
      await instance.provider.cleanup();
      this.instances.delete(providerId);
      this.logger.log(`Destroyed provider instance: ${providerId}`);
    } catch (error) {
      this.logger.error(`Error destroying provider ${providerId}:`, error);
    }
  }

  /**
   * Clean up all provider instances
   */
  async cleanupAllProviders(): Promise<void> {
    const providerIds = Array.from(this.instances.keys());
    
    await Promise.all(
      providerIds.map(providerId => this.destroyProvider(providerId))
    );
    
    this.logger.log('All provider instances cleaned up');
  }

  // ================================================================
  // HEALTH MONITORING
  // ================================================================

  /**
   * Start background health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
    
    this.logger.log(`Started health check monitoring (interval: ${this.config.healthCheckInterval}ms)`);
  }

  /**
   * Perform health checks on all active providers
   */
  async performHealthChecks(): Promise<void> {
    const instances = Array.from(this.instances.values());
    
    if (instances.length === 0) {
      return;
    }
    
    this.logger.debug(`Performing health checks on ${instances.length} providers`);
    
    const healthPromises = instances.map(async (instance) => {
      try {
        const health = await instance.provider.getHealthStatus();
        instance.lastHealth = health;
        instance.status = health.status;
        instance.lastActivity = new Date();
        
        if (health.status === IntegrationStatus.ERROR) {
          this.logger.warn(`Provider ${instance.providerId} is in error state: ${health.errorMessage}`);
          
          if (this.config.enableAutoReconnect) {
            await this.attemptReconnection(instance);
          }
        }
        
      } catch (error) {
        this.logger.error(`Health check failed for provider ${instance.providerId}:`, error);
        instance.status = IntegrationStatus.ERROR;
        instance.lastHealth = {
          status: IntegrationStatus.ERROR,
          responseTime: -1,
          lastCheck: new Date(),
          errorMessage: error.message,
          capabilities: []
        };
      }
    });
    
    await Promise.allSettled(healthPromises);
  }

  /**
   * Get health status for a specific provider
   */
  async getProviderHealth(providerId: string): Promise<IntegrationHealth | null> {
    const instance = this.instances.get(providerId);
    if (!instance) {
      return null;
    }
    
    try {
      const health = await instance.provider.getHealthStatus();
      instance.lastHealth = health;
      instance.status = health.status;
      instance.lastActivity = new Date();
      return health;
    } catch (error) {
      this.logger.error(`Failed to get health for provider ${providerId}:`, error);
      return {
        status: IntegrationStatus.ERROR,
        responseTime: -1,
        lastCheck: new Date(),
        errorMessage: error.message,
        capabilities: []
      };
    }
  }

  /**
   * Get health status for all providers
   */
  async getAllProvidersHealth(): Promise<Record<string, IntegrationHealth>> {
    const instances = Array.from(this.instances.values());
    const healthResults: Record<string, IntegrationHealth> = {};
    
    const healthPromises = instances.map(async (instance) => {
      const health = await this.getProviderHealth(instance.providerId);
      if (health) {
        healthResults[instance.providerId] = health;
      }
    });
    
    await Promise.allSettled(healthPromises);
    return healthResults;
  }

  // ================================================================
  // RECONNECTION & ERROR HANDLING
  // ================================================================

  /**
   * Attempt to reconnect a failed provider
   */
  private async attemptReconnection(instance: ProviderInstance): Promise<void> {
    this.logger.log(`Attempting to reconnect provider: ${instance.providerId}`);
    
    try {
      // Cleanup existing instance
      await instance.provider.cleanup();
      
      // Create new instance
      const registration = this.registrations.get(instance.providerId);
      if (registration) {
        const newProvider = new registration.providerClass();
        await newProvider.initialize(instance.config);
        
        const health = await newProvider.testConnection();
        if (health.status === IntegrationStatus.ACTIVE) {
          instance.provider = newProvider;
          instance.status = health.status;
          instance.lastHealth = health;
          instance.lastActivity = new Date();
          
          this.logger.log(`Successfully reconnected provider: ${instance.providerId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to reconnect provider ${instance.providerId}:`, error);
    }
  }

  // ================================================================
  // UTILITY METHODS
  // ================================================================

  /**
   * Update configuration for a provider
   */
  async updateProviderConfig(
    providerId: string, 
    config: Record<string, any>
  ): Promise<void> {
    const instance = this.instances.get(providerId);
    if (!instance) {
      throw new Error(`Provider ${providerId} is not active`);
    }
    
    // Update stored config
    instance.config = { ...instance.config, ...config };
    
    // Reinitialize provider with new config
    await instance.provider.cleanup();
    await instance.provider.initialize(instance.config);
    
    this.logger.log(`Updated configuration for provider: ${providerId}`);
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): {
    totalRegistered: number;
    totalActive: number;
    statusBreakdown: Record<IntegrationStatus, number>;
    enabledProviders: string[];
  } {
    const instances = Array.from(this.instances.values());
    const statusBreakdown: Record<IntegrationStatus, number> = {
      [IntegrationStatus.ACTIVE]: 0,
      [IntegrationStatus.INACTIVE]: 0,
      [IntegrationStatus.ERROR]: 0,
      [IntegrationStatus.CONNECTING]: 0,
      [IntegrationStatus.DISCONNECTED]: 0,
      [IntegrationStatus.MAINTENANCE]: 0
    };
    
    instances.forEach(instance => {
      statusBreakdown[instance.status]++;
    });
    
    return {
      totalRegistered: this.registrations.size,
      totalActive: this.instances.size,
      statusBreakdown,
      enabledProviders: this.config.enabledProviders
    };
  }
}
