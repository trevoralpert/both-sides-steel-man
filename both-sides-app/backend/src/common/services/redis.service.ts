import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    if (!redisUrl) {
      this.logger.warn('Redis URL not configured. Redis functionality will be disabled.');
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        enableAutoPipelining: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      // Test connection
      await this.redis.connect();
      this.logger.log('Successfully connected to Redis');
      
      // Handle connection events
      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });
      
      this.redis.on('ready', () => {
        this.logger.log('Redis connection is ready');
      });
      
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.disconnect();
      this.logger.log('Disconnected from Redis');
    }
  }

  // Basic cache operations
  async get(key: string): Promise<string | null> {
    if (!this.redis) return null;
    
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, value);
      } else {
        await this.redis.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  // JSON operations for complex data
  async getJson<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Error getting JSON key ${key}:`, error);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      const jsonString = JSON.stringify(value);
      return await this.set(key, jsonString, ttlSeconds);
    } catch (error) {
      this.logger.error(`Error setting JSON key ${key}:`, error);
      return false;
    }
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number | null> {
    if (!this.redis) return null;
    
    try {
      return await this.redis.lpush(key, ...values);
    } catch (error) {
      this.logger.error(`Error lpush to key ${key}:`, error);
      return null;
    }
  }

  async rpop(key: string): Promise<string | null> {
    if (!this.redis) return null;
    
    try {
      return await this.redis.rpop(key);
    } catch (error) {
      this.logger.error(`Error rpop from key ${key}:`, error);
      return null;
    }
  }

  async llen(key: string): Promise<number | null> {
    if (!this.redis) return null;
    
    try {
      return await this.redis.llen(key);
    } catch (error) {
      this.logger.error(`Error getting length of key ${key}:`, error);
      return null;
    }
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    if (!this.redis) return null;
    
    try {
      return await this.redis.hget(key, field);
    } catch (error) {
      this.logger.error(`Error hget ${field} from key ${key}:`, error);
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      await this.redis.hset(key, field, value);
      return true;
    } catch (error) {
      this.logger.error(`Error hset ${field} to key ${key}:`, error);
      return false;
    }
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    if (!this.redis) return null;
    
    try {
      return await this.redis.hgetall(key);
    } catch (error) {
      this.logger.error(`Error hgetall from key ${key}:`, error);
      return null;
    }
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number | null> {
    if (!this.redis) return null;
    
    try {
      return await this.redis.sadd(key, ...members);
    } catch (error) {
      this.logger.error(`Error sadd to key ${key}:`, error);
      return null;
    }
  }

  async sismember(key: string, member: string): Promise<boolean | null> {
    if (!this.redis) return null;
    
    try {
      const result = await this.redis.sismember(key, member);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error sismember ${member} in key ${key}:`, error);
      return null;
    }
  }

  async smembers(key: string): Promise<string[] | null> {
    if (!this.redis) return null;
    
    try {
      return await this.redis.smembers(key);
    } catch (error) {
      this.logger.error(`Error smembers from key ${key}:`, error);
      return null;
    }
  }

  // Utility methods
  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      const result = await this.redis.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.redis) return [];
    
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.logger.error(`Error getting keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  async flushall(): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      await this.redis.flushall();
      return true;
    } catch (error) {
      this.logger.error('Error flushing all keys:', error);
      return false;
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping failed:', error);
      return false;
    }
  }

  // Direct Redis client access for advanced operations
  getClient(): Redis | null {
    return this.redis;
  }
}
