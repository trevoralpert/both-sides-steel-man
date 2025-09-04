/**
 * Phase 9 Task 9.1.1: Core Integration Interfaces & Types
 * 
 * This file defines the foundational abstractions and interfaces for external system integration.
 * These interfaces enable the integration layer to work with various external educational systems
 * like TimeBack, Google Classroom, Canvas, etc. in a provider-agnostic way.
 */

import { Organization, Class, User, Enrollment } from '@prisma/client';

// ================================================================
// CORE INTEGRATION TYPES
// ================================================================

/**
 * Integration status for monitoring integration health
 */
export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  MAINTENANCE = 'maintenance'
}

/**
 * Integration health check result
 */
export interface IntegrationHealth {
  status: IntegrationStatus;
  responseTime: number;
  lastCheck: Date;
  errorMessage?: string;
  capabilities: string[];
  metadata?: Record<string, any>;
}

/**
 * External system metadata for tracking sync relationships
 */
export interface ExternalSystemMetadata {
  externalId: string;
  externalSystemId: string;
  lastSyncAt?: Date;
  syncStatus: 'pending' | 'synced' | 'error' | 'conflict';
  syncVersion: number;
  conflictData?: Record<string, any>;
}

/**
 * Data synchronization context for tracking sync operations
 */
export interface SyncContext {
  syncId: string;
  externalSystemId: string;
  startTime: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Sync operation result with detailed tracking
 */
export interface SyncOperationResult {
  success: boolean;
  entityType: string;
  operation: 'create' | 'update' | 'delete' | 'skip';
  externalId?: string;
  internalId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

// ================================================================
// BASE INTEGRATION PROVIDER INTERFACE
// ================================================================

/**
 * Base interface for all external system providers
 * This is the foundational contract that all integration providers must implement
 */
export interface IExternalSystemProvider {
  /**
   * Unique identifier for this provider type
   */
  readonly providerId: string;
  
  /**
   * Human-readable name of the provider
   */
  readonly providerName: string;
  
  /**
   * Version of the provider implementation
   */
  readonly providerVersion: string;
  
  /**
   * Configuration for this provider instance
   */
  readonly configuration: Record<string, any>;

  /**
   * Initialize the provider with given configuration
   */
  initialize(config: Record<string, any>): Promise<void>;

  /**
   * Test the connection to the external system
   */
  testConnection(): Promise<IntegrationHealth>;

  /**
   * Get current health status of the integration
   */
  getHealthStatus(): Promise<IntegrationHealth>;

  /**
   * Get provider capabilities and supported features
   */
  getCapabilities(): {
    supportsRealTime: boolean;
    supportsWebhooks: boolean;
    supportsIncremental: boolean;
    supportedEntityTypes: string[];
    rateLimits: {
      requestsPerMinute: number;
      requestsPerHour: number;
      burstLimit?: number;
    };
    authentication: {
      methods: string[];
      requiresRefresh: boolean;
    };
  };

  /**
   * Clean up resources and close connections
   */
  cleanup(): Promise<void>;
}

// ================================================================
// DATA SYNCHRONIZATION PROVIDER
// ================================================================

/**
 * Extended interface for providers that support data synchronization
 */
export interface IDataSyncProvider extends IExternalSystemProvider {
  /**
   * Perform a full synchronization of all supported entity types
   */
  performFullSync(context: SyncContext): Promise<{
    success: boolean;
    results: SyncOperationResult[];
    summary: {
      totalProcessed: number;
      created: number;
      updated: number;
      deleted: number;
      skipped: number;
      errors: number;
    };
  }>;

  /**
   * Perform an incremental synchronization since the last sync
   */
  performIncrementalSync(context: SyncContext, lastSyncTime: Date): Promise<{
    success: boolean;
    results: SyncOperationResult[];
    summary: {
      totalProcessed: number;
      created: number;
      updated: number;
      deleted: number;
      skipped: number;
      errors: number;
    };
  }>;

  /**
   * Sync a specific entity by its external ID
   */
  syncEntity(
    entityType: string, 
    externalId: string, 
    context: SyncContext
  ): Promise<SyncOperationResult>;

  /**
   * Get sync metadata and statistics
   */
  getSyncMetadata(): Promise<{
    lastFullSync?: Date;
    lastIncrementalSync?: Date;
    totalRecords: number;
    syncFrequency: string;
    averageSyncDuration: number;
    errorRate: number;
    supportedOperations: string[];
  }>;

  /**
   * Detect conflicts between external and internal data
   */
  detectConflicts(entityType: string, externalId?: string): Promise<{
    conflicts: Array<{
      entityType: string;
      entityId: string;
      externalData: Record<string, any>;
      internalData: Record<string, any>;
      conflictFields: string[];
      lastModified: {
        external: Date;
        internal: Date;
      };
    }>;
  }>;

  /**
   * Resolve a data conflict using specified strategy
   */
  resolveConflict(
    conflictId: string,
    strategy: 'external-wins' | 'internal-wins' | 'manual' | 'merge',
    manualData?: Record<string, any>
  ): Promise<SyncOperationResult>;
}

// ================================================================
// AUTHENTICATION PROVIDER
// ================================================================

/**
 * Authentication provider interface for external system authentication
 */
export interface IAuthenticationProvider {
  /**
   * Type of authentication this provider supports
   */
  readonly authType: 'oauth2' | 'api-key' | 'basic' | 'jwt' | 'custom';

  /**
   * Authenticate with the external system
   */
  authenticate(credentials: Record<string, any>): Promise<{
    success: boolean;
    token?: string;
    refreshToken?: string;
    expiresAt?: Date;
    error?: string;
  }>;

  /**
   * Refresh authentication token if supported
   */
  refreshToken(refreshToken: string): Promise<{
    success: boolean;
    token?: string;
    refreshToken?: string;
    expiresAt?: Date;
    error?: string;
  }>;

  /**
   * Validate current authentication status
   */
  validateAuthentication(token: string): Promise<{
    valid: boolean;
    expiresAt?: Date;
    userInfo?: Record<string, any>;
  }>;

  /**
   * Revoke authentication and cleanup
   */
  revokeAuthentication(token: string): Promise<{ success: boolean }>;
}

// ================================================================
// EXTENDED ROSTER PROVIDER INTERFACE
// ================================================================

/**
 * Extended roster provider interface that combines all integration capabilities
 * This extends the existing RosterProvider with new integration features
 */
export interface IRosterProvider extends IDataSyncProvider, IAuthenticationProvider {
  /**
   * Get organizations from external system with sync metadata
   */
  getOrganizationsWithMetadata(options?: {
    includeInactive?: boolean;
    since?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Array<Organization & { metadata: ExternalSystemMetadata }>>;

  /**
   * Get classes from external system with sync metadata
   */
  getClassesWithMetadata(
    organizationId?: string,
    options?: {
      includeInactive?: boolean;
      since?: Date;
      academicYear?: string;
      term?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<Class & { metadata: ExternalSystemMetadata }>>;

  /**
   * Get users from external system with sync metadata
   */
  getUsersWithMetadata(
    organizationId?: string,
    options?: {
      role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
      includeInactive?: boolean;
      since?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<User & { metadata: ExternalSystemMetadata }>>;

  /**
   * Get enrollments from external system with sync metadata
   */
  getEnrollmentsWithMetadata(
    classId?: string,
    options?: {
      status?: string;
      since?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<Enrollment & { metadata: ExternalSystemMetadata }>>;

  /**
   * Map external entity ID to internal ID
   */
  mapExternalToInternal(entityType: string, externalId: string): Promise<string | null>;

  /**
   * Map internal entity ID to external ID
   */
  mapInternalToExternal(entityType: string, internalId: string): Promise<string | null>;

  /**
   * Create or update mapping between external and internal IDs
   */
  createIdMapping(
    entityType: string,
    externalId: string,
    internalId: string,
    metadata?: Record<string, any>
  ): Promise<void>;

  /**
   * Remove ID mapping
   */
  removeIdMapping(entityType: string, externalId: string): Promise<void>;

  /**
   * Bulk create ID mappings for performance
   */
  bulkCreateIdMappings(mappings: Array<{
    entityType: string;
    externalId: string;
    internalId: string;
    metadata?: Record<string, any>;
  }>): Promise<void>;
}

// ================================================================
// WEBHOOK PROVIDER INTERFACE
// ================================================================

/**
 * Interface for providers that support webhook notifications
 */
export interface IWebhookProvider extends IExternalSystemProvider {
  /**
   * Register a webhook endpoint for receiving real-time notifications
   */
  registerWebhook(
    endpoint: string,
    events: string[],
    secret?: string
  ): Promise<{
    success: boolean;
    webhookId?: string;
    error?: string;
  }>;

  /**
   * Unregister a webhook endpoint
   */
  unregisterWebhook(webhookId: string): Promise<{ success: boolean }>;

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean;

  /**
   * Process incoming webhook payload
   */
  processWebhookPayload(payload: Record<string, any>): Promise<{
    processed: boolean;
    entityType?: string;
    entityId?: string;
    action?: 'create' | 'update' | 'delete';
    syncRequired?: boolean;
  }>;

  /**
   * Get list of supported webhook events
   */
  getSupportedWebhookEvents(): string[];
}

// ================================================================
// REAL-TIME PROVIDER INTERFACE
// ================================================================

/**
 * Interface for providers that support real-time subscriptions
 */
export interface IRealtimeProvider extends IExternalSystemProvider {
  /**
   * Subscribe to real-time updates for specific entities
   */
  subscribe(
    entityTypes: string[],
    callback: (update: {
      entityType: string;
      entityId: string;
      action: 'create' | 'update' | 'delete';
      data?: any;
      timestamp: Date;
    }) => void
  ): Promise<string>; // Returns subscription ID

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Get active subscription status
   */
  getSubscriptionStatus(subscriptionId: string): Promise<{
    active: boolean;
    entityTypes: string[];
    lastUpdate?: Date;
  }>;
}

// ================================================================
// BATCH OPERATION PROVIDER
// ================================================================

/**
 * Interface for providers that support batch operations for performance
 */
export interface IBatchOperationProvider extends IExternalSystemProvider {
  /**
   * Perform batch retrieval of entities
   */
  batchGetEntities<T>(
    entityType: string,
    externalIds: string[]
  ): Promise<Array<T & { metadata: ExternalSystemMetadata }>>;

  /**
   * Perform batch synchronization of entities
   */
  batchSyncEntities(
    operations: Array<{
      entityType: string;
      externalId: string;
      operation: 'sync' | 'force-sync' | 'validate';
    }>,
    context: SyncContext
  ): Promise<SyncOperationResult[]>;

  /**
   * Get batch operation limits
   */
  getBatchLimits(): {
    maxBatchSize: number;
    supportedEntityTypes: string[];
    maxConcurrentBatches: number;
  };
}
