/**
 * Intelligent Cache Service
 * 
 * Multi-level intelligent caching system with TTL management, cache invalidation,
 * adaptive caching strategies, and performance optimization for API responses.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';

// ===================================================================
// CACHING TYPES AND INTERFACES
// ===================================================================

export type CacheLevel = 'memory' | 'redis' | 'database';
export type CacheStrategy = 'lru' | 'lfu' | 'ttl' | 'adaptive' | 'write_through' | 'write_back' | 'write_around';
export type InvalidationStrategy = 'time_based' | 'tag_based' | 'manual' | 'pattern_based' | 'event_driven';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;                    // Time to live in milliseconds
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  expiresAt: Date;
  tags: string[];                 // Cache tags for invalidation
  metadata: {
    size: number;                 // Entry size in bytes
    compressed?: boolean;
    source: string;               // Source of cached data
    version: string;              // Cache version for compatibility
    priority: number;             // Cache priority (1-10)
    cost: number;                 // Cost to recreate this entry
  };
}

export interface CacheConfig {
  enabled: boolean;
  levels: {
    memory: {
      enabled: boolean;
      maxEntries: number;
      maxSizeBytes: number;
      strategy: CacheStrategy;
      ttl: number;                // Default TTL in milliseconds
    };
    redis: {
      enabled: boolean;
      maxEntries: number;
      maxSizeBytes: number;
      ttl: number;
      keyPrefix: string;
      compression: boolean;
    };
    database: {
      enabled: boolean;
      ttl: number;
      cleanupInterval: number;
    };
  };
  invalidation: {
    strategy: InvalidationStrategy;
    batchSize: number;
    scheduleCleanup: boolean;
    cleanupInterval: number;      // Cleanup interval in milliseconds
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    performanceTracking: boolean;
  };
}

export interface CacheStats {
  level: CacheLevel;
  totalEntries: number;
  totalSizeBytes: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;              // Hit rate percentage
  evictions: number;
  invalidations: number;
  averageAccessTime: number;    // Average access time in milliseconds
  memoryUsage: {
    used: number;
    available: number;
    percentage: number;
  };
  topKeys: Array<{
    key: string;
    hits: number;
    lastAccessed: Date;
    size: number;
  }>;
  performance: {
    averageRetrievalTime: number;
    averageStorageTime: number;
    compressionRatio: number;
  };
}

export interface CacheMetrics {
  timestamp: Date;
  totalOperations: number;
  operations: {
    get: { count: number; averageTime: number; };
    set: { count: number; averageTime: number; };
    delete: { count: number; averageTime: number; };
    invalidate: { count: number; averageTime: number; };
  };
  levels: Record<CacheLevel, CacheStats>;
  efficiency: {
    overallHitRate: number;
    memoryEfficiency: number;
    storageEfficiency: number;
    networkReduction: number;    // Percentage of network requests avoided
  };
  recommendations: CacheRecommendation[];
}

export interface CacheRecommendation {
  id: string;
  type: 'performance' | 'capacity' | 'strategy' | 'configuration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  action: string;
  estimatedBenefit: {
    performanceImprovement?: number;  // Percentage
    memoryReduction?: number;         // Bytes
    hitRateIncrease?: number;        // Percentage
  };
}

export interface CachePattern {
  pattern: string;
  type: 'prefix' | 'suffix' | 'contains' | 'regex';
  ttl?: number;
  priority?: number;
  tags?: string[];
  compression?: boolean;
  strategy?: CacheStrategy;
}

export interface CacheBatch {
  id: string;
  entries: Array<{
    key: string;
    value: any;
    ttl?: number;
    tags?: string[];
  }>;
  timestamp: Date;
  completed: boolean;
  errors: Array<{
    key: string;
    error: string;
  }>;
}

// ===================================================================
// INTELLIGENT CACHE SERVICE
// ===================================================================

@Injectable()
export class IntelligentCacheService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(IntelligentCacheService.name);
  
  // Multi-level cache storage
  private readonly memoryCache = new Map<string, CacheEntry>();
  private readonly redisCache = new Map<string, CacheEntry>(); // Simulated Redis for demo
  private readonly cacheConfig: CacheConfig;
  
  // Cache statistics and monitoring
  private readonly cacheStats = new Map<CacheLevel, CacheStats>();
  private readonly cacheMetricsHistory: CacheMetrics[] = [];
  private readonly accessPatterns = new Map<string, { count: number; lastAccess: Date }>();
  
  // Cache patterns and rules
  private readonly cachePatterns: CachePattern[] = [];
  private readonly cacheTags = new Map<string, Set<string>>(); // tag -> keys mapping
  
  // Cleanup and maintenance
  private cleanupTimer: NodeJS.Timeout;
  private metricsTimer: NodeJS.Timeout;
  private adaptiveTimer: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    super();
    this.cacheConfig = this.loadCacheConfig();
    this.initializeCacheStats();
  }

  async onModuleInit() {
    await this.startCacheMaintenanceProcesses();
    this.logger.log('Intelligent Cache Service initialized');
  }

  // ===================================================================
  // CORE CACHING OPERATIONS
  // ===================================================================

  /**
   * Get value from cache with intelligent level selection
   */
  async get<T = any>(key: string, options?: {
    levels?: CacheLevel[];
    updateAccessTime?: boolean;
    promoteToHigherLevel?: boolean;
  }): Promise<T | null> {
    const startTime = Date.now();
    const opts = {
      levels: ['memory', 'redis', 'database'] as CacheLevel[],
      updateAccessTime: true,
      promoteToHigherLevel: true,
      ...options,
    };

    try {
      // Try each cache level in order
      for (const level of opts.levels) {
        if (!this.isCacheLevelEnabled(level)) continue;

        const entry = await this.getFromLevel(key, level);
        if (entry) {
          // Update access statistics
          if (opts.updateAccessTime) {
            entry.lastAccessed = new Date();
            entry.accessCount++;
          }

          // Promote to higher level if beneficial
          if (opts.promoteToHigherLevel && level !== 'memory') {
            await this.promoteEntryToHigherLevel(key, entry);
          }

          // Update metrics
          this.updateCacheStats(level, 'hit', Date.now() - startTime);
          this.recordAccess(key);

          this.emit('cache:hit', { key, level, entry: this.sanitizeEntry(entry) });

          this.logger.debug(`Cache hit for key ${key} in ${level}`, {
            ttl: entry.ttl,
            accessCount: entry.accessCount,
            level,
          });

          return entry.value as T;
        }
      }

      // Cache miss
      this.updateCacheStats('memory', 'miss', Date.now() - startTime);
      this.emit('cache:miss', { key, levels: opts.levels });

      this.logger.debug(`Cache miss for key ${key}`);
      
      return null;

    } catch (error) {
      this.logger.error(`Cache get error for key ${key}: ${error.message}`, error.stack);
      this.emit('cache:error', { operation: 'get', key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache with intelligent placement
   */
  async set<T = any>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      levels?: CacheLevel[];
      tags?: string[];
      priority?: number;
      compression?: boolean;
      metadata?: Record<string, any>;
    },
  ): Promise<boolean> {
    const startTime = Date.now();
    const opts = {
      ttl: this.getDefaultTTL(key),
      levels: this.selectOptimalCacheLevels(key, value),
      tags: [],
      priority: 5,
      compression: this.shouldCompress(value),
      metadata: {},
      ...options,
    };

    try {
      const entry: CacheEntry<T> = {
        key,
        value: opts.compression ? this.compress(value) : value,
        ttl: opts.ttl,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        expiresAt: new Date(Date.now() + opts.ttl),
        tags: opts.tags,
        metadata: {
          size: this.calculateSize(value),
          compressed: opts.compression,
          source: 'api_response',
          version: '1.0.0',
          priority: opts.priority,
          cost: this.calculateReplacementCost(key),
          ...opts.metadata,
        },
      };

      // Store in selected cache levels
      const results = await Promise.all(
        opts.levels.map(level => this.setInLevel(key, entry, level))
      );

      const success = results.some(result => result);

      if (success) {
        // Update tag mappings
        this.updateTagMappings(key, opts.tags);

        // Update metrics
        this.updateCacheStats('memory', 'set', Date.now() - startTime);
        
        this.emit('cache:set', { 
          key, 
          levels: opts.levels, 
          entry: this.sanitizeEntry(entry) 
        });

        this.logger.debug(`Cache set for key ${key}`, {
          levels: opts.levels,
          ttl: opts.ttl,
          size: entry.metadata.size,
          compressed: opts.compression,
        });
      }

      return success;

    } catch (error) {
      this.logger.error(`Cache set error for key ${key}: ${error.message}`, error.stack);
      this.emit('cache:error', { operation: 'set', key, error: error.message });
      return false;
    }
  }

  /**
   * Delete specific key from cache
   */
  async delete(key: string, options?: {
    levels?: CacheLevel[];
  }): Promise<boolean> {
    const startTime = Date.now();
    const opts = {
      levels: ['memory', 'redis', 'database'] as CacheLevel[],
      ...options,
    };

    try {
      const results = await Promise.all(
        opts.levels.map(level => this.deleteFromLevel(key, level))
      );

      const deleted = results.some(result => result);

      if (deleted) {
        // Remove from tag mappings
        this.removeFromTagMappings(key);
        
        // Update metrics
        this.updateCacheStats('memory', 'delete', Date.now() - startTime);
        
        this.emit('cache:delete', { key, levels: opts.levels });

        this.logger.debug(`Cache delete for key ${key}`, { levels: opts.levels });
      }

      return deleted;

    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}: ${error.message}`, error.stack);
      this.emit('cache:error', { operation: 'delete', key, error: error.message });
      return false;
    }
  }

  /**
   * Batch set multiple entries
   */
  async setBatch(entries: Array<{
    key: string;
    value: any;
    ttl?: number;
    tags?: string[];
    priority?: number;
  }>): Promise<CacheBatch> {
    const batch: CacheBatch = {
      id: this.generateBatchId(),
      entries,
      timestamp: new Date(),
      completed: false,
      errors: [],
    };

    this.logger.debug(`Starting batch set operation`, {
      batchId: batch.id,
      entryCount: entries.length,
    });

    try {
      const results = await Promise.all(
        entries.map(async (entry) => {
          try {
            const success = await this.set(entry.key, entry.value, {
              ttl: entry.ttl,
              tags: entry.tags,
              priority: entry.priority,
            });
            
            if (!success) {
              batch.errors.push({
                key: entry.key,
                error: 'Failed to set cache entry',
              });
            }
            
            return success;
          } catch (error) {
            batch.errors.push({
              key: entry.key,
              error: error.message,
            });
            return false;
          }
        })
      );

      batch.completed = true;
      
      this.emit('cache:batch-set', {
        batchId: batch.id,
        totalEntries: entries.length,
        successfulEntries: results.filter(r => r).length,
        errors: batch.errors,
      });

      return batch;

    } catch (error) {
      this.logger.error(`Batch set error: ${error.message}`, error.stack);
      batch.errors.push({ key: 'batch', error: error.message });
      batch.completed = true;
      return batch;
    }
  }

  // ===================================================================
  // CACHE INVALIDATION
  // ===================================================================

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    const startTime = Date.now();
    let invalidatedCount = 0;

    try {
      const keysToInvalidate = new Set<string>();
      
      // Collect all keys with matching tags
      for (const tag of tags) {
        const taggedKeys = this.cacheTags.get(tag);
        if (taggedKeys) {
          taggedKeys.forEach(key => keysToInvalidate.add(key));
        }
      }

      // Invalidate collected keys
      const results = await Promise.all(
        Array.from(keysToInvalidate).map(key => this.delete(key))
      );

      invalidatedCount = results.filter(result => result).length;

      // Update metrics
      this.updateCacheStats('memory', 'invalidate', Date.now() - startTime);

      this.emit('cache:invalidate-tags', {
        tags,
        invalidatedCount,
        keys: Array.from(keysToInvalidate),
      });

      this.logger.log(`Invalidated ${invalidatedCount} cache entries by tags`, {
        tags,
        invalidatedCount,
      });

      return invalidatedCount;

    } catch (error) {
      this.logger.error(`Tag invalidation error: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidateByPattern(pattern: string, type: 'prefix' | 'suffix' | 'contains' | 'regex' = 'prefix'): Promise<number> {
    const startTime = Date.now();
    let invalidatedCount = 0;

    try {
      const keysToInvalidate: string[] = [];
      
      // Find matching keys
      const allKeys = this.getAllCachedKeys();
      
      for (const key of allKeys) {
        if (this.keyMatchesPattern(key, pattern, type)) {
          keysToInvalidate.push(key);
        }
      }

      // Invalidate matching keys
      const results = await Promise.all(
        keysToInvalidate.map(key => this.delete(key))
      );

      invalidatedCount = results.filter(result => result).length;

      // Update metrics
      this.updateCacheStats('memory', 'invalidate', Date.now() - startTime);

      this.emit('cache:invalidate-pattern', {
        pattern,
        type,
        invalidatedCount,
        keys: keysToInvalidate,
      });

      this.logger.log(`Invalidated ${invalidatedCount} cache entries by pattern`, {
        pattern,
        type,
        invalidatedCount,
      });

      return invalidatedCount;

    } catch (error) {
      this.logger.error(`Pattern invalidation error: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(options?: { levels?: CacheLevel[] }): Promise<boolean> {
    const opts = {
      levels: ['memory', 'redis', 'database'] as CacheLevel[],
      ...options,
    };

    try {
      const results = await Promise.all(
        opts.levels.map(level => this.clearLevel(level))
      );

      const success = results.some(result => result);

      if (success) {
        // Clear tag mappings
        this.cacheTags.clear();
        
        // Reset statistics
        this.resetCacheStats();

        this.emit('cache:clear', { levels: opts.levels });

        this.logger.log(`Cache cleared for levels: ${opts.levels.join(', ')}`);
      }

      return success;

    } catch (error) {
      this.logger.error(`Cache clear error: ${error.message}`, error.stack);
      return false;
    }
  }

  // ===================================================================
  // CACHE LEVEL OPERATIONS
  // ===================================================================

  private async getFromLevel<T>(key: string, level: CacheLevel): Promise<CacheEntry<T> | null> {
    switch (level) {
      case 'memory':
        return this.getFromMemory(key);
      case 'redis':
        return await this.getFromRedis(key);
      case 'database':
        return await this.getFromDatabase(key);
      default:
        return null;
    }
  }

  private async setInLevel<T>(key: string, entry: CacheEntry<T>, level: CacheLevel): Promise<boolean> {
    switch (level) {
      case 'memory':
        return this.setInMemory(key, entry);
      case 'redis':
        return await this.setInRedis(key, entry);
      case 'database':
        return await this.setInDatabase(key, entry);
      default:
        return false;
    }
  }

  private async deleteFromLevel(key: string, level: CacheLevel): Promise<boolean> {
    switch (level) {
      case 'memory':
        return this.deleteFromMemory(key);
      case 'redis':
        return await this.deleteFromRedis(key);
      case 'database':
        return await this.deleteFromDatabase(key);
      default:
        return false;
    }
  }

  private async clearLevel(level: CacheLevel): Promise<boolean> {
    switch (level) {
      case 'memory':
        return this.clearMemory();
      case 'redis':
        return await this.clearRedis();
      case 'database':
        return await this.clearDatabase();
      default:
        return false;
    }
  }

  // ===================================================================
  // MEMORY CACHE OPERATIONS
  // ===================================================================

  private getFromMemory<T>(key: string): CacheEntry<T> | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    // Check expiration
    if (Date.now() > entry.expiresAt.getTime()) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return entry as CacheEntry<T>;
  }

  private setInMemory<T>(key: string, entry: CacheEntry<T>): boolean {
    try {
      // Check memory limits
      if (!this.hasMemoryCapacity(entry.metadata.size)) {
        this.evictLeastUsedEntries(entry.metadata.size);
      }

      this.memoryCache.set(key, entry);
      return true;
    } catch (error) {
      this.logger.error(`Memory cache set error: ${error.message}`);
      return false;
    }
  }

  private deleteFromMemory(key: string): boolean {
    return this.memoryCache.delete(key);
  }

  private clearMemory(): boolean {
    this.memoryCache.clear();
    return true;
  }

  // ===================================================================
  // REDIS CACHE OPERATIONS (Simulated for demo)
  // ===================================================================

  private async getFromRedis<T>(key: string): Promise<CacheEntry<T> | null> {
    // Simulated Redis operations - in real implementation, use Redis client
    const redisKey = this.getRedisKey(key);
    const entry = this.redisCache.get(redisKey);
    
    if (!entry) return null;
    
    // Check expiration
    if (Date.now() > entry.expiresAt.getTime()) {
      this.redisCache.delete(redisKey);
      return null;
    }
    
    // Decompress if needed
    if (entry.metadata.compressed) {
      entry.value = this.decompress(entry.value);
      entry.metadata.compressed = false;
    }
    
    return entry as CacheEntry<T>;
  }

  private async setInRedis<T>(key: string, entry: CacheEntry<T>): Promise<boolean> {
    try {
      const redisKey = this.getRedisKey(key);
      
      // Compress value for Redis storage
      const compressedEntry = { ...entry };
      if (this.cacheConfig.levels.redis.compression && !entry.metadata.compressed) {
        compressedEntry.value = this.compress(entry.value);
        compressedEntry.metadata.compressed = true;
      }
      
      this.redisCache.set(redisKey, compressedEntry);
      return true;
    } catch (error) {
      this.logger.error(`Redis cache set error: ${error.message}`);
      return false;
    }
  }

  private async deleteFromRedis(key: string): Promise<boolean> {
    const redisKey = this.getRedisKey(key);
    return this.redisCache.delete(redisKey);
  }

  private async clearRedis(): Promise<boolean> {
    this.redisCache.clear();
    return true;
  }

  // ===================================================================
  // DATABASE CACHE OPERATIONS (Simulated)
  // ===================================================================

  private async getFromDatabase<T>(key: string): Promise<CacheEntry<T> | null> {
    // Simulated database cache operations
    // In real implementation, this would query the database cache table
    return null;
  }

  private async setInDatabase<T>(key: string, entry: CacheEntry<T>): Promise<boolean> {
    // Simulated database cache operations
    // In real implementation, this would store in database cache table
    return true;
  }

  private async deleteFromDatabase(key: string): Promise<boolean> {
    // Simulated database cache operations
    return true;
  }

  private async clearDatabase(): Promise<boolean> {
    // Simulated database cache operations
    return true;
  }

  // ===================================================================
  // CACHE STATISTICS AND MONITORING
  // ===================================================================

  /**
   * Get current cache statistics
   */
  getCacheStats(level?: CacheLevel): CacheStats | Record<CacheLevel, CacheStats> {
    if (level) {
      return this.cacheStats.get(level) || this.createEmptyStats(level);
    }
    
    const allStats: Record<CacheLevel, CacheStats> = {} as any;
    for (const [lvl, stats] of this.cacheStats.entries()) {
      allStats[lvl] = stats;
    }
    
    return allStats;
  }

  /**
   * Get cache metrics with recommendations
   */
  getCacheMetrics(): CacheMetrics {
    const timestamp = new Date();
    const levels = this.getCacheStats() as Record<CacheLevel, CacheStats>;
    
    // Calculate overall efficiency
    const totalHits = Object.values(levels).reduce((sum, stats) => sum + stats.totalHits, 0);
    const totalMisses = Object.values(levels).reduce((sum, stats) => sum + stats.totalMisses, 0);
    const overallHitRate = totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0;
    
    const metrics: CacheMetrics = {
      timestamp,
      totalOperations: totalHits + totalMisses,
      operations: this.getOperationMetrics(),
      levels,
      efficiency: {
        overallHitRate,
        memoryEfficiency: this.calculateMemoryEfficiency(),
        storageEfficiency: this.calculateStorageEfficiency(),
        networkReduction: this.calculateNetworkReduction(),
      },
      recommendations: this.generateCacheRecommendations(),
    };

    return metrics;
  }

  /**
   * Get cache key information
   */
  getCacheKeyInfo(key: string): {
    exists: boolean;
    levels: CacheLevel[];
    entry?: CacheEntry;
    metadata?: {
      totalSize: number;
      accessPattern: any;
    };
  } {
    const levels: CacheLevel[] = [];
    let entry: CacheEntry | undefined;
    
    // Check each level
    if (this.memoryCache.has(key)) {
      levels.push('memory');
      entry = this.memoryCache.get(key);
    }
    
    if (this.redisCache.has(this.getRedisKey(key))) {
      levels.push('redis');
      if (!entry) entry = this.redisCache.get(this.getRedisKey(key));
    }

    const accessPattern = this.accessPatterns.get(key);

    return {
      exists: levels.length > 0,
      levels,
      entry: entry ? this.sanitizeEntry(entry) : undefined,
      metadata: entry ? {
        totalSize: entry.metadata.size,
        accessPattern,
      } : undefined,
    };
  }

  // ===================================================================
  // CACHE MANAGEMENT UTILITIES
  // ===================================================================

  /**
   * Add cache pattern for automatic management
   */
  addCachePattern(pattern: CachePattern): void {
    this.cachePatterns.push(pattern);
    
    this.emit('cache:pattern-added', pattern);
    
    this.logger.debug(`Cache pattern added: ${pattern.pattern}`, {
      type: pattern.type,
      ttl: pattern.ttl,
      priority: pattern.priority,
    });
  }

  /**
   * Remove cache pattern
   */
  removeCachePattern(pattern: string): boolean {
    const index = this.cachePatterns.findIndex(p => p.pattern === pattern);
    if (index >= 0) {
      const removed = this.cachePatterns.splice(index, 1)[0];
      
      this.emit('cache:pattern-removed', removed);
      
      this.logger.debug(`Cache pattern removed: ${pattern}`);
      return true;
    }
    return false;
  }

  /**
   * Get all cache patterns
   */
  getCachePatterns(): CachePattern[] {
    return [...this.cachePatterns];
  }

  /**
   * Warm cache with data
   */
  async warmCache(entries: Array<{
    key: string;
    dataFetcher: () => Promise<any>;
    ttl?: number;
    tags?: string[];
  }>): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    this.logger.log(`Starting cache warm-up with ${entries.length} entries`);

    const results = await Promise.allSettled(
      entries.map(async (entry) => {
        try {
          const data = await entry.dataFetcher();
          const success = await this.set(entry.key, data, {
            ttl: entry.ttl,
            tags: entry.tags,
          });
          
          return success ? 'success' : 'failed';
        } catch (error) {
          this.logger.error(`Cache warm-up failed for key ${entry.key}: ${error.message}`);
          return 'failed';
        }
      })
    );

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value === 'success') {
        successful++;
      } else {
        failed++;
      }
    });

    this.emit('cache:warm-up-completed', { successful, failed, total: entries.length });

    this.logger.log(`Cache warm-up completed`, { successful, failed, total: entries.length });

    return { successful, failed };
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private loadCacheConfig(): CacheConfig {
    return {
      enabled: this.configService.get('CACHE_ENABLED', 'true') === 'true',
      levels: {
        memory: {
          enabled: true,
          maxEntries: this.configService.get('CACHE_MEMORY_MAX_ENTRIES', 10000),
          maxSizeBytes: this.configService.get('CACHE_MEMORY_MAX_SIZE', 100 * 1024 * 1024), // 100MB
          strategy: 'lru',
          ttl: this.configService.get('CACHE_MEMORY_TTL', 300000), // 5 minutes
        },
        redis: {
          enabled: this.configService.get('CACHE_REDIS_ENABLED', 'false') === 'true',
          maxEntries: this.configService.get('CACHE_REDIS_MAX_ENTRIES', 100000),
          maxSizeBytes: this.configService.get('CACHE_REDIS_MAX_SIZE', 1024 * 1024 * 1024), // 1GB
          ttl: this.configService.get('CACHE_REDIS_TTL', 3600000), // 1 hour
          keyPrefix: this.configService.get('CACHE_REDIS_PREFIX', 'both-sides:cache:'),
          compression: true,
        },
        database: {
          enabled: this.configService.get('CACHE_DB_ENABLED', 'false') === 'true',
          ttl: this.configService.get('CACHE_DB_TTL', 86400000), // 24 hours
          cleanupInterval: this.configService.get('CACHE_DB_CLEANUP_INTERVAL', 3600000), // 1 hour
        },
      },
      invalidation: {
        strategy: 'time_based',
        batchSize: 100,
        scheduleCleanup: true,
        cleanupInterval: this.configService.get('CACHE_CLEANUP_INTERVAL', 300000), // 5 minutes
      },
      monitoring: {
        enabled: true,
        metricsInterval: this.configService.get('CACHE_METRICS_INTERVAL', 60000), // 1 minute
        performanceTracking: true,
      },
    };
  }

  private initializeCacheStats(): void {
    const levels: CacheLevel[] = ['memory', 'redis', 'database'];
    
    levels.forEach(level => {
      this.cacheStats.set(level, this.createEmptyStats(level));
    });
  }

  private createEmptyStats(level: CacheLevel): CacheStats {
    return {
      level,
      totalEntries: 0,
      totalSizeBytes: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      evictions: 0,
      invalidations: 0,
      averageAccessTime: 0,
      memoryUsage: { used: 0, available: 0, percentage: 0 },
      topKeys: [],
      performance: {
        averageRetrievalTime: 0,
        averageStorageTime: 0,
        compressionRatio: 0,
      },
    };
  }

  private isCacheLevelEnabled(level: CacheLevel): boolean {
    switch (level) {
      case 'memory':
        return this.cacheConfig.levels.memory.enabled;
      case 'redis':
        return this.cacheConfig.levels.redis.enabled;
      case 'database':
        return this.cacheConfig.levels.database.enabled;
      default:
        return false;
    }
  }

  private selectOptimalCacheLevels(key: string, value: any): CacheLevel[] {
    const levels: CacheLevel[] = [];
    const size = this.calculateSize(value);
    
    // Always try memory first if enabled
    if (this.cacheConfig.levels.memory.enabled) {
      levels.push('memory');
    }
    
    // Use Redis for larger entries or longer TTL
    if (this.cacheConfig.levels.redis.enabled && 
        (size > 1024 || this.getDefaultTTL(key) > 600000)) {
      levels.push('redis');
    }
    
    // Use database for very long TTL
    if (this.cacheConfig.levels.database.enabled && 
        this.getDefaultTTL(key) > 3600000) {
      levels.push('database');
    }
    
    return levels.length > 0 ? levels : ['memory'];
  }

  private getDefaultTTL(key: string): number {
    // Check patterns for specific TTL
    for (const pattern of this.cachePatterns) {
      if (this.keyMatchesPattern(key, pattern.pattern, pattern.type) && pattern.ttl) {
        return pattern.ttl;
      }
    }
    
    // Return default TTL
    return this.cacheConfig.levels.memory.ttl;
  }

  private keyMatchesPattern(key: string, pattern: string, type: 'prefix' | 'suffix' | 'contains' | 'regex'): boolean {
    switch (type) {
      case 'prefix':
        return key.startsWith(pattern);
      case 'suffix':
        return key.endsWith(pattern);
      case 'contains':
        return key.includes(pattern);
      case 'regex':
        try {
          return new RegExp(pattern).test(key);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private shouldCompress(value: any): boolean {
    const size = this.calculateSize(value);
    return size > 1024; // Compress entries larger than 1KB
  }

  private compress(value: any): string {
    // Simplified compression - in real implementation use proper compression library
    return JSON.stringify(value);
  }

  private decompress(compressedValue: string): any {
    // Simplified decompression
    return JSON.parse(compressedValue);
  }

  private calculateSize(value: any): number {
    return JSON.stringify(value).length;
  }

  private calculateReplacementCost(key: string): number {
    // Simplified cost calculation
    const pattern = this.accessPatterns.get(key);
    return pattern ? pattern.count * 10 : 100;
  }

  private hasMemoryCapacity(size: number): boolean {
    const currentSize = this.getCurrentMemorySize();
    return currentSize + size <= this.cacheConfig.levels.memory.maxSizeBytes;
  }

  private getCurrentMemorySize(): number {
    let totalSize = 0;
    this.memoryCache.forEach(entry => {
      totalSize += entry.metadata.size;
    });
    return totalSize;
  }

  private evictLeastUsedEntries(neededSpace: number): void {
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => {
        // Sort by access count and recency
        const scoreA = a[1].accessCount * a[1].lastAccessed.getTime();
        const scoreB = b[1].accessCount * b[1].lastAccessed.getTime();
        return scoreA - scoreB;
      });

    let freedSpace = 0;
    let evictedCount = 0;

    for (const [key, entry] of entries) {
      if (freedSpace >= neededSpace) break;
      
      this.memoryCache.delete(key);
      freedSpace += entry.metadata.size;
      evictedCount++;
    }

    // Update stats
    const stats = this.cacheStats.get('memory');
    if (stats) {
      stats.evictions += evictedCount;
    }

    this.logger.debug(`Evicted ${evictedCount} entries, freed ${freedSpace} bytes`);
  }

  private async promoteEntryToHigherLevel(key: string, entry: CacheEntry): Promise<void> {
    // Promote frequently accessed entries to memory cache
    if (entry.accessCount >= 3 && !this.memoryCache.has(key)) {
      await this.setInMemory(key, entry);
    }
  }

  private updateTagMappings(key: string, tags: string[]): void {
    // Remove key from old tag mappings
    this.removeFromTagMappings(key);
    
    // Add key to new tag mappings
    tags.forEach(tag => {
      if (!this.cacheTags.has(tag)) {
        this.cacheTags.set(tag, new Set());
      }
      this.cacheTags.get(tag)!.add(key);
    });
  }

  private removeFromTagMappings(key: string): void {
    this.cacheTags.forEach((keys, tag) => {
      keys.delete(key);
      if (keys.size === 0) {
        this.cacheTags.delete(tag);
      }
    });
  }

  private getAllCachedKeys(): string[] {
    const keys = new Set<string>();
    
    // Memory cache keys
    this.memoryCache.forEach((_, key) => keys.add(key));
    
    // Redis cache keys (remove prefix)
    this.redisCache.forEach((_, key) => {
      const originalKey = key.replace(this.cacheConfig.levels.redis.keyPrefix, '');
      keys.add(originalKey);
    });
    
    return Array.from(keys);
  }

  private getRedisKey(key: string): string {
    return `${this.cacheConfig.levels.redis.keyPrefix}${key}`;
  }

  private updateCacheStats(
    level: CacheLevel,
    operation: 'hit' | 'miss' | 'set' | 'delete' | 'invalidate',
    duration: number,
  ): void {
    const stats = this.cacheStats.get(level);
    if (!stats) return;

    switch (operation) {
      case 'hit':
        stats.totalHits++;
        break;
      case 'miss':
        stats.totalMisses++;
        break;
    }

    // Update hit rate
    const totalRequests = stats.totalHits + stats.totalMisses;
    stats.hitRate = totalRequests > 0 ? (stats.totalHits / totalRequests) * 100 : 0;

    // Update average access time
    stats.averageAccessTime = (stats.averageAccessTime + duration) / 2;
  }

  private recordAccess(key: string): void {
    const pattern = this.accessPatterns.get(key) || { count: 0, lastAccess: new Date() };
    pattern.count++;
    pattern.lastAccess = new Date();
    this.accessPatterns.set(key, pattern);
  }

  private resetCacheStats(): void {
    this.cacheStats.forEach((stats, level) => {
      this.cacheStats.set(level, this.createEmptyStats(level));
    });
  }

  private getOperationMetrics() {
    // Simplified operation metrics
    return {
      get: { count: 0, averageTime: 0 },
      set: { count: 0, averageTime: 0 },
      delete: { count: 0, averageTime: 0 },
      invalidate: { count: 0, averageTime: 0 },
    };
  }

  private calculateMemoryEfficiency(): number {
    const stats = this.cacheStats.get('memory');
    if (!stats) return 0;
    
    const used = stats.totalSizeBytes;
    const available = this.cacheConfig.levels.memory.maxSizeBytes;
    return available > 0 ? (used / available) * 100 : 0;
  }

  private calculateStorageEfficiency(): number {
    // Simplified storage efficiency calculation
    return 85;
  }

  private calculateNetworkReduction(): number {
    const totalStats = Array.from(this.cacheStats.values());
    const totalHits = totalStats.reduce((sum, stats) => sum + stats.totalHits, 0);
    const totalRequests = totalStats.reduce((sum, stats) => sum + stats.totalHits + stats.totalMisses, 0);
    
    return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
  }

  private generateCacheRecommendations(): CacheRecommendation[] {
    const recommendations: CacheRecommendation[] = [];
    const memoryStats = this.cacheStats.get('memory');
    
    if (memoryStats && memoryStats.hitRate < 50) {
      recommendations.push({
        id: 'low-hit-rate',
        type: 'performance',
        priority: 'high',
        title: 'Low Cache Hit Rate',
        description: `Memory cache hit rate is ${memoryStats.hitRate.toFixed(1)}%, which is below optimal threshold`,
        impact: 'Increased API response times and external service load',
        action: 'Review cache TTL settings and access patterns',
        estimatedBenefit: {
          performanceImprovement: 25,
          hitRateIncrease: 20,
        },
      });
    }

    return recommendations;
  }

  private sanitizeEntry(entry: CacheEntry): any {
    return {
      key: entry.key,
      ttl: entry.ttl,
      createdAt: entry.createdAt,
      lastAccessed: entry.lastAccessed,
      accessCount: entry.accessCount,
      expiresAt: entry.expiresAt,
      tags: entry.tags,
      metadata: {
        size: entry.metadata.size,
        compressed: entry.metadata.compressed,
        source: entry.metadata.source,
        priority: entry.metadata.priority,
        cost: entry.metadata.cost,
      },
    };
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async startCacheMaintenanceProcesses(): Promise<void> {
    // Cleanup expired entries
    if (this.cacheConfig.invalidation.scheduleCleanup) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredEntries();
      }, this.cacheConfig.invalidation.cleanupInterval);
    }

    // Metrics collection
    if (this.cacheConfig.monitoring.enabled) {
      this.metricsTimer = setInterval(() => {
        this.collectMetrics();
      }, this.cacheConfig.monitoring.metricsInterval);
    }

    // Adaptive optimization
    this.adaptiveTimer = setInterval(() => {
      this.optimizeCacheStrategy();
    }, 300000); // Every 5 minutes
  }

  private cleanupExpiredEntries(): void {
    let cleanedCount = 0;
    const now = Date.now();

    // Cleanup memory cache
    this.memoryCache.forEach((entry, key) => {
      if (now > entry.expiresAt.getTime()) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    });

    // Cleanup Redis cache
    this.redisCache.forEach((entry, key) => {
      if (now > entry.expiresAt.getTime()) {
        this.redisCache.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  private collectMetrics(): void {
    const metrics = this.getCacheMetrics();
    this.cacheMetricsHistory.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.cacheMetricsHistory.length > 1000) {
      this.cacheMetricsHistory.splice(0, this.cacheMetricsHistory.length - 500);
    }

    this.emit('cache:metrics-collected', metrics);
  }

  private optimizeCacheStrategy(): void {
    // Adaptive cache optimization based on access patterns
    const recommendations = this.generateCacheRecommendations();
    
    if (recommendations.length > 0) {
      this.emit('cache:optimization-recommendations', recommendations);
    }
  }

  // ===================================================================
  // CLEANUP
  // ===================================================================

  async onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.adaptiveTimer) clearInterval(this.adaptiveTimer);
    
    this.logger.log('Intelligent Cache Service destroyed');
  }
}
