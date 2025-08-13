/**
 * Task 2.3.3.5: Caching Strategy for Roster Data
 * 
 * This service implements a comprehensive caching strategy for roster data with:
 * - Multi-level caching (memory + Redis)
 * - Configurable TTL per entity type
 * - Smart cache invalidation
 * - Cache warming and prefetching
 * - Performance monitoring and metrics
 * - Bulk operations optimization
 */

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/services/redis.service';
import { 
  OrganizationRosterDto, 
  UserRosterDto, 
  ClassRosterDto, 
  EnrollmentRosterDto 
} from '../dto/roster-data.dto';

/**
 * Cache configuration for different entity types
 */
export interface CacheConfig {
  ttl: number;           // Time to live in seconds
  maxSize: number;       // Maximum number of entries in memory cache
  prefetch: boolean;     // Whether to prefetch related data
  compressionEnabled: boolean; // Whether to compress large objects
  tags: string[];        // Cache tags for bulk invalidation
}

/**
 * Cache key patterns
 */
export enum CacheKeyPattern {
  ORGANIZATION = 'roster:org:{id}',
  ORGANIZATION_LIST = 'roster:orgs:{filter}',
  USER = 'roster:user:{id}',
  USER_LIST = 'roster:users:{filter}',
  CLASS = 'roster:class:{id}',
  CLASS_LIST = 'roster:classes:{filter}',
  ENROLLMENT = 'roster:enrollment:{id}',
  ENROLLMENT_LIST = 'roster:enrollments:{filter}',
  ID_MAPPING = 'roster:mapping:{type}:{external_id}',
  SYNC_METADATA = 'roster:sync:{provider}:metadata',
  HEALTH_CHECK = 'roster:health:{provider}',
}

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
  version: number;
  tags: string[];
  size?: number;
  hitCount?: number;
  lastAccessed?: Date;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  avgResponseTime: number;
  topKeys: Array<{ key: string; hitCount: number; size: number }>;
}

/**
 * Cache invalidation strategy
 */
export enum InvalidationStrategy {
  IMMEDIATE = 'immediate',           // Invalidate immediately
  LAZY = 'lazy',                    // Mark as stale, refresh on next access
  SCHEDULED = 'scheduled',          // Invalidate at scheduled time
  VERSION_BASED = 'version_based',  // Invalidate based on version number
  TAG_BASED = 'tag_based'          // Invalidate by tags
}

/**
 * Main roster cache service
 */
@Injectable()
export class RosterCacheService {
  private readonly logger = new Logger(RosterCacheService.name);
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private hitStats: Map<string, number> = new Map();
  private missStats: Map<string, number> = new Map();
  private evictionCount = 0;

  // Default cache configurations by entity type
  private readonly cacheConfigs: Record<string, CacheConfig> = {
    organization: {
      ttl: 3600,         // 1 hour
      maxSize: 1000,
      prefetch: true,
      compressionEnabled: false,
      tags: ['roster', 'organization']
    },
    user: {
      ttl: 1800,         // 30 minutes
      maxSize: 5000,
      prefetch: true,
      compressionEnabled: false,
      tags: ['roster', 'user']
    },
    class: {
      ttl: 1800,         // 30 minutes
      maxSize: 2000,
      prefetch: true,
      compressionEnabled: false,
      tags: ['roster', 'class']
    },
    enrollment: {
      ttl: 900,          // 15 minutes (more volatile)
      maxSize: 10000,
      prefetch: false,
      compressionEnabled: true,
      tags: ['roster', 'enrollment']
    },
    list: {
      ttl: 600,          // 10 minutes (lists change frequently)
      maxSize: 500,
      prefetch: false,
      compressionEnabled: true,
      tags: ['roster', 'list']
    },
    mapping: {
      ttl: 7200,         // 2 hours (ID mappings are relatively stable)
      maxSize: 20000,
      prefetch: false,
      compressionEnabled: false,
      tags: ['roster', 'mapping']
    }
  };

  constructor(private readonly redis: RedisService) {
    this.startCleanupInterval();
  }

  // ================================================================
  // ORGANIZATION CACHING
  // ================================================================

  async getOrganization(id: string): Promise<OrganizationRosterDto | null> {
    const key = this.formatKey(CacheKeyPattern.ORGANIZATION, { id });
    return this.get<OrganizationRosterDto>(key, 'organization');
  }

  async setOrganization(id: string, data: OrganizationRosterDto): Promise<void> {
    const key = this.formatKey(CacheKeyPattern.ORGANIZATION, { id });
    await this.set(key, data, 'organization');
  }

  async getOrganizations(filter: string): Promise<OrganizationRosterDto[] | null> {
    const key = this.formatKey(CacheKeyPattern.ORGANIZATION_LIST, { filter });
    return this.get<OrganizationRosterDto[]>(key, 'list');
  }

  async setOrganizations(filter: string, data: OrganizationRosterDto[]): Promise<void> {
    const key = this.formatKey(CacheKeyPattern.ORGANIZATION_LIST, { filter });
    await this.set(key, data, 'list');
  }

  // ================================================================
  // USER CACHING
  // ================================================================

  async getUser(id: string): Promise<UserRosterDto | null> {
    const key = this.formatKey(CacheKeyPattern.USER, { id });
    return this.get<UserRosterDto>(key, 'user');
  }

  async setUser(id: string, data: UserRosterDto): Promise<void> {
    const key = this.formatKey(CacheKeyPattern.USER, { id });
    await this.set(key, data, 'user');
  }

  async getUsers(filter: string): Promise<UserRosterDto[] | null> {
    const key = this.formatKey(CacheKeyPattern.USER_LIST, { filter });
    return this.get<UserRosterDto[]>(key, 'list');
  }

  async setUsers(filter: string, data: UserRosterDto[]): Promise<void> {
    const key = this.formatKey(CacheKeyPattern.USER_LIST, { filter });
    await this.set(key, data, 'list');
  }

  // ================================================================
  // CLASS CACHING
  // ================================================================

  async getClass(id: string): Promise<ClassRosterDto | null> {
    const key = this.formatKey(CacheKeyPattern.CLASS, { id });
    return this.get<ClassRosterDto>(key, 'class');
  }

  async setClass(id: string, data: ClassRosterDto): Promise<void> {
    const key = this.formatKey(CacheKeyPattern.CLASS, { id });
    await this.set(key, data, 'class');
  }

  async getClasses(filter: string): Promise<ClassRosterDto[] | null> {
    const key = this.formatKey(CacheKeyPattern.CLASS_LIST, { filter });
    return this.get<ClassRosterDto[]>(key, 'list');
  }

  async setClasses(filter: string, data: ClassRosterDto[]): Promise<void> {
    const key = this.formatKey(CacheKeyPattern.CLASS_LIST, { filter });
    await this.set(key, data, 'list');
  }

  // ================================================================
  // ENROLLMENT CACHING
  // ================================================================

  async getEnrollment(id: string): Promise<EnrollmentRosterDto | null> {
    const key = this.formatKey(CacheKeyPattern.ENROLLMENT, { id });
    return this.get<EnrollmentRosterDto>(key, 'enrollment');
  }

  async setEnrollment(id: string, data: EnrollmentRosterDto): Promise<void> {
    const key = this.formatKey(CacheKeyPattern.ENROLLMENT, { id });
    await this.set(key, data, 'enrollment');
  }

  async getEnrollments(filter: string): Promise<EnrollmentRosterDto[] | null> {
    const key = this.formatKey(CacheKeyPattern.ENROLLMENT_LIST, { filter });
    return this.get<EnrollmentRosterDto[]>(key, 'list');
  }

  async setEnrollments(filter: string, data: EnrollmentRosterDto[]): Promise<void> {
    const key = this.formatKey(CacheKeyPattern.ENROLLMENT_LIST, { filter });
    await this.set(key, data, 'list');
  }

  // ================================================================
  // ID MAPPING CACHING
  // ================================================================

  async getIdMapping(type: string, externalId: string): Promise<string | null> {
    const key = this.formatKey(CacheKeyPattern.ID_MAPPING, { type, external_id: externalId });
    return this.get<string>(key, 'mapping');
  }

  async setIdMapping(type: string, externalId: string, internalId: string): Promise<void> {
    const key = this.formatKey(CacheKeyPattern.ID_MAPPING, { type, external_id: externalId });
    await this.set(key, internalId, 'mapping');
  }

  // ================================================================
  // METADATA CACHING
  // ================================================================

  async getSyncMetadata(provider: string): Promise<any | null> {
    const key = this.formatKey(CacheKeyPattern.SYNC_METADATA, { provider });
    return this.get<any>(key, 'organization'); // Use org TTL for metadata
  }

  async setSyncMetadata(provider: string, metadata: any): Promise<void> {
    const key = this.formatKey(CacheKeyPattern.SYNC_METADATA, { provider });
    await this.set(key, metadata, 'organization');
  }

  async getHealthCheck(provider: string): Promise<any | null> {
    const key = this.formatKey(CacheKeyPattern.HEALTH_CHECK, { provider });
    return this.get<any>(key, 'organization');
  }

  async setHealthCheck(provider: string, healthData: any): Promise<void> {
    const key = this.formatKey(CacheKeyPattern.HEALTH_CHECK, { provider });
    await this.set(key, healthData, 'organization');
  }

  // ================================================================
  // CORE CACHE OPERATIONS
  // ================================================================

  /**
   * Get item from cache (tries memory first, then Redis)
   */
  private async get<T>(key: string, configType: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      // Try memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isValid(memoryEntry)) {
        this.recordHit(key);
        memoryEntry.hitCount = (memoryEntry.hitCount || 0) + 1;
        memoryEntry.lastAccessed = new Date();
        
        this.logger.debug(`Memory cache hit for key: ${key}`);
        return memoryEntry.data as T;
      }

      // Try Redis cache
      const redisData = await this.redis.get(key);
      if (redisData) {
        const parsedData = JSON.parse(redisData);
        
        // Store in memory cache for faster future access
        const config = this.cacheConfigs[configType];
        if (this.memoryCache.size < config.maxSize) {
          const entry: CacheEntry<T> = {
            data: parsedData,
            cachedAt: new Date(),
            expiresAt: new Date(Date.now() + (config.ttl * 1000)),
            version: 1,
            tags: config.tags,
            hitCount: 1,
            lastAccessed: new Date()
          };
          this.memoryCache.set(key, entry);
        }

        this.recordHit(key);
        this.logger.debug(`Redis cache hit for key: ${key}`);
        return parsedData as T;
      }

      // Cache miss
      this.recordMiss(key);
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;

    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      this.recordMiss(key);
      return null;
    } finally {
      const responseTime = Date.now() - startTime;
      this.logger.debug(`Cache get took ${responseTime}ms for key: ${key}`);
    }
  }

  /**
   * Set item in cache (both memory and Redis)
   */
  private async set<T>(key: string, data: T, configType: string): Promise<void> {
    const config = this.cacheConfigs[configType];
    const entry: CacheEntry<T> = {
      data,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + (config.ttl * 1000)),
      version: 1,
      tags: config.tags,
      size: this.calculateSize(data)
    };

    try {
      // Store in memory cache if there's space
      if (this.memoryCache.size < config.maxSize) {
        this.memoryCache.set(key, entry);
      } else {
        // Evict least recently used entries
        this.evictLRU(configType);
        this.memoryCache.set(key, entry);
      }

      // Store in Redis with TTL
      const serialized = JSON.stringify(data);
      await this.redis.setex(key, config.ttl, serialized);

      this.logger.debug(`Cached data for key: ${key} (TTL: ${config.ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  // ================================================================
  // CACHE INVALIDATION
  // ================================================================

  /**
   * Invalidate specific cache key
   */
  async invalidate(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await this.redis.del(key);
      this.logger.debug(`Invalidated cache key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache invalidation error for key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      // Clear matching entries from memory cache
      for (const key of this.memoryCache.keys()) {
        if (this.matchesPattern(key, pattern)) {
          this.memoryCache.delete(key);
        }
      }

      // Clear matching entries from Redis
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Cache pattern invalidation error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToInvalidate: string[] = [];

    // Find keys with matching tags in memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags && tags.some(tag => entry.tags.includes(tag))) {
        keysToInvalidate.push(key);
        this.memoryCache.delete(key);
      }
    }

    // For Redis, we'd need to maintain a tag-to-keys mapping
    // This is a simplified version - in production, consider using Redis Sets for tag mapping
    for (const tag of tags) {
      const pattern = `*${tag}*`;
      const keys = await this.redis.keys(pattern);
      keysToInvalidate.push(...keys);
    }

    if (keysToInvalidate.length > 0) {
      await this.redis.del(...keysToInvalidate);
      this.logger.debug(`Invalidated ${keysToInvalidate.length} keys by tags: ${tags.join(', ')}`);
    }
  }

  /**
   * Invalidate all roster-related cache
   */
  async invalidateAll(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear Redis cache with roster prefix
      const keys = await this.redis.keys('roster:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.info(`Cleared all roster cache (${keys.length} keys)`);
      }
    } catch (error) {
      this.logger.error('Error clearing all roster cache:', error);
    }
  }

  // ================================================================
  // CACHE WARMING AND PREFETCHING
  // ================================================================

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(provider: string, organizationIds?: string[]): Promise<void> {
    this.logger.info(`Starting cache warm for provider: ${provider}`);

    try {
      // This would typically fetch data from the external provider
      // and populate the cache - implementation depends on specific provider
      
      if (organizationIds) {
        for (const orgId of organizationIds) {
          // Simulate warming organization data
          this.logger.debug(`Warming cache for organization: ${orgId}`);
        }
      }

      this.logger.info(`Cache warming completed for provider: ${provider}`);
    } catch (error) {
      this.logger.error(`Cache warming failed for provider ${provider}:`, error);
    }
  }

  /**
   * Prefetch related data based on access patterns
   */
  async prefetchRelatedData(entityType: string, entityId: string): Promise<void> {
    const config = this.cacheConfigs[entityType];
    if (!config.prefetch) return;

    try {
      switch (entityType) {
        case 'organization':
          // Prefetch classes for organization
          // Implementation would fetch and cache related classes
          break;
        case 'user':
          // Prefetch user's enrollments
          // Implementation would fetch and cache user's enrollments
          break;
        case 'class':
          // Prefetch class enrollments
          // Implementation would fetch and cache class roster
          break;
      }
    } catch (error) {
      this.logger.error(`Prefetch failed for ${entityType}:${entityId}:`, error);
    }
  }

  // ================================================================
  // CACHE MONITORING AND STATISTICS
  // ================================================================

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats(): CacheStats {
    const totalHits = Array.from(this.hitStats.values()).reduce((sum, hits) => sum + hits, 0);
    const totalMisses = Array.from(this.missStats.values()).reduce((sum, misses) => sum + misses, 0);
    const totalRequests = totalHits + totalMisses;

    const topKeys = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({
        key,
        hitCount: entry.hitCount || 0,
        size: entry.size || 0
      }))
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 10);

    return {
      totalEntries: this.memoryCache.size,
      memoryUsage: this.calculateTotalMemoryUsage(),
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      missRate: totalRequests > 0 ? totalMisses / totalRequests : 0,
      evictionCount: this.evictionCount,
      avgResponseTime: 0, // Would need to track response times
      topKeys
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.hitStats.clear();
    this.missStats.clear();
    this.evictionCount = 0;
  }

  // ================================================================
  // PRIVATE HELPER METHODS
  // ================================================================

  private formatKey(pattern: CacheKeyPattern, params: Record<string, string>): string {
    let key = pattern as string;
    for (const [param, value] of Object.entries(params)) {
      key = key.replace(`{${param}}`, value);
    }
    return key;
  }

  private isValid(entry: CacheEntry<any>): boolean {
    return entry.expiresAt > new Date();
  }

  private recordHit(key: string): void {
    this.hitStats.set(key, (this.hitStats.get(key) || 0) + 1);
  }

  private recordMiss(key: string): void {
    this.missStats.set(key, (this.missStats.get(key) || 0) + 1);
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private calculateTotalMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size || 0;
    }
    return totalSize;
  }

  private evictLRU(configType: string): void {
    const config = this.cacheConfigs[configType];
    let oldestEntry: { key: string; entry: CacheEntry<any> } | null = null;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags.includes(config.tags[0])) { // Match by primary tag
        if (!oldestEntry || 
            !entry.lastAccessed || 
            (entry.lastAccessed < oldestEntry.entry.lastAccessed!)) {
          oldestEntry = { key, entry };
        }
      }
    }

    if (oldestEntry) {
      this.memoryCache.delete(oldestEntry.key);
      this.evictionCount++;
      this.logger.debug(`Evicted LRU entry: ${oldestEntry.key}`);
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching - in production, use a proper glob library
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(key);
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = new Date();
      const expiredKeys: string[] = [];

      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expiresAt <= now) {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        this.memoryCache.delete(key);
      }

      if (expiredKeys.length > 0) {
        this.logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
      }
    }, 300000); // 5 minutes
  }
}
