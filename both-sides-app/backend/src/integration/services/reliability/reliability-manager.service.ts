/**
 * Reliability Manager Service
 * 
 * Orchestrates rate limiting, circuit breaking, retry logic, and graceful degradation
 * to provide comprehensive reliability features for external API integrations.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'events';
import { RateLimiterService, RateLimitConfig, RateLimitResult } from './rate-limiter.service';
import { CircuitBreakerService, CircuitBreakerConfig, CircuitBreakerResult } from './circuit-breaker.service';

// ===================================================================
// RELIABILITY MANAGER TYPES AND INTERFACES
// ===================================================================

export interface ReliabilityConfig {
  name: string;
  
  // Rate limiting configuration
  rateLimit?: RateLimitConfig;
  
  // Circuit breaker configuration
  circuitBreaker?: CircuitBreakerConfig;
  
  // Retry configuration
  retry?: RetryConfig;
  
  // Timeout configuration
  timeout?: TimeoutConfig;
  
  // Bulkhead configuration
  bulkhead?: BulkheadConfig;
  
  // Fallback configuration
  fallback?: FallbackConfig;
  
  // Monitoring configuration
  monitoring?: MonitoringConfig;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;                 // Base delay in milliseconds
  maxDelay: number;                  // Maximum delay in milliseconds
  multiplier: number;                // Backoff multiplier
  jitter: boolean;                   // Add random jitter
  retryCondition?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

export interface TimeoutConfig {
  enabled: boolean;
  timeout: number;                   // Timeout in milliseconds
  timeoutMessage?: string;
}

export interface BulkheadConfig {
  enabled: boolean;
  maxConcurrentRequests: number;
  maxQueueSize: number;
  queueTimeout: number;
}

export interface FallbackConfig {
  enabled: boolean;
  fallbackFunction?: (error: Error, context: any) => Promise<any>;
  cacheEnabled?: boolean;
  cacheTtl?: number;                 // Cache TTL in milliseconds
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number;           // Metrics collection interval in milliseconds
  historySize: number;               // Number of historical metrics to keep
  alertThresholds?: {
    errorRate?: number;              // Error rate threshold (0-100)
    responseTime?: number;           // Response time threshold in ms
    queueSize?: number;              // Queue size threshold
  };
}

export interface ReliabilityResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  
  // Execution metadata
  executionTime: number;
  attempts: number;
  
  // Feature usage
  rateLimited: boolean;
  circuitBreakerUsed: boolean;
  fallbackUsed: boolean;
  fromCache: boolean;
  
  // States
  rateLimitState?: RateLimitResult;
  circuitBreakerState?: string;
  
  // Metrics
  queueTime?: number;
  actualTimeout?: number;
}

export interface ReliabilityMetrics {
  name: string;
  timeWindow: {
    start: Date;
    end: Date;
  };
  
  // Request statistics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  
  // Reliability feature usage
  rateLimitedRequests: number;
  circuitBreakerTrips: number;
  fallbackUsage: number;
  retryAttempts: number;
  timeouts: number;
  
  // Current states
  currentRateLimitState?: any;
  currentCircuitBreakerState?: string;
  currentConcurrency: number;
  queueSize: number;
  
  // Performance metrics
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  availability: number;
}

interface PendingRequest<T> {
  id: string;
  operation: () => Promise<T>;
  resolve: (result: ReliabilityResult<T>) => void;
  reject: (error: Error) => void;
  startTime: Date;
  timeout?: NodeJS.Timeout;
}

// ===================================================================
// RELIABILITY MANAGER SERVICE
// ===================================================================

@Injectable()
export class ReliabilityManagerService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(ReliabilityManagerService.name);
  private readonly configurations = new Map<string, ReliabilityConfig>();
  private readonly metrics = new Map<string, ReliabilityMetrics>();
  private readonly responseTimeHistory = new Map<string, number[]>();
  private readonly activeRequests = new Map<string, Set<string>>();
  private readonly requestQueues = new Map<string, PendingRequest<any>[]>();
  private readonly cache = new Map<string, { data: any; expiry: number }>();

  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    super();
  }

  async onModuleInit() {
    this.startMetricsCollection();
    this.startQueueProcessing();
    this.logger.log('Reliability Manager Service initialized');
  }

  // ===================================================================
  // CORE RELIABILITY METHODS
  // ===================================================================

  /**
   * Execute an operation with comprehensive reliability features
   */
  async execute<T>(
    name: string,
    operation: () => Promise<T>,
    config?: Partial<ReliabilityConfig>,
    context?: any,
  ): Promise<ReliabilityResult<T>> {
    const reliabilityConfig = this.getOrCreateConfig(name, config);
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    this.logger.debug(`Executing operation with reliability features: ${name}`, {
      requestId,
      hasRateLimit: !!reliabilityConfig.rateLimit,
      hasCircuitBreaker: !!reliabilityConfig.circuitBreaker,
      hasRetry: !!reliabilityConfig.retry,
    });

    // Initialize result
    let result: ReliabilityResult<T> = {
      success: false,
      executionTime: 0,
      attempts: 0,
      rateLimited: false,
      circuitBreakerUsed: false,
      fallbackUsed: false,
      fromCache: false,
    };

    try {
      // Check cache first
      const cachedResult = this.checkCache(name, context);
      if (cachedResult) {
        return {
          ...result,
          success: true,
          data: cachedResult,
          fromCache: true,
          executionTime: Date.now() - startTime,
        };
      }

      // Apply bulkhead (concurrency limiting)
      const bulkheadResult = await this.applyBulkhead(name, reliabilityConfig, operation, requestId, context);
      if (bulkheadResult) {
        return bulkheadResult;
      }

      // Apply rate limiting
      if (reliabilityConfig.rateLimit) {
        const rateLimitResult = await this.rateLimiter.checkRateLimit(
          name,
          reliabilityConfig.rateLimit,
          context,
        );

        result.rateLimitState = rateLimitResult;
        result.rateLimited = !rateLimitResult.allowed;

        if (!rateLimitResult.allowed) {
          const fallbackResult = await this.tryFallback(
            new Error(`Rate limited: ${rateLimitResult.retryAfter}ms retry after`),
            reliabilityConfig,
            context,
          );

          return {
            ...result,
            ...fallbackResult,
            executionTime: Date.now() - startTime,
          };
        }
      }

      // Execute with circuit breaker
      if (reliabilityConfig.circuitBreaker) {
        const circuitBreakerResult = await this.executeWithCircuitBreaker(
          name,
          operation,
          reliabilityConfig,
          context,
        );

        result.circuitBreakerUsed = true;
        result.circuitBreakerState = circuitBreakerResult.state;
        result.fallbackUsed = circuitBreakerResult.fallbackUsed || false;

        if (circuitBreakerResult.success) {
          result.success = true;
          result.data = circuitBreakerResult.data;
        } else {
          result.error = circuitBreakerResult.error;
        }
      } else {
        // Execute with retry logic
        const retryResult = await this.executeWithRetry(
          operation,
          reliabilityConfig,
          context,
        );

        result.attempts = retryResult.attempts;
        
        if (retryResult.success) {
          result.success = true;
          result.data = retryResult.data;
        } else {
          result.error = retryResult.error;
        }
      }

      // Cache successful results
      if (result.success && reliabilityConfig.fallback?.cacheEnabled) {
        this.cacheResult(name, context, result.data, reliabilityConfig.fallback.cacheTtl);
      }

      // Update metrics
      result.executionTime = Date.now() - startTime;
      await this.updateMetrics(name, result);

      return result;

    } catch (error) {
      result.error = error as Error;
      result.executionTime = Date.now() - startTime;

      // Try fallback for unexpected errors
      const fallbackResult = await this.tryFallback(error as Error, reliabilityConfig, context);
      result = { ...result, ...fallbackResult };

      await this.updateMetrics(name, result);
      return result;

    } finally {
      // Clean up active request tracking
      const activeSet = this.activeRequests.get(name);
      if (activeSet) {
        activeSet.delete(requestId);
      }
    }
  }

  /**
   * Register a reliability configuration
   */
  registerConfiguration(name: string, config: ReliabilityConfig): void {
    this.configurations.set(name, { ...config, name });
    this.logger.log(`Reliability configuration registered: ${name}`, {
      hasRateLimit: !!config.rateLimit,
      hasCircuitBreaker: !!config.circuitBreaker,
      hasRetry: !!config.retry,
      hasFallback: !!config.fallback,
    });
  }

  /**
   * Update reliability configuration
   */
  updateConfiguration(name: string, updates: Partial<ReliabilityConfig>): void {
    const existing = this.configurations.get(name);
    if (!existing) {
      throw new Error(`Reliability configuration '${name}' not found`);
    }

    const updated = { ...existing, ...updates };
    this.configurations.set(name, updated);

    this.logger.log(`Reliability configuration updated: ${name}`);
  }

  /**
   * Get reliability metrics
   */
  getMetrics(name?: string): ReliabilityMetrics | Map<string, ReliabilityMetrics> {
    if (name) {
      return this.metrics.get(name) || this.createEmptyMetrics(name);
    }
    return new Map(this.metrics);
  }

  /**
   * Reset reliability state for a service
   */
  async reset(name: string): Promise<void> {
    // Reset circuit breaker
    try {
      await this.circuitBreaker.reset(name);
    } catch (error) {
      this.logger.warn(`Failed to reset circuit breaker for ${name}: ${error.message}`);
    }

    // Reset rate limiter
    try {
      await this.rateLimiter.resetRateLimit(name);
    } catch (error) {
      this.logger.warn(`Failed to reset rate limiter for ${name}: ${error.message}`);
    }

    // Clear metrics and cache
    this.metrics.delete(name);
    this.responseTimeHistory.delete(name);
    this.clearServiceCache(name);

    // Clear active requests and queues
    this.activeRequests.delete(name);
    this.requestQueues.delete(name);

    this.logger.log(`Reliability state reset for: ${name}`);
  }

  // ===================================================================
  // PRIVATE IMPLEMENTATION METHODS
  // ===================================================================

  private getOrCreateConfig(name: string, overrides?: Partial<ReliabilityConfig>): ReliabilityConfig {
    let config = this.configurations.get(name);
    
    if (!config) {
      config = {
        name,
        retry: {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          multiplier: 2,
          jitter: true,
        },
        timeout: {
          enabled: true,
          timeout: 30000,
        },
        monitoring: {
          enabled: true,
          metricsInterval: 60000,
          historySize: 100,
        },
      };
      
      this.configurations.set(name, config);
    }

    if (overrides) {
      config = { ...config, ...overrides };
    }

    return config;
  }

  private async executeWithCircuitBreaker<T>(
    name: string,
    operation: () => Promise<T>,
    config: ReliabilityConfig,
    context: any,
  ): Promise<CircuitBreakerResult<T>> {
    const wrappedOperation = config.timeout?.enabled
      ? () => this.applyTimeout(operation, config.timeout!.timeout, config.timeout?.timeoutMessage)
      : operation;

    const fallback = config.fallback?.fallbackFunction
      ? config.fallback.fallbackFunction
      : undefined;

    return await this.circuitBreaker.execute(
      name,
      wrappedOperation,
      config.circuitBreaker!,
      fallback,
    );
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: ReliabilityConfig,
    context: any,
  ): Promise<{ success: boolean; data?: T; error?: Error; attempts: number }> {
    const retryConfig = config.retry!;
    let lastError: Error;
    let attempts = 0;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      attempts = attempt;

      try {
        const wrappedOperation = config.timeout?.enabled
          ? () => this.applyTimeout(operation, config.timeout!.timeout, config.timeout?.timeoutMessage)
          : operation;

        const data = await wrappedOperation();
        return { success: true, data, attempts };

      } catch (error) {
        lastError = error as Error;

        // Check if we should retry
        const shouldRetry = attempt < retryConfig.maxAttempts &&
          (!retryConfig.retryCondition || retryConfig.retryCondition(error, attempt));

        if (!shouldRetry) {
          break;
        }

        // Calculate delay with jitter
        const delay = this.calculateRetryDelay(attempt - 1, retryConfig);
        
        this.logger.debug(`Retrying operation after ${delay}ms (attempt ${attempt}/${retryConfig.maxAttempts})`);
        
        // Call retry callback
        if (retryConfig.onRetry) {
          try {
            retryConfig.onRetry(error, attempt);
          } catch (callbackError) {
            this.logger.warn(`Retry callback failed: ${callbackError.message}`);
          }
        }

        await this.delay(delay);
      }
    }

    return { success: false, error: lastError, attempts };
  }

  private async applyTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    timeoutMessage?: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage || `Operation timed out after ${timeout}ms`));
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private async applyBulkhead<T>(
    name: string,
    config: ReliabilityConfig,
    operation: () => Promise<T>,
    requestId: string,
    context: any,
  ): Promise<ReliabilityResult<T> | null> {
    if (!config.bulkhead?.enabled) {
      return null;
    }

    const bulkhead = config.bulkhead;
    const activeSet = this.activeRequests.get(name) || new Set<string>();
    const queue = this.requestQueues.get(name) || [];

    // Check if we can execute immediately
    if (activeSet.size < bulkhead.maxConcurrentRequests) {
      activeSet.add(requestId);
      this.activeRequests.set(name, activeSet);
      return null; // Continue with normal execution
    }

    // Check if queue is full
    if (queue.length >= bulkhead.maxQueueSize) {
      return {
        success: false,
        error: new Error(`Bulkhead queue full for ${name}`),
        executionTime: 0,
        attempts: 0,
        rateLimited: false,
        circuitBreakerUsed: false,
        fallbackUsed: false,
        fromCache: false,
      };
    }

    // Queue the request
    return new Promise<ReliabilityResult<T>>((resolve, reject) => {
      const pendingRequest: PendingRequest<T> = {
        id: requestId,
        operation,
        resolve,
        reject,
        startTime: new Date(),
      };

      // Set timeout for queued request
      pendingRequest.timeout = setTimeout(() => {
        this.removeFromQueue(name, requestId);
        resolve({
          success: false,
          error: new Error(`Bulkhead queue timeout after ${bulkhead.queueTimeout}ms`),
          executionTime: bulkhead.queueTimeout,
          attempts: 0,
          rateLimited: false,
          circuitBreakerUsed: false,
          fallbackUsed: false,
          fromCache: false,
        });
      }, bulkhead.queueTimeout);

      queue.push(pendingRequest);
      this.requestQueues.set(name, queue);
    });
  }

  private async tryFallback(
    error: Error,
    config: ReliabilityConfig,
    context: any,
  ): Promise<Partial<ReliabilityResult<any>>> {
    if (!config.fallback?.enabled || !config.fallback.fallbackFunction) {
      return { fallbackUsed: false };
    }

    try {
      const fallbackData = await config.fallback.fallbackFunction(error, context);
      return {
        success: true,
        data: fallbackData,
        fallbackUsed: true,
      };
    } catch (fallbackError) {
      this.logger.error(`Fallback failed: ${fallbackError.message}`, fallbackError.stack);
      return { fallbackUsed: false };
    }
  }

  private checkCache(name: string, context: any): any | null {
    const cacheKey = this.generateCacheKey(name, context);
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  private cacheResult(name: string, context: any, data: any, ttl?: number): void {
    const cacheKey = this.generateCacheKey(name, context);
    const expiry = Date.now() + (ttl || 60000); // Default 1 minute TTL
    
    this.cache.set(cacheKey, { data, expiry });
  }

  private clearServiceCache(name: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${name}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay = Math.min(config.baseDelay * Math.pow(config.multiplier, attempt), config.maxDelay);
    
    if (config.jitter) {
      // Add random jitter of ±25%
      const jitterAmount = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.max(delay, 100); // Minimum 100ms delay
  }

  private async updateMetrics(name: string, result: ReliabilityResult<any>): Promise<void> {
    let metrics = this.metrics.get(name);
    
    if (!metrics) {
      metrics = this.createEmptyMetrics(name);
      this.metrics.set(name, metrics);
    }

    // Update basic counters
    metrics.totalRequests++;
    
    if (result.success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // Update response time tracking
    let responseTimes = this.responseTimeHistory.get(name) || [];
    responseTimes.push(result.executionTime);
    
    // Keep only recent response times
    if (responseTimes.length > 1000) {
      responseTimes = responseTimes.slice(-500);
    }
    
    this.responseTimeHistory.set(name, responseTimes);

    // Update aggregated metrics
    metrics.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    metrics.p95ResponseTime = this.calculatePercentile(responseTimes, 0.95);
    metrics.p99ResponseTime = this.calculatePercentile(responseTimes, 0.99);

    // Update feature usage metrics
    if (result.rateLimited) metrics.rateLimitedRequests++;
    if (result.fallbackUsed) metrics.fallbackUsage++;
    metrics.retryAttempts += result.attempts - 1;

    // Update error rate
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;
    
    // Update availability
    metrics.availability = (metrics.successfulRequests / metrics.totalRequests) * 100;

    // Update current states
    metrics.currentRateLimitState = result.rateLimitState;
    metrics.currentCircuitBreakerState = result.circuitBreakerState;

    // Update concurrency and queue metrics
    const activeSet = this.activeRequests.get(name);
    const queue = this.requestQueues.get(name);
    
    metrics.currentConcurrency = activeSet ? activeSet.size : 0;
    metrics.queueSize = queue ? queue.length : 0;

    this.emit('metrics:updated', { name, metrics });
  }

  private createEmptyMetrics(name: string): ReliabilityMetrics {
    return {
      name,
      timeWindow: {
        start: new Date(),
        end: new Date(),
      },
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitedRequests: 0,
      circuitBreakerTrips: 0,
      fallbackUsage: 0,
      retryAttempts: 0,
      timeouts: 0,
      currentConcurrency: 0,
      queueSize: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      availability: 100,
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Collect metrics every minute
  }

  private startQueueProcessing(): void {
    setInterval(() => {
      this.processQueues();
    }, 100); // Process queues every 100ms
  }

  private async collectMetrics(): Promise<void> {
    // Update time windows for all metrics
    const now = new Date();
    
    for (const metrics of this.metrics.values()) {
      metrics.timeWindow.end = now;
    }
  }

  private async processQueues(): Promise<void> {
    for (const [name, queue] of this.requestQueues.entries()) {
      if (queue.length === 0) continue;

      const config = this.configurations.get(name);
      if (!config?.bulkhead?.enabled) continue;

      const activeSet = this.activeRequests.get(name) || new Set<string>();
      const availableSlots = config.bulkhead.maxConcurrentRequests - activeSet.size;

      if (availableSlots <= 0) continue;

      // Process available slots
      const toProcess = Math.min(availableSlots, queue.length);
      const requests = queue.splice(0, toProcess);

      for (const request of requests) {
        if (request.timeout) {
          clearTimeout(request.timeout);
        }

        activeSet.add(request.id);
        this.activeRequests.set(name, activeSet);

        // Execute the request
        this.executeQueuedRequest(name, request);
      }
    }
  }

  private async executeQueuedRequest<T>(name: string, request: PendingRequest<T>): Promise<void> {
    const startTime = Date.now();

    try {
      const data = await request.operation();
      const queueTime = startTime - request.startTime.getTime();

      request.resolve({
        success: true,
        data,
        executionTime: Date.now() - startTime,
        attempts: 1,
        rateLimited: false,
        circuitBreakerUsed: false,
        fallbackUsed: false,
        fromCache: false,
        queueTime,
      });

    } catch (error) {
      const queueTime = startTime - request.startTime.getTime();

      request.resolve({
        success: false,
        error: error as Error,
        executionTime: Date.now() - startTime,
        attempts: 1,
        rateLimited: false,
        circuitBreakerUsed: false,
        fallbackUsed: false,
        fromCache: false,
        queueTime,
      });

    } finally {
      // Remove from active requests
      const activeSet = this.activeRequests.get(name);
      if (activeSet) {
        activeSet.delete(request.id);
      }
    }
  }

  private removeFromQueue(name: string, requestId: string): void {
    const queue = this.requestQueues.get(name);
    if (!queue) return;

    const index = queue.findIndex(req => req.id === requestId);
    if (index !== -1) {
      const request = queue.splice(index, 1)[0];
      if (request.timeout) {
        clearTimeout(request.timeout);
      }
    }
  }

  private generateRequestId(): string {
    return `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(name: string, context: any): string {
    const contextHash = context ? JSON.stringify(context) : 'null';
    return `${name}:${Buffer.from(contextHash).toString('base64')}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===================================================================
  // PUBLIC UTILITY METHODS
  // ===================================================================

  /**
   * Create default reliability configuration
   */
  static createDefaultConfig(name: string): ReliabilityConfig {
    return {
      name,
      rateLimit: {
        algorithm: 'token-bucket',
        requests: 100,
        window: 60000, // 1 minute
        burst: 120,
      },
      circuitBreaker: {
        name: `${name}-circuit-breaker`,
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000, // 1 minute
        volumeThreshold: 10,
        errorPercentageThreshold: 50,
        monitoringWindow: 60000, // 1 minute
      },
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        multiplier: 2,
        jitter: true,
      },
      timeout: {
        enabled: true,
        timeout: 30000, // 30 seconds
      },
      fallback: {
        enabled: false,
        cacheEnabled: true,
        cacheTtl: 60000, // 1 minute
      },
      monitoring: {
        enabled: true,
        metricsInterval: 60000, // 1 minute
        historySize: 100,
        alertThresholds: {
          errorRate: 10, // 10%
          responseTime: 5000, // 5 seconds
          queueSize: 50,
        },
      },
    };
  }

  /**
   * Get system-wide reliability statistics
   */
  getSystemStatistics(): {
    totalServices: number;
    totalRequests: number;
    overallSuccessRate: number;
    averageResponseTime: number;
    activeCircuitBreakers: number;
    rateLimitedServices: number;
    servicesUsingFallback: number;
  } {
    const allMetrics = Array.from(this.metrics.values());
    
    if (allMetrics.length === 0) {
      return {
        totalServices: 0,
        totalRequests: 0,
        overallSuccessRate: 100,
        averageResponseTime: 0,
        activeCircuitBreakers: 0,
        rateLimitedServices: 0,
        servicesUsingFallback: 0,
      };
    }

    const totalRequests = allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalSuccessful = allMetrics.reduce((sum, m) => sum + m.successfulRequests, 0);
    const totalResponseTime = allMetrics.reduce((sum, m) => sum + (m.averageResponseTime * m.totalRequests), 0);
    
    const overallSuccessRate = totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 100;
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    
    const activeCircuitBreakers = allMetrics.filter(m => 
      m.currentCircuitBreakerState === 'open' || m.currentCircuitBreakerState === 'half-open'
    ).length;
    
    const rateLimitedServices = allMetrics.filter(m => m.rateLimitedRequests > 0).length;
    const servicesUsingFallback = allMetrics.filter(m => m.fallbackUsage > 0).length;

    return {
      totalServices: allMetrics.length,
      totalRequests,
      overallSuccessRate,
      averageResponseTime,
      activeCircuitBreakers,
      rateLimitedServices,
      servicesUsingFallback,
    };
  }
}
