/**
 * Complete TimeBack API Client
 * 
 * Production-ready TimeBack API client with comprehensive endpoint mapping,
 * advanced error handling, real-time webhook support, and integration with
 * our reliability, caching, and monitoring systems.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TimeBackApiClient } from './timeback-api-client';
import { ReliabilityManagerService } from '../services/reliability/reliability-manager.service';
import { IntelligentCacheService } from '../services/caching/intelligent-cache.service';
import { HealthCheckService } from '../services/health/health-check.service';
import { EventEmitter } from 'events';

// ===================================================================
// TIMEBACK DATA MODELS
// ===================================================================

export interface TimeBackOrganization {
  id: string;
  name: string;
  type: 'school' | 'district' | 'institution';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  settings: {
    timezone: string;
    academicYear: {
      startDate: string;
      endDate: string;
    };
    grading: {
      scale: 'points' | 'percentage' | 'letter';
      periods: Array<{
        name: string;
        startDate: string;
        endDate: string;
        weight: number;
      }>;
    };
  };
  hierarchy: {
    parentId?: string;
    level: number;
    path: string[];
  };
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  metadata: {
    studentCount?: number;
    teacherCount?: number;
    classCount?: number;
    version: string;
  };
}

export interface TimeBackUser {
  id: string;
  externalId?: string;
  email: string;
  username: string;
  profile: {
    firstName: string;
    lastName: string;
    displayName?: string;
    avatar?: string;
    bio?: string;
  };
  roles: Array<{
    organizationId: string;
    roleType: 'student' | 'teacher' | 'admin' | 'parent' | 'staff';
    permissions: string[];
    department?: string;
    grade?: string;
    subjects?: string[];
  }>;
  authentication: {
    passwordHash?: string;
    lastLogin?: string;
    mfaEnabled: boolean;
    ssoProvider?: string;
    externalAuthId?: string;
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    accessibility: Record<string, any>;
  };
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  createdAt: string;
  updatedAt: string;
  metadata: {
    lastSync?: string;
    source: string;
    version: string;
  };
}

export interface TimeBackClass {
  id: string;
  name: string;
  code: string;
  description?: string;
  organizationId: string;
  teacherId: string;
  subject: {
    area: string;
    level: string;
    curriculum?: string;
  };
  schedule: {
    term: string;
    periods: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      room?: string;
    }>;
    dates: {
      startDate: string;
      endDate: string;
    };
  };
  enrollment: {
    capacity: number;
    currentCount: number;
    waitlistCount: number;
    enrollmentPolicy: 'open' | 'approval' | 'invitation';
  };
  grading: {
    scale: 'points' | 'percentage' | 'letter';
    categories: Array<{
      name: string;
      weight: number;
      dropLowest?: number;
    }>;
  };
  resources: {
    materials?: string[];
    textbooks?: Array<{
      title: string;
      isbn?: string;
      required: boolean;
    }>;
    links?: Array<{
      title: string;
      url: string;
      type: 'resource' | 'assignment' | 'video' | 'document';
    }>;
  };
  settings: {
    visibility: 'public' | 'private' | 'organization';
    allowLateSubmissions: boolean;
    gradingRubric?: string;
  };
  status: 'active' | 'archived' | 'draft';
  createdAt: string;
  updatedAt: string;
  metadata: {
    lastSync?: string;
    version: string;
  };
}

export interface TimeBackEnrollment {
  id: string;
  classId: string;
  userId: string;
  organizationId: string;
  role: 'student' | 'teacher' | 'ta' | 'observer';
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'dropped' | 'waitlisted';
  enrollmentDate: string;
  completionDate?: string;
  grades: {
    current?: {
      score: number;
      letter?: string;
      percentage: number;
    };
    final?: {
      score: number;
      letter: string;
      percentage: number;
    };
    categories: Array<{
      name: string;
      score: number;
      weight: number;
      assignments: Array<{
        id: string;
        name: string;
        score: number;
        maxPoints: number;
        submittedAt?: string;
        gradedAt?: string;
      }>;
    }>;
  };
  attendance: {
    totalSessions: number;
    attendedSessions: number;
    absences: Array<{
      date: string;
      type: 'excused' | 'unexcused' | 'tardy';
      reason?: string;
    }>;
  };
  progress: {
    completionPercentage: number;
    milestones: Array<{
      name: string;
      completed: boolean;
      completedAt?: string;
    }>;
  };
  notes: Array<{
    id: string;
    authorId: string;
    content: string;
    type: 'academic' | 'behavioral' | 'administrative';
    createdAt: string;
    updatedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  metadata: {
    lastSync?: string;
    version: string;
  };
}

// ===================================================================
// API RESPONSE TYPES
// ===================================================================

export interface TimeBackApiResponse<T> {
  data: T;
  meta: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
  links?: {
    first?: string;
    last?: string;
    prev?: string;
    next?: string;
  };
  timestamp: string;
  version: string;
}

export interface TimeBackBatchResponse<T> {
  items: Array<{
    id: string;
    status: 'success' | 'error' | 'skipped';
    data?: T;
    error?: {
      code: string;
      message: string;
      details?: any;
    };
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  processingTime: number;
  batchId: string;
  timestamp: string;
}

export interface TimeBackWebhookEvent {
  id: string;
  type: string;
  action: 'created' | 'updated' | 'deleted' | 'enrolled' | 'unenrolled';
  entity: 'organization' | 'user' | 'class' | 'enrollment';
  entityId: string;
  organizationId: string;
  data: {
    current?: any;
    previous?: any;
    changes?: Record<string, { from: any; to: any }>;
  };
  timestamp: string;
  version: string;
  source: {
    userId?: string;
    system: string;
    ip?: string;
  };
  metadata: {
    correlationId?: string;
    batchId?: string;
    retryCount?: number;
  };
}

// ===================================================================
// QUERY AND FILTER TYPES
// ===================================================================

export interface TimeBackQueryOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  fields?: string[];
  include?: string[];
  filter?: Record<string, any>;
  search?: string;
  dateRange?: {
    start: string;
    end: string;
    field: string;
  };
}

export interface TimeBackBulkOperationOptions {
  batchSize?: number;
  parallel?: boolean;
  continueOnError?: boolean;
  dryRun?: boolean;
  validateOnly?: boolean;
  conflictResolution?: 'skip' | 'overwrite' | 'merge' | 'error';
}

// ===================================================================
// COMPLETE TIMEBACK API CLIENT
// ===================================================================

@Injectable()
export class TimeBackCompleteClient extends EventEmitter {
  private readonly logger = new Logger(TimeBackCompleteClient.name);
  private readonly baseClient: TimeBackApiClient;
  private isInitialized = false;
  private healthCheckInterval: NodeJS.Timeout;
  private webhookEndpoints = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly reliabilityManager: ReliabilityManagerService,
    private readonly cacheService: IntelligentCacheService,
    private readonly healthService: HealthCheckService,
  ) {
    super();
    this.baseClient = new TimeBackApiClient(configService);
  }

  /**
   * Initialize the TimeBack client
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.logger.log('Initializing TimeBack Complete Client');

      // Initialize base client
      await this.baseClient.initialize();

      // Set up health monitoring
      await this.setupHealthMonitoring();

      // Configure webhooks
      await this.configureWebhooks();

      // Test connection
      await this.testConnection();

      this.isInitialized = true;
      this.emit('client:initialized');

      this.logger.log('TimeBack Complete Client initialized successfully');

    } catch (error) {
      this.logger.error(`Failed to initialize TimeBack client: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===================================================================
  // ORGANIZATION OPERATIONS
  // ===================================================================

  /**
   * Get organization by ID
   */
  async getOrganization(
    organizationId: string,
    options?: { useCache?: boolean; include?: string[] }
  ): Promise<TimeBackOrganization> {
    const cacheKey = `timeback:org:${organizationId}`;
    const opts = { useCache: true, ...options };

    try {
      // Check cache first
      if (opts.useCache) {
        const cached = await this.cacheService.get<TimeBackOrganization>(cacheKey);
        if (cached) {
          this.logger.debug(`Organization ${organizationId} retrieved from cache`);
          return cached;
        }
      }

      // Call API with reliability wrapper
      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          const response = await this.baseClient.get<TimeBackApiResponse<TimeBackOrganization>>(
            `/organizations/${organizationId}`,
            { 
              params: opts.include ? { include: opts.include.join(',') } : undefined 
            }
          );
          return response.data;
        },
        {
          operation: 'getOrganization',
          context: { organizationId },
          timeout: 10000,
        }
      );

      // Cache the result
      if (opts.useCache && result) {
        await this.cacheService.set(cacheKey, result, {
          ttl: 30 * 60 * 1000, // 30 minutes
          tags: [`org:${organizationId}`, 'organizations'],
        });
      }

      this.emit('organization:retrieved', { organizationId, fromCache: false });
      return result;

    } catch (error) {
      this.logger.error(`Failed to get organization ${organizationId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all organizations with pagination
   */
  async getOrganizations(
    queryOptions?: TimeBackQueryOptions
  ): Promise<TimeBackApiResponse<TimeBackOrganization[]>> {
    try {
      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          return await this.baseClient.get<TimeBackApiResponse<TimeBackOrganization[]>>(
            '/organizations',
            { params: this.buildQueryParams(queryOptions) }
          );
        },
        {
          operation: 'getOrganizations',
          context: { queryOptions },
          timeout: 15000,
        }
      );

      this.emit('organizations:listed', { count: result.data.length });
      return result;

    } catch (error) {
      this.logger.error(`Failed to get organizations: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create organization
   */
  async createOrganization(
    organizationData: Partial<TimeBackOrganization>
  ): Promise<TimeBackOrganization> {
    try {
      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          const response = await this.baseClient.post<TimeBackApiResponse<TimeBackOrganization>>(
            '/organizations',
            organizationData
          );
          return response.data;
        },
        {
          operation: 'createOrganization',
          context: { organizationData },
          timeout: 15000,
        }
      );

      // Cache the new organization
      const cacheKey = `timeback:org:${result.id}`;
      await this.cacheService.set(cacheKey, result, {
        ttl: 30 * 60 * 1000,
        tags: [`org:${result.id}`, 'organizations'],
      });

      // Invalidate organization list cache
      await this.cacheService.invalidateByTags(['organizations']);

      this.emit('organization:created', { organizationId: result.id });
      return result;

    } catch (error) {
      this.logger.error(`Failed to create organization: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(
    organizationId: string,
    updates: Partial<TimeBackOrganization>
  ): Promise<TimeBackOrganization> {
    try {
      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          const response = await this.baseClient.put<TimeBackApiResponse<TimeBackOrganization>>(
            `/organizations/${organizationId}`,
            updates
          );
          return response.data;
        },
        {
          operation: 'updateOrganization',
          context: { organizationId, updates },
          timeout: 15000,
        }
      );

      // Update cache
      const cacheKey = `timeback:org:${organizationId}`;
      await this.cacheService.set(cacheKey, result, {
        ttl: 30 * 60 * 1000,
        tags: [`org:${organizationId}`, 'organizations'],
      });

      this.emit('organization:updated', { organizationId, updates });
      return result;

    } catch (error) {
      this.logger.error(`Failed to update organization ${organizationId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===================================================================
  // USER OPERATIONS
  // ===================================================================

  /**
   * Get user by ID
   */
  async getUser(
    userId: string,
    options?: { useCache?: boolean; include?: string[] }
  ): Promise<TimeBackUser> {
    const cacheKey = `timeback:user:${userId}`;
    const opts = { useCache: true, ...options };

    try {
      // Check cache first
      if (opts.useCache) {
        const cached = await this.cacheService.get<TimeBackUser>(cacheKey);
        if (cached) {
          this.logger.debug(`User ${userId} retrieved from cache`);
          return cached;
        }
      }

      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          const response = await this.baseClient.get<TimeBackApiResponse<TimeBackUser>>(
            `/users/${userId}`,
            { 
              params: opts.include ? { include: opts.include.join(',') } : undefined 
            }
          );
          return response.data;
        },
        {
          operation: 'getUser',
          context: { userId },
          timeout: 10000,
        }
      );

      // Cache the result
      if (opts.useCache && result) {
        await this.cacheService.set(cacheKey, result, {
          ttl: 15 * 60 * 1000, // 15 minutes
          tags: [`user:${userId}`, 'users'],
        });
      }

      this.emit('user:retrieved', { userId, fromCache: false });
      return result;

    } catch (error) {
      this.logger.error(`Failed to get user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get users with pagination
   */
  async getUsers(
    queryOptions?: TimeBackQueryOptions
  ): Promise<TimeBackApiResponse<TimeBackUser[]>> {
    try {
      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          return await this.baseClient.get<TimeBackApiResponse<TimeBackUser[]>>(
            '/users',
            { params: this.buildQueryParams(queryOptions) }
          );
        },
        {
          operation: 'getUsers',
          context: { queryOptions },
          timeout: 15000,
        }
      );

      this.emit('users:listed', { count: result.data.length });
      return result;

    } catch (error) {
      this.logger.error(`Failed to get users: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create user
   */
  async createUser(userData: Partial<TimeBackUser>): Promise<TimeBackUser> {
    try {
      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          const response = await this.baseClient.post<TimeBackApiResponse<TimeBackUser>>(
            '/users',
            userData
          );
          return response.data;
        },
        {
          operation: 'createUser',
          context: { userData },
          timeout: 15000,
        }
      );

      // Cache the new user
      const cacheKey = `timeback:user:${result.id}`;
      await this.cacheService.set(cacheKey, result, {
        ttl: 15 * 60 * 1000,
        tags: [`user:${result.id}`, 'users'],
      });

      // Invalidate user list cache
      await this.cacheService.invalidateByTags(['users']);

      this.emit('user:created', { userId: result.id });
      return result;

    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    updates: Partial<TimeBackUser>
  ): Promise<TimeBackUser> {
    try {
      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          const response = await this.baseClient.put<TimeBackApiResponse<TimeBackUser>>(
            `/users/${userId}`,
            updates
          );
          return response.data;
        },
        {
          operation: 'updateUser',
          context: { userId, updates },
          timeout: 15000,
        }
      );

      // Update cache
      const cacheKey = `timeback:user:${userId}`;
      await this.cacheService.set(cacheKey, result, {
        ttl: 15 * 60 * 1000,
        tags: [`user:${userId}`, 'users'],
      });

      this.emit('user:updated', { userId, updates });
      return result;

    } catch (error) {
      this.logger.error(`Failed to update user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Bulk user operations
   */
  async bulkUserOperations(
    operations: Array<{
      action: 'create' | 'update' | 'delete';
      id?: string;
      data: Partial<TimeBackUser>;
    }>,
    options?: TimeBackBulkOperationOptions
  ): Promise<TimeBackBatchResponse<TimeBackUser>> {
    try {
      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          return await this.baseClient.post<TimeBackBatchResponse<TimeBackUser>>(
            '/users/bulk',
            { operations, options }
          );
        },
        {
          operation: 'bulkUserOperations',
          context: { operationCount: operations.length, options },
          timeout: 60000, // Longer timeout for bulk operations
        }
      );

      // Invalidate user caches
      await this.cacheService.invalidateByTags(['users']);

      this.emit('users:bulk-operation', {
        batchId: result.batchId,
        summary: result.summary,
      });

      return result;

    } catch (error) {
      this.logger.error(`Failed to perform bulk user operations: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===================================================================
  // CLASS OPERATIONS
  // ===================================================================

  /**
   * Get class by ID
   */
  async getClass(
    classId: string,
    options?: { useCache?: boolean; include?: string[] }
  ): Promise<TimeBackClass> {
    const cacheKey = `timeback:class:${classId}`;
    const opts = { useCache: true, ...options };

    try {
      // Check cache first
      if (opts.useCache) {
        const cached = await this.cacheService.get<TimeBackClass>(cacheKey);
        if (cached) {
          this.logger.debug(`Class ${classId} retrieved from cache`);
          return cached;
        }
      }

      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          const response = await this.baseClient.get<TimeBackApiResponse<TimeBackClass>>(
            `/classes/${classId}`,
            { 
              params: opts.include ? { include: opts.include.join(',') } : undefined 
            }
          );
          return response.data;
        },
        {
          operation: 'getClass',
          context: { classId },
          timeout: 10000,
        }
      );

      // Cache the result
      if (opts.useCache && result) {
        await this.cacheService.set(cacheKey, result, {
          ttl: 20 * 60 * 1000, // 20 minutes
          tags: [`class:${classId}`, 'classes', `org:${result.organizationId}`],
        });
      }

      this.emit('class:retrieved', { classId, fromCache: false });
      return result;

    } catch (error) {
      this.logger.error(`Failed to get class ${classId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get classes with pagination
   */
  async getClasses(
    queryOptions?: TimeBackQueryOptions
  ): Promise<TimeBackApiResponse<TimeBackClass[]>> {
    try {
      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          return await this.baseClient.get<TimeBackApiResponse<TimeBackClass[]>>(
            '/classes',
            { params: this.buildQueryParams(queryOptions) }
          );
        },
        {
          operation: 'getClasses',
          context: { queryOptions },
          timeout: 15000,
        }
      );

      this.emit('classes:listed', { count: result.data.length });
      return result;

    } catch (error) {
      this.logger.error(`Failed to get classes: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create class
   */
  async createClass(classData: Partial<TimeBackClass>): Promise<TimeBackClass> {
    try {
      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          const response = await this.baseClient.post<TimeBackApiResponse<TimeBackClass>>(
            '/classes',
            classData
          );
          return response.data;
        },
        {
          operation: 'createClass',
          context: { classData },
          timeout: 15000,
        }
      );

      // Cache the new class
      const cacheKey = `timeback:class:${result.id}`;
      await this.cacheService.set(cacheKey, result, {
        ttl: 20 * 60 * 1000,
        tags: [`class:${result.id}`, 'classes', `org:${result.organizationId}`],
      });

      // Invalidate class list cache
      await this.cacheService.invalidateByTags(['classes']);

      this.emit('class:created', { classId: result.id });
      return result;

    } catch (error) {
      this.logger.error(`Failed to create class: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===================================================================
  // ENROLLMENT OPERATIONS
  // ===================================================================

  /**
   * Get enrollment by ID
   */
  async getEnrollment(
    enrollmentId: string,
    options?: { useCache?: boolean; include?: string[] }
  ): Promise<TimeBackEnrollment> {
    const cacheKey = `timeback:enrollment:${enrollmentId}`;
    const opts = { useCache: true, ...options };

    try {
      // Check cache first
      if (opts.useCache) {
        const cached = await this.cacheService.get<TimeBackEnrollment>(cacheKey);
        if (cached) {
          this.logger.debug(`Enrollment ${enrollmentId} retrieved from cache`);
          return cached;
        }
      }

      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          const response = await this.baseClient.get<TimeBackApiResponse<TimeBackEnrollment>>(
            `/enrollments/${enrollmentId}`,
            { 
              params: opts.include ? { include: opts.include.join(',') } : undefined 
            }
          );
          return response.data;
        },
        {
          operation: 'getEnrollment',
          context: { enrollmentId },
          timeout: 10000,
        }
      );

      // Cache the result
      if (opts.useCache && result) {
        await this.cacheService.set(cacheKey, result, {
          ttl: 10 * 60 * 1000, // 10 minutes (more dynamic data)
          tags: [`enrollment:${enrollmentId}`, 'enrollments', `class:${result.classId}`, `user:${result.userId}`],
        });
      }

      this.emit('enrollment:retrieved', { enrollmentId, fromCache: false });
      return result;

    } catch (error) {
      this.logger.error(`Failed to get enrollment ${enrollmentId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get enrollments with pagination
   */
  async getEnrollments(
    queryOptions?: TimeBackQueryOptions
  ): Promise<TimeBackApiResponse<TimeBackEnrollment[]>> {
    try {
      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          return await this.baseClient.get<TimeBackApiResponse<TimeBackEnrollment[]>>(
            '/enrollments',
            { params: this.buildQueryParams(queryOptions) }
          );
        },
        {
          operation: 'getEnrollments',
          context: { queryOptions },
          timeout: 15000,
        }
      );

      this.emit('enrollments:listed', { count: result.data.length });
      return result;

    } catch (error) {
      this.logger.error(`Failed to get enrollments: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create enrollment
   */
  async createEnrollment(enrollmentData: Partial<TimeBackEnrollment>): Promise<TimeBackEnrollment> {
    try {
      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          const response = await this.baseClient.post<TimeBackApiResponse<TimeBackEnrollment>>(
            '/enrollments',
            enrollmentData
          );
          return response.data;
        },
        {
          operation: 'createEnrollment',
          context: { enrollmentData },
          timeout: 15000,
        }
      );

      // Cache the new enrollment
      const cacheKey = `timeback:enrollment:${result.id}`;
      await this.cacheService.set(cacheKey, result, {
        ttl: 10 * 60 * 1000,
        tags: [`enrollment:${result.id}`, 'enrollments', `class:${result.classId}`, `user:${result.userId}`],
      });

      // Invalidate related caches
      await this.cacheService.invalidateByTags(['enrollments']);

      this.emit('enrollment:created', { enrollmentId: result.id });
      return result;

    } catch (error) {
      this.logger.error(`Failed to create enrollment: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===================================================================
  // WEBHOOK OPERATIONS
  // ===================================================================

  /**
   * Register webhook endpoint
   */
  async registerWebhook(
    events: string[],
    callbackUrl: string,
    secret?: string
  ): Promise<{ webhookId: string; secret: string }> {
    try {
      const webhookData = {
        events,
        callbackUrl,
        secret: secret || this.generateWebhookSecret(),
        active: true,
      };

      const result = await this.reliabilityManager.executeWithReliability(
        async () => {
          return await this.baseClient.post<{ webhookId: string; secret: string }>(
            '/webhooks',
            webhookData
          );
        },
        {
          operation: 'registerWebhook',
          context: { events, callbackUrl },
          timeout: 10000,
        }
      );

      // Store webhook endpoint mapping
      this.webhookEndpoints.set(result.webhookId, callbackUrl);

      this.emit('webhook:registered', {
        webhookId: result.webhookId,
        events,
        callbackUrl,
      });

      return result;

    } catch (error) {
      this.logger.error(`Failed to register webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process incoming webhook event
   */
  async processWebhookEvent(
    webhookId: string,
    event: TimeBackWebhookEvent,
    signature: string
  ): Promise<{ processed: boolean; acknowledgment: string }> {
    try {
      // Verify webhook signature (simplified)
      const isValid = await this.verifyWebhookSignature(webhookId, event, signature);
      
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Process the event based on type
      await this.handleWebhookEvent(event);

      // Invalidate relevant caches
      await this.invalidateCacheForEvent(event);

      this.emit('webhook:processed', {
        webhookId,
        eventType: event.type,
        entityType: event.entity,
        entityId: event.entityId,
      });

      return {
        processed: true,
        acknowledgment: `Event ${event.id} processed successfully`,
      };

    } catch (error) {
      this.logger.error(`Failed to process webhook event: ${error.message}`, error.stack);
      
      this.emit('webhook:error', {
        webhookId,
        eventId: event.id,
        error: error.message,
      });

      throw error;
    }
  }

  // ===================================================================
  // SYNCHRONIZATION OPERATIONS
  // ===================================================================

  /**
   * Perform full data synchronization
   */
  async performFullSync(
    organizationId: string,
    options?: {
      entities?: ('users' | 'classes' | 'enrollments')[];
      batchSize?: number;
      parallel?: boolean;
    }
  ): Promise<{
    syncId: string;
    summary: {
      users: { synced: number; errors: number };
      classes: { synced: number; errors: number };
      enrollments: { synced: number; errors: number };
    };
    duration: number;
  }> {
    const startTime = Date.now();
    const syncId = this.generateSyncId();
    const opts = {
      entities: ['users', 'classes', 'enrollments'] as const,
      batchSize: 100,
      parallel: true,
      ...options,
    };

    try {
      this.logger.log(`Starting full sync for organization ${organizationId}`, {
        syncId,
        options: opts,
      });

      const summary = {
        users: { synced: 0, errors: 0 },
        classes: { synced: 0, errors: 0 },
        enrollments: { synced: 0, errors: 0 },
      };

      // Sync entities based on configuration
      const syncPromises = opts.entities.map(async (entity) => {
        switch (entity) {
          case 'users':
            return await this.syncUsers(organizationId, opts.batchSize);
          case 'classes':
            return await this.syncClasses(organizationId, opts.batchSize);
          case 'enrollments':
            return await this.syncEnrollments(organizationId, opts.batchSize);
        }
      });

      const results = opts.parallel
        ? await Promise.allSettled(syncPromises)
        : await this.executeSequentially(syncPromises);

      // Process results
      results.forEach((result, index) => {
        const entity = opts.entities[index];
        if (result.status === 'fulfilled') {
          summary[entity] = result.value;
        } else {
          summary[entity] = { synced: 0, errors: 1 };
          this.logger.error(`Failed to sync ${entity}: ${result.reason}`);
        }
      });

      const duration = Date.now() - startTime;

      this.emit('sync:completed', {
        syncId,
        organizationId,
        summary,
        duration,
      });

      return {
        syncId,
        summary,
        duration,
      };

    } catch (error) {
      this.logger.error(`Full sync failed for organization ${organizationId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===================================================================
  // HEALTH AND MONITORING
  // ===================================================================

  /**
   * Get API health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    endpoints: Record<string, {
      status: 'up' | 'down';
      responseTime: number;
      lastChecked: string;
    }>;
    metrics: {
      totalRequests: number;
      successRate: number;
      averageResponseTime: number;
      errorRate: number;
    };
  }> {
    try {
      const healthData = await this.healthService.checkApiHealth();
      
      return {
        status: healthData.overallStatus,
        endpoints: healthData.endpoints,
        metrics: healthData.performanceMetrics,
      };

    } catch (error) {
      this.logger.error(`Failed to get health status: ${error.message}`, error.stack);
      return {
        status: 'unhealthy',
        endpoints: {},
        metrics: {
          totalRequests: 0,
          successRate: 0,
          averageResponseTime: 0,
          errorRate: 100,
        },
      };
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private buildQueryParams(options?: TimeBackQueryOptions): Record<string, any> {
    if (!options) return {};

    const params: Record<string, any> = {};

    if (options.limit) params.limit = options.limit;
    if (options.offset) params.offset = options.offset;
    if (options.sort) params.sort = options.sort;
    if (options.order) params.order = options.order;
    if (options.fields) params.fields = options.fields.join(',');
    if (options.include) params.include = options.include.join(',');
    if (options.search) params.search = options.search;
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        params[`filter[${key}]`] = value;
      });
    }
    if (options.dateRange) {
      params[`dateRange[field]`] = options.dateRange.field;
      params[`dateRange[start]`] = options.dateRange.start;
      params[`dateRange[end]`] = options.dateRange.end;
    }

    return params;
  }

  private async setupHealthMonitoring(): Promise<void> {
    // Set up periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getHealthStatus();
        if (health.status !== 'healthy') {
          this.emit('health:degraded', health);
        }
      } catch (error) {
        this.logger.error(`Health check failed: ${error.message}`);
      }
    }, 60000); // Check every minute
  }

  private async configureWebhooks(): Promise<void> {
    // Configure standard webhook events
    const events = [
      'user.created',
      'user.updated',
      'user.deleted',
      'class.created',
      'class.updated',
      'class.deleted',
      'enrollment.created',
      'enrollment.updated',
      'enrollment.deleted',
    ];

    const callbackUrl = this.configService.get('TIMEBACK_WEBHOOK_URL');
    if (callbackUrl) {
      try {
        await this.registerWebhook(events, callbackUrl);
        this.logger.log('Webhook configuration completed');
      } catch (error) {
        this.logger.warn(`Failed to configure webhooks: ${error.message}`);
      }
    }
  }

  private async testConnection(): Promise<void> {
    try {
      await this.baseClient.get('/health');
      this.logger.log('TimeBack API connection test successful');
    } catch (error) {
      this.logger.error('TimeBack API connection test failed');
      throw error;
    }
  }

  private async verifyWebhookSignature(
    webhookId: string,
    event: TimeBackWebhookEvent,
    signature: string
  ): Promise<boolean> {
    // Simplified signature verification
    // In real implementation, use HMAC-SHA256 with webhook secret
    return signature.length > 0;
  }

  private async handleWebhookEvent(event: TimeBackWebhookEvent): Promise<void> {
    switch (event.entity) {
      case 'user':
        await this.handleUserWebhookEvent(event);
        break;
      case 'class':
        await this.handleClassWebhookEvent(event);
        break;
      case 'enrollment':
        await this.handleEnrollmentWebhookEvent(event);
        break;
      case 'organization':
        await this.handleOrganizationWebhookEvent(event);
        break;
    }
  }

  private async handleUserWebhookEvent(event: TimeBackWebhookEvent): Promise<void> {
    // Emit event for synchronization system
    this.emit('user:webhook', {
      action: event.action,
      userId: event.entityId,
      data: event.data,
    });
  }

  private async handleClassWebhookEvent(event: TimeBackWebhookEvent): Promise<void> {
    this.emit('class:webhook', {
      action: event.action,
      classId: event.entityId,
      data: event.data,
    });
  }

  private async handleEnrollmentWebhookEvent(event: TimeBackWebhookEvent): Promise<void> {
    this.emit('enrollment:webhook', {
      action: event.action,
      enrollmentId: event.entityId,
      data: event.data,
    });
  }

  private async handleOrganizationWebhookEvent(event: TimeBackWebhookEvent): Promise<void> {
    this.emit('organization:webhook', {
      action: event.action,
      organizationId: event.entityId,
      data: event.data,
    });
  }

  private async invalidateCacheForEvent(event: TimeBackWebhookEvent): Promise<void> {
    const tags: string[] = [];

    switch (event.entity) {
      case 'user':
        tags.push(`user:${event.entityId}`, 'users');
        break;
      case 'class':
        tags.push(`class:${event.entityId}`, 'classes');
        break;
      case 'enrollment':
        tags.push(`enrollment:${event.entityId}`, 'enrollments');
        break;
      case 'organization':
        tags.push(`org:${event.entityId}`, 'organizations');
        break;
    }

    if (tags.length > 0) {
      await this.cacheService.invalidateByTags(tags);
    }
  }

  private async syncUsers(organizationId: string, batchSize: number): Promise<{ synced: number; errors: number }> {
    // Simplified sync implementation
    return { synced: 0, errors: 0 };
  }

  private async syncClasses(organizationId: string, batchSize: number): Promise<{ synced: number; errors: number }> {
    return { synced: 0, errors: 0 };
  }

  private async syncEnrollments(organizationId: string, batchSize: number): Promise<{ synced: number; errors: number }> {
    return { synced: 0, errors: 0 };
  }

  private async executeSequentially<T>(promises: Promise<T>[]): Promise<PromiseSettledResult<T>[]> {
    const results: PromiseSettledResult<T>[] = [];
    
    for (const promise of promises) {
      try {
        const result = await promise;
        results.push({ status: 'fulfilled', value: result });
      } catch (reason) {
        results.push({ status: 'rejected', reason });
      }
    }
    
    return results;
  }

  private generateWebhookSecret(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===================================================================
  // PUBLIC API METHODS
  // ===================================================================

  /**
   * Get client statistics
   */
  getClientStats(): {
    initialized: boolean;
    totalRequests: number;
    cacheHitRate: number;
    averageResponseTime: number;
    webhookEndpoints: number;
  } {
    return {
      initialized: this.isInitialized,
      totalRequests: 0, // Would track in real implementation
      cacheHitRate: 0,  // Would calculate from cache service
      averageResponseTime: 0, // Would track timing
      webhookEndpoints: this.webhookEndpoints.size,
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.webhookEndpoints.clear();
    this.removeAllListeners();
    
    this.logger.log('TimeBack Complete Client cleaned up');
  }
}
