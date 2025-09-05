/**
 * Rate Limiter Service
 * 
 * Advanced rate limiting system with multiple algorithms, distributed support via Redis,
 * and intelligent throttling to protect external APIs while maximizing throughput.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

// ===================================================================
// RATE LIMITING TYPES AND INTERFACES
// ===================================================================

export type RateLimitAlgorithm = 'token-bucket' | 'sliding-window' | 'fixed-window' | 'leaky-bucket';

export interface RateLimitConfig {
  algorithm: RateLimitAlgorithm;
  requests: number;               // Number of requests allowed
  window: number;                 // Time window in milliseconds
  burst?: number;                 // Burst capacity (for token bucket)
  refillRate?: number;            // Tokens per millisecond (for token bucket)
  queueSize?: number;             // Max queued requests
  priority?: boolean;             // Enable priority queuing
  distributed?: boolean;          // Use Redis for distributed limiting
  keyGenerator?: (context: any) => string; // Custom key generation
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;            // Milliseconds to wait before retry
  queuePosition?: number;         // Position in queue if queued
  waitTime?: number;              // Estimated wait time in ms
}

export interface RateLimitState {
  key: string;
  algorithm: RateLimitAlgorithm;
  limit: number;
  remaining: number;
  window: number;
  resetTime: Date;
  lastRefill?: Date;
  tokens?: number;                // Current tokens (token bucket)
  requests?: number[];            // Request timestamps (sliding window)
  queueSize?: number;
  priorityQueue?: QueuedRequest[];
  standardQueue?: QueuedRequest[];
}

export interface QueuedRequest {
  id: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: any;
  resolve: (result: RateLimitResult) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

export interface RateLimitMetrics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  queuedRequests: number;
  averageWaitTime: number;
  peakQueueSize: number;
  currentQueueSize: number;
  algorithm: RateLimitAlgorithm;
  efficiency: number;             // Allowed / Total requests
  lastReset: Date;
}

// ===================================================================
// RATE LIMITER SERVICE
// ===================================================================

@Injectable()
export class RateLimiterService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly redis: Redis;
  private readonly limiters = new Map<string, RateLimitState>();
  private readonly metrics = new Map<string, RateLimitMetrics>();
  private readonly cleanupInterval: NodeJS.Timeout;
  private readonly queueProcessInterval: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
  ) {
    super();
    
    // Initialize Redis connection for distributed rate limiting
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    // Start cleanup processes
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000); // Every minute
    this.queueProcessInterval = setInterval(() => this.processQueues(), 100); // Every 100ms
  }

  async onModuleInit() {
    try {
      await this.redis.connect();
      this.logger.log('Rate limiter service initialized with Redis support');
    } catch (error) {
      this.logger.warn(`Redis connection failed, using in-memory rate limiting: ${error.message}`);
    }
  }

  // ===================================================================
  // CORE RATE LIMITING METHODS
  // ===================================================================

  /**
   * Check if request is allowed under rate limit
   */
  async checkRateLimit(
    key: string,
    config: RateLimitConfig,
    context?: any,
  ): Promise<RateLimitResult> {
    const effectiveKey = config.keyGenerator ? config.keyGenerator(context) : key;
    
    this.logger.debug(`Checking rate limit for key: ${effectiveKey}`, {
      algorithm: config.algorithm,
      limit: config.requests,
      window: config.window,
    });

    try {
      // Use distributed rate limiting if enabled and Redis is available
      if (config.distributed && this.redis.status === 'ready') {
        return await this.checkDistributedRateLimit(effectiveKey, config, context);
      } else {
        return await this.checkLocalRateLimit(effectiveKey, config, context);
      }
    } catch (error) {
      this.logger.error(`Rate limit check failed for ${effectiveKey}: ${error.message}`, error.stack);
      
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        limit: config.requests,
        remaining: config.requests,
        resetTime: new Date(Date.now() + config.window),
      };
    }
  }

  /**
   * Acquire rate limit with automatic queuing if blocked
   */
  async acquireRateLimit(
    key: string,
    config: RateLimitConfig,
    priority: QueuedRequest['priority'] = 'medium',
    timeout: number = 30000,
    context?: any,
  ): Promise<RateLimitResult> {
    const result = await this.checkRateLimit(key, config, context);
    
    if (result.allowed) {
      return result;
    }

    // If not allowed and queuing is not enabled, return immediately
    if (!config.queueSize || config.queueSize <= 0) {
      return result;
    }

    // Queue the request
    return new Promise<RateLimitResult>((resolve, reject) => {
      const requestId = this.generateRequestId();
      const queuedRequest: QueuedRequest = {
        id: requestId,
        timestamp: new Date(),
        priority,
        context: { ...context, key, config },
        resolve,
        reject,
      };

      // Set timeout for queued request
      if (timeout > 0) {
        queuedRequest.timeout = setTimeout(() => {
          this.removeFromQueue(key, requestId);
          reject(new Error(`Rate limit acquire timed out after ${timeout}ms`));
        }, timeout);
      }

      this.addToQueue(key, config, queuedRequest);
    });
  }

  /**
   * Release rate limit (for leaky bucket algorithm)
   */
  async releaseRateLimit(key: string, config: RateLimitConfig): Promise<void> {
    if (config.algorithm !== 'leaky-bucket') {
      return;
    }

    const state = this.limiters.get(key);
    if (state && state.remaining < state.limit) {
      state.remaining = Math.min(state.remaining + 1, state.limit);
      await this.updateState(key, state, config);
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(key: string): Promise<void> {
    this.logger.log(`Resetting rate limit for key: ${key}`);
    
    this.limiters.delete(key);
    
    if (this.redis.status === 'ready') {
      await this.redis.del(`ratelimit:${key}`);
    }

    this.emit('rate-limit:reset', { key, timestamp: new Date() });
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(key: string): Promise<RateLimitState | null> {
    return this.limiters.get(key) || null;
  }

  /**
   * Get rate limiting metrics
   */
  getRateLimitMetrics(key?: string): RateLimitMetrics | Map<string, RateLimitMetrics> {
    if (key) {
      return this.metrics.get(key) || this.createEmptyMetrics();
    }
    return new Map(this.metrics);
  }

  // ===================================================================
  // LOCAL RATE LIMITING IMPLEMENTATIONS
  // ===================================================================

  private async checkLocalRateLimit(
    key: string,
    config: RateLimitConfig,
    context?: any,
  ): Promise<RateLimitResult> {
    switch (config.algorithm) {
      case 'token-bucket':
        return await this.checkTokenBucket(key, config, context);
      case 'sliding-window':
        return await this.checkSlidingWindow(key, config, context);
      case 'fixed-window':
        return await this.checkFixedWindow(key, config, context);
      case 'leaky-bucket':
        return await this.checkLeakyBucket(key, config, context);
      default:
        throw new Error(`Unknown rate limiting algorithm: ${config.algorithm}`);
    }
  }

  private async checkTokenBucket(
    key: string,
    config: RateLimitConfig,
    context?: any,
  ): Promise<RateLimitResult> {
    let state = this.limiters.get(key);
    const now = new Date();

    if (!state) {
      state = {
        key,
        algorithm: 'token-bucket',
        limit: config.burst || config.requests,
        remaining: config.burst || config.requests,
        window: config.window,
        resetTime: new Date(now.getTime() + config.window),
        lastRefill: now,
        tokens: config.burst || config.requests,
      };
      this.limiters.set(key, state);
    }

    // Refill tokens based on time elapsed
    const refillRate = config.refillRate || (config.requests / config.window);
    const timeSinceRefill = now.getTime() - (state.lastRefill?.getTime() || 0);
    const tokensToAdd = Math.floor(timeSinceRefill * refillRate);
    
    if (tokensToAdd > 0) {
      state.tokens = Math.min((state.tokens || 0) + tokensToAdd, state.limit);
      state.lastRefill = now;
    }

    const allowed = (state.tokens || 0) >= 1;
    
    if (allowed) {
      state.tokens = (state.tokens || 0) - 1;
      state.remaining = state.tokens;
    }

    const result: RateLimitResult = {
      allowed,
      limit: state.limit,
      remaining: state.remaining,
      resetTime: state.resetTime,
      retryAfter: allowed ? undefined : Math.ceil(1 / refillRate),
    };

    await this.updateMetrics(key, config.algorithm, result);
    return result;
  }

  private async checkSlidingWindow(
    key: string,
    config: RateLimitConfig,
    context?: any,
  ): Promise<RateLimitResult> {
    let state = this.limiters.get(key);
    const now = new Date();

    if (!state) {
      state = {
        key,
        algorithm: 'sliding-window',
        limit: config.requests,
        remaining: config.requests,
        window: config.window,
        resetTime: new Date(now.getTime() + config.window),
        requests: [],
      };
      this.limiters.set(key, state);
    }

    // Remove old requests outside the window
    const cutoff = now.getTime() - config.window;
    state.requests = (state.requests || []).filter(timestamp => timestamp > cutoff);

    const allowed = (state.requests || []).length < config.requests;
    
    if (allowed) {
      state.requests = state.requests || [];
      state.requests.push(now.getTime());
    }

    state.remaining = Math.max(0, config.requests - (state.requests || []).length);

    // Calculate reset time (when oldest request will expire)
    const oldestRequest = Math.min(...(state.requests || []));
    state.resetTime = new Date(oldestRequest + config.window);

    const result: RateLimitResult = {
      allowed,
      limit: state.limit,
      remaining: state.remaining,
      resetTime: state.resetTime,
      retryAfter: allowed ? undefined : (oldestRequest + config.window - now.getTime()),
    };

    await this.updateMetrics(key, config.algorithm, result);
    return result;
  }

  private async checkFixedWindow(
    key: string,
    config: RateLimitConfig,
    context?: any,
  ): Promise<RateLimitResult> {
    let state = this.limiters.get(key);
    const now = new Date();
    const windowStart = Math.floor(now.getTime() / config.window) * config.window;
    const windowEnd = windowStart + config.window;

    if (!state || state.resetTime.getTime() <= now.getTime()) {
      state = {
        key,
        algorithm: 'fixed-window',
        limit: config.requests,
        remaining: config.requests,
        window: config.window,
        resetTime: new Date(windowEnd),
        tokens: 0,
      };
      this.limiters.set(key, state);
    }

    const allowed = (state.tokens || 0) < config.requests;
    
    if (allowed) {
      state.tokens = (state.tokens || 0) + 1;
      state.remaining = config.requests - state.tokens;
    }

    const result: RateLimitResult = {
      allowed,
      limit: state.limit,
      remaining: state.remaining,
      resetTime: state.resetTime,
      retryAfter: allowed ? undefined : (windowEnd - now.getTime()),
    };

    await this.updateMetrics(key, config.algorithm, result);
    return result;
  }

  private async checkLeakyBucket(
    key: string,
    config: RateLimitConfig,
    context?: any,
  ): Promise<RateLimitResult> {
    let state = this.limiters.get(key);
    const now = new Date();

    if (!state) {
      state = {
        key,
        algorithm: 'leaky-bucket',
        limit: config.requests,
        remaining: config.requests,
        window: config.window,
        resetTime: new Date(now.getTime() + config.window),
        tokens: config.requests,
      };
      this.limiters.set(key, state);
    }

    // Leak tokens at a constant rate
    const leakRate = config.requests / config.window;
    const timeSinceLastLeak = now.getTime() - (state.lastRefill?.getTime() || 0);
    const tokensToLeak = Math.floor(timeSinceLastLeak * leakRate);
    
    if (tokensToLeak > 0) {
      state.tokens = Math.min((state.tokens || 0) + tokensToLeak, state.limit);
      state.lastRefill = now;
    }

    const allowed = (state.tokens || 0) >= 1;
    
    if (allowed) {
      state.tokens = (state.tokens || 0) - 1;
      state.remaining = state.tokens;
    }

    const result: RateLimitResult = {
      allowed,
      limit: state.limit,
      remaining: state.remaining,
      resetTime: state.resetTime,
      retryAfter: allowed ? undefined : Math.ceil(1 / leakRate),
    };

    await this.updateMetrics(key, config.algorithm, result);
    return result;
  }

  // ===================================================================
  // DISTRIBUTED RATE LIMITING (REDIS)
  // ===================================================================

  private async checkDistributedRateLimit(
    key: string,
    config: RateLimitConfig,
    context?: any,
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;
    
    try {
      switch (config.algorithm) {
        case 'token-bucket':
          return await this.checkDistributedTokenBucket(redisKey, config);
        case 'sliding-window':
          return await this.checkDistributedSlidingWindow(redisKey, config);
        case 'fixed-window':
          return await this.checkDistributedFixedWindow(redisKey, config);
        case 'leaky-bucket':
          return await this.checkDistributedLeakyBucket(redisKey, config);
        default:
          throw new Error(`Distributed rate limiting not implemented for algorithm: ${config.algorithm}`);
      }
    } catch (error) {
      this.logger.error(`Distributed rate limiting failed: ${error.message}`);
      // Fallback to local rate limiting
      return await this.checkLocalRateLimit(key, config, context);
    }
  }

  private async checkDistributedTokenBucket(
    redisKey: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const script = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refill_rate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      
      local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(bucket[1]) or capacity
      local last_refill = tonumber(bucket[2]) or now
      
      -- Refill tokens
      local elapsed = (now - last_refill) / 1000
      tokens = math.min(capacity, tokens + (elapsed * refill_rate))
      
      local allowed = tokens >= 1
      if allowed then
        tokens = tokens - 1
      end
      
      -- Update bucket
      redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
      redis.call('EXPIRE', key, math.ceil(capacity / refill_rate))
      
      return {allowed and 1 or 0, tokens, capacity}
    `;

    const capacity = config.burst || config.requests;
    const refillRate = config.refillRate || (config.requests / (config.window / 1000));
    
    const result = await this.redis.eval(script, 1, redisKey, capacity, refillRate, now) as [number, number, number];
    
    return {
      allowed: result[0] === 1,
      limit: capacity,
      remaining: Math.floor(result[1]),
      resetTime: new Date(now + (capacity / refillRate) * 1000),
      retryAfter: result[0] === 1 ? undefined : Math.ceil(1000 / refillRate),
    };
  }

  private async checkDistributedSlidingWindow(
    redisKey: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.window;
    
    const script = `
      local key = KEYS[1]
      local window_start = tonumber(ARGV[1])
      local limit = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      
      -- Remove expired entries
      redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
      
      local count = redis.call('ZCARD', key)
      local allowed = count < limit
      
      if allowed then
        redis.call('ZADD', key, now, now)
        count = count + 1
      end
      
      redis.call('EXPIRE', key, math.ceil(ARGV[4] / 1000))
      
      -- Get oldest timestamp for reset calculation
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local reset_time = oldest[2] and (oldest[2] + ARGV[4]) or (now + ARGV[4])
      
      return {allowed and 1 or 0, limit - count, reset_time}
    `;

    const result = await this.redis.eval(script, 1, redisKey, windowStart, config.requests, now, config.window) as [number, number, number];
    
    return {
      allowed: result[0] === 1,
      limit: config.requests,
      remaining: Math.max(0, result[1]),
      resetTime: new Date(result[2]),
      retryAfter: result[0] === 1 ? undefined : (result[2] - now),
    };
  }

  private async checkDistributedFixedWindow(
    redisKey: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / config.window) * config.window;
    const windowEnd = windowStart + config.window;
    const windowKey = `${redisKey}:${windowStart}`;

    const count = await this.redis.incr(windowKey);
    
    if (count === 1) {
      await this.redis.expire(windowKey, Math.ceil(config.window / 1000));
    }

    return {
      allowed: count <= config.requests,
      limit: config.requests,
      remaining: Math.max(0, config.requests - count),
      resetTime: new Date(windowEnd),
      retryAfter: count <= config.requests ? undefined : (windowEnd - now),
    };
  }

  private async checkDistributedLeakyBucket(
    redisKey: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const script = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local leak_rate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      
      local bucket = redis.call('HMGET', key, 'level', 'last_leak')
      local level = tonumber(bucket[1]) or 0
      local last_leak = tonumber(bucket[2]) or now
      
      -- Leak water
      local elapsed = (now - last_leak) / 1000
      level = math.max(0, level - (elapsed * leak_rate))
      
      local allowed = level < capacity
      if allowed then
        level = level + 1
      end
      
      -- Update bucket
      redis.call('HMSET', key, 'level', level, 'last_leak', now)
      redis.call('EXPIRE', key, math.ceil(capacity / leak_rate))
      
      return {allowed and 1 or 0, capacity - level, capacity}
    `;

    const leakRate = config.requests / (config.window / 1000);
    
    const result = await this.redis.eval(script, 1, redisKey, config.requests, leakRate, now) as [number, number, number];
    
    return {
      allowed: result[0] === 1,
      limit: config.requests,
      remaining: Math.floor(result[1]),
      resetTime: new Date(now + (config.requests / leakRate) * 1000),
      retryAfter: result[0] === 1 ? undefined : Math.ceil(1000 / leakRate),
    };
  }

  // ===================================================================
  // QUEUE MANAGEMENT
  // ===================================================================

  private addToQueue(key: string, config: RateLimitConfig, request: QueuedRequest): void {
    let state = this.limiters.get(key);
    if (!state) {
      state = {
        key,
        algorithm: config.algorithm,
        limit: config.requests,
        remaining: 0,
        window: config.window,
        resetTime: new Date(Date.now() + config.window),
        priorityQueue: [],
        standardQueue: [],
      };
      this.limiters.set(key, state);
    }

    // Add to appropriate queue
    if (request.priority === 'high' || request.priority === 'urgent') {
      state.priorityQueue = state.priorityQueue || [];
      state.priorityQueue.push(request);
      state.priorityQueue.sort((a, b) => this.comparePriority(b.priority, a.priority));
    } else {
      state.standardQueue = state.standardQueue || [];
      state.standardQueue.push(request);
    }

    const totalQueued = (state.priorityQueue?.length || 0) + (state.standardQueue?.length || 0);
    
    this.emit('request:queued', {
      key,
      requestId: request.id,
      priority: request.priority,
      queuePosition: totalQueued,
      waitTime: this.estimateWaitTime(key, config),
    });

    // Update metrics
    const metrics = this.metrics.get(key) || this.createEmptyMetrics();
    metrics.queuedRequests++;
    metrics.currentQueueSize = totalQueued;
    metrics.peakQueueSize = Math.max(metrics.peakQueueSize, totalQueued);
    this.metrics.set(key, metrics);
  }

  private removeFromQueue(key: string, requestId: string): void {
    const state = this.limiters.get(key);
    if (!state) return;

    // Remove from priority queue
    if (state.priorityQueue) {
      const index = state.priorityQueue.findIndex(req => req.id === requestId);
      if (index !== -1) {
        const request = state.priorityQueue.splice(index, 1)[0];
        if (request.timeout) {
          clearTimeout(request.timeout);
        }
        return;
      }
    }

    // Remove from standard queue
    if (state.standardQueue) {
      const index = state.standardQueue.findIndex(req => req.id === requestId);
      if (index !== -1) {
        const request = state.standardQueue.splice(index, 1)[0];
        if (request.timeout) {
          clearTimeout(request.timeout);
        }
      }
    }
  }

  private async processQueues(): Promise<void> {
    for (const [key, state] of this.limiters.entries()) {
      if ((!state.priorityQueue || state.priorityQueue.length === 0) && 
          (!state.standardQueue || state.standardQueue.length === 0)) {
        continue;
      }

      try {
        await this.processQueueForKey(key, state);
      } catch (error) {
        this.logger.error(`Queue processing failed for ${key}: ${error.message}`, error.stack);
      }
    }
  }

  private async processQueueForKey(key: string, state: RateLimitState): Promise<void> {
    // Process priority queue first
    while (state.priorityQueue && state.priorityQueue.length > 0) {
      const request = state.priorityQueue[0];
      const config: RateLimitConfig = request.context.config;
      
      const result = await this.checkRateLimit(key, config, request.context);
      
      if (result.allowed) {
        state.priorityQueue.shift();
        if (request.timeout) {
          clearTimeout(request.timeout);
        }
        
        const queueResult: RateLimitResult = {
          ...result,
          queuePosition: 0,
          waitTime: Date.now() - request.timestamp.getTime(),
        };
        
        request.resolve(queueResult);
        
        this.emit('request:dequeued', {
          key,
          requestId: request.id,
          waitTime: queueResult.waitTime,
          priority: request.priority,
        });
      } else {
        break; // Can't process more requests right now
      }
    }

    // Process standard queue
    while (state.standardQueue && state.standardQueue.length > 0 && 
           (!state.priorityQueue || state.priorityQueue.length === 0)) {
      const request = state.standardQueue[0];
      const config: RateLimitConfig = request.context.config;
      
      const result = await this.checkRateLimit(key, config, request.context);
      
      if (result.allowed) {
        state.standardQueue.shift();
        if (request.timeout) {
          clearTimeout(request.timeout);
        }
        
        const queueResult: RateLimitResult = {
          ...result,
          queuePosition: 0,
          waitTime: Date.now() - request.timestamp.getTime(),
        };
        
        request.resolve(queueResult);
        
        this.emit('request:dequeued', {
          key,
          requestId: request.id,
          waitTime: queueResult.waitTime,
          priority: request.priority,
        });
      } else {
        break; // Can't process more requests right now
      }
    }
  }

  private comparePriority(a: QueuedRequest['priority'], b: QueuedRequest['priority']): number {
    const priorities = { urgent: 4, high: 3, medium: 2, low: 1 };
    return priorities[a] - priorities[b];
  }

  private estimateWaitTime(key: string, config: RateLimitConfig): number {
    const state = this.limiters.get(key);
    if (!state) return 0;

    const totalQueued = (state.priorityQueue?.length || 0) + (state.standardQueue?.length || 0);
    const throughputPerMs = config.requests / config.window;
    
    return Math.ceil(totalQueued / throughputPerMs);
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private async updateState(key: string, state: RateLimitState, config: RateLimitConfig): Promise<void> {
    state.resetTime = new Date(Date.now() + config.window);
    this.limiters.set(key, state);
  }

  private async updateMetrics(
    key: string,
    algorithm: RateLimitAlgorithm,
    result: RateLimitResult,
  ): Promise<void> {
    let metrics = this.metrics.get(key);
    if (!metrics) {
      metrics = this.createEmptyMetrics();
      metrics.algorithm = algorithm;
    }

    metrics.totalRequests++;
    
    if (result.allowed) {
      metrics.allowedRequests++;
    } else {
      metrics.blockedRequests++;
    }

    metrics.efficiency = metrics.allowedRequests / metrics.totalRequests;
    metrics.lastReset = new Date();

    this.metrics.set(key, metrics);
  }

  private createEmptyMetrics(): RateLimitMetrics {
    return {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      queuedRequests: 0,
      averageWaitTime: 0,
      peakQueueSize: 0,
      currentQueueSize: 0,
      algorithm: 'token-bucket',
      efficiency: 1,
      lastReset: new Date(),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, state] of this.limiters.entries()) {
      // Clean up expired states (older than 1 hour)
      if (state.resetTime.getTime() < now - 60 * 60 * 1000) {
        expiredKeys.push(key);
      }
      
      // Clean up empty queues
      if (state.priorityQueue && state.priorityQueue.length === 0) {
        delete state.priorityQueue;
      }
      if (state.standardQueue && state.standardQueue.length === 0) {
        delete state.standardQueue;
      }
    }

    expiredKeys.forEach(key => {
      this.limiters.delete(key);
      this.metrics.delete(key);
    });

    if (expiredKeys.length > 0) {
      this.logger.debug(`Cleaned up ${expiredKeys.length} expired rate limiters`);
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===================================================================
  // CLEANUP
  // ===================================================================

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.queueProcessInterval) {
      clearInterval(this.queueProcessInterval);
    }

    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}
