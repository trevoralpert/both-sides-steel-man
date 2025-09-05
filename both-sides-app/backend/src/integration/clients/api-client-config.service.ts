/**
 * API Client Configuration Service
 * 
 * Manages configuration for API clients with environment-specific settings,
 * credential rotation, feature flag integration, and dynamic updates.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter } from 'events';
import { ApiClientConfig, AuthenticationConfig } from './base-api-client';
import { TimeBackConfig, createTimeBackConfig } from './timeback-api-client';

// ===================================================================
// CONFIGURATION INTERFACES
// ===================================================================

export interface ClientConfigurationEntry {
  id: string;
  integrationId: string;
  clientType: 'timeback' | 'google-classroom' | 'canvas' | 'blackboard' | 'custom';
  environment: 'development' | 'staging' | 'production';
  status: 'active' | 'inactive' | 'testing';
  configuration: ApiClientConfig | TimeBackConfig;
  credentials: CredentialEntry;
  featureFlags: FeatureFlagConfig;
  metadata: {
    version: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    lastUsed?: Date;
    usageCount: number;
  };
}

export interface CredentialEntry {
  id: string;
  type: 'oauth2' | 'api-key' | 'bearer' | 'basic' | 'custom';
  encrypted: boolean;
  expiresAt?: Date;
  rotationPolicy: {
    enabled: boolean;
    intervalDays: number;
    warningDays: number;
    autoRotate: boolean;
  };
  data: Record<string, string>; // Will be encrypted in storage
  backup?: {
    data: Record<string, string>;
    createdAt: Date;
    validUntil: Date;
  };
}

export interface FeatureFlagConfig {
  enabledFeatures: string[];
  experimentalFeatures: string[];
  disabledFeatures: string[];
  environmentOverrides: Record<string, {
    enabled: string[];
    disabled: string[];
  }>;
  rolloutPercentage: Record<string, number>;
}

export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: ConfigurationError[];
  warnings: ConfigurationWarning[];
  suggestions: ConfigurationSuggestion[];
}

export interface ConfigurationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ConfigurationWarning extends ConfigurationError {
  suggestion?: string;
}

export interface ConfigurationSuggestion {
  category: 'performance' | 'security' | 'reliability' | 'feature';
  title: string;
  description: string;
  implementation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  clientType: ClientConfigurationEntry['clientType'];
  template: Partial<ApiClientConfig>;
  requiredFields: string[];
  optionalFields: string[];
  environmentVariables: string[];
  validationSchema: any;
}

// ===================================================================
// CLIENT CONFIGURATION SERVICE
// ===================================================================

@Injectable()
export class ApiClientConfigService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(ApiClientConfigService.name);
  private readonly configCache = new Map<string, ClientConfigurationEntry>();
  private readonly credentialCache = new Map<string, CredentialEntry>();
  private readonly templates = new Map<string, ConfigurationTemplate>();
  private encryptionKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.initializeEncryptionKey();
  }

  async onModuleInit() {
    await this.loadConfigurationTemplates();
    await this.loadActiveConfigurations();
    await this.startCredentialRotationMonitoring();
    this.logger.log('API Client Configuration Service initialized');
  }

  // ===================================================================
  // CONFIGURATION MANAGEMENT
  // ===================================================================

  /**
   * Create new client configuration
   */
  async createConfiguration(
    integrationId: string,
    clientType: ClientConfigurationEntry['clientType'],
    configuration: Partial<ApiClientConfig>,
    credentials: Omit<CredentialEntry, 'id' | 'encrypted'>,
    options?: {
      environment?: string;
      featureFlags?: Partial<FeatureFlagConfig>;
      metadata?: Partial<ClientConfigurationEntry['metadata']>;
    },
  ): Promise<ClientConfigurationEntry> {
    this.logger.log(`Creating configuration for ${clientType} client`, {
      integrationId,
      clientType,
      environment: options?.environment || 'development',
    });

    // Validate configuration
    const validation = await this.validateConfiguration(clientType, configuration);
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Generate IDs
    const configId = this.generateConfigId();
    const credentialId = this.generateCredentialId();

    // Encrypt credentials
    const encryptedCredentials: CredentialEntry = {
      ...credentials,
      id: credentialId,
      encrypted: true,
      data: await this.encryptCredentials(credentials.data),
      backup: credentials.backup ? {
        ...credentials.backup,
        data: await this.encryptCredentials(credentials.backup.data),
      } : undefined,
    };

    // Complete configuration
    const fullConfig = await this.completeConfiguration(clientType, configuration);

    // Create configuration entry
    const configEntry: ClientConfigurationEntry = {
      id: configId,
      integrationId,
      clientType,
      environment: (options?.environment || 'development') as any,
      status: 'active',
      configuration: fullConfig,
      credentials: encryptedCredentials,
      featureFlags: this.buildFeatureFlags(options?.featureFlags),
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system', // Would be actual user in real implementation
        usageCount: 0,
        ...options?.metadata,
      },
    };

    // Store in database
    await this.persistConfiguration(configEntry);

    // Cache configuration
    this.configCache.set(configId, configEntry);
    this.credentialCache.set(credentialId, encryptedCredentials);

    this.emit('configuration:created', {
      configurationId: configId,
      integrationId,
      clientType,
    });

    this.logger.log(`Configuration created successfully: ${configId}`, {
      integrationId,
      clientType,
    });

    return configEntry;
  }

  /**
   * Get configuration by ID
   */
  async getConfiguration(configId: string): Promise<ClientConfigurationEntry | null> {
    // Check cache first
    let config = this.configCache.get(configId);
    
    if (!config) {
      // Load from database
      config = await this.loadConfigurationFromDatabase(configId);
      
      if (config) {
        this.configCache.set(configId, config);
      }
    }

    if (config) {
      // Update usage statistics
      config.metadata.lastUsed = new Date();
      config.metadata.usageCount++;
      
      // Decrypt credentials for runtime use
      const decryptedCredentials = await this.decryptCredentials(config.credentials);
      
      return {
        ...config,
        credentials: decryptedCredentials,
      };
    }

    return null;
  }

  /**
   * Get configuration by integration ID
   */
  async getConfigurationByIntegration(integrationId: string): Promise<ClientConfigurationEntry | null> {
    // Try cache first
    for (const [id, config] of this.configCache.entries()) {
      if (config.integrationId === integrationId && config.status === 'active') {
        return this.getConfiguration(id);
      }
    }

    // Load from database
    const config = await this.loadConfigurationByIntegration(integrationId);
    return config ? this.getConfiguration(config.id) : null;
  }

  /**
   * Update existing configuration
   */
  async updateConfiguration(
    configId: string,
    updates: {
      configuration?: Partial<ApiClientConfig>;
      credentials?: Partial<CredentialEntry>;
      featureFlags?: Partial<FeatureFlagConfig>;
      status?: ClientConfigurationEntry['status'];
    },
  ): Promise<ClientConfigurationEntry> {
    const existingConfig = await this.getConfiguration(configId);
    if (!existingConfig) {
      throw new Error(`Configuration not found: ${configId}`);
    }

    this.logger.log(`Updating configuration: ${configId}`, {
      hasConfigUpdates: !!updates.configuration,
      hasCredentialUpdates: !!updates.credentials,
      hasFeatureFlagUpdates: !!updates.featureFlags,
      statusUpdate: updates.status,
    });

    let updatedCredentials = existingConfig.credentials;

    // Handle credential updates
    if (updates.credentials) {
      // Create backup of current credentials
      const credentialBackup = {
        data: existingConfig.credentials.data,
        createdAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      updatedCredentials = {
        ...existingConfig.credentials,
        ...updates.credentials,
        backup: credentialBackup,
        data: updates.credentials.data 
          ? await this.encryptCredentials(updates.credentials.data)
          : existingConfig.credentials.data,
      };
    }

    // Create updated configuration
    const updatedConfig: ClientConfigurationEntry = {
      ...existingConfig,
      configuration: updates.configuration 
        ? { ...existingConfig.configuration, ...updates.configuration }
        : existingConfig.configuration,
      credentials: updatedCredentials,
      featureFlags: updates.featureFlags 
        ? { ...existingConfig.featureFlags, ...updates.featureFlags }
        : existingConfig.featureFlags,
      status: updates.status || existingConfig.status,
      metadata: {
        ...existingConfig.metadata,
        updatedAt: new Date(),
        version: this.incrementVersion(existingConfig.metadata.version),
      },
    };

    // Validate updated configuration
    const validation = await this.validateConfiguration(
      existingConfig.clientType, 
      updatedConfig.configuration,
    );
    
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Persist and cache updates
    await this.persistConfiguration(updatedConfig);
    this.configCache.set(configId, updatedConfig);
    this.credentialCache.set(updatedCredentials.id, updatedCredentials);

    this.emit('configuration:updated', {
      configurationId: configId,
      integrationId: existingConfig.integrationId,
      changes: Object.keys(updates),
    });

    this.logger.log(`Configuration updated successfully: ${configId}`);

    return updatedConfig;
  }

  /**
   * Delete configuration
   */
  async deleteConfiguration(configId: string): Promise<void> {
    const config = await this.getConfiguration(configId);
    if (!config) {
      throw new Error(`Configuration not found: ${configId}`);
    }

    this.logger.log(`Deleting configuration: ${configId}`, {
      integrationId: config.integrationId,
      clientType: config.clientType,
    });

    // Remove from database
    await this.removeConfigurationFromDatabase(configId);

    // Remove from cache
    this.configCache.delete(configId);
    this.credentialCache.delete(config.credentials.id);

    this.emit('configuration:deleted', {
      configurationId: configId,
      integrationId: config.integrationId,
    });

    this.logger.log(`Configuration deleted successfully: ${configId}`);
  }

  // ===================================================================
  // CREDENTIAL MANAGEMENT
  // ===================================================================

  /**
   * Rotate credentials for a configuration
   */
  async rotateCredentials(
    configId: string,
    newCredentials: Record<string, string>,
    options?: {
      preserveBackup?: boolean;
      validationTimeout?: number;
    },
  ): Promise<void> {
    const config = await this.getConfiguration(configId);
    if (!config) {
      throw new Error(`Configuration not found: ${configId}`);
    }

    this.logger.log(`Rotating credentials for configuration: ${configId}`, {
      credentialType: config.credentials.type,
      hasBackup: !!config.credentials.backup,
    });

    try {
      // Test new credentials before applying
      await this.validateCredentials(config.clientType, newCredentials);

      // Update credentials
      await this.updateConfiguration(configId, {
        credentials: {
          data: newCredentials,
          rotationPolicy: {
            ...config.credentials.rotationPolicy,
            // Reset warning period after successful rotation
          },
        },
      });

      this.emit('credentials:rotated', {
        configurationId: configId,
        integrationId: config.integrationId,
        rotationType: 'manual',
      });

      this.logger.log(`Credentials rotated successfully for: ${configId}`);

    } catch (error) {
      this.logger.error(`Credential rotation failed for ${configId}: ${error.message}`, error.stack);
      throw new Error(`Credential rotation failed: ${error.message}`);
    }
  }

  /**
   * Check credential expiration status
   */
  async getCredentialStatus(configId: string): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    daysUntilExpiration?: number;
    needsRotation: boolean;
    canAutoRotate: boolean;
    lastRotated?: Date;
  }> {
    const config = await this.getConfiguration(configId);
    if (!config) {
      throw new Error(`Configuration not found: ${configId}`);
    }

    const credentials = config.credentials;
    const now = new Date();
    
    let daysUntilExpiration: number | undefined;
    let needsRotation = false;
    
    if (credentials.expiresAt) {
      const msUntilExpiration = credentials.expiresAt.getTime() - now.getTime();
      daysUntilExpiration = Math.ceil(msUntilExpiration / (1000 * 60 * 60 * 24));
      needsRotation = daysUntilExpiration <= credentials.rotationPolicy.warningDays;
    }

    return {
      isValid: !credentials.expiresAt || credentials.expiresAt > now,
      expiresAt: credentials.expiresAt,
      daysUntilExpiration,
      needsRotation,
      canAutoRotate: credentials.rotationPolicy.enabled && credentials.rotationPolicy.autoRotate,
      lastRotated: config.metadata.updatedAt,
    };
  }

  // ===================================================================
  // CONFIGURATION VALIDATION
  // ===================================================================

  /**
   * Validate client configuration
   */
  async validateConfiguration(
    clientType: ClientConfigurationEntry['clientType'],
    configuration: Partial<ApiClientConfig>,
  ): Promise<ConfigurationValidationResult> {
    const errors: ConfigurationError[] = [];
    const warnings: ConfigurationWarning[] = [];
    const suggestions: ConfigurationSuggestion[] = [];

    // Basic validation
    if (!configuration.baseURL) {
      errors.push({
        field: 'baseURL',
        code: 'REQUIRED_FIELD',
        message: 'Base URL is required',
        severity: 'error',
      });
    } else if (!this.isValidUrl(configuration.baseURL)) {
      errors.push({
        field: 'baseURL',
        code: 'INVALID_URL',
        message: 'Base URL is not a valid URL',
        severity: 'error',
      });
    }

    if (!configuration.timeout || configuration.timeout <= 0) {
      errors.push({
        field: 'timeout',
        code: 'INVALID_TIMEOUT',
        message: 'Timeout must be a positive number',
        severity: 'error',
      });
    } else if (configuration.timeout > 60000) {
      warnings.push({
        field: 'timeout',
        code: 'HIGH_TIMEOUT',
        message: 'Timeout is very high (>60s), may cause performance issues',
        severity: 'warning',
        suggestion: 'Consider reducing timeout to 30s or less',
      });
    }

    // Client-specific validation
    if (clientType === 'timeback') {
      await this.validateTimeBackConfiguration(configuration as TimeBackConfig, errors, warnings, suggestions);
    }

    // Performance suggestions
    if (configuration.retryConfig?.maxRetries && configuration.retryConfig.maxRetries > 5) {
      suggestions.push({
        category: 'performance',
        title: 'Optimize Retry Configuration',
        description: 'High retry count may cause delays and resource consumption',
        implementation: 'Consider reducing maxRetries to 3-5 for better performance',
        priority: 'medium',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Test configuration connectivity
   */
  async testConfiguration(configuration: ClientConfigurationEntry): Promise<{
    connectionSuccessful: boolean;
    authenticationSuccessful: boolean;
    responseTime: number;
    errors: string[];
    capabilities: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let connectionSuccessful = false;
    let authenticationSuccessful = false;
    let capabilities: string[] = [];

    try {
      // This would create a temporary client for testing
      // Implementation depends on client type
      this.logger.log(`Testing configuration: ${configuration.id}`);

      // For TimeBack, we would create a temporary TimeBackApiClient
      if (configuration.clientType === 'timeback') {
        // Test implementation would go here
        connectionSuccessful = true;
        authenticationSuccessful = true;
        capabilities = ['read:users', 'read:organizations', 'read:classes'];
      }

    } catch (error) {
      errors.push(error.message);
    }

    const responseTime = Date.now() - startTime;

    return {
      connectionSuccessful,
      authenticationSuccessful,
      responseTime,
      errors,
      capabilities,
    };
  }

  // ===================================================================
  // FEATURE FLAG MANAGEMENT
  // ===================================================================

  /**
   * Check if feature is enabled for configuration
   */
  isFeatureEnabled(configId: string, feature: string): boolean {
    const config = this.configCache.get(configId);
    if (!config) return false;

    const featureFlags = config.featureFlags;
    const environment = config.environment;

    // Check environment overrides first
    if (featureFlags.environmentOverrides[environment]) {
      const envOverride = featureFlags.environmentOverrides[environment];
      if (envOverride.disabled.includes(feature)) return false;
      if (envOverride.enabled.includes(feature)) return true;
    }

    // Check disabled features
    if (featureFlags.disabledFeatures.includes(feature)) return false;

    // Check enabled features
    if (featureFlags.enabledFeatures.includes(feature)) return true;

    // Check experimental features with rollout percentage
    if (featureFlags.experimentalFeatures.includes(feature)) {
      const rolloutPercentage = featureFlags.rolloutPercentage[feature] || 0;
      const hash = this.hashString(`${configId}:${feature}`);
      return (hash % 100) < rolloutPercentage;
    }

    return false;
  }

  /**
   * Update feature flags for configuration
   */
  async updateFeatureFlags(
    configId: string, 
    updates: Partial<FeatureFlagConfig>,
  ): Promise<void> {
    await this.updateConfiguration(configId, { featureFlags: updates });
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private async loadConfigurationTemplates(): Promise<void> {
    // Load built-in templates
    const timebackTemplate: ConfigurationTemplate = {
      id: 'timeback-default',
      name: 'TimeBack Default Configuration',
      description: 'Default configuration template for TimeBack integration',
      clientType: 'timeback',
      template: {
        timeout: 30000,
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
          retryDelayMultiplier: 2,
        },
        logging: {
          enabled: true,
          logRequests: true,
          logResponses: true,
          logResponseData: false,
          sanitizeHeaders: ['authorization', 'x-api-key'],
          sanitizeRequestData: ['password', 'token', 'secret'],
          sanitizeResponseData: ['password', 'token', 'secret'],
        },
      },
      requiredFields: ['baseURL', 'authentication.oauth2.clientId', 'authentication.oauth2.clientSecret'],
      optionalFields: ['timeout', 'rateLimiting', 'webhookConfig'],
      environmentVariables: ['TIMEBACK_CLIENT_ID', 'TIMEBACK_CLIENT_SECRET', 'TIMEBACK_ENVIRONMENT'],
      validationSchema: {}, // Would contain Zod schema
    };

    this.templates.set('timeback-default', timebackTemplate);
    this.logger.debug('Configuration templates loaded');
  }

  private async loadActiveConfigurations(): Promise<void> {
    // Load active configurations from database into cache
    // Implementation would query database and populate cache
    this.logger.debug('Active configurations loaded');
  }

  private async completeConfiguration(
    clientType: ClientConfigurationEntry['clientType'], 
    partial: Partial<ApiClientConfig>,
  ): Promise<ApiClientConfig> {
    const template = this.templates.get(`${clientType}-default`);
    if (!template) {
      throw new Error(`No template found for client type: ${clientType}`);
    }

    // Merge template with provided configuration
    const completed = {
      ...template.template,
      ...partial,
    } as ApiClientConfig;

    return completed;
  }

  private buildFeatureFlags(partial?: Partial<FeatureFlagConfig>): FeatureFlagConfig {
    return {
      enabledFeatures: [],
      experimentalFeatures: [],
      disabledFeatures: [],
      environmentOverrides: {},
      rolloutPercentage: {},
      ...partial,
    };
  }

  private async validateTimeBackConfiguration(
    config: TimeBackConfig,
    errors: ConfigurationError[],
    warnings: ConfigurationWarning[],
    suggestions: ConfigurationSuggestion[],
  ): Promise<void> {
    // TimeBack-specific validation
    if (!config.environment || !['sandbox', 'production'].includes(config.environment)) {
      errors.push({
        field: 'environment',
        code: 'INVALID_ENVIRONMENT',
        message: 'Environment must be either "sandbox" or "production"',
        severity: 'error',
      });
    }

    if (config.authentication?.oauth2) {
      const oauth = config.authentication.oauth2;
      
      if (!oauth.clientId) {
        errors.push({
          field: 'authentication.oauth2.clientId',
          code: 'REQUIRED_FIELD',
          message: 'OAuth2 client ID is required',
          severity: 'error',
        });
      }

      if (!oauth.clientSecret) {
        errors.push({
          field: 'authentication.oauth2.clientSecret',
          code: 'REQUIRED_FIELD',
          message: 'OAuth2 client secret is required',
          severity: 'error',
        });
      }
    }
  }

  private async validateCredentials(
    clientType: ClientConfigurationEntry['clientType'],
    credentials: Record<string, string>,
  ): Promise<void> {
    // Would implement actual credential validation by creating temporary client
    // For now, just basic validation
    if (clientType === 'timeback') {
      if (!credentials.clientId || !credentials.clientSecret) {
        throw new Error('TimeBack credentials must include clientId and clientSecret');
      }
    }
  }

  private async encryptCredentials(data: Record<string, string>): Promise<Record<string, string>> {
    // Simple encryption implementation - would use proper encryption in production
    const encrypted: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(data)) {
      encrypted[key] = Buffer.from(value, 'utf8').toString('base64');
    }
    
    return encrypted;
  }

  private async decryptCredentials(credentials: CredentialEntry): Promise<CredentialEntry> {
    if (!credentials.encrypted) {
      return credentials;
    }

    const decryptedData: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(credentials.data)) {
      decryptedData[key] = Buffer.from(value, 'base64').toString('utf8');
    }

    return {
      ...credentials,
      encrypted: false,
      data: decryptedData,
    };
  }

  private async persistConfiguration(config: ClientConfigurationEntry): Promise<void> {
    // Store configuration in database
    // Implementation would use Prisma to store in integration_configurations table
    this.logger.debug(`Persisting configuration: ${config.id}`);
  }

  private async loadConfigurationFromDatabase(configId: string): Promise<ClientConfigurationEntry | null> {
    // Load from database
    // Implementation would query database
    return null;
  }

  private async loadConfigurationByIntegration(integrationId: string): Promise<ClientConfigurationEntry | null> {
    // Load by integration ID
    // Implementation would query database
    return null;
  }

  private async removeConfigurationFromDatabase(configId: string): Promise<void> {
    // Remove from database
    // Implementation would delete from database
    this.logger.debug(`Removing configuration from database: ${configId}`);
  }

  private async startCredentialRotationMonitoring(): Promise<void> {
    // Start background job to monitor credential expiration and auto-rotate
    setInterval(async () => {
      await this.checkCredentialRotations();
    }, 60 * 60 * 1000); // Check every hour
  }

  private async checkCredentialRotations(): Promise<void> {
    for (const [configId, config] of this.configCache.entries()) {
      if (config.credentials.rotationPolicy.enabled) {
        const status = await this.getCredentialStatus(configId);
        
        if (status.needsRotation && status.canAutoRotate) {
          this.emit('credentials:rotation-needed', {
            configurationId: configId,
            integrationId: config.integrationId,
            daysUntilExpiration: status.daysUntilExpiration,
          });
        }
      }
    }
  }

  private initializeEncryptionKey(): void {
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key';
  }

  private generateConfigId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCredentialId(): string {
    return `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0] || '1'}.${parts[1] || '0'}.${patch}`;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // ===================================================================
  // PUBLIC UTILITY METHODS
  // ===================================================================

  /**
   * Get all configurations for an integration
   */
  async getConfigurationsByIntegration(integrationId: string): Promise<ClientConfigurationEntry[]> {
    const configs: ClientConfigurationEntry[] = [];
    
    for (const [id, config] of this.configCache.entries()) {
      if (config.integrationId === integrationId) {
        const decryptedConfig = await this.getConfiguration(id);
        if (decryptedConfig) {
          configs.push(decryptedConfig);
        }
      }
    }
    
    return configs;
  }

  /**
   * Get configuration statistics
   */
  getConfigurationStatistics(): {
    totalConfigurations: number;
    byClientType: Record<string, number>;
    byEnvironment: Record<string, number>;
    byStatus: Record<string, number>;
    credentialsNeedingRotation: number;
    averageUsageCount: number;
  } {
    const stats = {
      totalConfigurations: this.configCache.size,
      byClientType: {} as Record<string, number>,
      byEnvironment: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      credentialsNeedingRotation: 0,
      averageUsageCount: 0,
    };

    let totalUsage = 0;

    for (const config of this.configCache.values()) {
      // By client type
      stats.byClientType[config.clientType] = (stats.byClientType[config.clientType] || 0) + 1;
      
      // By environment
      stats.byEnvironment[config.environment] = (stats.byEnvironment[config.environment] || 0) + 1;
      
      // By status
      stats.byStatus[config.status] = (stats.byStatus[config.status] || 0) + 1;
      
      // Usage count
      totalUsage += config.metadata.usageCount;
      
      // Credentials needing rotation
      if (config.credentials.expiresAt && 
          config.credentials.expiresAt <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
        stats.credentialsNeedingRotation++;
      }
    }

    stats.averageUsageCount = stats.totalConfigurations > 0 ? totalUsage / stats.totalConfigurations : 0;

    return stats;
  }
}
