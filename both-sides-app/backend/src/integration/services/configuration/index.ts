/**
 * Configuration Services Index
 * 
 * Central exports for all configuration management services including validation,
 * environment-specific configuration, backup & versioning, and promotion workflows.
 */

// ===================================================================
// CORE CONFIGURATION SERVICES
// ===================================================================

export { ConfigurationValidationService } from './configuration-validation.service';
export { EnvironmentConfigurationService } from './environment-configuration.service';

// ===================================================================
// TYPES AND INTERFACES
// ===================================================================

export type {
  // Validation service types
  ConfigurationSchema,
  ConfigurationValidationResult,
  ConfigurationBackup,
  ConfigurationVersion,
} from './configuration-validation.service';

export type {
  // Environment service types
  EnvironmentConfiguration,
  EnvironmentTemplate,
  ConfigurationPromotion,
  SecretManagement,
} from './environment-configuration.service';

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Configuration utilities and helpers
 */
export const ConfigurationUtils = {
  /**
   * Merge configurations with inheritance
   */
  mergeConfigurations(
    baseConfig: any,
    overrideConfig: any,
    options: {
      deepMerge?: boolean;
      arrayMergeStrategy?: 'replace' | 'merge' | 'concat';
    } = {}
  ): { merged: any; changes: string[] } {
    const opts = {
      deepMerge: true,
      arrayMergeStrategy: 'replace' as const,
      ...options,
    };

    const changes: string[] = [];
    const merged = { ...baseConfig };

    for (const [key, value] of Object.entries(overrideConfig)) {
      if (baseConfig[key] !== undefined) {
        if (JSON.stringify(baseConfig[key]) !== JSON.stringify(value)) {
          changes.push(key);
        }
      } else {
        changes.push(key);
      }

      if (opts.deepMerge && typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = typeof baseConfig[key] === 'object' && baseConfig[key] !== null
          ? this.mergeConfigurations(baseConfig[key], value, opts).merged
          : value;
      } else if (Array.isArray(value) && Array.isArray(baseConfig[key])) {
        switch (opts.arrayMergeStrategy) {
          case 'merge':
            merged[key] = [...baseConfig[key], ...value];
            break;
          case 'concat':
            merged[key] = baseConfig[key].concat(value);
            break;
          case 'replace':
          default:
            merged[key] = value;
            break;
        }
      } else {
        merged[key] = value;
      }
    }

    return { merged, changes };
  },

  /**
   * Calculate configuration difference
   */
  calculateDifference(
    oldConfig: any,
    newConfig: any
  ): {
    added: string[];
    modified: string[];
    deleted: string[];
    unchanged: string[];
  } {
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];
    const unchanged: string[] = [];

    // Check for additions and modifications
    for (const key of Object.keys(newConfig)) {
      if (oldConfig[key] === undefined) {
        added.push(key);
      } else if (JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])) {
        modified.push(key);
      } else {
        unchanged.push(key);
      }
    }

    // Check for deletions
    for (const key of Object.keys(oldConfig)) {
      if (newConfig[key] === undefined) {
        deleted.push(key);
      }
    }

    return { added, modified, deleted, unchanged };
  },

  /**
   * Validate configuration structure
   */
  validateConfigurationStructure(
    config: any,
    requiredFields: string[],
    optionalFields: string[] = []
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of requiredFields) {
      if (config[field] === undefined || config[field] === null) {
        errors.push(`Required field '${field}' is missing`);
      }
    }

    // Check for unknown fields
    const knownFields = new Set([...requiredFields, ...optionalFields]);
    for (const field of Object.keys(config)) {
      if (!knownFields.has(field)) {
        warnings.push(`Unknown field '${field}' found`);
      }
    }

    // Check for empty objects
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (Object.keys(value).length === 0) {
          warnings.push(`Field '${key}' is an empty object`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Sanitize configuration for logging
   */
  sanitizeForLogging(
    config: any,
    sensitiveFields: string[] = ['apiKey', 'secret', 'password', 'token', 'credentials']
  ): any {
    const sanitized = JSON.parse(JSON.stringify(config));

    const sanitizeObject = (obj: any, path: string = ''): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        
        if (sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase()) ||
          fieldPath.toLowerCase().includes(field.toLowerCase())
        )) {
          obj[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitizeObject(value, fieldPath);
        }
      }

      return obj;
    };

    return sanitizeObject(sanitized);
  },

  /**
   * Generate configuration hash
   */
  generateConfigurationHash(config: any): string {
    const normalizedConfig = this.normalizeConfiguration(config);
    const configString = JSON.stringify(normalizedConfig);
    
    // Simple hash function - in production, use a proper hash function
    let hash = 0;
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  },

  /**
   * Normalize configuration for consistent hashing
   */
  normalizeConfiguration(config: any): any {
    if (config === null || config === undefined) {
      return config;
    }

    if (Array.isArray(config)) {
      return config
        .map(item => this.normalizeConfiguration(item))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }

    if (typeof config === 'object') {
      const normalized: any = {};
      const sortedKeys = Object.keys(config).sort();
      
      for (const key of sortedKeys) {
        normalized[key] = this.normalizeConfiguration(config[key]);
      }
      
      return normalized;
    }

    return config;
  },

  /**
   * Validate environment name
   */
  validateEnvironmentName(environment: string): { valid: boolean; error?: string } {
    const validEnvironments = ['local', 'development', 'staging', 'production', 'test'];
    
    if (!environment || typeof environment !== 'string') {
      return { valid: false, error: 'Environment name must be a non-empty string' };
    }

    if (!validEnvironments.includes(environment)) {
      return { 
        valid: false, 
        error: `Invalid environment '${environment}'. Must be one of: ${validEnvironments.join(', ')}` 
      };
    }

    return { valid: true };
  },

  /**
   * Get environment hierarchy
   */
  getEnvironmentHierarchy(): Record<string, string[]> {
    return {
      'local': [],
      'development': ['local'],
      'staging': ['development', 'local'],
      'production': ['staging', 'development', 'local'],
      'test': ['local'],
    };
  },

  /**
   * Get parent environments
   */
  getParentEnvironments(environment: string): string[] {
    const hierarchy = this.getEnvironmentHierarchy();
    return hierarchy[environment] || [];
  },

  /**
   * Check if environment inheritance is valid
   */
  isValidInheritance(childEnvironment: string, parentEnvironment: string): boolean {
    const parentEnvironments = this.getParentEnvironments(childEnvironment);
    return parentEnvironments.includes(parentEnvironment);
  },

  /**
   * Format configuration for display
   */
  formatConfigurationForDisplay(
    config: any,
    options: {
      indent?: number;
      maxDepth?: number;
      showTypes?: boolean;
    } = {}
  ): string {
    const opts = {
      indent: 2,
      maxDepth: 5,
      showTypes: false,
      ...options,
    };

    const formatValue = (value: any, depth: number = 0): string => {
      if (depth > opts.maxDepth) {
        return '[Max depth exceeded]';
      }

      if (value === null) {
        return 'null';
      }

      if (value === undefined) {
        return 'undefined';
      }

      if (typeof value === 'string') {
        const typeInfo = opts.showTypes ? ' (string)' : '';
        return `"${value}"${typeInfo}`;
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        const typeInfo = opts.showTypes ? ` (${typeof value})` : '';
        return `${value}${typeInfo}`;
      }

      if (Array.isArray(value)) {
        const typeInfo = opts.showTypes ? ' (array)' : '';
        if (value.length === 0) {
          return `[]${typeInfo}`;
        }

        const items = value.map(item => formatValue(item, depth + 1));
        const indentStr = ' '.repeat((depth + 1) * opts.indent);
        const closeIndentStr = ' '.repeat(depth * opts.indent);
        
        return `[${typeInfo}\n${indentStr}${items.join(`,\n${indentStr}`)}\n${closeIndentStr}]`;
      }

      if (typeof value === 'object') {
        const typeInfo = opts.showTypes ? ' (object)' : '';
        const keys = Object.keys(value);
        
        if (keys.length === 0) {
          return `{}${typeInfo}`;
        }

        const pairs = keys.map(key => {
          const formattedValue = formatValue(value[key], depth + 1);
          return `"${key}": ${formattedValue}`;
        });

        const indentStr = ' '.repeat((depth + 1) * opts.indent);
        const closeIndentStr = ' '.repeat(depth * opts.indent);
        
        return `{${typeInfo}\n${indentStr}${pairs.join(`,\n${indentStr}`)}\n${closeIndentStr}}`;
      }

      return String(value);
    };

    return formatValue(config);
  },

  /**
   * Create configuration template
   */
  createConfigurationTemplate(
    providerType: string,
    environment: string
  ): any {
    const baseTemplate = {
      enabled: true,
      description: `Configuration for ${providerType} provider in ${environment} environment`,
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        environment,
        providerType,
      },
    };

    // Environment-specific defaults
    const environmentDefaults = {
      local: {
        features: {
          caching: false,
          monitoring: false,
          conflictResolution: false,
        },
        limits: {
          maxBatchSize: 10,
          maxConcurrentRequests: 2,
        },
      },
      development: {
        features: {
          caching: false,
          monitoring: true,
          conflictResolution: true,
        },
        limits: {
          maxBatchSize: 50,
          maxConcurrentRequests: 5,
        },
      },
      staging: {
        features: {
          caching: true,
          monitoring: true,
          conflictResolution: true,
        },
        limits: {
          maxBatchSize: 100,
          maxConcurrentRequests: 10,
        },
      },
      production: {
        features: {
          caching: true,
          monitoring: true,
          conflictResolution: true,
        },
        limits: {
          maxBatchSize: 200,
          maxConcurrentRequests: 20,
        },
      },
      test: {
        features: {
          caching: false,
          monitoring: false,
          conflictResolution: false,
        },
        limits: {
          maxBatchSize: 5,
          maxConcurrentRequests: 1,
        },
      },
    };

    const envDefaults = environmentDefaults[environment as keyof typeof environmentDefaults] || {};

    return { ...baseTemplate, ...envDefaults };
  },
};

/**
 * Configuration validation helpers
 */
export const ConfigurationValidators = {
  /**
   * Validate URL format
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate API key format
   */
  isValidApiKey(apiKey: string, minLength: number = 10): boolean {
    return typeof apiKey === 'string' && apiKey.length >= minLength && apiKey.trim() !== '';
  },

  /**
   * Validate number range
   */
  isInRange(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && value >= min && value <= max;
  },

  /**
   * Validate enum value
   */
  isValidEnumValue(value: any, validValues: any[]): boolean {
    return validValues.includes(value);
  },

  /**
   * Validate object structure
   */
  hasRequiredProperties(obj: any, requiredProps: string[]): boolean {
    if (typeof obj !== 'object' || obj === null) return false;
    
    return requiredProps.every(prop => obj.hasOwnProperty(prop));
  },

  /**
   * Validate configuration completeness
   */
  isConfigurationComplete(
    config: any,
    requiredFields: string[],
    conditionalFields: Array<{ condition: (config: any) => boolean; fields: string[] }>
  ): { complete: boolean; missing: string[] } {
    const missing: string[] = [];

    // Check required fields
    for (const field of requiredFields) {
      if (!config[field]) {
        missing.push(field);
      }
    }

    // Check conditional fields
    for (const conditional of conditionalFields) {
      if (conditional.condition(config)) {
        for (const field of conditional.fields) {
          if (!config[field]) {
            missing.push(`${field} (required when condition met)`);
          }
        }
      }
    }

    return {
      complete: missing.length === 0,
      missing,
    };
  },
};

/**
 * Configuration constants
 */
export const CONFIGURATION_CONSTANTS = {
  // Environment types
  ENVIRONMENTS: {
    LOCAL: 'local',
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production',
    TEST: 'test',
  },

  // Backup types
  BACKUP_TYPES: {
    MANUAL: 'manual',
    AUTOMATIC: 'automatic',
    PRE_UPDATE: 'pre_update',
    SCHEDULED: 'scheduled',
  },

  // Promotion statuses
  PROMOTION_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    DEPLOYED: 'deployed',
    FAILED: 'failed',
  },

  // Validation error codes
  VALIDATION_ERRORS: {
    REQUIRED_FIELD: 'REQUIRED_FIELD',
    INVALID_TYPE: 'INVALID_TYPE',
    INVALID_FORMAT: 'INVALID_FORMAT',
    OUT_OF_RANGE: 'OUT_OF_RANGE',
    SCHEMA_ERROR: 'SCHEMA_ERROR',
    CONNECTION_FAILED: 'CONNECTION_FAILED',
  },

  // Default values
  DEFAULTS: {
    VALIDATION_TIMEOUT: 30000,
    CONNECTION_TEST_TIMEOUT: 10000,
    BACKUP_RETENTION_DAYS: 30,
    SECRET_ROTATION_DAYS: 90,
    PROMOTION_APPROVAL_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Sensitive field patterns
  SENSITIVE_FIELDS: [
    'apiKey',
    'secret',
    'password',
    'token',
    'credentials',
    'auth',
    'key',
    'webhook',
  ],
} as const;
