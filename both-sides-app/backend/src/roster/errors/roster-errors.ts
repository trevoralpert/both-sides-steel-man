/**
 * Task 2.3.3.3: Error Handling and Retry Logic
 * 
 * This module defines comprehensive error types, retry strategies, and circuit breaker
 * patterns for robust integration with external roster management systems.
 * 
 * Features:
 * - Typed error hierarchy for different failure modes
 * - Exponential backoff with jitter for retries
 * - Circuit breaker pattern to prevent cascade failures
 * - Rate limiting and throttling support
 * - Comprehensive error context and logging
 */

/**
 * Error severity levels for monitoring and alerting
 */
export enum ErrorSeverity {
  LOW = 'low',         // Recoverable errors, retry automatically
  MEDIUM = 'medium',   // Temporary issues, manual intervention may be needed
  HIGH = 'high',       // System errors, immediate attention required
  CRITICAL = 'critical' // Service disruption, emergency response needed
}

/**
 * Error categories for classification and handling
 */
export enum ErrorCategory {
  CONNECTION = 'connection',       // Network/connectivity issues
  AUTHENTICATION = 'authentication', // Auth/permission errors
  RATE_LIMIT = 'rate_limit',       // Rate limiting/throttling
  DATA_VALIDATION = 'data_validation', // Invalid data format/content
  NOT_FOUND = 'not_found',         // Resource not found
  CONFLICT = 'conflict',           // Data conflicts/version mismatches
  TIMEOUT = 'timeout',             // Request timeout
  SERVER_ERROR = 'server_error',   // External server errors
  CLIENT_ERROR = 'client_error',   // Client-side errors
  SYSTEM_ERROR = 'system_error'    // Internal system errors
}

/**
 * Base error class for all roster provider errors
 */
export abstract class RosterProviderError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly retryable: boolean;
  public readonly provider?: string;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: Record<string, any> = {},
    retryable: boolean = false,
    provider?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.retryable = retryable;
    this.provider = provider;
    
    // Maintain stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to structured format for logging
   */
  toLogFormat(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      provider: this.provider,
      stack: this.stack
    };
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends RosterProviderError {
  constructor(message: string, context: Record<string, any> = {}, provider?: string) {
    super(
      message,
      'CONNECTION_ERROR',
      ErrorCategory.CONNECTION,
      ErrorSeverity.MEDIUM,
      context,
      true, // Usually retryable
      provider
    );
  }
}

export class TimeoutError extends RosterProviderError {
  constructor(message: string, timeoutMs: number, context: Record<string, any> = {}, provider?: string) {
    super(
      message,
      'TIMEOUT_ERROR',
      ErrorCategory.TIMEOUT,
      ErrorSeverity.MEDIUM,
      { ...context, timeoutMs },
      true, // Retryable
      provider
    );
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthenticationError extends RosterProviderError {
  constructor(message: string, context: Record<string, any> = {}, provider?: string) {
    super(
      message,
      'AUTH_ERROR',
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.HIGH,
      context,
      false, // Usually not retryable
      provider
    );
  }
}

export class AuthorizationError extends RosterProviderError {
  constructor(message: string, context: Record<string, any> = {}, provider?: string) {
    super(
      message,
      'AUTHZ_ERROR',
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.HIGH,
      context,
      false, // Not retryable
      provider
    );
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends RosterProviderError {
  public readonly resetTime?: Date;

  constructor(
    message: string, 
    resetTime?: Date, 
    context: Record<string, any> = {}, 
    provider?: string
  ) {
    super(
      message,
      'RATE_LIMIT_ERROR',
      ErrorCategory.RATE_LIMIT,
      ErrorSeverity.MEDIUM,
      { ...context, resetTime: resetTime?.toISOString() },
      true, // Retryable after reset time
      provider
    );
    this.resetTime = resetTime;
  }
}

/**
 * Data validation errors
 */
export class DataValidationError extends RosterProviderError {
  public readonly validationErrors: string[];

  constructor(
    message: string, 
    validationErrors: string[] = [], 
    context: Record<string, any> = {},
    provider?: string
  ) {
    super(
      message,
      'DATA_VALIDATION_ERROR',
      ErrorCategory.DATA_VALIDATION,
      ErrorSeverity.LOW,
      { ...context, validationErrors },
      false, // Not retryable without data fix
      provider
    );
    this.validationErrors = validationErrors;
  }
}

/**
 * Resource not found errors
 */
export class ResourceNotFoundError extends RosterProviderError {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(
    resourceType: string,
    resourceId: string,
    context: Record<string, any> = {},
    provider?: string
  ) {
    const message = `${resourceType} with ID '${resourceId}' not found`;
    super(
      message,
      'RESOURCE_NOT_FOUND',
      ErrorCategory.NOT_FOUND,
      ErrorSeverity.LOW,
      { ...context, resourceType, resourceId },
      false, // Not retryable
      provider
    );
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Data conflict errors
 */
export class DataConflictError extends RosterProviderError {
  public readonly conflictType: string;

  constructor(
    message: string,
    conflictType: string,
    context: Record<string, any> = {},
    provider?: string
  ) {
    super(
      message,
      'DATA_CONFLICT_ERROR',
      ErrorCategory.CONFLICT,
      ErrorSeverity.MEDIUM,
      { ...context, conflictType },
      false, // Usually not retryable without manual intervention
      provider
    );
    this.conflictType = conflictType;
  }
}

/**
 * Server-side errors
 */
export class ServerError extends RosterProviderError {
  public readonly httpStatus?: number;

  constructor(
    message: string,
    httpStatus?: number,
    context: Record<string, any> = {},
    provider?: string
  ) {
    super(
      message,
      'SERVER_ERROR',
      ErrorCategory.SERVER_ERROR,
      ErrorSeverity.HIGH,
      { ...context, httpStatus },
      httpStatus ? httpStatus >= 500 : true, // 5xx errors are retryable
      provider
    );
    this.httpStatus = httpStatus;
  }
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, not allowing requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;  // Number of failures before opening
  successThreshold: number;  // Number of successes to close from half-open
  timeout: number;           // How long to wait before trying half-open (ms)
  resetTimeout: number;      // How long to wait before retrying after open (ms)
  monitoringPeriod: number;  // Time window for failure counting (ms)
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private nextAttempt: Date = new Date();
  private lastFailureTime: Date = new Date();

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new Error(`Circuit breaker '${this.name}' is ${this.state}. Next attempt at ${this.nextAttempt.toISOString()}`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if request can be executed
   */
  private canExecute(): boolean {
    const now = new Date();

    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        if (now >= this.nextAttempt) {
          this.state = CircuitBreakerState.HALF_OPEN;
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failures = 0;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.successes = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    this.successes = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): {
    name: string;
    state: CircuitBreakerState;
    failures: number;
    successes: number;
    nextAttempt?: string;
    lastFailure?: string;
  } {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.nextAttempt.toISOString(),
      lastFailure: this.lastFailureTime.toISOString(),
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = new Date();
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitterMaxMs: number;
  retryableErrors: ErrorCategory[];
  nonRetryableErrors: ErrorCategory[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  exponentialBase: 2,
  jitterMaxMs: 1000,
  retryableErrors: [
    ErrorCategory.CONNECTION,
    ErrorCategory.TIMEOUT,
    ErrorCategory.RATE_LIMIT,
    ErrorCategory.SERVER_ERROR
  ],
  nonRetryableErrors: [
    ErrorCategory.AUTHENTICATION,
    ErrorCategory.DATA_VALIDATION,
    ErrorCategory.NOT_FOUND,
    ErrorCategory.CLIENT_ERROR
  ]
};

/**
 * Retry strategy implementation with exponential backoff and jitter
 */
export class RetryStrategy {
  constructor(private readonly config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>, 
    context: Record<string, any> = {}
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryable(error)) {
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt);
        
        // Log retry attempt
        console.warn(`Retry attempt ${attempt + 1}/${this.config.maxRetries} after ${delay}ms`, {
          error: error.message,
          context,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries
        });

        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Check if error is retryable based on configuration
   */
  private isRetryable(error: any): boolean {
    if (error instanceof RosterProviderError) {
      // Use explicit retryable flag if available
      if (error.retryable !== undefined) {
        return error.retryable;
      }

      // Check category-based rules
      if (this.config.nonRetryableErrors.includes(error.category)) {
        return false;
      }
      
      if (this.config.retryableErrors.includes(error.category)) {
        return true;
      }
    }

    // Default to non-retryable for unknown errors
    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelayMs * 
      Math.pow(this.config.exponentialBase, attempt);
    
    const jitter = Math.random() * this.config.jitterMaxMs;
    
    const totalDelay = exponentialDelay + jitter;
    
    return Math.min(totalDelay, this.config.maxDelayMs);
  }

  /**
   * Promise-based delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Error recovery strategies
 */
export interface RecoveryStrategy {
  canRecover(error: RosterProviderError): boolean;
  recover(error: RosterProviderError, context: Record<string, any>): Promise<void>;
}

/**
 * Rate limit recovery strategy
 */
export class RateLimitRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: RosterProviderError): boolean {
    return error instanceof RateLimitError;
  }

  async recover(error: RosterProviderError, context: Record<string, any>): Promise<void> {
    if (!(error instanceof RateLimitError)) {
      return;
    }

    if (error.resetTime) {
      const waitTime = error.resetTime.getTime() - Date.now();
      if (waitTime > 0) {
        console.info(`Waiting ${waitTime}ms for rate limit reset`, context);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
}

/**
 * Comprehensive error handler with circuit breaker and retry logic
 */
export class RosterErrorHandler {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryStrategy: RetryStrategy;
  private recoveryStrategies: RecoveryStrategy[] = [
    new RateLimitRecoveryStrategy()
  ];

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    private readonly logger?: any
  ) {
    this.retryStrategy = new RetryStrategy({ ...DEFAULT_RETRY_CONFIG, ...retryConfig });
  }

  /**
   * Execute function with comprehensive error handling
   */
  async executeWithProtection<T>(
    operationName: string,
    fn: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    const circuitBreaker = this.getOrCreateCircuitBreaker(operationName);
    
    return this.retryStrategy.execute(async () => {
      return circuitBreaker.execute(async () => {
        try {
          return await fn();
        } catch (error) {
          // Apply recovery strategies
          for (const strategy of this.recoveryStrategies) {
            if (error instanceof RosterProviderError && strategy.canRecover(error)) {
              await strategy.recover(error, context);
            }
          }
          
          // Re-throw for retry logic to handle
          throw error;
        }
      });
    }, context);
  }

  /**
   * Get or create circuit breaker for operation
   */
  private getOrCreateCircuitBreaker(operationName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operationName)) {
      const config: CircuitBreakerConfig = {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        resetTimeout: 30000,
        monitoringPeriod: 300000
      };
      
      this.circuitBreakers.set(operationName, new CircuitBreaker(operationName, config));
    }
    
    return this.circuitBreakers.get(operationName)!;
  }

  /**
   * Get status of all circuit breakers
   */
  getCircuitBreakerStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [name, breaker] of this.circuitBreakers) {
      status[name] = breaker.getStatus();
    }
    
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
  }
}
