import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/services/redis.service';
import { Profile } from '@prisma/client';

@Injectable()
export class ProfileCacheService {
  private readonly logger = new Logger(ProfileCacheService.name);
  private readonly CACHE_PREFIX = 'profile:';
  private readonly CACHE_TTL = 3600; // 1 hour in seconds
  private readonly STATS_TTL = 300; // 5 minutes for stats

  constructor(private readonly redisService: RedisService) {}

  /**
   * Get cached profile by ID
   */
  async getProfile(profileId: string): Promise<Profile | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${profileId}`;
      const cached = await this.redisService.getJson<Profile>(cacheKey);
      
      if (cached) {
        this.logger.debug(`Cache hit for profile: ${profileId}`);
      }
      
      return cached;
    } catch (error) {
      this.logger.error(`Cache get error for profile ${profileId}:`, error);
      return null;
    }
  }

  /**
   * Cache profile data
   */
  async setProfile(profile: Profile, customTtl?: number): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${profile.id}`;
      const ttl = customTtl || this.CACHE_TTL;
      
      await this.redisService.setJson(cacheKey, profile, ttl);
      
      // Also cache by user_id for quick lookups
      const userCacheKey = `${this.CACHE_PREFIX}user:${profile.user_id}`;
      await this.redisService.setJson(userCacheKey, profile, ttl);
      
      this.logger.debug(`Cached profile: ${profile.id}`);
    } catch (error) {
      this.logger.error(`Cache set error for profile ${profile.id}:`, error);
    }
  }

  /**
   * Get profile by user ID from cache
   */
  async getProfileByUserId(userId: string): Promise<Profile | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}user:${userId}`;
      const cached = await this.redisService.getJson<Profile>(cacheKey);
      
      if (cached) {
        this.logger.debug(`Cache hit for user profile: ${userId}`);
      }
      
      return cached;
    } catch (error) {
      this.logger.error(`Cache get error for user profile ${userId}:`, error);
      return null;
    }
  }

  /**
   * Invalidate profile cache
   */
  async invalidateProfile(profileId: string, userId?: string): Promise<void> {
    try {
      const keys = [`${this.CACHE_PREFIX}${profileId}`];
      
      if (userId) {
        keys.push(`${this.CACHE_PREFIX}user:${userId}`);
      }

      await Promise.all(keys.map(key => this.redisService.del(key)));
      
      this.logger.debug(`Invalidated cache for profile: ${profileId}`);
    } catch (error) {
      this.logger.error(`Cache invalidation error for profile ${profileId}:`, error);
    }
  }

  /**
   * Cache multiple profiles (bulk operation)
   */
  async setProfiles(profiles: Profile[], customTtl?: number): Promise<void> {
    try {
      const ttl = customTtl || this.CACHE_TTL;
      
      await Promise.all(
        profiles.map(profile => this.setProfile(profile, ttl))
      );
      
      this.logger.debug(`Bulk cached ${profiles.length} profiles`);
    } catch (error) {
      this.logger.error('Bulk cache set error:', error);
    }
  }

  /**
   * Get multiple profiles from cache
   */
  async getProfiles(profileIds: string[]): Promise<{ [key: string]: Profile | null }> {
    try {
      const cacheKeys = profileIds.map(id => `${this.CACHE_PREFIX}${id}`);
      const cached = await Promise.all(
        cacheKeys.map(key => this.redisService.getJson<Profile>(key))
      );

      const result: { [key: string]: Profile | null } = {};
      profileIds.forEach((id, index) => {
        result[id] = cached[index];
      });

      const hitCount = cached.filter(p => p !== null).length;
      this.logger.debug(`Bulk cache: ${hitCount}/${profileIds.length} hits`);

      return result;
    } catch (error) {
      this.logger.error('Bulk cache get error:', error);
      return {};
    }
  }

  /**
   * Cache profile statistics
   */
  async setProfileStats(stats: any): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}stats:summary`;
      await this.redisService.setJson(cacheKey, stats, this.STATS_TTL);
      
      this.logger.debug('Cached profile statistics');
    } catch (error) {
      this.logger.error('Cache set error for profile stats:', error);
    }
  }

  /**
   * Get cached profile statistics
   */
  async getProfileStats(): Promise<any | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}stats:summary`;
      const cached = await this.redisService.getJson(cacheKey);
      
      if (cached) {
        this.logger.debug('Cache hit for profile statistics');
      }
      
      return cached;
    } catch (error) {
      this.logger.error('Cache get error for profile stats:', error);
      return null;
    }
  }

  /**
   * Cache search results
   */
  async setSearchResults(
    searchKey: string, 
    results: any, 
    customTtl?: number
  ): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}search:${searchKey}`;
      const ttl = customTtl || 600; // 10 minutes for search results
      
      await this.redisService.setJson(cacheKey, results, ttl);
      
      this.logger.debug(`Cached search results: ${searchKey}`);
    } catch (error) {
      this.logger.error(`Cache set error for search ${searchKey}:`, error);
    }
  }

  /**
   * Get cached search results
   */
  async getSearchResults(searchKey: string): Promise<any | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}search:${searchKey}`;
      const cached = await this.redisService.getJson(cacheKey);
      
      if (cached) {
        this.logger.debug(`Cache hit for search: ${searchKey}`);
      }
      
      return cached;
    } catch (error) {
      this.logger.error(`Cache get error for search ${searchKey}:`, error);
      return null;
    }
  }

  /**
   * Invalidate all profile caches (use sparingly)
   */
  async invalidateAllProfiles(): Promise<void> {
    try {
      const keys = await this.redisService.keys(`${this.CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.redisService.del(key)));
        this.logger.log(`Invalidated ${keys.length} profile cache entries`);
      }
    } catch (error) {
      this.logger.error('Error invalidating all profile caches:', error);
    }
  }

  /**
   * Generate cache key for search queries
   */
  generateSearchKey(options: {
    page?: number;
    limit?: number;
    completed?: boolean;
    search?: string;
    role?: string;
    organization?: string;
  }): string {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
    
    return params.toString();
  }

  /**
   * Cache health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      const testKey = `${this.CACHE_PREFIX}health:test`;
      const testValue = { timestamp: Date.now() };
      
      // Test set and get
      await this.redisService.setJson(testKey, testValue, 10);
      const retrieved = await this.redisService.getJson(testKey);
      
      if (retrieved && (retrieved as any).timestamp === testValue.timestamp) {
        await this.redisService.del(testKey);
        return { status: 'healthy' };
      } else {
        return { 
          status: 'unhealthy', 
          details: 'Cache set/get test failed' 
        };
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: error.message 
      };
    }
  }
}
