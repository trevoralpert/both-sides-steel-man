/**
 * TimeBack Services Index
 * 
 * Central exports for all TimeBack integration services including the complete API client,
 * real-time synchronization, data mapping, and the production-ready roster provider.
 */

// ===================================================================
// CORE TIMEBACK SERVICES
// ===================================================================

export { TimeBackCompleteClient } from '../../clients/timeback-complete-client';
export { TimeBackRealTimeSyncService } from './timeback-realtime-sync.service';
export { TimeBackDataMapperService } from './timeback-data-mapper.service';
export { TimeBackRosterProvider } from '../../providers/timeback-roster-provider';

// ===================================================================
// TYPES AND INTERFACES
// ===================================================================

export type {
  // Client types
  TimeBackUser,
  TimeBackClass,
  TimeBackEnrollment,
  TimeBackOrganization,
  TimeBackApiResponse,
  TimeBackBatchResponse,
  TimeBackWebhookEvent,
  TimeBackQueryOptions,
  TimeBackBulkOperationOptions,
} from '../../clients/timeback-complete-client';

export type {
  // Real-time sync types
  RealTimeSyncConfig,
  RealTimeSyncSession,
  WebhookEventProcessingResult,
  RealTimeSyncMetrics,
  RealTimeSyncAlert,
} from './timeback-realtime-sync.service';

export type {
  // Data mapping types
  DataMappingConfig,
  FieldMappingRule,
  EntityMappingSchema,
  RelationshipMapping,
  CustomTransformer,
  ValidationRule,
  MappingContext,
  MappingResult,
  InternalUser,
  InternalClass,
  InternalEnrollment,
  InternalOrganization,
} from './timeback-data-mapper.service';

export type {
  // Provider types
  TimeBackProviderConfig,
  TimeBackProviderMetrics,
  TimeBackSyncReport,
} from '../../providers/timeback-roster-provider';

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Create default TimeBack provider configuration
 */
export function createDefaultTimeBackConfig(overrides?: any): any {
  return {
    enabled: true,
    name: 'TimeBack Roster Provider',
    type: 'lms',
    version: '1.0.0',
    
    timeback: {
      apiUrl: process.env.TIMEBACK_API_URL || 'https://api.timeback.com',
      apiKey: process.env.TIMEBACK_API_KEY || '',
      organizationId: process.env.TIMEBACK_ORG_ID || '',
      webhookSecret: process.env.TIMEBACK_WEBHOOK_SECRET || '',
      enableRealTimeSync: (process.env.TIMEBACK_REALTIME_SYNC || 'true') === 'true',
      
      syncIntervals: {
        fullSync: parseInt(process.env.TIMEBACK_FULL_SYNC_INTERVAL || '86400000'), // 24 hours
        incrementalSync: parseInt(process.env.TIMEBACK_INCREMENTAL_SYNC_INTERVAL || '300000'), // 5 minutes
        healthCheck: parseInt(process.env.TIMEBACK_HEALTH_CHECK_INTERVAL || '60000'), // 1 minute
      },
      
      features: {
        caching: true,
        conflictResolution: true,
        webhooks: true,
        batching: true,
        monitoring: true,
      },
      
      limits: {
        maxBatchSize: parseInt(process.env.TIMEBACK_MAX_BATCH_SIZE || '100'),
        maxConcurrentRequests: parseInt(process.env.TIMEBACK_MAX_CONCURRENT || '10'),
        rateLimitPerMinute: parseInt(process.env.TIMEBACK_RATE_LIMIT || '1000'),
      },
      
      retry: {
        maxAttempts: parseInt(process.env.TIMEBACK_RETRY_ATTEMPTS || '3'),
        backoffMultiplier: parseFloat(process.env.TIMEBACK_RETRY_BACKOFF || '2'),
        maxDelay: parseInt(process.env.TIMEBACK_RETRY_MAX_DELAY || '10000'),
      },
    },
    
    ...overrides,
  };
}

/**
 * TimeBack utility functions
 */
export const TimeBackUtils = {
  /**
   * Generate TimeBack API endpoint URL
   */
  createApiUrl(baseUrl: string, endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  },

  /**
   * Validate TimeBack configuration
   */
  validateConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.timeback?.apiUrl) {
      errors.push('TimeBack API URL is required');
    }

    if (!config.timeback?.apiKey) {
      errors.push('TimeBack API key is required');
    }

    if (!config.timeback?.organizationId) {
      errors.push('TimeBack organization ID is required');
    }

    if (config.timeback?.enableRealTimeSync && !config.timeback?.webhookSecret) {
      errors.push('Webhook secret is required when real-time sync is enabled');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Create TimeBack webhook signature
   */
  createWebhookSignature(payload: any, secret: string): string {
    // Simplified signature creation - in real implementation use HMAC-SHA256
    const crypto = require('crypto');
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  },

  /**
   * Verify TimeBack webhook signature
   */
  verifyWebhookSignature(payload: any, signature: string, secret: string): boolean {
    try {
      const expectedSignature = this.createWebhookSignature(payload, secret);
      return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
    } catch (error) {
      return false;
    }
  },

  /**
   * Parse TimeBack error response
   */
  parseErrorResponse(error: any): {
    code: string;
    message: string;
    details?: any;
    isRetryable: boolean;
  } {
    if (error.response?.data) {
      const data = error.response.data;
      return {
        code: data.error?.code || 'UNKNOWN_ERROR',
        message: data.error?.message || data.message || 'Unknown error occurred',
        details: data.error?.details,
        isRetryable: this.isRetryableError(error.response.status, data.error?.code),
      };
    }

    return {
      code: 'NETWORK_ERROR',
      message: error.message || 'Network error occurred',
      isRetryable: true,
    };
  },

  /**
   * Check if error is retryable
   */
  isRetryableError(statusCode: number, errorCode?: string): boolean {
    // Network errors and 5xx errors are generally retryable
    if (statusCode >= 500) return true;
    
    // Rate limiting errors are retryable with backoff
    if (statusCode === 429) return true;
    
    // Specific error codes that are retryable
    const retryableErrorCodes = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'SERVICE_UNAVAILABLE',
    ];
    
    return errorCode ? retryableErrorCodes.includes(errorCode) : false;
  },

  /**
   * Format TimeBack entity ID
   */
  formatEntityId(id: string, entityType: string): string {
    return `timeback:${entityType}:${id}`;
  },

  /**
   * Parse TimeBack entity ID
   */
  parseEntityId(formattedId: string): { provider: string; entityType: string; id: string } | null {
    const parts = formattedId.split(':');
    if (parts.length === 3 && parts[0] === 'timeback') {
      return {
        provider: parts[0],
        entityType: parts[1],
        id: parts[2],
      };
    }
    return null;
  },

  /**
   * Calculate sync priority based on entity type and data
   */
  calculateSyncPriority(entityType: string, data: any): number {
    // Priority scale: 1 (highest) to 10 (lowest)
    const basePriorities = {
      organization: 2,  // High priority - affects everything else
      user: 3,         // High priority - needed for enrollments
      class: 4,        // Medium-high priority
      enrollment: 5,   // Medium priority
    };

    let priority = basePriorities[entityType as keyof typeof basePriorities] || 7;

    // Adjust priority based on data characteristics
    if (data?.status === 'active') {
      priority -= 1; // Active entities get higher priority
    }

    if (data?.updatedAt) {
      const updatedAt = new Date(data.updatedAt);
      const hoursSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
      
      // Recently updated entities get higher priority
      if (hoursSinceUpdate < 1) {
        priority -= 2;
      } else if (hoursSinceUpdate < 24) {
        priority -= 1;
      }
    }

    return Math.max(1, Math.min(10, priority));
  },

  /**
   * Create batch groups for optimal processing
   */
  createBatchGroups<T>(
    items: T[],
    batchSize: number,
    priorityFn?: (item: T) => number
  ): T[][] {
    if (priorityFn) {
      // Sort by priority first
      items.sort((a, b) => priorityFn(a) - priorityFn(b));
    }

    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  },
};

/**
 * TimeBack constants and defaults
 */
export const TIMEBACK_CONSTANTS = {
  // API endpoints
  ENDPOINTS: {
    HEALTH: '/health',
    ORGANIZATIONS: '/organizations',
    USERS: '/users',
    CLASSES: '/classes',
    ENROLLMENTS: '/enrollments',
    WEBHOOKS: '/webhooks',
    BULK: '/bulk',
  },

  // Default configuration values
  DEFAULTS: {
    API_TIMEOUT: 30000,        // 30 seconds
    BATCH_SIZE: 50,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,         // 1 second
    WEBHOOK_TIMEOUT: 5000,     // 5 seconds
    HEALTH_CHECK_INTERVAL: 60000, // 1 minute
    SYNC_INTERVAL: 300000,     // 5 minutes
    CACHE_TTL: 300000,         // 5 minutes
  },

  // Status mappings
  STATUS_MAPPINGS: {
    USER: {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      PENDING: 'pending',
      SUSPENDED: 'suspended',
    },
    CLASS: {
      ACTIVE: 'active',
      ARCHIVED: 'archived',
      DRAFT: 'draft',
    },
    ENROLLMENT: {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      PENDING: 'pending',
      COMPLETED: 'completed',
      DROPPED: 'dropped',
      WAITLISTED: 'waitlisted',
    },
    ORGANIZATION: {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      SUSPENDED: 'suspended',
    },
  },

  // Role mappings
  ROLE_MAPPINGS: {
    STUDENT: 'student',
    TEACHER: 'teacher',
    ADMIN: 'admin',
    STAFF: 'staff',
    PARENT: 'parent',
    TA: 'ta',
    OBSERVER: 'observer',
  },

  // Error codes
  ERROR_CODES: {
    AUTHENTICATION_FAILED: 'AUTH_FAILED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT',
    RESOURCE_NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
  },

  // Webhook event types
  WEBHOOK_EVENTS: {
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    CLASS_CREATED: 'class.created',
    CLASS_UPDATED: 'class.updated',
    CLASS_DELETED: 'class.deleted',
    ENROLLMENT_CREATED: 'enrollment.created',
    ENROLLMENT_UPDATED: 'enrollment.updated',
    ENROLLMENT_DELETED: 'enrollment.deleted',
    ORGANIZATION_CREATED: 'organization.created',
    ORGANIZATION_UPDATED: 'organization.updated',
    ORGANIZATION_DELETED: 'organization.deleted',
  },
} as const;

/**
 * Data validation utilities
 */
export const TimeBackValidators = {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate TimeBack ID format
   */
  isValidTimeBackId(id: string): boolean {
    // TimeBack IDs are typically UUIDs or alphanumeric strings
    const idRegex = /^[a-zA-Z0-9_-]+$/;
    return idRegex.test(id) && id.length >= 3 && id.length <= 128;
  },

  /**
   * Validate user data
   */
  validateUserData(user: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!user.email || !this.isValidEmail(user.email)) {
      errors.push('Valid email is required');
    }

    if (!user.profile?.firstName) {
      errors.push('First name is required');
    }

    if (!user.profile?.lastName) {
      errors.push('Last name is required');
    }

    if (!user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
      errors.push('At least one role is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate class data
   */
  validateClassData(classData: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!classData.name) {
      errors.push('Class name is required');
    }

    if (!classData.organizationId || !this.isValidTimeBackId(classData.organizationId)) {
      errors.push('Valid organization ID is required');
    }

    if (!classData.teacherId || !this.isValidTimeBackId(classData.teacherId)) {
      errors.push('Valid teacher ID is required');
    }

    if (!classData.subject?.area) {
      errors.push('Subject area is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate enrollment data
   */
  validateEnrollmentData(enrollment: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!enrollment.classId || !this.isValidTimeBackId(enrollment.classId)) {
      errors.push('Valid class ID is required');
    }

    if (!enrollment.userId || !this.isValidTimeBackId(enrollment.userId)) {
      errors.push('Valid user ID is required');
    }

    if (!enrollment.role || !Object.values(TIMEBACK_CONSTANTS.ROLE_MAPPINGS).includes(enrollment.role)) {
      errors.push('Valid role is required');
    }

    if (!enrollment.enrollmentDate) {
      errors.push('Enrollment date is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

/**
 * Performance optimization utilities
 */
export const TimeBackOptimizations = {
  /**
   * Create optimized query parameters
   */
  optimizeQuery(query: any): any {
    const optimized = { ...query };

    // Optimize field selection
    if (!optimized.fields) {
      optimized.fields = this.getDefaultFields(optimized.entityType);
    }

    // Optimize pagination
    if (!optimized.limit) {
      optimized.limit = TIMEBACK_CONSTANTS.DEFAULTS.BATCH_SIZE;
    }

    // Optimize includes
    if (optimized.include && Array.isArray(optimized.include)) {
      optimized.include = optimized.include.slice(0, 5); // Limit includes to prevent over-fetching
    }

    return optimized;
  },

  /**
   * Get default fields for entity type
   */
  getDefaultFields(entityType: string): string[] {
    const defaultFields = {
      user: ['id', 'email', 'profile', 'status', 'roles', 'createdAt', 'updatedAt'],
      class: ['id', 'name', 'organizationId', 'teacherId', 'subject', 'status', 'enrollment', 'createdAt', 'updatedAt'],
      enrollment: ['id', 'classId', 'userId', 'role', 'status', 'enrollmentDate', 'grades', 'createdAt', 'updatedAt'],
      organization: ['id', 'name', 'type', 'status', 'contact', 'createdAt', 'updatedAt'],
    };

    return defaultFields[entityType as keyof typeof defaultFields] || [];
  },

  /**
   * Calculate optimal batch size based on data characteristics
   */
  calculateOptimalBatchSize(dataSize: number, complexity: 'low' | 'medium' | 'high'): number {
    const baseSize = TIMEBACK_CONSTANTS.DEFAULTS.BATCH_SIZE;
    
    // Adjust based on data size
    let adjustedSize = baseSize;
    if (dataSize > 10000) {
      adjustedSize = Math.floor(baseSize * 0.5);
    } else if (dataSize < 100) {
      adjustedSize = Math.floor(baseSize * 1.5);
    }

    // Adjust based on complexity
    const complexityMultipliers = {
      low: 1.5,
      medium: 1.0,
      high: 0.7,
    };

    adjustedSize = Math.floor(adjustedSize * complexityMultipliers[complexity]);

    // Ensure reasonable bounds
    return Math.max(10, Math.min(200, adjustedSize));
  },
};

/**
 * Error handling utilities
 */
export const TimeBackErrorHandler = {
  /**
   * Create standardized error
   */
  createError(
    code: string,
    message: string,
    details?: any,
    isRetryable: boolean = false
  ): Error & { code: string; details?: any; isRetryable: boolean } {
    const error = new Error(message) as any;
    error.code = code;
    error.details = details;
    error.isRetryable = isRetryable;
    return error;
  },

  /**
   * Handle API errors with appropriate retry logic
   */
  handleApiError(error: any): Error & { code: string; isRetryable: boolean } {
    const parsed = TimeBackUtils.parseErrorResponse(error);
    return this.createError(parsed.code, parsed.message, parsed.details, parsed.isRetryable);
  },

  /**
   * Create timeout error
   */
  createTimeoutError(operation: string, timeout: number): Error & { code: string; isRetryable: boolean } {
    return this.createError(
      TIMEBACK_CONSTANTS.ERROR_CODES.TIMEOUT,
      `Operation '${operation}' timed out after ${timeout}ms`,
      { operation, timeout },
      true
    );
  },
};
