import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * High-level cache service with application-specific caching patterns
 * Built on top of RedisService for common caching operations
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  // User session caching
  async setUserSession(userId: string, sessionData: any, ttlHours: number = 24): Promise<boolean> {
    const key = this.getUserSessionKey(userId);
    const ttlSeconds = ttlHours * 3600;
    return await this.redis.setJson(key, sessionData, ttlSeconds);
  }

  async getUserSession<T>(userId: string): Promise<T | null> {
    const key = this.getUserSessionKey(userId);
    return await this.redis.getJson<T>(key);
  }

  async clearUserSession(userId: string): Promise<boolean> {
    const key = this.getUserSessionKey(userId);
    return await this.redis.del(key);
  }

  // User profile caching
  async setUserProfile(userId: string, profile: any, ttlHours: number = 12): Promise<boolean> {
    const key = this.getUserProfileKey(userId);
    const ttlSeconds = ttlHours * 3600;
    return await this.redis.setJson(key, profile, ttlSeconds);
  }

  async getUserProfile<T>(userId: string): Promise<T | null> {
    const key = this.getUserProfileKey(userId);
    return await this.redis.getJson<T>(key);
  }

  async clearUserProfile(userId: string): Promise<boolean> {
    const key = this.getUserProfileKey(userId);
    return await this.redis.del(key);
  }

  // Debate session caching
  async setDebateSession(debateId: string, sessionData: any, ttlHours: number = 6): Promise<boolean> {
    const key = this.getDebateSessionKey(debateId);
    const ttlSeconds = ttlHours * 3600;
    return await this.redis.setJson(key, sessionData, ttlSeconds);
  }

  async getDebateSession<T>(debateId: string): Promise<T | null> {
    const key = this.getDebateSessionKey(debateId);
    return await this.redis.getJson<T>(key);
  }

  async clearDebateSession(debateId: string): Promise<boolean> {
    const key = this.getDebateSessionKey(debateId);
    return await this.redis.del(key);
  }

  // Rate limiting
  async checkRateLimit(identifier: string, maxRequests: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.getRateLimitKey(identifier);
    
    try {
      const current = await this.redis.get(key);
      const now = Date.now();
      
      if (!current) {
        // First request in the window
        await this.redis.set(key, '1', windowSeconds);
        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetTime: now + (windowSeconds * 1000)
        };
      }
      
      const count = parseInt(current, 10);
      if (count >= maxRequests) {
        // Rate limit exceeded
        const ttl = await this.redis.getClient()?.ttl(key) || 0;
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + (ttl * 1000)
        };
      }
      
      // Increment counter
      const newCount = await this.redis.getClient()?.incr(key) || 0;
      const ttl = await this.redis.getClient()?.ttl(key) || 0;
      
      return {
        allowed: true,
        remaining: maxRequests - newCount,
        resetTime: now + (ttl * 1000)
      };
      
    } catch (error) {
      this.logger.error(`Rate limit check failed for ${identifier}:`, error);
      // Fail open - allow the request if Redis is down
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: Date.now() + (windowSeconds * 1000)
      };
    }
  }

  // API response caching
  async cacheApiResponse(endpoint: string, params: string, response: any, ttlMinutes: number = 15): Promise<boolean> {
    const key = this.getApiCacheKey(endpoint, params);
    const ttlSeconds = ttlMinutes * 60;
    return await this.redis.setJson(key, {
      data: response,
      cachedAt: Date.now()
    }, ttlSeconds);
  }

  async getCachedApiResponse<T>(endpoint: string, params: string): Promise<T | null> {
    const key = this.getApiCacheKey(endpoint, params);
    const cached = await this.redis.getJson<{ data: T; cachedAt: number }>(key);
    return cached?.data || null;
  }

  // Real-time presence tracking
  async setUserPresence(userId: string, status: string, ttlMinutes: number = 5): Promise<boolean> {
    const key = this.getUserPresenceKey(userId);
    const ttlSeconds = ttlMinutes * 60;
    return await this.redis.setJson(key, {
      status,
      lastSeen: Date.now()
    }, ttlSeconds);
  }

  async getUserPresence(userId: string): Promise<{ status: string; lastSeen: number } | null> {
    const key = this.getUserPresenceKey(userId);
    return await this.redis.getJson(key);
  }

  async getOnlineUsers(userIds: string[]): Promise<string[]> {
    const presenceChecks = await Promise.all(
      userIds.map(async (userId) => {
        const presence = await this.getUserPresence(userId);
        return presence ? userId : null;
      })
    );
    
    return presenceChecks.filter((userId) => userId !== null) as string[];
  }

  // Temporary data storage (e.g., for form drafts, temporary uploads)
  async setTempData(key: string, data: any, ttlMinutes: number = 30): Promise<boolean> {
    const cacheKey = this.getTempDataKey(key);
    const ttlSeconds = ttlMinutes * 60;
    return await this.redis.setJson(cacheKey, data, ttlSeconds);
  }

  async getTempData<T>(key: string): Promise<T | null> {
    const cacheKey = this.getTempDataKey(key);
    return await this.redis.getJson<T>(cacheKey);
  }

  async clearTempData(key: string): Promise<boolean> {
    const cacheKey = this.getTempDataKey(key);
    return await this.redis.del(cacheKey);
  }

  // Debate queue management
  async addToDebateQueue(queueName: string, userId: string, preferences: any): Promise<boolean> {
    const queueKey = this.getDebateQueueKey(queueName);
    const userKey = this.getQueueUserKey(userId);
    
    // Store user preferences
    const stored = await this.redis.setJson(userKey, {
      userId,
      preferences,
      joinedAt: Date.now()
    }, 3600); // 1 hour TTL
    
    if (stored) {
      // Add user to queue
      await this.redis.sadd(queueKey, userId);
    }
    
    return stored;
  }

  async getDebateQueueUsers(queueName: string): Promise<string[]> {
    const queueKey = this.getDebateQueueKey(queueName);
    return (await this.redis.smembers(queueKey)) || [];
  }

  async removeFromDebateQueue(queueName: string, userId: string): Promise<boolean> {
    const queueKey = this.getDebateQueueKey(queueName);
    const userKey = this.getQueueUserKey(userId);
    
    // Remove from queue and clear preferences
    const client = this.redis.getClient();
    if (client) {
      await client.srem(queueKey, userId);
      await this.redis.del(userKey);
      return true;
    }
    
    return false;
  }

  // Cache invalidation patterns
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      this.getUserSessionKey(userId),
      this.getUserProfileKey(userId),
      this.getUserPresenceKey(userId),
    ];
    
    await Promise.all(patterns.map(key => this.redis.del(key)));
  }

  async invalidateDebateCache(debateId: string): Promise<void> {
    const key = this.getDebateSessionKey(debateId);
    await this.redis.del(key);
  }

  // Health check
  async healthCheck(): Promise<{ redis: boolean; operations: boolean }> {
    const redis = await this.redis.ping();
    
    // Test basic operations
    let operations = false;
    try {
      const testKey = 'health:test';
      const testValue = Date.now().toString();
      
      const setResult = await this.redis.set(testKey, testValue, 10);
      const getValue = await this.redis.get(testKey);
      const delResult = await this.redis.del(testKey);
      
      operations = setResult && getValue === testValue && delResult;
    } catch (error) {
      this.logger.error('Health check operations failed:', error);
    }
    
    return { redis, operations };
  }

  // Private helper methods for key generation
  private getUserSessionKey(userId: string): string {
    return `session:user:${userId}`;
  }

  private getUserProfileKey(userId: string): string {
    return `profile:user:${userId}`;
  }

  private getDebateSessionKey(debateId: string): string {
    return `session:debate:${debateId}`;
  }

  private getRateLimitKey(identifier: string): string {
    return `ratelimit:${identifier}`;
  }

  private getApiCacheKey(endpoint: string, params: string): string {
    return `api:${endpoint}:${params}`;
  }

  private getUserPresenceKey(userId: string): string {
    return `presence:user:${userId}`;
  }

  private getTempDataKey(key: string): string {
    return `temp:${key}`;
  }

  private getDebateQueueKey(queueName: string): string {
    return `queue:debate:${queueName}`;
  }

  private getQueueUserKey(userId: string): string {
    return `queue:user:${userId}`;
  }
}
