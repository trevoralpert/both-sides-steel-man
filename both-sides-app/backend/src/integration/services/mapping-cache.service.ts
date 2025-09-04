/**
 * Phase 9 Task 9.2.1: Mapping Cache Service
 * 
 * This service provides a specialized Redis-based caching layer for External ID mappings
 * with optimized performance, compression, and intelligent cache management.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalSystemMapping } from '@prisma/client';
import * as Redis from 'ioredis';

/**
 * Cache entry structure for mappings
 */
export interface CachedMapping {
  internalId: string;
  externalId: string;
  syncStatus: string;
  syncVersion: number;
  lastSyncAt: string;
  cachedAt: string;
}

/**
 * Batch cache operation result
 */
export interface BatchCacheResult {
  success: boolean;
  processed: number;
  errors: number;
  errorDetails: Array<{
    key: string;
    error: string;
  }>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalKeys: number;
  memoryUsage: number; // bytes
  hitRate: number; // percentage
  missRate: number; // percentage
  avgResponseTime: number; // milliseconds
  keysByIntegration: Record<string, number>;
  keysByEntityType: Record<string, number>;
}

/**
 * Cache configuration
 */
export interface MappingCacheConfig {
  enabled: boolean;
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  ttl: number; // seconds
  maxMemory: string;
  compressionEnabled: boolean;
  batchSize: number;
  retryAttempts: number;
  retryDelayOnFailover: number;
}

/**
 * Specialized Redis cache service for External ID mappings
 */
@Injectable()
export class MappingCacheService {
  private readonly logger = new Logger(MappingCacheService.name);
  private redis: Redis.Redis;
  private config: MappingCacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    totalResponseTime: 0,
  };

  constructor(
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') redisClient?: Redis.Redis
  ) {
    this.config = {
      enabled: this.configService.get('MAPPING_CACHE_ENABLED', 'true') === 'true',
      host: this.configService.get('MAPPING_CACHE_HOST', 'localhost'),
      port: this.configService.get('MAPPING_CACHE_PORT', 6379),
      password: this.configService.get('MAPPING_CACHE_PASSWORD'),
      db: this.configService.get('MAPPING_CACHE_DB', 2), // Separate DB for mapping cache
      keyPrefix: this.configService.get('MAPPING_CACHE_PREFIX', 'mapping'),
      ttl: this.configService.get('MAPPING_CACHE_TTL', 3600),
      maxMemory: this.configService.get('MAPPING_CACHE_MAX_MEMORY', '256mb'),
      compressionEnabled: this.configService.get('MAPPING_CACHE_COMPRESSION', 'false') === 'true',
      batchSize: this.configService.get('MAPPING_CACHE_BATCH_SIZE', 100),
      retryAttempts: this.configService.get('MAPPING_CACHE_RETRY_ATTEMPTS', 3),
      retryDelayOnFailover: this.configService.get('MAPPING_CACHE_RETRY_DELAY', 100),
    };

    this.initializeRedis(redisClient);
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(existingClient?: Redis.Redis): void {
    if (!this.config.enabled) {
      this.logger.warn('Mapping cache is disabled');
      return;
    }

    if (existingClient) {
      this.redis = existingClient;
      this.logger.log('Using existing Redis client for mapping cache');
    } else {
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        maxRetriesPerRequest: this.config.retryAttempts,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis for mapping cache');
      });

      this.redis.on('error', (err) => {
        this.logger.error('Redis connection error for mapping cache:', err);
      });

      this.redis.on('reconnecting', () => {
        this.logger.warn('Reconnecting to Redis for mapping cache');
      });
    }

    // Configure Redis for optimal caching
    this.configureRedis();
  }

  /**
   * Configure Redis settings for optimal caching performance
   */
  private async configureRedis(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.connect();
      
      // Set memory policy to LRU eviction
      await this.redis.config('SET', 'maxmemory-policy', 'allkeys-lru');
      await this.redis.config('SET', 'maxmemory', this.config.maxMemory);
      
      this.logger.log(`Redis configured for mapping cache: ${this.config.maxMemory} max memory`);
    } catch (error) {
      this.logger.error('Failed to configure Redis for mapping cache:', error);
    }
  }

  // ================================================================
  // SINGLE KEY OPERATIONS
  // ================================================================

  /**
   * Get external ID to internal ID mapping from cache
   */
  async getExternalToInternal(
    integrationId: string,
    entityType: string,
    externalId: string
  ): Promise<string | null> {
    if (!this.config.enabled || !this.redis) {
      return null;
    }

    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const key = this.buildCacheKey('ext_to_int', integrationId, entityType, externalId);
      const result = await this.redis.get(key);
      
      const responseTime = Date.now() - startTime;
      this.stats.totalResponseTime += responseTime;

      if (result !== null) {
        this.stats.hits++;
        this.logger.debug(`Cache HIT: ${key} (${responseTime}ms)`);
        return this.decompress(result);
      } else {
        this.stats.misses++;
        this.logger.debug(`Cache MISS: ${key} (${responseTime}ms)`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Cache get error for external-to-internal mapping:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Get internal ID to external ID mapping from cache
   */
  async getInternalToExternal(
    integrationId: string,
    entityType: string,
    internalId: string
  ): Promise<string | null> {
    if (!this.config.enabled || !this.redis) {
      return null;
    }

    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const key = this.buildCacheKey('int_to_ext', integrationId, entityType, internalId);
      const result = await this.redis.get(key);
      
      const responseTime = Date.now() - startTime;
      this.stats.totalResponseTime += responseTime;

      if (result !== null) {
        this.stats.hits++;
        this.logger.debug(`Cache HIT: ${key} (${responseTime}ms)`);
        return this.decompress(result);
      } else {
        this.stats.misses++;
        this.logger.debug(`Cache MISS: ${key} (${responseTime}ms)`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Cache get error for internal-to-external mapping:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Get complete mapping from cache
   */
  async getCompleteMapping(
    integrationId: string,
    entityType: string,
    externalId: string
  ): Promise<CachedMapping | null> {
    if (!this.config.enabled || !this.redis) {
      return null;
    }

    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const key = this.buildCacheKey('mapping', integrationId, entityType, externalId);
      const result = await this.redis.get(key);
      
      const responseTime = Date.now() - startTime;
      this.stats.totalResponseTime += responseTime;

      if (result !== null) {
        this.stats.hits++;
        this.logger.debug(`Cache HIT: ${key} (${responseTime}ms)`);
        return JSON.parse(this.decompress(result));
      } else {
        this.stats.misses++;
        this.logger.debug(`Cache MISS: ${key} (${responseTime}ms)`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Cache get error for complete mapping:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set mapping in cache
   */
  async setMapping(mapping: ExternalSystemMapping): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      return;
    }

    try {
      const pipeline = this.redis.pipeline();
      
      // Cache external-to-internal mapping
      const extToIntKey = this.buildCacheKey('ext_to_int', mapping.integration_id, mapping.entity_type, mapping.external_id);
      pipeline.setex(extToIntKey, this.config.ttl, this.compress(mapping.internal_id));
      
      // Cache internal-to-external mapping
      const intToExtKey = this.buildCacheKey('int_to_ext', mapping.integration_id, mapping.entity_type, mapping.internal_id);
      pipeline.setex(intToExtKey, this.config.ttl, this.compress(mapping.external_id));
      
      // Cache complete mapping
      const mappingKey = this.buildCacheKey('mapping', mapping.integration_id, mapping.entity_type, mapping.external_id);
      const cachedMapping: CachedMapping = {
        internalId: mapping.internal_id,
        externalId: mapping.external_id,
        syncStatus: mapping.sync_status,
        syncVersion: mapping.sync_version,
        lastSyncAt: mapping.last_sync_at?.toISOString() || '',
        cachedAt: new Date().toISOString(),
      };
      pipeline.setex(mappingKey, this.config.ttl, this.compress(JSON.stringify(cachedMapping)));
      
      await pipeline.exec();
      
      this.logger.debug(`Cached mapping: ${mapping.entity_type} ${mapping.external_id} <-> ${mapping.internal_id}`);
    } catch (error) {
      this.logger.error(`Cache set error for mapping:`, error);
    }
  }

  /**
   * Delete mapping from cache
   */
  async deleteMapping(
    integrationId: string,
    entityType: string,
    externalId: string,
    internalId: string
  ): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      return;
    }

    try {
      const keys = [
        this.buildCacheKey('ext_to_int', integrationId, entityType, externalId),
        this.buildCacheKey('int_to_ext', integrationId, entityType, internalId),
        this.buildCacheKey('mapping', integrationId, entityType, externalId),
      ];
      
      await this.redis.del(...keys);
      this.logger.debug(`Deleted cached mapping: ${entityType} ${externalId} <-> ${internalId}`);
    } catch (error) {
      this.logger.error(`Cache delete error for mapping:`, error);
    }
  }

  // ================================================================
  // BULK OPERATIONS
  // ================================================================

  /**
   * Set multiple mappings in cache using pipeline
   */
  async setBulkMappings(mappings: ExternalSystemMapping[]): Promise<BatchCacheResult> {
    if (!this.config.enabled || !this.redis) {
      return {
        success: false,
        processed: 0,
        errors: 0,
        errorDetails: [],
      };
    }

    const result: BatchCacheResult = {
      success: true,
      processed: 0,
      errors: 0,
      errorDetails: [],
    };

    // Process in batches for better performance
    const batches = this.chunkArray(mappings, this.config.batchSize);
    
    for (const batch of batches) {
      try {
        const pipeline = this.redis.pipeline();
        
        for (const mapping of batch) {
          // Add all three cache entries for each mapping
          const extToIntKey = this.buildCacheKey('ext_to_int', mapping.integration_id, mapping.entity_type, mapping.external_id);
          pipeline.setex(extToIntKey, this.config.ttl, this.compress(mapping.internal_id));
          
          const intToExtKey = this.buildCacheKey('int_to_ext', mapping.integration_id, mapping.entity_type, mapping.internal_id);
          pipeline.setex(intToExtKey, this.config.ttl, this.compress(mapping.external_id));
          
          const mappingKey = this.buildCacheKey('mapping', mapping.integration_id, mapping.entity_type, mapping.external_id);
          const cachedMapping: CachedMapping = {
            internalId: mapping.internal_id,
            externalId: mapping.external_id,
            syncStatus: mapping.sync_status,
            syncVersion: mapping.sync_version,
            lastSyncAt: mapping.last_sync_at?.toISOString() || '',
            cachedAt: new Date().toISOString(),
          };
          pipeline.setex(mappingKey, this.config.ttl, this.compress(JSON.stringify(cachedMapping)));
        }
        
        await pipeline.exec();
        result.processed += batch.length;
        
      } catch (error) {
        result.errors += batch.length;
        result.success = false;
        result.errorDetails.push({
          key: `batch_${result.processed / this.config.batchSize}`,
          error: error.message || 'Unknown batch error',
        });
        
        this.logger.error(`Bulk cache set error for batch:`, error);
      }
    }
    
    this.logger.log(`Bulk cached ${result.processed} mappings with ${result.errors} errors`);
    return result;
  }

  /**
   * Get multiple mappings from cache
   */
  async getBulkMappings(
    requests: Array<{
      integrationId: string;
      entityType: string;
      externalId: string;
    }>
  ): Promise<Map<string, CachedMapping>> {
    if (!this.config.enabled || !this.redis || requests.length === 0) {
      return new Map();
    }

    const result = new Map<string, CachedMapping>();
    
    try {
      // Build keys for all requests
      const keys = requests.map(req => 
        this.buildCacheKey('mapping', req.integrationId, req.entityType, req.externalId)
      );
      
      // Get all mappings in a single operation
      const values = await this.redis.mget(...keys);
      
      // Process results
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (value !== null) {
          const request = requests[i];
          const cacheKey = `${request.integrationId}:${request.entityType}:${request.externalId}`;
          
          try {
            const cachedMapping = JSON.parse(this.decompress(value));
            result.set(cacheKey, cachedMapping);
            this.stats.hits++;
          } catch (parseError) {
            this.logger.error(`Failed to parse cached mapping for ${cacheKey}:`, parseError);
            this.stats.misses++;
          }
        } else {
          this.stats.misses++;
        }
      }
      
      this.stats.totalRequests += requests.length;
      
    } catch (error) {
      this.logger.error('Bulk cache get error:', error);
      this.stats.misses += requests.length;
    }
    
    return result;
  }

  // ================================================================
  // CACHE MANAGEMENT
  // ================================================================

  /**
   * Clear cache for a specific integration
   */
  async clearIntegrationCache(integrationId: string): Promise<number> {
    if (!this.config.enabled || !this.redis) {
      return 0;
    }

    try {
      const pattern = `${this.config.keyPrefix}:*:${integrationId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const deletedCount = await this.redis.del(...keys);
      this.logger.log(`Cleared ${deletedCount} cache keys for integration: ${integrationId}`);
      return deletedCount;
      
    } catch (error) {
      this.logger.error(`Failed to clear integration cache for ${integrationId}:`, error);
      return 0;
    }
  }

  /**
   * Clear cache for a specific entity type
   */
  async clearEntityTypeCache(integrationId: string, entityType: string): Promise<number> {
    if (!this.config.enabled || !this.redis) {
      return 0;
    }

    try {
      const pattern = `${this.config.keyPrefix}:*:${integrationId}:${entityType}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const deletedCount = await this.redis.del(...keys);
      this.logger.log(`Cleared ${deletedCount} cache keys for ${entityType} in integration: ${integrationId}`);
      return deletedCount;
      
    } catch (error) {
      this.logger.error(`Failed to clear entity type cache for ${integrationId}:${entityType}:`, error);
      return 0;
    }
  }

  /**
   * Clear all mapping cache
   */
  async clearAllCache(): Promise<number> {
    if (!this.config.enabled || !this.redis) {
      return 0;
    }

    try {
      const pattern = `${this.config.keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const deletedCount = await this.redis.del(...keys);
      this.logger.log(`Cleared all ${deletedCount} mapping cache keys`);
      return deletedCount;
      
    } catch (error) {
      this.logger.error('Failed to clear all mapping cache:', error);
      return 0;
    }
  }

  // ================================================================
  // STATISTICS & MONITORING
  // ================================================================

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    const stats: CacheStats = {
      totalKeys: 0,
      memoryUsage: 0,
      hitRate: 0,
      missRate: 0,
      avgResponseTime: 0,
      keysByIntegration: {},
      keysByEntityType: {},
    };

    if (!this.config.enabled || !this.redis) {
      return stats;
    }

    try {
      // Get Redis info
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      if (memoryMatch) {
        stats.memoryUsage = parseInt(memoryMatch[1]);
      }

      // Count keys
      const pattern = `${this.config.keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);
      stats.totalKeys = keys.length;

      // Calculate hit/miss rates
      if (this.stats.totalRequests > 0) {
        stats.hitRate = Math.round((this.stats.hits / this.stats.totalRequests) * 100 * 100) / 100;
        stats.missRate = Math.round((this.stats.misses / this.stats.totalRequests) * 100 * 100) / 100;
        stats.avgResponseTime = Math.round((this.stats.totalResponseTime / this.stats.totalRequests) * 100) / 100;
      }

      // Analyze key patterns
      for (const key of keys) {
        const parts = key.split(':');
        if (parts.length >= 4) {
          const integrationId = parts[2];
          const entityType = parts[3];
          
          stats.keysByIntegration[integrationId] = (stats.keysByIntegration[integrationId] || 0) + 1;
          stats.keysByEntityType[entityType] = (stats.keysByEntityType[entityType] || 0) + 1;
        }
      }

    } catch (error) {
      this.logger.error('Failed to get cache statistics:', error);
    }

    return stats;
  }

  /**
   * Reset performance statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      totalResponseTime: 0,
    };
    
    this.logger.log('Cache statistics reset');
  }

  // ================================================================
  // PRIVATE HELPER METHODS
  // ================================================================

  /**
   * Build cache key
   */
  private buildCacheKey(
    type: 'ext_to_int' | 'int_to_ext' | 'mapping',
    integrationId: string,
    entityType: string,
    id: string
  ): string {
    return `${this.config.keyPrefix}:${type}:${integrationId}:${entityType}:${id}`;
  }

  /**
   * Compress data if compression is enabled
   */
  private compress(data: string): string {
    if (!this.config.compressionEnabled) {
      return data;
    }
    
    // Simple compression - in production, consider using a proper compression library
    try {
      return Buffer.from(data).toString('base64');
    } catch (error) {
      this.logger.error('Compression error:', error);
      return data;
    }
  }

  /**
   * Decompress data if compression is enabled
   */
  private decompress(data: string): string {
    if (!this.config.compressionEnabled) {
      return data;
    }
    
    try {
      return Buffer.from(data, 'base64').toString();
    } catch (error) {
      this.logger.error('Decompression error:', error);
      return data;
    }
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Cleanup resources
   */
  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Mapping cache Redis connection closed');
    }
  }
}
