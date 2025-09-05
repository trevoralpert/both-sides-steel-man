/**
 * TimeBack API Client
 * 
 * TimeBack-specific API client implementing roster management endpoints,
 * OAuth 2.0 authentication, and TimeBack data model transformations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { BaseApiClient, ApiClientConfig, AuthenticationConfig, RequestContext, ApiResponse } from './base-api-client';

// ===================================================================
// TIMEBACK-SPECIFIC TYPES AND INTERFACES
// ===================================================================

export interface TimeBackConfig extends Omit<ApiClientConfig, 'authentication'> {
  authentication: TimeBackAuthConfig;
  environment: 'sandbox' | 'production';
  webhookConfig?: {
    enabled: boolean;
    endpointUrl: string;
    secret: string;
    events: string[];
  };
}

export interface TimeBackAuthConfig extends AuthenticationConfig {
  oauth2: {
    clientId: string;
    clientSecret: string;
    tokenEndpoint: string;
    scope: string;
    grantType: 'client_credentials';
    audience?: string;
    customParams?: Record<string, string>;
  };
}

// TimeBack API Response Structures
export interface TimeBackResponse<T = any> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
    request_id: string;
    timestamp: string;
  };
  links?: {
    self: string;
    first?: string;
    last?: string;
    next?: string;
    prev?: string;
  };
}

// TimeBack User/Student Model
export interface TimeBackUser {
  id: string;
  external_id: string;
  email: string;
  first_name: string;
  last_name: string;
  username?: string;
  role: 'student' | 'teacher' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  organization_id: string;
  profile: {
    avatar_url?: string;
    timezone?: string;
    locale?: string;
    phone?: string;
  };
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

// TimeBack Organization Model
export interface TimeBackOrganization {
  id: string;
  external_id: string;
  name: string;
  type: 'school' | 'district' | 'department';
  status: 'active' | 'inactive';
  parent_id?: string;
  settings: {
    timezone: string;
    locale: string;
    academic_year_start?: string;
    academic_year_end?: string;
  };
  contact: {
    address?: {
      street: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    phone?: string;
    email?: string;
    website?: string;
  };
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// TimeBack Class Model
export interface TimeBackClass {
  id: string;
  external_id: string;
  name: string;
  description?: string;
  subject: string;
  grade_level?: string;
  status: 'active' | 'inactive' | 'archived';
  organization_id: string;
  teacher_ids: string[];
  settings: {
    max_students?: number;
    timezone?: string;
    meeting_schedule?: {
      days: string[];
      start_time: string;
      end_time: string;
    };
  };
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

// TimeBack Enrollment Model
export interface TimeBackEnrollment {
  id: string;
  external_id: string;
  student_id: string;
  class_id: string;
  status: 'active' | 'inactive' | 'dropped' | 'completed';
  role: 'student' | 'teaching_assistant';
  enrolled_at: string;
  dropped_at?: string;
  completed_at?: string;
  grade?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// TimeBack Webhook Event
export interface TimeBackWebhookEvent {
  id: string;
  type: 'user.created' | 'user.updated' | 'user.deleted' | 
        'organization.created' | 'organization.updated' | 'organization.deleted' |
        'class.created' | 'class.updated' | 'class.deleted' |
        'enrollment.created' | 'enrollment.updated' | 'enrollment.deleted';
  data: {
    object: TimeBackUser | TimeBackOrganization | TimeBackClass | TimeBackEnrollment;
    previous_attributes?: Partial<any>;
  };
  created_at: string;
  organization_id: string;
  livemode: boolean;
}

// Query Parameters
export interface TimeBackQueryParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  filters?: Record<string, string | string[]>;
  include?: string[];
  updated_since?: string;
}

// ===================================================================
// TIMEBACK API CLIENT IMPLEMENTATION
// ===================================================================

@Injectable()
export class TimeBackApiClient extends BaseApiClient {
  private readonly timeBackLogger: Logger;

  constructor(config: TimeBackConfig) {
    super('TimeBack', config);
    this.timeBackLogger = new Logger('TimeBackApiClient');
    
    this.timeBackLogger.log('TimeBack API client initialized', {
      environment: config.environment,
      baseURL: config.baseURL,
      webhookEnabled: config.webhookConfig?.enabled || false,
    });
  }

  // ===================================================================
  // HEALTH CHECK IMPLEMENTATION
  // ===================================================================

  protected getHealthCheckEndpoint(): string {
    return '/v1/health';
  }

  // ===================================================================
  // USER/STUDENT MANAGEMENT ENDPOINTS
  // ===================================================================

  /**
   * Get all users (students and teachers)
   */
  async getUsers(params?: TimeBackQueryParams): Promise<ApiResponse<TimeBackUser[]>> {
    const response = await this.get<TimeBackResponse<TimeBackUser[]>>('/v1/users', {
      params: this.buildQueryParams(params),
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Get specific user by ID
   */
  async getUser(userId: string): Promise<ApiResponse<TimeBackUser>> {
    const response = await this.get<TimeBackResponse<TimeBackUser>>(`/v1/users/${userId}`);
    
    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Create new user
   */
  async createUser(userData: Partial<TimeBackUser>): Promise<ApiResponse<TimeBackUser>> {
    const response = await this.post<TimeBackResponse<TimeBackUser>>('/v1/users', {
      user: userData,
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Update existing user
   */
  async updateUser(userId: string, userData: Partial<TimeBackUser>): Promise<ApiResponse<TimeBackUser>> {
    const response = await this.put<TimeBackResponse<TimeBackUser>>(`/v1/users/${userId}`, {
      user: userData,
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    return this.delete(`/v1/users/${userId}`);
  }

  /**
   * Get users by organization
   */
  async getUsersByOrganization(
    organizationId: string, 
    params?: TimeBackQueryParams,
  ): Promise<ApiResponse<TimeBackUser[]>> {
    const response = await this.get<TimeBackResponse<TimeBackUser[]>>(`/v1/organizations/${organizationId}/users`, {
      params: this.buildQueryParams(params),
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  // ===================================================================
  // ORGANIZATION MANAGEMENT ENDPOINTS
  // ===================================================================

  /**
   * Get all organizations
   */
  async getOrganizations(params?: TimeBackQueryParams): Promise<ApiResponse<TimeBackOrganization[]>> {
    const response = await this.get<TimeBackResponse<TimeBackOrganization[]>>('/v1/organizations', {
      params: this.buildQueryParams(params),
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Get specific organization by ID
   */
  async getOrganization(organizationId: string): Promise<ApiResponse<TimeBackOrganization>> {
    const response = await this.get<TimeBackResponse<TimeBackOrganization>>(`/v1/organizations/${organizationId}`);
    
    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Create new organization
   */
  async createOrganization(orgData: Partial<TimeBackOrganization>): Promise<ApiResponse<TimeBackOrganization>> {
    const response = await this.post<TimeBackResponse<TimeBackOrganization>>('/v1/organizations', {
      organization: orgData,
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Update existing organization
   */
  async updateOrganization(organizationId: string, orgData: Partial<TimeBackOrganization>): Promise<ApiResponse<TimeBackOrganization>> {
    const response = await this.put<TimeBackResponse<TimeBackOrganization>>(`/v1/organizations/${organizationId}`, {
      organization: orgData,
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  // ===================================================================
  // CLASS MANAGEMENT ENDPOINTS
  // ===================================================================

  /**
   * Get all classes
   */
  async getClasses(params?: TimeBackQueryParams): Promise<ApiResponse<TimeBackClass[]>> {
    const response = await this.get<TimeBackResponse<TimeBackClass[]>>('/v1/classes', {
      params: this.buildQueryParams(params),
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Get specific class by ID
   */
  async getClass(classId: string): Promise<ApiResponse<TimeBackClass>> {
    const response = await this.get<TimeBackResponse<TimeBackClass>>(`/v1/classes/${classId}`);
    
    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Create new class
   */
  async createClass(classData: Partial<TimeBackClass>): Promise<ApiResponse<TimeBackClass>> {
    const response = await this.post<TimeBackResponse<TimeBackClass>>('/v1/classes', {
      class: classData,
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Update existing class
   */
  async updateClass(classId: string, classData: Partial<TimeBackClass>): Promise<ApiResponse<TimeBackClass>> {
    const response = await this.put<TimeBackResponse<TimeBackClass>>(`/v1/classes/${classId}`, {
      class: classData,
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Delete class
   */
  async deleteClass(classId: string): Promise<ApiResponse<void>> {
    return this.delete(`/v1/classes/${classId}`);
  }

  /**
   * Get classes by organization
   */
  async getClassesByOrganization(
    organizationId: string, 
    params?: TimeBackQueryParams,
  ): Promise<ApiResponse<TimeBackClass[]>> {
    const response = await this.get<TimeBackResponse<TimeBackClass[]>>(`/v1/organizations/${organizationId}/classes`, {
      params: this.buildQueryParams(params),
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  // ===================================================================
  // ENROLLMENT MANAGEMENT ENDPOINTS
  // ===================================================================

  /**
   * Get all enrollments
   */
  async getEnrollments(params?: TimeBackQueryParams): Promise<ApiResponse<TimeBackEnrollment[]>> {
    const response = await this.get<TimeBackResponse<TimeBackEnrollment[]>>('/v1/enrollments', {
      params: this.buildQueryParams(params),
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Get specific enrollment by ID
   */
  async getEnrollment(enrollmentId: string): Promise<ApiResponse<TimeBackEnrollment>> {
    const response = await this.get<TimeBackResponse<TimeBackEnrollment>>(`/v1/enrollments/${enrollmentId}`);
    
    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Create new enrollment
   */
  async createEnrollment(enrollmentData: Partial<TimeBackEnrollment>): Promise<ApiResponse<TimeBackEnrollment>> {
    const response = await this.post<TimeBackResponse<TimeBackEnrollment>>('/v1/enrollments', {
      enrollment: enrollmentData,
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Update existing enrollment
   */
  async updateEnrollment(enrollmentId: string, enrollmentData: Partial<TimeBackEnrollment>): Promise<ApiResponse<TimeBackEnrollment>> {
    const response = await this.put<TimeBackResponse<TimeBackEnrollment>>(`/v1/enrollments/${enrollmentId}`, {
      enrollment: enrollmentData,
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Delete enrollment
   */
  async deleteEnrollment(enrollmentId: string): Promise<ApiResponse<void>> {
    return this.delete(`/v1/enrollments/${enrollmentId}`);
  }

  /**
   * Get enrollments by class
   */
  async getEnrollmentsByClass(
    classId: string, 
    params?: TimeBackQueryParams,
  ): Promise<ApiResponse<TimeBackEnrollment[]>> {
    const response = await this.get<TimeBackResponse<TimeBackEnrollment[]>>(`/v1/classes/${classId}/enrollments`, {
      params: this.buildQueryParams(params),
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Get enrollments by student
   */
  async getEnrollmentsByStudent(
    studentId: string, 
    params?: TimeBackQueryParams,
  ): Promise<ApiResponse<TimeBackEnrollment[]>> {
    const response = await this.get<TimeBackResponse<TimeBackEnrollment[]>>(`/v1/users/${studentId}/enrollments`, {
      params: this.buildQueryParams(params),
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Bulk enrollment operations
   */
  async bulkCreateEnrollments(enrollmentsData: Partial<TimeBackEnrollment>[]): Promise<ApiResponse<TimeBackEnrollment[]>> {
    const response = await this.post<TimeBackResponse<TimeBackEnrollment[]>>('/v1/enrollments/bulk', {
      enrollments: enrollmentsData,
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Bulk enrollment updates
   */
  async bulkUpdateEnrollments(updates: { id: string; data: Partial<TimeBackEnrollment> }[]): Promise<ApiResponse<TimeBackEnrollment[]>> {
    const response = await this.put<TimeBackResponse<TimeBackEnrollment[]>>('/v1/enrollments/bulk', {
      updates,
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  // ===================================================================
  // SYNC AND WEBHOOK ENDPOINTS
  // ===================================================================

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<ApiResponse<{
    status: 'idle' | 'syncing' | 'error';
    last_sync: string;
    next_sync?: string;
    errors?: string[];
  }>> {
    return this.get('/v1/sync/status');
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(options: {
    type: 'full' | 'incremental';
    entities?: ('users' | 'organizations' | 'classes' | 'enrollments')[];
    organization_ids?: string[];
  }): Promise<ApiResponse<{ sync_id: string; status: string }>> {
    return this.post('/v1/sync/trigger', options);
  }

  /**
   * Get webhook events
   */
  async getWebhookEvents(params?: TimeBackQueryParams & {
    event_types?: string[];
    organization_id?: string;
    since?: string;
  }): Promise<ApiResponse<TimeBackWebhookEvent[]>> {
    const response = await this.get<TimeBackResponse<TimeBackWebhookEvent[]>>('/v1/webhook-events', {
      params: this.buildQueryParams(params),
    });

    return {
      ...response,
      data: response.data.data,
    };
  }

  /**
   * Test webhook endpoint
   */
  async testWebhookEndpoint(endpointUrl: string): Promise<ApiResponse<{
    status: 'success' | 'error';
    response_code?: number;
    response_time?: number;
    error?: string;
  }>> {
    return this.post('/v1/webhooks/test', {
      endpoint_url: endpointUrl,
    });
  }

  // ===================================================================
  // BATCH OPERATIONS
  // ===================================================================

  /**
   * Get multiple entities in a single request
   */
  async getBatch(requests: Array<{
    method: 'GET';
    path: string;
    params?: Record<string, any>;
  }>): Promise<ApiResponse<Array<{
    status: number;
    data: any;
    error?: string;
  }>>> {
    return this.post('/v1/batch', {
      requests,
    });
  }

  /**
   * Perform multiple operations in a single transaction
   */
  async performBatchOperations(operations: Array<{
    method: 'POST' | 'PUT' | 'DELETE';
    path: string;
    data?: any;
  }>): Promise<ApiResponse<Array<{
    status: number;
    data: any;
    error?: string;
  }>>> {
    return this.post('/v1/batch/operations', {
      operations,
    });
  }

  // ===================================================================
  // TIMEBACKS-SPECIFIC TRANSFORMATIONS
  // ===================================================================

  protected transformRequestData(data: any, context: RequestContext): any {
    // TimeBack-specific request transformation
    if (!data) return data;

    // Convert date strings to ISO format
    const transformed = { ...data };
    
    if (transformed.created_at && typeof transformed.created_at === 'object') {
      transformed.created_at = transformed.created_at.toISOString();
    }
    
    if (transformed.updated_at && typeof transformed.updated_at === 'object') {
      transformed.updated_at = transformed.updated_at.toISOString();
    }

    // Ensure proper structure for nested objects
    if (context.method === 'POST' || context.method === 'PUT') {
      return this.wrapRequestData(transformed, context);
    }

    return transformed;
  }

  protected transformResponseData<T>(data: any, context: RequestContext): T {
    // TimeBack-specific response transformation
    if (!data) return data;

    // Convert ISO date strings back to Date objects
    const transformed = this.convertDatesToObjects(data);
    
    return transformed;
  }

  private wrapRequestData(data: any, context: RequestContext): any {
    // TimeBack expects certain endpoints to wrap data
    if (context.url.includes('/users')) {
      return { user: data };
    } else if (context.url.includes('/organizations')) {
      return { organization: data };
    } else if (context.url.includes('/classes')) {
      return { class: data };
    } else if (context.url.includes('/enrollments')) {
      return { enrollment: data };
    }
    
    return data;
  }

  private convertDatesToObjects(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertDatesToObjects(item));
    }

    const converted = { ...obj };
    
    // Convert common date fields
    const dateFields = ['created_at', 'updated_at', 'last_login_at', 'enrolled_at', 'dropped_at', 'completed_at', 'archived_at'];
    
    dateFields.forEach(field => {
      if (converted[field] && typeof converted[field] === 'string') {
        try {
          converted[field] = new Date(converted[field]);
        } catch (error) {
          // Keep as string if conversion fails
          this.timeBackLogger.warn(`Failed to convert ${field} to Date: ${converted[field]}`);
        }
      }
    });

    // Recursively convert nested objects
    Object.keys(converted).forEach(key => {
      if (typeof converted[key] === 'object' && converted[key] !== null) {
        converted[key] = this.convertDatesToObjects(converted[key]);
      }
    });

    return converted;
  }

  private buildQueryParams(params?: TimeBackQueryParams): Record<string, string> {
    if (!params) return {};

    const queryParams: Record<string, string> = {};

    if (params.page !== undefined) {
      queryParams.page = params.page.toString();
    }

    if (params.per_page !== undefined) {
      queryParams.per_page = params.per_page.toString();
    }

    if (params.sort_by) {
      queryParams.sort_by = params.sort_by;
    }

    if (params.sort_order) {
      queryParams.sort_order = params.sort_order;
    }

    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          queryParams[`filters[${key}]`] = value.join(',');
        } else {
          queryParams[`filters[${key}]`] = value;
        }
      });
    }

    if (params.include) {
      queryParams.include = params.include.join(',');
    }

    if (params.updated_since) {
      queryParams.updated_since = params.updated_since;
    }

    return queryParams;
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  /**
   * Get API rate limit status
   */
  async getRateLimitStatus(): Promise<ApiResponse<{
    limit: number;
    remaining: number;
    reset_at: string;
  }>> {
    return this.get('/v1/rate-limit');
  }

  /**
   * Get API usage statistics
   */
  async getUsageStatistics(period: 'hour' | 'day' | 'month' = 'day'): Promise<ApiResponse<{
    period: string;
    requests: number;
    errors: number;
    average_response_time: number;
    endpoints: Record<string, {
      requests: number;
      errors: number;
      avg_response_time: number;
    }>;
  }>> {
    return this.get('/v1/usage', { params: { period } });
  }

  /**
   * Verify TimeBack API connectivity and credentials
   */
  async verifyConnection(): Promise<{
    connected: boolean;
    authenticated: boolean;
    organization?: TimeBackOrganization;
    permissions?: string[];
    errors?: string[];
  }> {
    try {
      // Test basic connectivity
      const healthCheck = await this.healthCheck();
      if (healthCheck.status !== 'healthy') {
        return {
          connected: false,
          authenticated: false,
          errors: ['Health check failed'],
        };
      }

      // Test authentication by getting current organization
      try {
        const orgsResponse = await this.getOrganizations({ per_page: 1 });
        const organization = orgsResponse.data[0];

        return {
          connected: true,
          authenticated: true,
          organization,
          permissions: ['read:users', 'read:organizations', 'read:classes', 'read:enrollments'], // Would be dynamic
        };

      } catch (authError) {
        return {
          connected: true,
          authenticated: false,
          errors: [`Authentication failed: ${authError.message}`],
        };
      }

    } catch (error) {
      return {
        connected: false,
        authenticated: false,
        errors: [`Connection failed: ${error.message}`],
      };
    }
  }
}

// ===================================================================
// HELPER FUNCTIONS FOR CONFIGURATION
// ===================================================================

export function createTimeBackConfig(options: {
  environment: 'sandbox' | 'production';
  clientId: string;
  clientSecret: string;
  timeout?: number;
  rateLimiting?: {
    requestsPerSecond: number;
    burstSize: number;
  };
  webhookConfig?: TimeBackConfig['webhookConfig'];
}): TimeBackConfig {
  const baseUrls = {
    sandbox: 'https://api-sandbox.timeback.com',
    production: 'https://api.timeback.com',
  };

  const tokenEndpoints = {
    sandbox: 'https://auth-sandbox.timeback.com/oauth/token',
    production: 'https://auth.timeback.com/oauth/token',
  };

  return {
    baseURL: baseUrls[options.environment],
    timeout: options.timeout || 30000,
    environment: options.environment,
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      retryDelayMultiplier: 2,
      retryCondition: (error) => {
        const status = error.response?.status;
        return !status || status >= 500 || status === 429 || status === 408;
      },
    },
    authentication: {
      type: 'oauth2',
      oauth2: {
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        tokenEndpoint: tokenEndpoints[options.environment],
        scope: 'read:users read:organizations read:classes read:enrollments write:users write:classes write:enrollments',
        grantType: 'client_credentials',
        audience: 'timeback-api',
      },
    },
    logging: {
      enabled: true,
      logRequests: true,
      logResponses: true,
      logResponseData: false,
      sanitizeHeaders: ['authorization', 'x-api-key'],
      sanitizeRequestData: ['password', 'token', 'secret', 'client_secret'],
      sanitizeResponseData: ['password', 'token', 'secret'],
    },
    rateLimiting: options.rateLimiting ? {
      enabled: true,
      requestsPerSecond: options.rateLimiting.requestsPerSecond,
      burstSize: options.rateLimiting.burstSize,
    } : undefined,
    webhookConfig: options.webhookConfig,
  };
}
