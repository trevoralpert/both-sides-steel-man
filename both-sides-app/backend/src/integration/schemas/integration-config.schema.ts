/**
 * Phase 9 Task 9.1.1: Integration Configuration Schema
 * 
 * This file defines Zod schemas for validating integration configurations.
 * It provides type-safe configuration management for different external systems
 * and ensures proper validation of credentials and settings.
 */

import { z } from 'zod';

// ================================================================
// BASE CONFIGURATION SCHEMAS
// ================================================================

/**
 * Base authentication configuration schema
 */
const BaseAuthConfigSchema = z.object({
  authType: z.enum(['oauth2', 'api-key', 'basic', 'jwt', 'custom']),
  environment: z.enum(['sandbox', 'production', 'staging']).default('sandbox'),
  timeout: z.number().min(1000).max(300000).default(30000), // 1s to 5min
  retries: z.number().min(0).max(10).default(3),
});

/**
 * OAuth 2.0 configuration schema
 */
const OAuth2ConfigSchema = BaseAuthConfigSchema.extend({
  authType: z.literal('oauth2'),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  authUrl: z.string().url(),
  tokenUrl: z.string().url(),
  scope: z.string().optional(),
  redirectUri: z.string().url().optional(),
  audience: z.string().optional(),
});

/**
 * API Key configuration schema
 */
const ApiKeyConfigSchema = BaseAuthConfigSchema.extend({
  authType: z.literal('api-key'),
  apiKey: z.string().min(1),
  headerName: z.string().default('Authorization'),
  prefix: z.string().default('Bearer'),
});

/**
 * Basic authentication configuration schema
 */
const BasicAuthConfigSchema = BaseAuthConfigSchema.extend({
  authType: z.literal('basic'),
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * JWT configuration schema
 */
const JwtConfigSchema = BaseAuthConfigSchema.extend({
  authType: z.literal('jwt'),
  secret: z.string().min(1),
  algorithm: z.enum(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']).default('HS256'),
  issuer: z.string().optional(),
  audience: z.string().optional(),
  expiresIn: z.string().default('1h'),
});

/**
 * Custom authentication configuration schema
 */
const CustomAuthConfigSchema = BaseAuthConfigSchema.extend({
  authType: z.literal('custom'),
  customParams: z.record(z.unknown()),
});

/**
 * Union of all authentication configuration schemas
 */
const AuthenticationConfigSchema = z.discriminatedUnion('authType', [
  OAuth2ConfigSchema,
  ApiKeyConfigSchema,
  BasicAuthConfigSchema,
  JwtConfigSchema,
  CustomAuthConfigSchema,
]);

// ================================================================
// RATE LIMITING CONFIGURATION
// ================================================================

const RateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().min(1).max(10000).default(60),
  requestsPerHour: z.number().min(1).max(100000).default(3600),
  burstLimit: z.number().min(1).max(1000).optional(),
  backoffStrategy: z.enum(['exponential', 'linear', 'fixed']).default('exponential'),
  maxBackoffDelay: z.number().min(1000).max(300000).default(60000), // 1s to 5min
});

// ================================================================
// SYNC CONFIGURATION
// ================================================================

const SyncConfigSchema = z.object({
  enableFullSync: z.boolean().default(true),
  enableIncrementalSync: z.boolean().default(true),
  fullSyncSchedule: z.string().default('0 2 * * *'), // Daily at 2 AM
  incrementalSyncInterval: z.number().min(60).max(86400).default(300), // 1min to 1 day (in seconds)
  batchSize: z.number().min(1).max(1000).default(100),
  maxConcurrentSyncs: z.number().min(1).max(10).default(3),
  syncTimeout: z.number().min(30000).max(3600000).default(300000), // 30s to 1h
  retryFailedSyncs: z.boolean().default(true),
  maxSyncRetries: z.number().min(0).max(10).default(3),
  retryBackoffMultiplier: z.number().min(1).max(10).default(2),
});

// ================================================================
// WEBHOOK CONFIGURATION
// ================================================================

const WebhookConfigSchema = z.object({
  enabled: z.boolean().default(false),
  endpoint: z.string().url().optional(),
  secret: z.string().min(32).optional(), // At least 32 characters for security
  events: z.array(z.string()).default([]),
  timeout: z.number().min(5000).max(60000).default(30000), // 5s to 1min
  retries: z.number().min(0).max(5).default(3),
  signatureHeader: z.string().default('X-Webhook-Signature'),
  timestampHeader: z.string().default('X-Webhook-Timestamp'),
  maxBodySize: z.number().min(1024).max(10485760).default(1048576), // 1KB to 10MB
});

// ================================================================
// CACHING CONFIGURATION
// ================================================================

const CacheConfigSchema = z.object({
  enabled: z.boolean().default(true),
  ttl: z.number().min(60).max(86400).default(900), // 1min to 1 day (in seconds)
  maxSize: z.number().min(100).max(100000).default(10000),
  keyPrefix: z.string().default('integration'),
  compressionEnabled: z.boolean().default(false),
  serializationType: z.enum(['json', 'msgpack']).default('json'),
});

// ================================================================
// LOGGING CONFIGURATION
// ================================================================

const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
  enableRequestLogging: z.boolean().default(false),
  enableResponseLogging: z.boolean().default(false),
  enableErrorLogging: z.boolean().default(true),
  enablePerformanceLogging: z.boolean().default(true),
  logSensitiveData: z.boolean().default(false), // Never log sensitive data by default
  maxLogSize: z.number().min(1024).max(10485760).default(1048576), // 1KB to 10MB
});

// ================================================================
// FEATURE FLAGS CONFIGURATION
// ================================================================

const FeatureFlagsConfigSchema = z.object({
  enableRealTimeSync: z.boolean().default(false),
  enableWebhooks: z.boolean().default(false),
  enableBatchOperations: z.boolean().default(true),
  enableConflictResolution: z.boolean().default(true),
  enableDataValidation: z.boolean().default(true),
  enableMetricsCollection: z.boolean().default(true),
  enableCircuitBreaker: z.boolean().default(true),
  circuitBreakerThreshold: z.number().min(1).max(100).default(50), // Percentage
  circuitBreakerTimeout: z.number().min(30000).max(600000).default(60000), // 30s to 10min
});

// ================================================================
// BASE INTEGRATION CONFIGURATION
// ================================================================

const BaseIntegrationConfigSchema = z.object({
  providerId: z.string().min(1),
  providerName: z.string().min(1),
  enabled: z.boolean().default(true),
  priority: z.number().min(1).max(100).default(50),
  environment: z.enum(['sandbox', 'production', 'staging']).default('sandbox'),
  baseUrl: z.string().url(),
  apiVersion: z.string().optional(),
  userAgent: z.string().default('BothSides-Integration/1.0'),
  
  // Nested configurations
  authentication: AuthenticationConfigSchema,
  rateLimit: RateLimitConfigSchema.optional(),
  sync: SyncConfigSchema.optional(),
  webhooks: WebhookConfigSchema.optional(),
  cache: CacheConfigSchema.optional(),
  logging: LoggingConfigSchema.optional(),
  features: FeatureFlagsConfigSchema.optional(),
  
  // Custom provider-specific configuration
  customConfig: z.record(z.unknown()).optional(),
  
  // Metadata
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  contactInfo: z.object({
    email: z.string().email().optional(),
    support: z.string().url().optional(),
    documentation: z.string().url().optional(),
  }).optional(),
});

// ================================================================
// PROVIDER-SPECIFIC CONFIGURATIONS
// ================================================================

/**
 * TimeBack specific configuration schema
 */
const TimeBackConfigSchema = BaseIntegrationConfigSchema.extend({
  providerId: z.literal('timeback'),
  authentication: OAuth2ConfigSchema,
  schoolId: z.string().min(1),
  districtId: z.string().optional(),
  customConfig: z.object({
    includeInactiveStudents: z.boolean().default(false),
    includeArchivedClasses: z.boolean().default(false),
    syncGrades: z.boolean().default(false),
    syncAttendance: z.boolean().default(false),
    academicYearFilter: z.string().optional(),
    termFilter: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * Google Classroom specific configuration schema
 */
const GoogleClassroomConfigSchema = BaseIntegrationConfigSchema.extend({
  providerId: z.literal('google-classroom'),
  authentication: OAuth2ConfigSchema.extend({
    scope: z.string().default('https://www.googleapis.com/auth/classroom.rosters.readonly'),
  }),
  customConfig: z.object({
    includeArchivedCourses: z.boolean().default(false),
    teacherEmailDomain: z.string().optional(),
    courseSyncFields: z.array(z.string()).default(['id', 'name', 'section', 'descriptionHeading', 'room']),
  }).optional(),
});

/**
 * Canvas LMS specific configuration schema
 */
const CanvasConfigSchema = BaseIntegrationConfigSchema.extend({
  providerId: z.literal('canvas'),
  authentication: ApiKeyConfigSchema,
  accountId: z.string().min(1),
  customConfig: z.object({
    includeCompletedEnrollments: z.boolean().default(false),
    includeTestCourses: z.boolean().default(false),
    enrollmentTypes: z.array(z.string()).default(['student', 'teacher']),
    courseStates: z.array(z.string()).default(['available']),
  }).optional(),
});

/**
 * Mock provider configuration schema (for testing)
 */
const MockProviderConfigSchema = BaseIntegrationConfigSchema.extend({
  providerId: z.literal('mock'),
  authentication: z.object({
    authType: z.literal('custom'),
    customParams: z.record(z.unknown()).default({}),
    environment: z.enum(['sandbox', 'production', 'staging']).default('sandbox'),
    timeout: z.number().default(30000),
    retries: z.number().default(3),
  }),
  customConfig: z.object({
    scenario: z.enum(['small-school', 'medium-school', 'large-school', 'district']).default('medium-school'),
    studentCount: z.number().min(10).max(10000).default(100),
    teacherCount: z.number().min(2).max(500).default(10),
    classCount: z.number().min(5).max(1000).default(20),
    responseDelay: z.object({
      min: z.number().min(0).max(5000).default(100),
      max: z.number().min(0).max(10000).default(500),
    }).optional(),
    failureRate: z.number().min(0).max(1).default(0.02), // 2% failure rate
    enableRealTimeUpdates: z.boolean().default(false),
  }).optional(),
});

// ================================================================
// MAIN CONFIGURATION SCHEMAS
// ================================================================

/**
 * Union of all provider-specific configuration schemas
 */
export const IntegrationConfigSchema = z.discriminatedUnion('providerId', [
  TimeBackConfigSchema,
  GoogleClassroomConfigSchema,
  CanvasConfigSchema,
  MockProviderConfigSchema,
]);

/**
 * Global integration system configuration
 */
export const IntegrationSystemConfigSchema = z.object({
  enabled: z.boolean().default(true),
  defaultProvider: z.string().optional(),
  enabledProviders: z.array(z.string()).default(['mock']),
  
  // Global settings
  healthCheckInterval: z.number().min(60000).max(3600000).default(300000), // 1min to 1h
  providerTimeout: z.number().min(5000).max(300000).default(30000), // 5s to 5min
  maxRetries: z.number().min(0).max(10).default(3),
  enableAutoReconnect: z.boolean().default(true),
  enableMetrics: z.boolean().default(true),
  enableAuditLogging: z.boolean().default(true),
  
  // Provider configurations
  providers: z.array(IntegrationConfigSchema),
  
  // Security settings
  security: z.object({
    encryptCredentials: z.boolean().default(true),
    credentialRotationInterval: z.number().min(86400).max(31536000).default(2592000), // 1 day to 1 year (in seconds)
    requireHttps: z.boolean().default(true),
    validateCertificates: z.boolean().default(true),
    allowSelfSignedCerts: z.boolean().default(false),
  }),
  
  // Database settings
  database: z.object({
    enableConnectionPooling: z.boolean().default(true),
    maxConnections: z.number().min(5).max(100).default(20),
    connectionTimeout: z.number().min(1000).max(60000).default(5000),
    queryTimeout: z.number().min(1000).max(300000).default(30000),
  }),
  
  // Background job settings
  jobs: z.object({
    concurrency: z.number().min(1).max(20).default(5),
    maxAttempts: z.number().min(1).max(10).default(3),
    backoffDelay: z.number().min(1000).max(300000).default(5000),
    removeOnComplete: z.number().min(1).max(1000).default(100),
    removeOnFail: z.number().min(1).max(1000).default(50),
  }),
});

// ================================================================
// TYPE EXPORTS
// ================================================================

export type AuthenticationConfig = z.infer<typeof AuthenticationConfigSchema>;
export type OAuth2Config = z.infer<typeof OAuth2ConfigSchema>;
export type ApiKeyConfig = z.infer<typeof ApiKeyConfigSchema>;
export type BasicAuthConfig = z.infer<typeof BasicAuthConfigSchema>;
export type JwtConfig = z.infer<typeof JwtConfigSchema>;
export type CustomAuthConfig = z.infer<typeof CustomAuthConfigSchema>;

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;
export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type FeatureFlagsConfig = z.infer<typeof FeatureFlagsConfigSchema>;

export type BaseIntegrationConfig = z.infer<typeof BaseIntegrationConfigSchema>;
export type TimeBackConfig = z.infer<typeof TimeBackConfigSchema>;
export type GoogleClassroomConfig = z.infer<typeof GoogleClassroomConfigSchema>;
export type CanvasConfig = z.infer<typeof CanvasConfigSchema>;
export type MockProviderConfig = z.infer<typeof MockProviderConfigSchema>;

export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;
export type IntegrationSystemConfig = z.infer<typeof IntegrationSystemConfigSchema>;

// ================================================================
// VALIDATION UTILITIES
// ================================================================

/**
 * Validate a provider configuration
 */
export function validateProviderConfig(config: unknown): IntegrationConfig {
  return IntegrationConfigSchema.parse(config);
}

/**
 * Validate system configuration
 */
export function validateSystemConfig(config: unknown): IntegrationSystemConfig {
  return IntegrationSystemConfigSchema.parse(config);
}

/**
 * Validate authentication configuration
 */
export function validateAuthConfig(config: unknown): AuthenticationConfig {
  return AuthenticationConfigSchema.parse(config);
}

/**
 * Create default configuration for a provider type
 */
export function createDefaultProviderConfig(providerId: string): Partial<BaseIntegrationConfig> {
  const baseConfig: Partial<BaseIntegrationConfig> = {
    providerId,
    enabled: true,
    priority: 50,
    environment: 'sandbox',
    tags: [],
    cache: {
      enabled: true,
      ttl: 900,
      maxSize: 10000,
      keyPrefix: `integration:${providerId}`,
      compressionEnabled: false,
      serializationType: 'json',
    },
    logging: {
      level: 'info',
      enableRequestLogging: false,
      enableResponseLogging: false,
      enableErrorLogging: true,
      enablePerformanceLogging: true,
      logSensitiveData: false,
      maxLogSize: 1048576,
    },
    features: {
      enableRealTimeSync: false,
      enableWebhooks: false,
      enableBatchOperations: true,
      enableConflictResolution: true,
      enableDataValidation: true,
      enableMetricsCollection: true,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 50,
      circuitBreakerTimeout: 60000,
    },
  };

  return baseConfig;
}
