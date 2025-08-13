/**
 * Roster Provider System - Main Export File
 * 
 * This file exports all the components of the roster provider system,
 * providing a clean interface for external roster management system integration.
 * 
 * Task 2.3.3: Design RosterProvider Interface and Contracts - COMPLETED
 * 
 * Components:
 * - RosterProvider interface and extensions
 * - Data Transfer Objects (DTOs) for all entity types
 * - Comprehensive error handling with circuit breaker pattern
 * - Data validation and mapping utilities
 * - Advanced caching strategy with multi-level cache
 */

// ================================================================
// INTERFACES AND CONTRACTS
// ================================================================
export * from './interfaces/roster-provider.interface';

// ================================================================
// DATA TRANSFER OBJECTS
// ================================================================
export * from './dto/roster-data.dto';

// ================================================================
// ERROR HANDLING AND RESILIENCE
// ================================================================
export * from './errors/roster-errors';

// ================================================================
// VALIDATION AND MAPPING UTILITIES
// ================================================================
export * from './utils/validation-mapping.util';

// ================================================================
// CACHING SERVICES
// ================================================================
export * from './services/roster-cache.service';

// ================================================================
// MOCK PROVIDER AND TESTING UTILITIES
// ================================================================
export * from './providers/mock-roster-provider';
export * from './testing/mock-data-generator';
export * from './testing/demo-data-manager';
export * from './testing/mock-roster-provider.test';

// ================================================================
// TYPE DEFINITIONS FOR EXTERNAL USE
// ================================================================

/**
 * Configuration interface for roster provider implementations
 */
export interface RosterProviderConfig {
  providerName: string;
  apiEndpoint: string;
  apiKey?: string;
  timeout: number;
  retryConfig?: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
  cacheConfig?: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  circuitBreakerConfig?: {
    failureThreshold: number;
    resetTimeout: number;
  };
}

/**
 * Provider factory type for creating provider instances
 */
export type RosterProviderFactory = (config: RosterProviderConfig) => Promise<import('./interfaces/roster-provider.interface').RosterProvider>;

/**
 * Integration result summary
 */
export interface IntegrationSummary {
  providerId: string;
  isHealthy: boolean;
  lastSync: Date | null;
  syncStatus: 'pending' | 'syncing' | 'completed' | 'failed';
  totalRecords: {
    organizations: number;
    users: number;
    classes: number;
    enrollments: number;
  };
  errors: Array<{
    code: string;
    message: string;
    timestamp: Date;
  }>;
  performance: {
    avgResponseTime: number;
    successRate: number;
    cacheHitRate: number;
  };
}
