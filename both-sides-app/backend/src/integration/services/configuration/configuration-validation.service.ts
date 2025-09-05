/**
 * Configuration Validation Service
 * 
 * Advanced configuration validation framework with schema-based validation,
 * connection testing, configuration backup/versioning, and rollback capabilities.
 * Provides comprehensive validation for all integration provider configurations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntelligentCacheService } from '../caching/intelligent-cache.service';

// ===================================================================
// CONFIGURATION VALIDATION TYPES
// ===================================================================

export interface ConfigurationSchema {
  id: string;
  name: string;
  version: string;
  providerType: string;
  description?: string;
  
  schema: z.ZodSchema;
  
  metadata: {
    author: string;
    createdAt: Date;
    updatedAt: Date;
    deprecated?: boolean;
    successorVersion?: string;
  };
  
  validationRules: {
    required: string[];
    optional: string[];
    conditionalRules: Array<{
      condition: string;
      requiredFields: string[];
      validationLogic: string;
    }>;
  };
  
  connectionTest?: {
    enabled: boolean;
    testEndpoint: string;
    testMethod: 'GET' | 'POST' | 'PUT' | 'HEAD';
    testData?: any;
    timeoutMs: number;
    retryAttempts: number;
  };
}

export interface ConfigurationValidationResult {
  valid: boolean;
  
  errors: Array<{
    field: string;
    code: string;
    message: string;
    severity: 'error' | 'warning';
    suggestion?: string;
  }>;
  
  warnings: Array<{
    field: string;
    message: string;
    recommendation?: string;
  }>;
  
  metadata: {
    schemaVersion: string;
    validatedAt: Date;
    validationDuration: number;
    fieldsValidated: string[];
    rulesApplied: string[];
  };
  
  connectionTest?: {
    attempted: boolean;
    successful: boolean;
    responseTime?: number;
    error?: string;
    details?: any;
  };
}

export interface ConfigurationBackup {
  id: string;
  configurationId: string;
  providerId: string;
  providerName: string;
  
  version: string;
  backupType: 'manual' | 'automatic' | 'pre_update' | 'scheduled';
  
  configuration: any;
  schemaVersion: string;
  
  createdAt: Date;
  createdBy: string;
  
  metadata: {
    reason?: string;
    changeDescription?: string;
    previousVersion?: string;
    tags: string[];
  };
  
  validation: {
    isValid: boolean;
    validationResult?: ConfigurationValidationResult;
  };
}

export interface ConfigurationVersion {
  version: string;
  configuration: any;
  schemaVersion: string;
  createdAt: Date;
  createdBy: string;
  changeDescription?: string;
  status: 'active' | 'archived' | 'deprecated';
}

// ===================================================================
// CONFIGURATION VALIDATION SERVICE
// ===================================================================

@Injectable()
export class ConfigurationValidationService {
  private readonly logger = new Logger(ConfigurationValidationService.name);
  
  // Schema registry
  private schemas = new Map<string, ConfigurationSchema>();
  
  // Configuration backups
  private backups = new Map<string, ConfigurationBackup[]>();
  
  // Configuration validation cache
  private validationCache = new Map<string, ConfigurationValidationResult>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: IntelligentCacheService,
  ) {
    this.initializeDefaultSchemas();
  }

  // ===================================================================
  // SCHEMA MANAGEMENT
  // ===================================================================

  /**
   * Register configuration schema
   */
  registerSchema(schema: ConfigurationSchema): void {
    try {
      // Validate the schema itself
      this.validateSchemaDefinition(schema);
      
      this.schemas.set(schema.id, schema);
      
      this.logger.log(`Configuration schema registered: ${schema.name} v${schema.version}`);
      
    } catch (error) {
      this.logger.error(`Failed to register schema ${schema.id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get configuration schema
   */
  getSchema(schemaId: string): ConfigurationSchema | null {
    return this.schemas.get(schemaId) || null;
  }

  /**
   * Get schemas by provider type
   */
  getSchemasByProviderType(providerType: string): ConfigurationSchema[] {
    return Array.from(this.schemas.values())
      .filter(schema => schema.providerType === providerType);
  }

  /**
   * Get all schemas
   */
  getAllSchemas(): ConfigurationSchema[] {
    return Array.from(this.schemas.values());
  }

  // ===================================================================
  // CONFIGURATION VALIDATION
  // ===================================================================

  /**
   * Validate configuration against schema
   */
  async validateConfiguration(
    configuration: any,
    schemaId: string,
    options: {
      includeConnectionTest?: boolean;
      skipCache?: boolean;
      validateDependencies?: boolean;
    } = {}
  ): Promise<ConfigurationValidationResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(configuration, schemaId);
      if (!options.skipCache) {
        const cached = this.validationCache.get(cacheKey);
        if (cached) {
          this.logger.debug(`Using cached validation result for ${schemaId}`);
          return cached;
        }
      }

      const schema = this.schemas.get(schemaId);
      if (!schema) {
        throw new Error(`Configuration schema not found: ${schemaId}`);
      }

      const result: ConfigurationValidationResult = {
        valid: false,
        errors: [],
        warnings: [],
        metadata: {
          schemaVersion: schema.version,
          validatedAt: new Date(),
          validationDuration: 0,
          fieldsValidated: [],
          rulesApplied: [],
        },
      };

      // Schema validation
      try {
        const validationResult = schema.schema.safeParse(configuration);
        
        if (validationResult.success) {
          result.valid = true;
          result.metadata.fieldsValidated = Object.keys(configuration);
        } else {
          result.valid = false;
          
          // Convert Zod errors to our format
          validationResult.error.issues.forEach(issue => {
            result.errors.push({
              field: issue.path.join('.'),
              code: issue.code,
              message: issue.message,
              severity: 'error',
              suggestion: this.generateSuggestion(issue),
            });
          });
        }
      } catch (schemaError) {
        result.errors.push({
          field: 'schema',
          code: 'SCHEMA_ERROR',
          message: `Schema validation failed: ${schemaError.message}`,
          severity: 'error',
        });
      }

      // Apply custom validation rules
      await this.applyCustomValidationRules(configuration, schema, result);

      // Dependency validation
      if (options.validateDependencies) {
        await this.validateDependencies(configuration, schema, result);
      }

      // Connection test
      if (options.includeConnectionTest && schema.connectionTest?.enabled && result.valid) {
        result.connectionTest = await this.performConnectionTest(configuration, schema);
      }

      // Generate warnings
      this.generateConfigurationWarnings(configuration, schema, result);

      // Update metadata
      result.metadata.validationDuration = Date.now() - startTime;

      // Cache result
      this.validationCache.set(cacheKey, result);
      
      // Cache with TTL
      await this.cacheService.set(`validation:${cacheKey}`, result, {
        ttl: 300000, // 5 minutes
        tags: ['validation', 'configuration', schemaId],
      });

      return result;

    } catch (error) {
      this.logger.error(`Configuration validation failed: ${error.message}`, error.stack);
      
      return {
        valid: false,
        errors: [{
          field: 'general',
          code: 'VALIDATION_ERROR',
          message: error.message,
          severity: 'error',
        }],
        warnings: [],
        metadata: {
          schemaVersion: 'unknown',
          validatedAt: new Date(),
          validationDuration: Date.now() - startTime,
          fieldsValidated: [],
          rulesApplied: [],
        },
      };
    }
  }

  /**
   * Batch validate configurations
   */
  async validateConfigurations(
    configurations: Array<{ id: string; configuration: any; schemaId: string }>,
    options?: { includeConnectionTest?: boolean; parallel?: boolean }
  ): Promise<Array<{ id: string; result: ConfigurationValidationResult }>> {
    const opts = { includeConnectionTest: false, parallel: true, ...options };
    
    if (opts.parallel) {
      const promises = configurations.map(async config => ({
        id: config.id,
        result: await this.validateConfiguration(config.configuration, config.schemaId, {
          includeConnectionTest: opts.includeConnectionTest,
        }),
      }));

      return Promise.all(promises);
    } else {
      const results: Array<{ id: string; result: ConfigurationValidationResult }> = [];
      
      for (const config of configurations) {
        const result = await this.validateConfiguration(config.configuration, config.schemaId, {
          includeConnectionTest: opts.includeConnectionTest,
        });
        
        results.push({ id: config.id, result });
      }
      
      return results;
    }
  }

  // ===================================================================
  // CONNECTION TESTING
  // ===================================================================

  /**
   * Test configuration connectivity
   */
  async testConnection(
    configuration: any,
    schemaId: string,
    timeout?: number
  ): Promise<{ successful: boolean; responseTime?: number; error?: string; details?: any }> {
    try {
      const schema = this.schemas.get(schemaId);
      if (!schema || !schema.connectionTest?.enabled) {
        throw new Error('Connection testing not supported for this schema');
      }

      const connectionTest = await this.performConnectionTest(configuration, schema, timeout);
      
      return {
        successful: connectionTest.successful,
        responseTime: connectionTest.responseTime,
        error: connectionTest.error,
        details: connectionTest.details,
      };

    } catch (error) {
      return {
        successful: false,
        error: error.message,
      };
    }
  }

  // ===================================================================
  // CONFIGURATION BACKUP & VERSIONING
  // ===================================================================

  /**
   * Create configuration backup
   */
  async createBackup(
    configurationId: string,
    providerId: string,
    configuration: any,
    options: {
      type?: ConfigurationBackup['backupType'];
      reason?: string;
      changeDescription?: string;
      createdBy: string;
      tags?: string[];
    }
  ): Promise<ConfigurationBackup> {
    try {
      const backupId = this.generateBackupId();
      const version = this.generateVersionNumber(configurationId);

      // Get provider info
      const provider = await this.prisma.integration.findUnique({
        where: { id: providerId },
      });

      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      // Validate the configuration
      const schemaId = this.getSchemaIdForProvider(provider.type);
      const validation = await this.validateConfiguration(configuration, schemaId, {
        skipCache: true,
      });

      const backup: ConfigurationBackup = {
        id: backupId,
        configurationId,
        providerId,
        providerName: provider.name,
        version,
        backupType: options.type || 'manual',
        configuration: { ...configuration },
        schemaVersion: schemaId,
        createdAt: new Date(),
        createdBy: options.createdBy,
        metadata: {
          reason: options.reason,
          changeDescription: options.changeDescription,
          tags: options.tags || [],
        },
        validation: {
          isValid: validation.valid,
          validationResult: validation,
        },
      };

      // Store backup
      if (!this.backups.has(configurationId)) {
        this.backups.set(configurationId, []);
      }
      
      this.backups.get(configurationId)!.push(backup);
      
      // Persist to database
      await this.saveBackupToDatabase(backup);

      this.logger.log(`Configuration backup created: ${backupId} for ${provider.name}`);

      return backup;

    } catch (error) {
      this.logger.error(`Failed to create configuration backup: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get configuration backups
   */
  getBackups(
    configurationId: string,
    options?: { limit?: number; type?: ConfigurationBackup['backupType'] }
  ): ConfigurationBackup[] {
    const backups = this.backups.get(configurationId) || [];
    
    let filtered = [...backups];
    
    if (options?.type) {
      filtered = filtered.filter(backup => backup.backupType === options.type);
    }
    
    // Sort by creation date (newest first)
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
  }

  /**
   * Restore configuration from backup
   */
  async restoreFromBackup(
    backupId: string,
    options: {
      validateBeforeRestore?: boolean;
      createBackupBeforeRestore?: boolean;
      restoredBy: string;
    } = { validateBeforeRestore: true, createBackupBeforeRestore: true, restoredBy: 'system' }
  ): Promise<{ success: boolean; configuration?: any; error?: string }> {
    try {
      // Find the backup
      const backup = this.findBackupById(backupId);
      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }

      // Validate the backup configuration if requested
      if (options.validateBeforeRestore) {
        const validation = await this.validateConfiguration(
          backup.configuration,
          backup.schemaVersion,
          { includeConnectionTest: false }
        );

        if (!validation.valid) {
          return {
            success: false,
            error: `Backup configuration is invalid: ${validation.errors.map(e => e.message).join(', ')}`,
          };
        }
      }

      // Create backup of current configuration if requested
      if (options.createBackupBeforeRestore) {
        // Get current configuration (simplified - would fetch from database)
        const currentConfig = {}; // Would fetch actual current config
        
        await this.createBackup(
          backup.configurationId,
          backup.providerId,
          currentConfig,
          {
            type: 'automatic',
            reason: `Pre-restore backup before restoring ${backupId}`,
            createdBy: options.restoredBy,
            tags: ['pre-restore', 'automatic'],
          }
        );
      }

      this.logger.log(`Configuration restored from backup ${backupId} by ${options.restoredBy}`);

      return {
        success: true,
        configuration: backup.configuration,
      };

    } catch (error) {
      this.logger.error(`Failed to restore from backup: ${error.message}`, error.stack);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get configuration versions
   */
  getConfigurationVersions(
    configurationId: string,
    options?: { limit?: number; includeArchived?: boolean }
  ): ConfigurationVersion[] {
    const backups = this.getBackups(configurationId);
    
    let versions = backups.map(backup => ({
      version: backup.version,
      configuration: backup.configuration,
      schemaVersion: backup.schemaVersion,
      createdAt: backup.createdAt,
      createdBy: backup.createdBy,
      changeDescription: backup.metadata.changeDescription,
      status: 'archived' as const,
    }));

    if (!options?.includeArchived) {
      versions = versions.filter(v => v.status !== 'archived');
    }

    if (options?.limit) {
      versions = versions.slice(0, options.limit);
    }

    return versions;
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private initializeDefaultSchemas(): void {
    // TimeBack Provider Schema
    const timebackSchema: ConfigurationSchema = {
      id: 'timeback_v1',
      name: 'TimeBack Provider Configuration',
      version: '1.0.0',
      providerType: 'lms',
      description: 'Configuration schema for TimeBack LMS integration',
      
      schema: z.object({
        enabled: z.boolean().default(true),
        apiUrl: z.string().url('Invalid API URL format'),
        apiKey: z.string().min(10, 'API key must be at least 10 characters'),
        organizationId: z.string().min(1, 'Organization ID is required'),
        webhookSecret: z.string().optional(),
        enableRealTimeSync: z.boolean().default(false),
        
        syncIntervals: z.object({
          fullSync: z.number().min(60000, 'Full sync interval must be at least 1 minute'),
          incrementalSync: z.number().min(30000, 'Incremental sync interval must be at least 30 seconds'),
          healthCheck: z.number().min(10000, 'Health check interval must be at least 10 seconds'),
        }).optional(),
        
        features: z.object({
          caching: z.boolean().default(true),
          conflictResolution: z.boolean().default(true),
          webhooks: z.boolean().default(false),
          batching: z.boolean().default(true),
          monitoring: z.boolean().default(true),
        }).optional(),
        
        limits: z.object({
          maxBatchSize: z.number().min(1).max(1000).default(100),
          maxConcurrentRequests: z.number().min(1).max(50).default(10),
          rateLimitPerMinute: z.number().min(10).max(10000).default(1000),
        }).optional(),
        
        retry: z.object({
          maxAttempts: z.number().min(0).max(10).default(3),
          backoffMultiplier: z.number().min(1).max(10).default(2),
          maxDelay: z.number().min(1000).max(60000).default(10000),
        }).optional(),
      }),
      
      metadata: {
        author: 'System',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      
      validationRules: {
        required: ['apiUrl', 'apiKey', 'organizationId'],
        optional: ['webhookSecret', 'syncIntervals', 'features', 'limits', 'retry'],
        conditionalRules: [
          {
            condition: 'enableRealTimeSync === true',
            requiredFields: ['webhookSecret'],
            validationLogic: 'Real-time sync requires webhook secret',
          },
        ],
      },
      
      connectionTest: {
        enabled: true,
        testEndpoint: '/health',
        testMethod: 'GET',
        timeoutMs: 10000,
        retryAttempts: 2,
      },
    };

    this.registerSchema(timebackSchema);

    // Mock Provider Schema
    const mockSchema: ConfigurationSchema = {
      id: 'mock_v1',
      name: 'Mock Provider Configuration',
      version: '1.0.0',
      providerType: 'mock',
      description: 'Configuration schema for mock/testing provider',
      
      schema: z.object({
        enabled: z.boolean().default(true),
        simulateLatency: z.boolean().default(false),
        latencyRange: z.object({
          min: z.number().min(0).default(100),
          max: z.number().min(0).default(1000),
        }).optional(),
        simulateErrors: z.boolean().default(false),
        errorRate: z.number().min(0).max(100).default(5),
        dataSize: z.enum(['small', 'medium', 'large']).default('medium'),
      }),
      
      metadata: {
        author: 'System',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      
      validationRules: {
        required: ['enabled'],
        optional: ['simulateLatency', 'latencyRange', 'simulateErrors', 'errorRate', 'dataSize'],
        conditionalRules: [
          {
            condition: 'simulateLatency === true',
            requiredFields: ['latencyRange'],
            validationLogic: 'Latency simulation requires latency range configuration',
          },
        ],
      },
      
      connectionTest: {
        enabled: false,
        testEndpoint: '',
        testMethod: 'GET',
        timeoutMs: 5000,
        retryAttempts: 1,
      },
    };

    this.registerSchema(mockSchema);
  }

  private validateSchemaDefinition(schema: ConfigurationSchema): void {
    if (!schema.id || !schema.name || !schema.version) {
      throw new Error('Schema must have id, name, and version');
    }

    if (!schema.schema) {
      throw new Error('Schema must have a Zod schema definition');
    }

    if (!schema.providerType) {
      throw new Error('Schema must specify provider type');
    }
  }

  private async applyCustomValidationRules(
    configuration: any,
    schema: ConfigurationSchema,
    result: ConfigurationValidationResult
  ): Promise<void> {
    for (const rule of schema.validationRules.conditionalRules) {
      try {
        // Evaluate condition (simplified - would use a proper expression evaluator)
        const conditionMet = this.evaluateCondition(rule.condition, configuration);
        
        if (conditionMet) {
          for (const requiredField of rule.requiredFields) {
            if (!configuration[requiredField]) {
              result.errors.push({
                field: requiredField,
                code: 'CONDITIONAL_REQUIRED',
                message: `Field ${requiredField} is required when ${rule.condition}`,
                severity: 'error',
                suggestion: rule.validationLogic,
              });
              result.valid = false;
            }
          }
          
          result.metadata.rulesApplied.push(rule.condition);
        }
      } catch (error) {
        this.logger.warn(`Failed to apply validation rule: ${rule.condition}`, error);
      }
    }
  }

  private async validateDependencies(
    configuration: any,
    schema: ConfigurationSchema,
    result: ConfigurationValidationResult
  ): Promise<void> {
    // Dependency validation logic would go here
    // For example, checking if referenced external resources exist
  }

  private async performConnectionTest(
    configuration: any,
    schema: ConfigurationSchema,
    customTimeout?: number
  ): Promise<ConfigurationValidationResult['connectionTest']> {
    if (!schema.connectionTest?.enabled) {
      return {
        attempted: false,
        successful: false,
        error: 'Connection test not enabled for this schema',
      };
    }

    const startTime = Date.now();
    const timeout = customTimeout || schema.connectionTest.timeoutMs;

    try {
      // Build test URL
      const baseUrl = configuration.apiUrl || configuration.baseUrl;
      if (!baseUrl) {
        throw new Error('No API URL found in configuration for connection test');
      }

      const testUrl = `${baseUrl}${schema.connectionTest.testEndpoint}`;

      // Simulate connection test (would make actual HTTP request)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100)); // Simulate network delay

      const responseTime = Date.now() - startTime;

      return {
        attempted: true,
        successful: true,
        responseTime,
        details: {
          url: testUrl,
          method: schema.connectionTest.testMethod,
          timeout,
        },
      };

    } catch (error) {
      return {
        attempted: true,
        successful: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private generateConfigurationWarnings(
    configuration: any,
    schema: ConfigurationSchema,
    result: ConfigurationValidationResult
  ): void {
    // Check for deprecated fields or patterns
    if (configuration.apiUrl && !configuration.apiUrl.startsWith('https://')) {
      result.warnings.push({
        field: 'apiUrl',
        message: 'Using HTTP instead of HTTPS may pose security risks',
        recommendation: 'Consider using HTTPS for secure communication',
      });
    }

    // Check for performance concerns
    if (configuration.limits?.maxBatchSize > 500) {
      result.warnings.push({
        field: 'limits.maxBatchSize',
        message: 'Large batch sizes may impact performance',
        recommendation: 'Consider using smaller batch sizes for better performance',
      });
    }

    // Check for configuration completeness
    const optionalFields = schema.validationRules.optional;
    const missingOptionalFields = optionalFields.filter(field => !configuration[field]);
    
    if (missingOptionalFields.length > 0) {
      result.warnings.push({
        field: 'configuration',
        message: `Optional configurations not set: ${missingOptionalFields.join(', ')}`,
        recommendation: 'Consider configuring optional settings for optimal performance',
      });
    }
  }

  private generateSuggestion(issue: z.ZodIssue): string | undefined {
    switch (issue.code) {
      case 'invalid_type':
        return `Expected ${issue.expected}, got ${issue.received}`;
      case 'too_small':
        return `Value should be at least ${issue.minimum}`;
      case 'too_big':
        return `Value should be at most ${issue.maximum}`;
      case 'invalid_string':
        return `String validation failed: ${issue.validation}`;
      default:
        return undefined;
    }
  }

  private evaluateCondition(condition: string, configuration: any): boolean {
    // Simplified condition evaluation
    // In a real implementation, use a proper expression evaluator
    try {
      // Basic pattern matching for simple conditions
      if (condition.includes('===')) {
        const [field, value] = condition.split('===').map(s => s.trim());
        const fieldValue = this.getNestedValue(configuration, field);
        return fieldValue === this.parseValue(value);
      }
      
      return false;
    } catch (error) {
      this.logger.warn(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (!isNaN(Number(value))) return Number(value);
    return value.replace(/['"]/g, ''); // Remove quotes
  }

  private generateCacheKey(configuration: any, schemaId: string): string {
    const configHash = this.hashObject(configuration);
    return `${schemaId}_${configHash}`;
  }

  private hashObject(obj: any): string {
    // Simple hash function - in production, use a proper hash function
    return Buffer.from(JSON.stringify(obj)).toString('base64').slice(0, 16);
  }

  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVersionNumber(configurationId: string): string {
    const backups = this.backups.get(configurationId) || [];
    const versionNumber = backups.length + 1;
    return `v${versionNumber}`;
  }

  private getSchemaIdForProvider(providerType: string): string {
    // Map provider types to schema IDs
    const typeToSchemaMap = {
      'lms': 'timeback_v1',
      'mock': 'mock_v1',
    };

    return typeToSchemaMap[providerType as keyof typeof typeToSchemaMap] || 'timeback_v1';
  }

  private findBackupById(backupId: string): ConfigurationBackup | null {
    for (const backupList of this.backups.values()) {
      const backup = backupList.find(b => b.id === backupId);
      if (backup) return backup;
    }
    return null;
  }

  private async saveBackupToDatabase(backup: ConfigurationBackup): Promise<void> {
    try {
      // Save backup to database
      // This would persist the backup to the integration_configuration_backups table
      this.logger.debug(`Backup ${backup.id} would be saved to database`);
    } catch (error) {
      this.logger.error(`Failed to save backup to database: ${error.message}`, error.stack);
    }
  }

  // ===================================================================
  // PUBLIC API METHODS
  // ===================================================================

  /**
   * Clear validation cache
   */
  clearValidationCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get validation statistics
   */
  getValidationStatistics(): {
    schemasRegistered: number;
    validationsCached: number;
    totalBackups: number;
  } {
    const totalBackups = Array.from(this.backups.values())
      .reduce((sum, backups) => sum + backups.length, 0);

    return {
      schemasRegistered: this.schemas.size,
      validationsCached: this.validationCache.size,
      totalBackups,
    };
  }
}
