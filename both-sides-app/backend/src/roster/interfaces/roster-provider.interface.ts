/**
 * Task 2.3.3.1: RosterProvider Interface Contract
 * 
 * This interface defines the contract for external roster management system integrations.
 * It provides a standardized API for syncing organizations, classes, users, and enrollments
 * from external systems (e.g., Google Classroom, Canvas, PowerSchool, etc.).
 * 
 * The interface is designed to be provider-agnostic, allowing different implementations
 * for various educational management systems while maintaining consistent data flow.
 */

import { Organization, Class, User, Enrollment } from '@prisma/client';

/**
 * Result of a data synchronization operation
 */
export interface SyncResult {
  success: boolean;
  message: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: SyncError[];
  lastSyncTimestamp: Date;
  nextSyncRecommended?: Date;
}

/**
 * Error details for sync operations
 */
export interface SyncError {
  code: string;
  message: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
}

/**
 * Options for data retrieval operations
 */
export interface FetchOptions {
  limit?: number;
  offset?: number;
  since?: Date;
  includeInactive?: boolean;
  filters?: Record<string, any>;
}

/**
 * Connection validation result
 */
export interface ConnectionValidation {
  isValid: boolean;
  message: string;
  providerInfo?: {
    name: string;
    version: string;
    capabilities: string[];
  };
  lastConnectionTest?: Date;
}

/**
 * Sync statistics and metadata
 */
export interface SyncMetadata {
  lastFullSync?: Date;
  lastIncrementalSync?: Date;
  totalRecords: number;
  syncFrequency: string;
  averageSyncDuration: number;
  errorRate: number;
}

/**
 * Main RosterProvider interface for external system integration
 */
export interface RosterProvider {
  /**
   * Provider identification
   */
  readonly providerName: string;
  readonly providerVersion: string;

  // ================================================================
  // ORGANIZATION METHODS
  // ================================================================

  /**
   * Retrieve all organizations from the external system
   * @param options - Fetch options for pagination and filtering
   * @returns Promise resolving to array of organizations
   */
  getOrganizations(options?: FetchOptions): Promise<Organization[]>;

  /**
   * Retrieve a specific organization by external ID
   * @param externalId - External system's organization ID
   * @returns Promise resolving to organization or null if not found
   */
  getOrganization(externalId: string): Promise<Organization | null>;

  /**
   * Get organization hierarchy (parent-child relationships)
   * @param rootOrgId - Optional root organization ID to start from
   * @returns Promise resolving to hierarchical organization structure
   */
  getOrganizationHierarchy(rootOrgId?: string): Promise<Organization[]>;

  // ================================================================
  // CLASS METHODS
  // ================================================================

  /**
   * Retrieve classes from the external system
   * @param organizationId - Optional organization filter
   * @param options - Fetch options for pagination and filtering
   * @returns Promise resolving to array of classes
   */
  getClasses(organizationId?: string, options?: FetchOptions): Promise<Class[]>;

  /**
   * Retrieve a specific class by external ID
   * @param externalId - External system's class ID
   * @returns Promise resolving to class or null if not found
   */
  getClass(externalId: string): Promise<Class | null>;

  /**
   * Get classes taught by a specific teacher
   * @param teacherExternalId - External system's teacher ID
   * @param options - Fetch options for pagination and filtering
   * @returns Promise resolving to array of classes
   */
  getClassesByTeacher(teacherExternalId: string, options?: FetchOptions): Promise<Class[]>;

  /**
   * Get active classes for a specific academic year and term
   * @param academicYear - Academic year (e.g., "2024-2025")
   * @param term - Optional term filter (e.g., "Fall", "Spring")
   * @param options - Fetch options for additional filtering
   * @returns Promise resolving to array of classes
   */
  getClassesByAcademicPeriod(
    academicYear: string, 
    term?: string, 
    options?: FetchOptions
  ): Promise<Class[]>;

  // ================================================================
  // USER METHODS
  // ================================================================

  /**
   * Retrieve users from the external system
   * @param organizationId - Optional organization filter
   * @param options - Fetch options for pagination and filtering
   * @returns Promise resolving to array of users
   */
  getUsers(organizationId?: string, options?: FetchOptions): Promise<User[]>;

  /**
   * Retrieve a specific user by external ID
   * @param externalId - External system's user ID
   * @returns Promise resolving to user or null if not found
   */
  getUser(externalId: string): Promise<User | null>;

  /**
   * Get users by role within an organization
   * @param role - User role to filter by
   * @param organizationId - Optional organization filter
   * @param options - Fetch options for pagination and filtering
   * @returns Promise resolving to array of users
   */
  getUsersByRole(
    role: 'STUDENT' | 'TEACHER' | 'ADMIN', 
    organizationId?: string, 
    options?: FetchOptions
  ): Promise<User[]>;

  /**
   * Search users by name, email, or username
   * @param searchTerm - Search term
   * @param organizationId - Optional organization filter
   * @param options - Fetch options for pagination
   * @returns Promise resolving to array of matching users
   */
  searchUsers(
    searchTerm: string, 
    organizationId?: string, 
    options?: FetchOptions
  ): Promise<User[]>;

  // ================================================================
  // ENROLLMENT METHODS
  // ================================================================

  /**
   * Retrieve enrollments for a specific class
   * @param classExternalId - External system's class ID
   * @param options - Fetch options for pagination and filtering
   * @returns Promise resolving to array of enrollments
   */
  getEnrollments(classExternalId: string, options?: FetchOptions): Promise<Enrollment[]>;

  /**
   * Get all enrollments for a specific student
   * @param studentExternalId - External system's student user ID
   * @param options - Fetch options for pagination and filtering
   * @returns Promise resolving to array of enrollments
   */
  getStudentEnrollments(studentExternalId: string, options?: FetchOptions): Promise<Enrollment[]>;

  /**
   * Get enrollment statistics for an organization or class
   * @param entityExternalId - External ID of organization or class
   * @param entityType - Type of entity ('organization' | 'class')
   * @returns Promise resolving to enrollment statistics
   */
  getEnrollmentStats(
    entityExternalId: string, 
    entityType: 'organization' | 'class'
  ): Promise<{
    totalStudents: number;
    activeEnrollments: number;
    pendingEnrollments: number;
    completedEnrollments: number;
    droppedEnrollments: number;
  }>;

  // ================================================================
  // SYNCHRONIZATION METHODS
  // ================================================================

  /**
   * Perform a full data synchronization
   * @param options - Sync options and filters
   * @returns Promise resolving to sync result
   */
  syncData(options?: {
    lastSync?: Date;
    entityTypes?: string[];
    organizationFilter?: string;
    dryRun?: boolean;
  }): Promise<SyncResult>;

  /**
   * Perform an incremental sync since last update
   * @param lastSyncTime - Timestamp of last successful sync
   * @param options - Additional sync options
   * @returns Promise resolving to sync result
   */
  syncIncremental(lastSyncTime: Date, options?: FetchOptions): Promise<SyncResult>;

  /**
   * Get sync metadata and statistics
   * @returns Promise resolving to sync metadata
   */
  getSyncMetadata(): Promise<SyncMetadata>;

  // ================================================================
  // CONNECTION & HEALTH METHODS
  // ================================================================

  /**
   * Validate connection to external system
   * @param includeCapabilityTest - Whether to test all capabilities
   * @returns Promise resolving to connection validation result
   */
  validateConnection(includeCapabilityTest?: boolean): Promise<ConnectionValidation>;

  /**
   * Test provider health and response time
   * @returns Promise resolving to health check result
   */
  healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    message: string;
    timestamp: Date;
  }>;

  /**
   * Get provider configuration and capabilities
   * @returns Provider configuration information
   */
  getCapabilities(): {
    supportsIncremental: boolean;
    supportsRealtime: boolean;
    supportsWebhooks: boolean;
    maxBatchSize: number;
    rateLimits: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
    supportedEntityTypes: string[];
  };

  // ================================================================
  // CLEANUP & MAINTENANCE METHODS
  // ================================================================

  /**
   * Clean up any temporary resources or connections
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup(): Promise<void>;

  /**
   * Reset provider state (useful for testing)
   * @returns Promise that resolves when reset is complete
   */
  reset?(): Promise<void>;
}

/**
 * Extended interface for providers that support real-time updates
 */
export interface RealtimeRosterProvider extends RosterProvider {
  /**
   * Subscribe to real-time updates
   * @param entityTypes - Types of entities to subscribe to
   * @param callback - Callback function for updates
   * @returns Promise resolving to subscription ID
   */
  subscribeToUpdates(
    entityTypes: string[],
    callback: (update: {
      entityType: string;
      entityId: string;
      action: 'create' | 'update' | 'delete';
      data?: any;
      timestamp: Date;
    }) => void
  ): Promise<string>;

  /**
   * Unsubscribe from real-time updates
   * @param subscriptionId - Subscription ID from subscribeToUpdates
   * @returns Promise that resolves when unsubscribed
   */
  unsubscribeFromUpdates(subscriptionId: string): Promise<void>;
}

/**
 * Extended interface for providers that support webhook notifications
 */
export interface WebhookRosterProvider extends RosterProvider {
  /**
   * Register webhook endpoint for notifications
   * @param webhookUrl - URL to receive webhook notifications
   * @param events - Array of event types to subscribe to
   * @param secret - Optional secret for webhook verification
   * @returns Promise resolving to webhook registration ID
   */
  registerWebhook(
    webhookUrl: string,
    events: string[],
    secret?: string
  ): Promise<string>;

  /**
   * Unregister a webhook endpoint
   * @param webhookId - Webhook registration ID
   * @returns Promise that resolves when webhook is unregistered
   */
  unregisterWebhook(webhookId: string): Promise<void>;

  /**
   * Verify webhook signature (for security)
   * @param payload - Webhook payload
   * @param signature - Webhook signature
   * @param secret - Webhook secret
   * @returns Boolean indicating if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
}
