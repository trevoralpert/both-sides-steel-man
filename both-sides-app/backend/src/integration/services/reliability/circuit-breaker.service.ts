/**
 * Circuit Breaker Service
 * 
 * Implements circuit breaker pattern to prevent cascading failures and provide
 * graceful degradation when external services are unhealthy or unresponsive.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'events';
import { ApiError } from '../../clients/base-api-client';

// ===================================================================
// CIRCUIT BREAKER TYPES AND INTERFACES
// ===================================================================

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;          // Number of failures to trip the breaker
  successThreshold: number;          // Number of successes to close breaker from half-open
  timeout: number;                   // Time in ms before attempting to half-open
  resetTimeout?: number;             // Time in ms before full reset
  errorFilter?: (error: any) => boolean;  // Filter which errors count as failures
  volumeThreshold?: number;          // Minimum requests before tripping
  errorPercentageThreshold?: number; // Percentage of errors to trip (0-100)
  monitoringWindow?: number;         // Time window for monitoring in ms
  maxRetries?: number;               // Max retries before opening
}

export interface CircuitBreakerState_Data {
  name: string;
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  requestHistory: RequestRecord[];
  config: CircuitBreakerConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestRecord {
  timestamp: Date;
  success: boolean;
  duration: number;
  error?: string;
}

export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  state: CircuitBreakerState;
  executionTime: number;
  fromCache?: boolean;
  fallbackUsed?: boolean;
}

export interface CircuitBreakerMetrics {
  name: string;
  state: CircuitBreakerState;
  failureRate: number;
  averageResponseTime: number;
  requestVolume: number;
  errorCount: number;
  successCount: number;
  tripCount: number;
  lastTripped?: Date;
  uptime: number;
  availability: number;
}

export interface FallbackFunction<T> {
  (error: Error): Promise<T> | T;
}

// ===================================================================
// CIRCUIT BREAKER SERVICE
// ===================================================================

@Injectable()
export class CircuitBreakerService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreakerState_Data>();
  private readonly fallbacks = new Map<string, FallbackFunction<any>>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    
    // Start cleanup process
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
  }

  async onModuleInit() {
    this.logger.log('Circuit Breaker Service initialized');
  }

  // ===================================================================
  // CORE CIRCUIT BREAKER METHODS
  // ===================================================================

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    name: string,
    operation: () => Promise<T>,
    config: CircuitBreakerConfig,
    fallback?: FallbackFunction<T>,
  ): Promise<CircuitBreakerResult<T>> {
    const breaker = this.getOrCreateBreaker(name, config);
    const startTime = Date.now();

    this.logger.debug(`Executing operation through circuit breaker: ${name}`, {
      state: breaker.state,
      failureCount: breaker.failureCount,
      totalRequests: breaker.totalRequests,
    });

    // Check if circuit breaker allows execution
    const canExecute = this.canExecute(breaker);
    
    if (!canExecute.allowed) {
      const result: CircuitBreakerResult<T> = {
        success: false,
        error: new Error(`Circuit breaker '${name}' is ${breaker.state}: ${canExecute.reason}`),
        state: breaker.state,
        executionTime: Date.now() - startTime,
        fallbackUsed: false,
      };

      // Try fallback if available
      if (fallback) {
        try {
          const fallbackData = await fallback(result.error);
          return {
            ...result,
            success: true,
            data: fallbackData,
            fallbackUsed: true,
          };
        } catch (fallbackError) {
          this.logger.error(`Fallback failed for ${name}: ${fallbackError.message}`, fallbackError.stack);
        }
      }

      this.emit('circuit-breaker:blocked', {
        name,
        state: breaker.state,
        reason: canExecute.reason,
      });

      return result;
    }

    // Execute the operation
    try {
      const data = await operation();
      const executionTime = Date.now() - startTime;

      await this.recordSuccess(breaker, executionTime);

      const result: CircuitBreakerResult<T> = {
        success: true,
        data,
        state: breaker.state,
        executionTime,
        fallbackUsed: false,
      };

      this.emit('circuit-breaker:success', {
        name,
        state: breaker.state,
        executionTime,
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      await this.recordFailure(breaker, error, executionTime);

      const result: CircuitBreakerResult<T> = {
        success: false,
        error: error as Error,
        state: breaker.state,
        executionTime,
        fallbackUsed: false,
      };

      // Try fallback if available and error is severe
      if (fallback && this.shouldUseFallback(error, breaker)) {
        try {
          const fallbackData = await fallback(error as Error);
          return {
            ...result,
            success: true,
            data: fallbackData,
            fallbackUsed: true,
          };
        } catch (fallbackError) {
          this.logger.error(`Fallback failed for ${name}: ${fallbackError.message}`, fallbackError.stack);
        }
      }

      this.emit('circuit-breaker:failure', {
        name,
        state: breaker.state,
        error: error.message,
        executionTime,
      });

      return result;
    }
  }

  /**
   * Register a fallback function for a circuit breaker
   */
  registerFallback<T>(name: string, fallback: FallbackFunction<T>): void {
    this.fallbacks.set(name, fallback);
    this.logger.debug(`Fallback registered for circuit breaker: ${name}`);
  }

  /**
   * Force circuit breaker state change
   */
  async forceState(name: string, state: CircuitBreakerState): Promise<void> {
    const breaker = this.breakers.get(name);
    if (!breaker) {
      throw new Error(`Circuit breaker '${name}' not found`);
    }

    const previousState = breaker.state;
    breaker.state = state;
    breaker.updatedAt = new Date();

    if (state === 'closed') {
      breaker.failureCount = 0;
      breaker.successCount = 0;
    }

    this.logger.log(`Circuit breaker '${name}' state forced from ${previousState} to ${state}`);

    this.emit('circuit-breaker:state-change', {
      name,
      previousState,
      newState: state,
      forced: true,
    });
  }

  /**
   * Reset circuit breaker statistics
   */
  async reset(name: string): Promise<void> {
    const breaker = this.breakers.get(name);
    if (!breaker) {
      throw new Error(`Circuit breaker '${name}' not found`);
    }

    breaker.state = 'closed';
    breaker.failureCount = 0;
    breaker.successCount = 0;
    breaker.totalRequests = 0;
    breaker.totalFailures = 0;
    breaker.totalSuccesses = 0;
    breaker.requestHistory = [];
    breaker.lastFailureTime = undefined;
    breaker.lastSuccessTime = undefined;
    breaker.nextAttemptTime = undefined;
    breaker.updatedAt = new Date();

    this.logger.log(`Circuit breaker '${name}' reset`);

    this.emit('circuit-breaker:reset', { name });
  }

  /**
   * Get circuit breaker state
   */
  getState(name: string): CircuitBreakerState_Data | null {
    return this.breakers.get(name) || null;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(name: string): CircuitBreakerMetrics | null {
    const breaker = this.breakers.get(name);
    if (!breaker) return null;

    const now = Date.now();
    const windowStart = now - (breaker.config.monitoringWindow || 60000);
    const recentRequests = breaker.requestHistory.filter(
      req => req.timestamp.getTime() >= windowStart
    );

    const successfulRequests = recentRequests.filter(req => req.success);
    const failedRequests = recentRequests.filter(req => !req.success);

    const failureRate = recentRequests.length > 0 
      ? (failedRequests.length / recentRequests.length) * 100 
      : 0;

    const averageResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length
      : 0;

    const uptimeMs = now - breaker.createdAt.getTime();
    const failureTime = breaker.requestHistory
      .filter(req => !req.success)
      .reduce((sum, req) => sum + req.duration, 0);
    
    const uptime = ((uptimeMs - failureTime) / uptimeMs) * 100;
    
    const availability = breaker.totalRequests > 0 
      ? (breaker.totalSuccesses / breaker.totalRequests) * 100 
      : 100;

    return {
      name: breaker.name,
      state: breaker.state,
      failureRate,
      averageResponseTime,
      requestVolume: recentRequests.length,
      errorCount: failedRequests.length,
      successCount: successfulRequests.length,
      tripCount: this.calculateTripCount(breaker),
      lastTripped: this.getLastTripTime(breaker),
      uptime,
      availability,
    };
  }

  /**
   * Get all circuit breaker states
   */
  getAllStates(): Map<string, CircuitBreakerState_Data> {
    return new Map(this.breakers);
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllMetrics(): Map<string, CircuitBreakerMetrics> {
    const metricsMap = new Map<string, CircuitBreakerMetrics>();
    
    for (const name of this.breakers.keys()) {
      const metrics = this.getMetrics(name);
      if (metrics) {
        metricsMap.set(name, metrics);
      }
    }
    
    return metricsMap;
  }

  // ===================================================================
  // PRIVATE METHODS
  // ===================================================================

  private getOrCreateBreaker(name: string, config: CircuitBreakerConfig): CircuitBreakerState_Data {
    let breaker = this.breakers.get(name);
    
    if (!breaker) {
      breaker = {
        name,
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        totalRequests: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        requestHistory: [],
        config: { ...config },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.breakers.set(name, breaker);
      this.logger.log(`Circuit breaker created: ${name}`, {
        failureThreshold: config.failureThreshold,
        timeout: config.timeout,
      });
    } else {
      // Update config if changed
      breaker.config = { ...config };
    }

    return breaker;
  }

  private canExecute(breaker: CircuitBreakerState_Data): { allowed: boolean; reason?: string } {
    const now = new Date();

    switch (breaker.state) {
      case 'closed':
        return { allowed: true };

      case 'open':
        if (breaker.nextAttemptTime && now >= breaker.nextAttemptTime) {
          // Transition to half-open
          breaker.state = 'half-open';
          breaker.successCount = 0;
          breaker.updatedAt = now;
          
          this.logger.log(`Circuit breaker '${breaker.name}' transitioned to half-open`);
          
          this.emit('circuit-breaker:state-change', {
            name: breaker.name,
            previousState: 'open',
            newState: 'half-open',
          });
          
          return { allowed: true };
        }
        
        return { 
          allowed: false, 
          reason: `Circuit is open, next attempt at ${breaker.nextAttemptTime?.toISOString()}` 
        };

      case 'half-open':
        return { allowed: true };

      default:
        return { allowed: false, reason: 'Unknown circuit breaker state' };
    }
  }

  private async recordSuccess(breaker: CircuitBreakerState_Data, duration: number): Promise<void> {
    breaker.totalRequests++;
    breaker.totalSuccesses++;
    breaker.lastSuccessTime = new Date();
    breaker.updatedAt = new Date();

    // Add to request history
    this.addToRequestHistory(breaker, {
      timestamp: new Date(),
      success: true,
      duration,
    });

    if (breaker.state === 'half-open') {
      breaker.successCount++;
      
      if (breaker.successCount >= breaker.config.successThreshold) {
        // Close the circuit
        breaker.state = 'closed';
        breaker.failureCount = 0;
        breaker.successCount = 0;
        breaker.nextAttemptTime = undefined;
        
        this.logger.log(`Circuit breaker '${breaker.name}' closed after ${breaker.successCount} successes`);
        
        this.emit('circuit-breaker:state-change', {
          name: breaker.name,
          previousState: 'half-open',
          newState: 'closed',
        });
      }
    } else if (breaker.state === 'closed') {
      // Reset failure count on success
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
    }
  }

  private async recordFailure(breaker: CircuitBreakerState_Data, error: any, duration: number): Promise<void> {
    // Check if error should be counted
    if (breaker.config.errorFilter && !breaker.config.errorFilter(error)) {
      this.logger.debug(`Error filtered out for circuit breaker '${breaker.name}': ${error.message}`);
      return;
    }

    breaker.totalRequests++;
    breaker.totalFailures++;
    breaker.lastFailureTime = new Date();
    breaker.updatedAt = new Date();

    // Add to request history
    this.addToRequestHistory(breaker, {
      timestamp: new Date(),
      success: false,
      duration,
      error: error.message,
    });

    if (breaker.state === 'closed') {
      breaker.failureCount++;
      
      // Check if we should open the circuit
      if (this.shouldOpenCircuit(breaker)) {
        this.openCircuit(breaker);
      }
    } else if (breaker.state === 'half-open') {
      // Go back to open on any failure in half-open state
      this.openCircuit(breaker);
    }
  }

  private shouldOpenCircuit(breaker: CircuitBreakerState_Data): boolean {
    const config = breaker.config;

    // Check minimum volume threshold
    if (config.volumeThreshold && breaker.totalRequests < config.volumeThreshold) {
      return false;
    }

    // Check failure threshold
    if (breaker.failureCount >= config.failureThreshold) {
      return true;
    }

    // Check error percentage threshold
    if (config.errorPercentageThreshold && config.monitoringWindow) {
      const windowStart = Date.now() - config.monitoringWindow;
      const recentRequests = breaker.requestHistory.filter(
        req => req.timestamp.getTime() >= windowStart
      );

      if (recentRequests.length >= (config.volumeThreshold || 1)) {
        const failures = recentRequests.filter(req => !req.success).length;
        const errorPercentage = (failures / recentRequests.length) * 100;
        
        if (errorPercentage >= config.errorPercentageThreshold) {
          return true;
        }
      }
    }

    return false;
  }

  private openCircuit(breaker: CircuitBreakerState_Data): void {
    const previousState = breaker.state;
    breaker.state = 'open';
    breaker.nextAttemptTime = new Date(Date.now() + breaker.config.timeout);
    breaker.successCount = 0;
    breaker.updatedAt = new Date();

    this.logger.warn(`Circuit breaker '${breaker.name}' opened`, {
      failureCount: breaker.failureCount,
      failureThreshold: breaker.config.failureThreshold,
      nextAttemptTime: breaker.nextAttemptTime,
    });

    this.emit('circuit-breaker:opened', {
      name: breaker.name,
      failureCount: breaker.failureCount,
      nextAttemptTime: breaker.nextAttemptTime,
    });

    this.emit('circuit-breaker:state-change', {
      name: breaker.name,
      previousState,
      newState: 'open',
    });
  }

  private shouldUseFallback(error: any, breaker: CircuitBreakerState_Data): boolean {
    // Use fallback for circuit breaker errors or severe errors
    if (breaker.state === 'open') {
      return true;
    }

    // Use fallback for specific error types
    if (error instanceof ApiError) {
      const status = error.status;
      // Use fallback for server errors and timeouts
      return status >= 500 || status === 408 || status === 429;
    }

    // Use fallback for network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }

    return false;
  }

  private addToRequestHistory(breaker: CircuitBreakerState_Data, record: RequestRecord): void {
    breaker.requestHistory.push(record);
    
    // Keep only recent history (last hour)
    const cutoff = Date.now() - 60 * 60 * 1000;
    breaker.requestHistory = breaker.requestHistory.filter(
      req => req.timestamp.getTime() >= cutoff
    );

    // Limit history size to prevent memory issues
    if (breaker.requestHistory.length > 1000) {
      breaker.requestHistory = breaker.requestHistory.slice(-500);
    }
  }

  private calculateTripCount(breaker: CircuitBreakerState_Data): number {
    // Count state changes to 'open'
    return breaker.requestHistory.filter((req, index) => {
      if (index === 0) return false;
      
      const prevReq = breaker.requestHistory[index - 1];
      return !prevReq.success && req.success === false;
    }).length;
  }

  private getLastTripTime(breaker: CircuitBreakerState_Data): Date | undefined {
    // Find the most recent failure that would have caused a trip
    const recentFailures = breaker.requestHistory
      .filter(req => !req.success)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (recentFailures.length > 0 && breaker.state === 'open') {
      return recentFailures[0].timestamp;
    }

    return undefined;
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredBreakers: string[] = [];

    for (const [name, breaker] of this.breakers.entries()) {
      // Clean up old request history
      const cutoff = now - 60 * 60 * 1000; // 1 hour
      breaker.requestHistory = breaker.requestHistory.filter(
        req => req.timestamp.getTime() >= cutoff
      );

      // Remove breakers that haven't been used in 24 hours
      const lastUsed = breaker.updatedAt.getTime();
      if (now - lastUsed > 24 * 60 * 60 * 1000) {
        expiredBreakers.push(name);
      }
    }

    expiredBreakers.forEach(name => {
      this.breakers.delete(name);
      this.fallbacks.delete(name);
    });

    if (expiredBreakers.length > 0) {
      this.logger.debug(`Cleaned up ${expiredBreakers.length} expired circuit breakers`);
    }
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  /**
   * Create a standard error filter
   */
  static createErrorFilter(options: {
    ignoreClientErrors?: boolean;
    ignoreAuthErrors?: boolean;
    ignoreNotFoundErrors?: boolean;
    customFilter?: (error: any) => boolean;
  }): (error: any) => boolean {
    return (error: any) => {
      // Apply custom filter first
      if (options.customFilter && !options.customFilter(error)) {
        return false;
      }

      // Ignore client errors (4xx) if requested
      if (options.ignoreClientErrors && error.status >= 400 && error.status < 500) {
        return false;
      }

      // Ignore auth errors specifically
      if (options.ignoreAuthErrors && (error.status === 401 || error.status === 403)) {
        return false;
      }

      // Ignore not found errors
      if (options.ignoreNotFoundErrors && error.status === 404) {
        return false;
      }

      return true;
    };
  }

  /**
   * Create default circuit breaker config
   */
  static createDefaultConfig(overrides?: Partial<CircuitBreakerConfig>): CircuitBreakerConfig {
    return {
      name: 'default',
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000, // 1 minute
      resetTimeout: 300000, // 5 minutes
      volumeThreshold: 10,
      errorPercentageThreshold: 50,
      monitoringWindow: 60000, // 1 minute
      maxRetries: 3,
      errorFilter: CircuitBreakerService.createErrorFilter({
        ignoreClientErrors: true,
        ignoreNotFoundErrors: true,
      }),
      ...overrides,
    };
  }

  // ===================================================================
  // CLEANUP
  // ===================================================================

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
