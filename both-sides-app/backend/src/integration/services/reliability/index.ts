/**
 * Reliability Services Index
 * 
 * Central exports for all reliability services including rate limiting,
 * circuit breaking, and comprehensive reliability management.
 */

// ===================================================================
// CORE SERVICES
// ===================================================================

export { RateLimiterService } from './rate-limiter.service';
export { CircuitBreakerService } from './circuit-breaker.service';
export { ReliabilityManagerService } from './reliability-manager.service';

// ===================================================================
// INTERFACES AND TYPES
// ===================================================================

export type {
  // Rate limiting types
  RateLimitAlgorithm,
  RateLimitConfig,
  RateLimitResult,
  RateLimitState,
  RateLimitMetrics,
  QueuedRequest,
} from './rate-limiter.service';

export type {
  // Circuit breaker types
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerState_Data,
  CircuitBreakerResult,
  CircuitBreakerMetrics,
  RequestRecord,
  FallbackFunction,
} from './circuit-breaker.service';

export type {
  // Reliability manager types
  ReliabilityConfig,
  RetryConfig,
  TimeoutConfig,
  BulkheadConfig,
  FallbackConfig,
  MonitoringConfig,
  ReliabilityResult,
  ReliabilityMetrics,
} from './reliability-manager.service';

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Create default rate limit configuration
 */
export function createDefaultRateLimitConfig(
  requests: number = 100,
  windowMs: number = 60000,
  algorithm: import('./rate-limiter.service').RateLimitAlgorithm = 'token-bucket',
): import('./rate-limiter.service').RateLimitConfig {
  return {
    algorithm,
    requests,
    window: windowMs,
    burst: Math.floor(requests * 1.2), // 20% burst capacity
    refillRate: requests / (windowMs / 1000), // tokens per second
    queueSize: Math.floor(requests * 0.5), // 50% queue size
    priority: false,
    distributed: true,
  };
}

/**
 * Create default circuit breaker configuration
 */
export function createDefaultCircuitBreakerConfig(
  name: string,
): import('./circuit-breaker.service').CircuitBreakerConfig {
  return {
    name,
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 60000, // 1 minute
    resetTimeout: 300000, // 5 minutes
    volumeThreshold: 10,
    errorPercentageThreshold: 50,
    monitoringWindow: 60000, // 1 minute
    maxRetries: 3,
    errorFilter: (error: any) => {
      // Don't count client errors (4xx) as failures
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
      return true;
    },
  };
}

/**
 * Create default retry configuration
 */
export function createDefaultRetryConfig(): import('./reliability-manager.service').RetryConfig {
  return {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    multiplier: 2,
    jitter: true,
    retryCondition: (error: any, attempt: number) => {
      // Don't retry client errors (4xx except 408 and 429)
      if (error.status >= 400 && error.status < 500) {
        return error.status === 408 || error.status === 429; // Retry timeouts and rate limits
      }
      
      // Don't retry on last attempt
      return attempt < 3;
    },
  };
}

/**
 * Create a comprehensive reliability configuration
 */
export function createReliabilityConfig(
  name: string,
  options?: {
    rateLimitRequests?: number;
    rateLimitWindowMs?: number;
    circuitBreakerFailureThreshold?: number;
    circuitBreakerTimeoutMs?: number;
    retryMaxAttempts?: number;
    retryBaseDelayMs?: number;
    timeoutMs?: number;
    bulkheadMaxConcurrent?: number;
    enableFallback?: boolean;
    enableMonitoring?: boolean;
  },
): import('./reliability-manager.service').ReliabilityConfig {
  const opts = options || {};

  return {
    name,
    
    // Rate limiting
    rateLimit: {
      algorithm: 'token-bucket',
      requests: opts.rateLimitRequests || 100,
      window: opts.rateLimitWindowMs || 60000,
      burst: Math.floor((opts.rateLimitRequests || 100) * 1.2),
      distributed: true,
      priority: true,
    },
    
    // Circuit breaker
    circuitBreaker: {
      name: `${name}-cb`,
      failureThreshold: opts.circuitBreakerFailureThreshold || 5,
      successThreshold: 3,
      timeout: opts.circuitBreakerTimeoutMs || 60000,
      volumeThreshold: 10,
      errorPercentageThreshold: 50,
      monitoringWindow: 60000,
      errorFilter: (error: any) => error.status >= 500 || !error.status,
    },
    
    // Retry logic
    retry: {
      maxAttempts: opts.retryMaxAttempts || 3,
      baseDelay: opts.retryBaseDelayMs || 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true,
      retryCondition: (error: any, attempt: number) => {
        if (attempt >= (opts.retryMaxAttempts || 3)) return false;
        return !error.status || error.status >= 500 || error.status === 429;
      },
    },
    
    // Timeout
    timeout: {
      enabled: true,
      timeout: opts.timeoutMs || 30000,
      timeoutMessage: `Operation timed out after ${opts.timeoutMs || 30000}ms`,
    },
    
    // Bulkhead (if specified)
    bulkhead: opts.bulkheadMaxConcurrent ? {
      enabled: true,
      maxConcurrentRequests: opts.bulkheadMaxConcurrent,
      maxQueueSize: opts.bulkheadMaxConcurrent * 2,
      queueTimeout: 10000,
    } : undefined,
    
    // Fallback
    fallback: {
      enabled: opts.enableFallback || false,
      cacheEnabled: true,
      cacheTtl: 60000,
    },
    
    // Monitoring
    monitoring: {
      enabled: opts.enableMonitoring !== false,
      metricsInterval: 60000,
      historySize: 100,
      alertThresholds: {
        errorRate: 10,
        responseTime: 5000,
        queueSize: 50,
      },
    },
  };
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  multiplier: number = 2,
  jitter: boolean = true,
): number {
  let delay = Math.min(baseDelay * Math.pow(multiplier, attempt), maxDelay);
  
  if (jitter) {
    // Add random jitter of ±25%
    const jitterAmount = delay * 0.25;
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
  }
  
  return Math.max(delay, 100); // Minimum 100ms delay
}

/**
 * Check if an error is retryable based on common patterns
 */
export function isRetryableError(error: any): boolean {
  // Network errors are typically retryable
  if (!error.status && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
    return true;
  }
  
  // HTTP status codes that are retryable
  if (error.status) {
    // 5xx server errors are retryable
    if (error.status >= 500) return true;
    
    // Specific 4xx errors that are retryable
    if (error.status === 408 || error.status === 429) return true;
  }
  
  return false;
}

/**
 * Check if an error should trigger circuit breaker
 */
export function isCircuitBreakerError(error: any): boolean {
  // Network errors
  if (!error.status) return true;
  
  // Server errors (5xx)
  if (error.status >= 500) return true;
  
  // Don't trigger circuit breaker for client errors
  return false;
}

/**
 * Get error category for monitoring and alerting
 */
export function getErrorCategory(error: any): 'network' | 'timeout' | 'rate-limit' | 'server' | 'client' | 'unknown' {
  if (!error.status) {
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return 'timeout';
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return 'network';
    }
    return 'unknown';
  }
  
  if (error.status === 429) return 'rate-limit';
  if (error.status === 408) return 'timeout';
  if (error.status >= 500) return 'server';
  if (error.status >= 400) return 'client';
  
  return 'unknown';
}

/**
 * Format reliability metrics for display
 */
export function formatReliabilityMetrics(
  metrics: import('./reliability-manager.service').ReliabilityMetrics,
): {
  successRate: string;
  errorRate: string;
  averageResponseTime: string;
  p95ResponseTime: string;
  availability: string;
  throughput: string;
} {
  const successRate = metrics.totalRequests > 0 
    ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)
    : '100.00';
    
  return {
    successRate: `${successRate}%`,
    errorRate: `${metrics.errorRate.toFixed(2)}%`,
    averageResponseTime: `${metrics.averageResponseTime.toFixed(0)}ms`,
    p95ResponseTime: `${metrics.p95ResponseTime.toFixed(0)}ms`,
    availability: `${metrics.availability.toFixed(2)}%`,
    throughput: `${(metrics.totalRequests / 60).toFixed(2)} req/min`, // Assuming 1-minute window
  };
}

/**
 * Create a fallback function that returns cached data or default values
 */
export function createCachedFallback<T>(
  defaultValue: T,
  cacheDuration: number = 300000, // 5 minutes
): import('./circuit-breaker.service').FallbackFunction<T> {
  const cache = new Map<string, { value: T; expiry: number }>();
  
  return async (error: Error): Promise<T> => {
    const cacheKey = error.message || 'default';
    const cached = cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    // Return default value and cache it
    cache.set(cacheKey, {
      value: defaultValue,
      expiry: Date.now() + cacheDuration,
    });
    
    return defaultValue;
  };
}

/**
 * Create a fallback function that returns stale data
 */
export function createStaleDataFallback<T>(
  staleDataProvider: () => Promise<T | null>,
  defaultValue: T,
): import('./circuit-breaker.service').FallbackFunction<T> {
  return async (error: Error): Promise<T> => {
    try {
      const staleData = await staleDataProvider();
      return staleData || defaultValue;
    } catch (staleError) {
      return defaultValue;
    }
  };
}

// ===================================================================
// CONSTANTS
// ===================================================================

export const RELIABILITY_CONSTANTS = {
  // Default timeouts
  DEFAULT_TIMEOUT: 30000,
  DEFAULT_RATE_LIMIT_WINDOW: 60000,
  DEFAULT_CIRCUIT_BREAKER_TIMEOUT: 60000,
  
  // Default thresholds
  DEFAULT_FAILURE_THRESHOLD: 5,
  DEFAULT_SUCCESS_THRESHOLD: 3,
  DEFAULT_ERROR_PERCENTAGE: 50,
  DEFAULT_VOLUME_THRESHOLD: 10,
  
  // Retry defaults
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_BASE_DELAY: 1000,
  DEFAULT_MAX_DELAY: 30000,
  DEFAULT_BACKOFF_MULTIPLIER: 2,
  
  // Rate limiting defaults
  DEFAULT_REQUESTS_PER_MINUTE: 100,
  DEFAULT_BURST_CAPACITY: 120,
  DEFAULT_QUEUE_SIZE: 50,
  
  // Monitoring defaults
  DEFAULT_METRICS_INTERVAL: 60000,
  DEFAULT_HISTORY_SIZE: 100,
  
  // Alert thresholds
  DEFAULT_ERROR_RATE_THRESHOLD: 10, // 10%
  DEFAULT_RESPONSE_TIME_THRESHOLD: 5000, // 5 seconds
  DEFAULT_QUEUE_SIZE_THRESHOLD: 50,
  
  // Cache defaults
  DEFAULT_CACHE_TTL: 60000, // 1 minute
  DEFAULT_STALE_CACHE_TTL: 300000, // 5 minutes
} as const;

// ===================================================================
// ERROR CLASSES
// ===================================================================

export class ReliabilityError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly feature: 'rate-limit' | 'circuit-breaker' | 'timeout' | 'bulkhead' | 'retry',
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'ReliabilityError';
  }
}

export class RateLimitExceededError extends ReliabilityError {
  constructor(
    message: string,
    public readonly service: string,
    public readonly retryAfter: number,
    public readonly queuePosition?: number,
  ) {
    super(message, service, 'rate-limit');
    this.name = 'RateLimitExceededError';
  }
}

export class CircuitBreakerOpenError extends ReliabilityError {
  constructor(
    message: string,
    public readonly service: string,
    public readonly nextAttemptTime: Date,
  ) {
    super(message, service, 'circuit-breaker');
    this.name = 'CircuitBreakerOpenError';
  }
}

export class BulkheadRejectionError extends ReliabilityError {
  constructor(
    message: string,
    public readonly service: string,
    public readonly currentConcurrency: number,
    public readonly maxConcurrency: number,
  ) {
    super(message, service, 'bulkhead');
    this.name = 'BulkheadRejectionError';
  }
}

export class TimeoutError extends ReliabilityError {
  constructor(
    message: string,
    public readonly service: string,
    public readonly timeoutDuration: number,
  ) {
    super(message, service, 'timeout');
    this.name = 'TimeoutError';
  }
}
