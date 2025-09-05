/**
 * Base API Client
 * 
 * Foundation HTTP client providing common functionality for all external API integrations.
 * Includes authentication, retry logic, request/response logging, and error handling.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

// ===================================================================
// CORE TYPES AND INTERFACES
// ===================================================================

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    retryDelayMultiplier: number;
    retryCondition?: (error: AxiosError) => boolean;
  };
  authentication: AuthenticationConfig;
  logging: {
    enabled: boolean;
    logRequests: boolean;
    logResponses: boolean;
    logResponseData: boolean;
    sanitizeHeaders: string[];
    sanitizeRequestData: string[];
    sanitizeResponseData: string[];
  };
  rateLimiting?: {
    enabled: boolean;
    requestsPerSecond: number;
    burstSize: number;
  };
}

export interface AuthenticationConfig {
  type: 'none' | 'api-key' | 'bearer' | 'oauth2' | 'basic' | 'custom';
  apiKey?: {
    key: string;
    headerName?: string;
    queryParam?: string;
  };
  bearer?: {
    token: string;
    refreshToken?: string;
    expiresAt?: Date;
  };
  oauth2?: {
    clientId: string;
    clientSecret: string;
    tokenEndpoint: string;
    scope?: string;
    grantType: 'client_credentials' | 'authorization_code' | 'refresh_token';
  };
  basic?: {
    username: string;
    password: string;
  };
  custom?: {
    handler: (config: AxiosRequestConfig) => Promise<AxiosRequestConfig>;
  };
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  requestId: string;
  duration: number;
  cached?: boolean;
}

export interface ApiError extends Error {
  code: string;
  status?: number;
  statusText?: string;
  response?: any;
  request?: any;
  requestId?: string;
  isRetryable: boolean;
  retryCount: number;
}

export interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  startTime: Date;
  retryCount: number;
  metadata: Record<string, any>;
}

// ===================================================================
// BASE API CLIENT CLASS
// ===================================================================

@Injectable()
export abstract class BaseApiClient extends EventEmitter {
  protected readonly logger: Logger;
  protected readonly axios: AxiosInstance;
  protected readonly config: ApiClientConfig;
  private requestQueue: Array<() => Promise<any>> = [];
  private processingQueue = false;
  private lastRequestTime = 0;
  private requestCount = 0;

  constructor(
    protected readonly clientName: string,
    config: ApiClientConfig,
  ) {
    super();
    this.logger = new Logger(`${clientName}ApiClient`);
    this.config = this.validateConfig(config);
    this.axios = this.createAxiosInstance();
    this.setupInterceptors();
    this.setupRateLimiting();
    
    this.logger.log(`${clientName} API client initialized`, {
      baseURL: config.baseURL,
      timeout: config.timeout,
      authType: config.authentication.type,
    });
  }

  // ===================================================================
  // PUBLIC API METHODS
  // ===================================================================

  /**
   * GET request with full configuration support
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    metadata?: Record<string, any>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config, metadata);
  }

  /**
   * POST request with data payload
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    metadata?: Record<string, any>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config, metadata);
  }

  /**
   * PUT request with data payload
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    metadata?: Record<string, any>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config, metadata);
  }

  /**
   * PATCH request with data payload
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    metadata?: Record<string, any>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, config, metadata);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    metadata?: Record<string, any>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config, metadata);
  }

  /**
   * Generic request method with full retry and error handling
   */
  async request<T = any>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    metadata?: Record<string, any>,
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const context: RequestContext = {
      requestId,
      method: method.toUpperCase(),
      url,
      startTime: new Date(),
      retryCount: 0,
      metadata: metadata || {},
    };

    // Handle rate limiting
    if (this.config.rateLimiting?.enabled) {
      await this.enforceRateLimit();
    }

    try {
      const response = await this.executeRequest<T>(context, method, url, data, config);
      
      this.emit('request:success', {
        requestId,
        method,
        url,
        status: response.status,
        duration: response.duration,
      });

      return response;

    } catch (error) {
      this.emit('request:error', {
        requestId,
        method,
        url,
        error: error.message,
        status: error.status,
        retryCount: context.retryCount,
      });

      throw error;
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    timestamp: Date;
    details?: any;
  }> {
    const startTime = Date.now();
    
    try {
      // Attempt a lightweight request to test connectivity
      const healthEndpoint = this.getHealthCheckEndpoint();
      const response = await this.get(healthEndpoint);
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency,
        timestamp: new Date(),
        details: {
          statusCode: response.status,
          responseTime: latency,
        },
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      
      this.logger.warn(`Health check failed for ${this.clientName}`, {
        error: error.message,
        latency,
      });

      return {
        status: 'unhealthy',
        latency,
        timestamp: new Date(),
        details: {
          error: error.message,
          status: error.status,
        },
      };
    }
  }

  /**
   * Update authentication configuration
   */
  async updateAuthentication(authConfig: AuthenticationConfig): Promise<void> {
    this.config.authentication = authConfig;
    
    // Clear any cached tokens or credentials
    delete this.axios.defaults.headers.common['Authorization'];
    delete this.axios.defaults.headers.common['X-API-Key'];
    
    // Re-setup authentication
    await this.setupAuthentication();
    
    this.logger.log(`Authentication updated for ${this.clientName}`, {
      authType: authConfig.type,
    });
  }

  /**
   * Get client statistics
   */
  getStatistics(): {
    requestCount: number;
    lastRequestTime: Date;
    queueLength: number;
    rateLimitEnabled: boolean;
    authType: string;
    baseURL: string;
  } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: new Date(this.lastRequestTime),
      queueLength: this.requestQueue.length,
      rateLimitEnabled: this.config.rateLimiting?.enabled || false,
      authType: this.config.authentication.type,
      baseURL: this.config.baseURL,
    };
  }

  // ===================================================================
  // PROTECTED ABSTRACT METHODS
  // ===================================================================

  /**
   * Get the health check endpoint for this API
   */
  protected abstract getHealthCheckEndpoint(): string;

  /**
   * Transform request data before sending (override for custom transformation)
   */
  protected transformRequestData(data: any, context: RequestContext): any {
    return data;
  }

  /**
   * Transform response data after receiving (override for custom transformation)
   */
  protected transformResponseData<T>(data: any, context: RequestContext): T {
    return data;
  }

  /**
   * Handle authentication setup (called during initialization and updates)
   */
  protected async setupAuthentication(): Promise<void> {
    const auth = this.config.authentication;

    switch (auth.type) {
      case 'api-key':
        if (auth.apiKey) {
          if (auth.apiKey.headerName) {
            this.axios.defaults.headers.common[auth.apiKey.headerName] = auth.apiKey.key;
          } else {
            this.axios.defaults.headers.common['X-API-Key'] = auth.apiKey.key;
          }
        }
        break;

      case 'bearer':
        if (auth.bearer?.token) {
          this.axios.defaults.headers.common['Authorization'] = `Bearer ${auth.bearer.token}`;
        }
        break;

      case 'basic':
        if (auth.basic) {
          const credentials = Buffer.from(`${auth.basic.username}:${auth.basic.password}`).toString('base64');
          this.axios.defaults.headers.common['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'oauth2':
        if (auth.oauth2) {
          await this.handleOAuth2Authentication();
        }
        break;

      case 'none':
        // No authentication required
        break;

      default:
        this.logger.warn(`Unknown authentication type: ${auth.type}`);
    }
  }

  // ===================================================================
  // PRIVATE METHODS
  // ===================================================================

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `BothSides/${this.clientName}Client/1.0`,
      },
    });

    return instance;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        const requestId = config.metadata?.requestId || this.generateRequestId();
        config.headers['X-Request-ID'] = requestId;
        
        if (this.config.logging.enabled && this.config.logging.logRequests) {
          this.logRequest(config);
        }

        // Handle custom authentication
        if (this.config.authentication.type === 'custom' && this.config.authentication.custom?.handler) {
          return this.config.authentication.custom.handler(config);
        }

        return config;
      },
      (error) => {
        this.logger.error(`Request interceptor error: ${error.message}`, error.stack);
        return Promise.reject(this.transformError(error));
      },
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        if (this.config.logging.enabled && this.config.logging.logResponses) {
          this.logResponse(response);
        }
        return response;
      },
      (error) => {
        if (this.config.logging.enabled) {
          this.logError(error);
        }
        return Promise.reject(this.transformError(error));
      },
    );
  }

  private setupRateLimiting(): void {
    if (!this.config.rateLimiting?.enabled) {
      return;
    }

    const { requestsPerSecond } = this.config.rateLimiting;
    const intervalMs = 1000 / requestsPerSecond;

    // Simple rate limiting implementation
    this.on('request:start', () => {
      this.lastRequestTime = Date.now();
      this.requestCount++;
    });
  }

  private async enforceRateLimit(): Promise<void> {
    if (!this.config.rateLimiting?.enabled) {
      return;
    }

    const now = Date.now();
    const { requestsPerSecond } = this.config.rateLimiting;
    const intervalMs = 1000 / requestsPerSecond;
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < intervalMs) {
      const delayMs = intervalMs - timeSinceLastRequest;
      this.logger.debug(`Rate limiting: delaying request by ${delayMs}ms`);
      await this.delay(delayMs);
    }
  }

  private async executeRequest<T>(
    context: RequestContext,
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    this.emit('request:start', context);

    try {
      // Transform request data
      const transformedData = data ? this.transformRequestData(data, context) : data;

      // Execute the request with retry logic
      const response = await this.executeWithRetry(async () => {
        return this.axios.request({
          method,
          url,
          data: transformedData,
          ...config,
          metadata: {
            requestId: context.requestId,
            retryCount: context.retryCount,
          },
        });
      }, context);

      const duration = Date.now() - startTime;

      // Transform response data
      const transformedResponseData = this.transformResponseData<T>(response.data, context);

      const apiResponse: ApiResponse<T> = {
        data: transformedResponseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        requestId: context.requestId,
        duration,
      };

      this.emit('request:complete', { ...context, duration, status: response.status });
      return apiResponse;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.emit('request:failed', { ...context, duration, error: error.message });
      throw error;
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: RequestContext,
  ): Promise<T> {
    const { maxRetries, retryDelay, retryDelayMultiplier, retryCondition } = this.config.retryConfig;

    let lastError: ApiError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        context.retryCount = attempt;
        return await operation();
      } catch (error) {
        lastError = this.transformError(error);
        
        const shouldRetry = attempt < maxRetries && 
          (retryCondition ? retryCondition(error) : this.isRetryableError(error));

        if (!shouldRetry) {
          throw lastError;
        }

        const delayMs = retryDelay * Math.pow(retryDelayMultiplier, attempt);
        
        this.logger.warn(`Request failed, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`, {
          requestId: context.requestId,
          error: error.message,
          status: error.response?.status,
        });

        await this.delay(delayMs);
      }
    }

    throw lastError;
  }

  private transformError(error: any): ApiError {
    const apiError = new Error(error.message) as ApiError;
    apiError.name = 'ApiError';
    apiError.code = error.code || 'UNKNOWN_ERROR';
    apiError.status = error.response?.status;
    apiError.statusText = error.response?.statusText;
    apiError.response = error.response?.data;
    apiError.request = error.config;
    apiError.requestId = error.config?.headers?.['X-Request-ID'];
    apiError.isRetryable = this.isRetryableError(error);
    apiError.retryCount = error.config?.metadata?.retryCount || 0;

    return apiError;
  }

  private isRetryableError(error: AxiosError): boolean {
    // Retry on network errors
    if (!error.response) {
      return true;
    }

    const status = error.response.status;

    // Retry on server errors and rate limiting
    if (status >= 500) return true;
    if (status === 429) return true; // Too Many Requests
    if (status === 408) return true; // Request Timeout

    // Don't retry client errors
    return false;
  }

  private async handleOAuth2Authentication(): Promise<void> {
    const auth = this.config.authentication.oauth2;
    if (!auth) return;

    try {
      const tokenResponse = await axios.post(auth.tokenEndpoint, {
        grant_type: auth.grantType,
        client_id: auth.clientId,
        client_secret: auth.clientSecret,
        scope: auth.scope,
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, expires_in } = tokenResponse.data;
      
      this.axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Update config with new token and expiry
      if (this.config.authentication.bearer) {
        this.config.authentication.bearer.token = access_token;
        this.config.authentication.bearer.expiresAt = new Date(Date.now() + (expires_in * 1000));
      }

      this.logger.log(`OAuth2 token obtained for ${this.clientName}`, {
        expiresIn: expires_in,
      });

    } catch (error) {
      this.logger.error(`OAuth2 authentication failed for ${this.clientName}: ${error.message}`, error.stack);
      throw new Error(`OAuth2 authentication failed: ${error.message}`);
    }
  }

  private logRequest(config: AxiosRequestConfig): void {
    const sanitizedData = this.sanitizeData(config.data, this.config.logging.sanitizeRequestData);
    const sanitizedHeaders = this.sanitizeHeaders(config.headers, this.config.logging.sanitizeHeaders);

    this.logger.debug(`[${config.method?.toUpperCase()}] ${config.url}`, {
      requestId: config.headers?.['X-Request-ID'],
      headers: sanitizedHeaders,
      data: sanitizedData,
    });
  }

  private logResponse(response: AxiosResponse): void {
    const shouldLogData = this.config.logging.logResponseData;
    const sanitizedData = shouldLogData 
      ? this.sanitizeData(response.data, this.config.logging.sanitizeResponseData)
      : '[DATA NOT LOGGED]';

    this.logger.debug(`[${response.status}] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      requestId: response.config.headers?.['X-Request-ID'],
      status: response.status,
      statusText: response.statusText,
      duration: Date.now() - (response.config.metadata?.startTime || Date.now()),
      data: sanitizedData,
    });
  }

  private logError(error: AxiosError): void {
    const status = error.response?.status || 'NO_RESPONSE';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error.config?.url || 'UNKNOWN';

    this.logger.error(`[${status}] ${method} ${url} - ${error.message}`, {
      requestId: error.config?.headers?.['X-Request-ID'],
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: this.sanitizeData(error.response?.data, this.config.logging.sanitizeResponseData),
    });
  }

  private sanitizeData(data: any, sensitiveFields: string[]): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeHeaders(headers: any, sensitiveHeaders: string[]): any {
    if (!headers) {
      return headers;
    }

    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private validateConfig(config: ApiClientConfig): ApiClientConfig {
    if (!config.baseURL) {
      throw new Error('baseURL is required in API client configuration');
    }

    if (!config.timeout || config.timeout <= 0) {
      throw new Error('timeout must be a positive number');
    }

    if (!config.authentication) {
      throw new Error('authentication configuration is required');
    }

    // Set defaults for optional properties
    config.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      retryDelayMultiplier: 2,
      ...config.retryConfig,
    };

    config.logging = {
      enabled: true,
      logRequests: true,
      logResponses: true,
      logResponseData: false,
      sanitizeHeaders: ['authorization', 'x-api-key', 'cookie'],
      sanitizeRequestData: ['password', 'token', 'secret', 'key'],
      sanitizeResponseData: ['password', 'token', 'secret', 'key'],
      ...config.logging,
    };

    return config;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  /**
   * Test connection to the API
   */
  async testConnection(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy';
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current authentication status
   */
  getAuthenticationStatus(): {
    type: string;
    isConfigured: boolean;
    expiresAt?: Date;
    lastRefresh?: Date;
  } {
    const auth = this.config.authentication;
    
    return {
      type: auth.type,
      isConfigured: this.isAuthenticationConfigured(),
      expiresAt: auth.bearer?.expiresAt,
      lastRefresh: undefined, // Could track this in the future
    };
  }

  private isAuthenticationConfigured(): boolean {
    const auth = this.config.authentication;
    
    switch (auth.type) {
      case 'none':
        return true;
      case 'api-key':
        return !!(auth.apiKey?.key);
      case 'bearer':
        return !!(auth.bearer?.token);
      case 'basic':
        return !!(auth.basic?.username && auth.basic.password);
      case 'oauth2':
        return !!(auth.oauth2?.clientId && auth.oauth2.clientSecret && auth.oauth2.tokenEndpoint);
      case 'custom':
        return !!(auth.custom?.handler);
      default:
        return false;
    }
  }
}
