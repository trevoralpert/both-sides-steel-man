import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { 
  DebateTranscript, 
  DebateMessage, 
  DebateMetadata,
  ParticipantMessages,
  DebateTranscriptService 
} from './debate-transcript.service';
import { ValidationResult, DataValidationService } from './data-validation.service';

/**
 * Interface for cache configuration
 */
export interface CacheConfig {
  transcript_ttl: number; // TTL for full transcripts (seconds)
  metadata_ttl: number; // TTL for metadata (seconds)
  participant_ttl: number; // TTL for participant data (seconds)
  validation_ttl: number; // TTL for validation results (seconds)
  max_cache_size: number; // Maximum cache size in MB
  compression_enabled: boolean; // Whether to compress cached data
}

/**
 * Interface for cache statistics
 */
export interface CacheStatistics {
  hit_rate: number;
  miss_rate: number;
  total_requests: number;
  total_hits: number;
  total_misses: number;
  cache_size_mb: number;
  keys_count: number;
  evictions: number;
  last_reset: Date;
}

/**
 * Interface for cached item metadata
 */
interface CachedItemMetadata {
  key: string;
  cached_at: Date;
  expires_at: Date;
  access_count: number;
  last_accessed: Date;
  size_bytes: number;
  data_type: string;
}

/**
 * Service for caching frequently accessed debate transcripts and related data
 */
@Injectable()
export class TranscriptCacheService {
  private readonly logger = new Logger(TranscriptCacheService.name);

  private readonly DEFAULT_CONFIG: CacheConfig = {
    transcript_ttl: 3600, // 1 hour
    metadata_ttl: 1800, // 30 minutes
    participant_ttl: 2400, // 40 minutes
    validation_ttl: 7200, // 2 hours
    max_cache_size: 100, // 100 MB
    compression_enabled: true,
  };

  // Cache key prefixes
  private readonly KEY_PREFIX = 'transcript_cache';
  private readonly TRANSCRIPT_PREFIX = `${this.KEY_PREFIX}:transcript`;
  private readonly METADATA_PREFIX = `${this.KEY_PREFIX}:metadata`;
  private readonly PARTICIPANT_PREFIX = `${this.KEY_PREFIX}:participant`;
  private readonly VALIDATION_PREFIX = `${this.KEY_PREFIX}:validation`;
  private readonly STATS_KEY = `${this.KEY_PREFIX}:statistics`;

  // Cache statistics
  private stats: CacheStatistics = {
    hit_rate: 0,
    miss_rate: 0,
    total_requests: 0,
    total_hits: 0,
    total_misses: 0,
    cache_size_mb: 0,
    keys_count: 0,
    evictions: 0,
    last_reset: new Date(),
  };

  constructor(
    private readonly redis: RedisService,
    private readonly transcriptService: DebateTranscriptService,
    private readonly validationService: DataValidationService,
  ) {}

  /**
   * Get cached debate transcript or fetch from database
   */
  async getDebateTranscript(conversationId: string, forceRefresh = false): Promise<DebateTranscript> {
    const cacheKey = `${this.TRANSCRIPT_PREFIX}:${conversationId}`;
    
    if (!forceRefresh) {
      const cached = await this.getCachedData<DebateTranscript>(cacheKey);
      if (cached) {
        this.recordCacheHit('transcript');
        return cached;
      }
    }

    this.recordCacheMiss('transcript');

    // Fetch from database
    const transcript = await this.transcriptService.getDebateTranscript(conversationId);
    
    // Cache the result
    await this.setCachedData(cacheKey, transcript, this.DEFAULT_CONFIG.transcript_ttl);
    
    return transcript;
  }

  /**
   * Get cached debate metadata or fetch from database
   */
  async getDebateMetadata(conversationId: string, forceRefresh = false): Promise<DebateMetadata> {
    const cacheKey = `${this.METADATA_PREFIX}:${conversationId}`;
    
    if (!forceRefresh) {
      const cached = await this.getCachedData<DebateMetadata>(cacheKey);
      if (cached) {
        this.recordCacheHit('metadata');
        return cached;
      }
    }

    this.recordCacheMiss('metadata');

    // Fetch from database
    const metadata = await this.transcriptService.getDebateMetadata(conversationId);
    
    // Cache the result
    await this.setCachedData(cacheKey, metadata, this.DEFAULT_CONFIG.metadata_ttl);
    
    return metadata;
  }

  /**
   * Get cached participant messages or fetch from database
   */
  async getParticipantMessages(
    conversationId: string, 
    userId: string, 
    forceRefresh = false
  ): Promise<ParticipantMessages> {
    const cacheKey = `${this.PARTICIPANT_PREFIX}:${conversationId}:${userId}`;
    
    if (!forceRefresh) {
      const cached = await this.getCachedData<ParticipantMessages>(cacheKey);
      if (cached) {
        this.recordCacheHit('participant');
        return cached;
      }
    }

    this.recordCacheMiss('participant');

    // Fetch from database
    const participantMessages = await this.transcriptService.getParticipantMessages(conversationId, userId);
    
    // Cache the result
    await this.setCachedData(cacheKey, participantMessages, this.DEFAULT_CONFIG.participant_ttl);
    
    return participantMessages;
  }

  /**
   * Get cached validation result or perform validation
   */
  async getValidationResult(
    conversationId: string, 
    forceRevalidate = false
  ): Promise<ValidationResult> {
    const cacheKey = `${this.VALIDATION_PREFIX}:${conversationId}`;
    
    if (!forceRevalidate) {
      const cached = await this.getCachedData<ValidationResult>(cacheKey);
      if (cached) {
        this.recordCacheHit('validation');
        return cached;
      }
    }

    this.recordCacheMiss('validation');

    // Get transcript and perform validation
    const transcript = await this.getDebateTranscript(conversationId);
    const validationResult = await this.validationService.validateDebateTranscript(transcript);
    
    // Cache the result
    await this.setCachedData(cacheKey, validationResult, this.DEFAULT_CONFIG.validation_ttl);
    
    return validationResult;
  }

  /**
   * Preload frequently accessed debates for a class
   */
  async preloadClassDebates(classId: string): Promise<void> {
    this.logger.debug(`Preloading debates for class: ${classId}`);

    try {
      const debates = await this.transcriptService.getDebatesReadyForAnalysis(classId);
      
      const preloadPromises = debates.map(async (debate) => {
        try {
          // Preload transcript
          await this.getDebateTranscript(debate.conversation_id);
          
          // Preload participant data
          for (const participant of debate.participants) {
            await this.getParticipantMessages(debate.conversation_id, participant.id);
          }
          
          this.logger.debug(`Preloaded debate: ${debate.conversation_id}`);
        } catch (error) {
          this.logger.warn(`Failed to preload debate ${debate.conversation_id}: ${error.message}`);
        }
      });

      await Promise.all(preloadPromises);
      this.logger.log(`Preloaded ${debates.length} debates for class ${classId}`);
    } catch (error) {
      this.logger.error(`Failed to preload class debates: ${error.message}`);
    }
  }

  /**
   * Invalidate cache for a specific conversation
   */
  async invalidateConversation(conversationId: string): Promise<void> {
    this.logger.debug(`Invalidating cache for conversation: ${conversationId}`);

    const keysToDelete = [
      `${this.TRANSCRIPT_PREFIX}:${conversationId}`,
      `${this.METADATA_PREFIX}:${conversationId}`,
      `${this.VALIDATION_PREFIX}:${conversationId}`,
    ];

    // Also invalidate participant-specific keys
    const participantKeys = await this.redis.keys(`${this.PARTICIPANT_PREFIX}:${conversationId}:*`);
    keysToDelete.push(...participantKeys);

    // Delete all keys
    if (keysToDelete.length > 0) {
      await this.redis.del(...keysToDelete);
      this.logger.debug(`Invalidated ${keysToDelete.length} cache keys for conversation: ${conversationId}`);
    }
  }

  /**
   * Invalidate all cache entries for a specific class
   */
  async invalidateClass(classId: string): Promise<void> {
    this.logger.debug(`Invalidating cache for class: ${classId}`);

    try {
      // Get all conversation IDs for this class
      const debates = await this.transcriptService.getDebatesReadyForAnalysis(classId);
      
      const invalidatePromises = debates.map(debate => 
        this.invalidateConversation(debate.conversation_id)
      );

      await Promise.all(invalidatePromises);
      this.logger.log(`Invalidated cache for ${debates.length} debates in class ${classId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate class cache: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics(): Promise<CacheStatistics> {
    // Update cache size and key count
    const info = await this.redis.info('memory');
    const usedMemory = this.extractMemoryUsage(info);
    this.stats.cache_size_mb = usedMemory / (1024 * 1024);

    // Get key count
    const keyCount = await this.redis.dbsize();
    this.stats.keys_count = keyCount;

    // Calculate rates
    if (this.stats.total_requests > 0) {
      this.stats.hit_rate = this.stats.total_hits / this.stats.total_requests;
      this.stats.miss_rate = this.stats.total_misses / this.stats.total_requests;
    }

    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetCacheStatistics(): void {
    this.stats = {
      hit_rate: 0,
      miss_rate: 0,
      total_requests: 0,
      total_hits: 0,
      total_misses: 0,
      cache_size_mb: 0,
      keys_count: 0,
      evictions: 0,
      last_reset: new Date(),
    };
    
    this.logger.log('Cache statistics reset');
  }

  /**
   * Clear all transcript cache data
   */
  async clearCache(): Promise<void> {
    this.logger.warn('Clearing all transcript cache data');

    const patterns = [
      `${this.TRANSCRIPT_PREFIX}:*`,
      `${this.METADATA_PREFIX}:*`,
      `${this.PARTICIPANT_PREFIX}:*`,
      `${this.VALIDATION_PREFIX}:*`,
    ];

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Cleared ${keys.length} keys matching pattern: ${pattern}`);
      }
    }

    this.resetCacheStatistics();
  }

  /**
   * Get cached data with compression support
   */
  private async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        return null;
      }

      // Update access metadata
      await this.updateAccessMetadata(key);

      // Parse JSON data
      const data = JSON.parse(cached) as T;
      
      this.logger.debug(`Cache hit: ${key}`);
      return data;
    } catch (error) {
      this.logger.warn(`Failed to retrieve cached data for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  private async setCachedData<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      const sizeBytes = Buffer.byteLength(serialized, 'utf8');

      // Check cache size limits
      if (sizeBytes > 1024 * 1024) { // 1MB per item limit
        this.logger.warn(`Large cache item detected: ${key} (${sizeBytes} bytes)`);
      }

      await this.redis.setex(key, ttlSeconds, serialized);

      // Store metadata
      await this.storeCacheMetadata(key, sizeBytes, typeof data as string, ttlSeconds);

      this.logger.debug(`Cached data: ${key} (${sizeBytes} bytes, TTL: ${ttlSeconds}s)`);
    } catch (error) {
      this.logger.error(`Failed to cache data for key ${key}: ${error.message}`);
    }
  }

  /**
   * Store cache item metadata
   */
  private async storeCacheMetadata(
    key: string, 
    sizeBytes: number, 
    dataType: string, 
    ttlSeconds: number
  ): Promise<void> {
    const metadata: CachedItemMetadata = {
      key,
      cached_at: new Date(),
      expires_at: new Date(Date.now() + ttlSeconds * 1000),
      access_count: 0,
      last_accessed: new Date(),
      size_bytes: sizeBytes,
      data_type: dataType,
    };

    const metadataKey = `${key}:metadata`;
    await this.redis.setex(metadataKey, ttlSeconds + 300, JSON.stringify(metadata)); // Keep metadata 5 minutes longer
  }

  /**
   * Update access metadata for cache analytics
   */
  private async updateAccessMetadata(key: string): Promise<void> {
    const metadataKey = `${key}:metadata`;
    
    try {
      const metadataStr = await this.redis.get(metadataKey);
      if (metadataStr) {
        const metadata: CachedItemMetadata = JSON.parse(metadataStr);
        metadata.access_count++;
        metadata.last_accessed = new Date();
        
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
          await this.redis.setex(metadataKey, ttl + 300, JSON.stringify(metadata));
        }
      }
    } catch (error) {
      // Silently fail - metadata is not critical
      this.logger.debug(`Failed to update access metadata for ${key}: ${error.message}`);
    }
  }

  /**
   * Record cache hit
   */
  private recordCacheHit(type: string): void {
    this.stats.total_requests++;
    this.stats.total_hits++;
    this.logger.debug(`Cache hit for ${type} (Hit rate: ${(this.stats.total_hits / this.stats.total_requests * 100).toFixed(1)}%)`);
  }

  /**
   * Record cache miss
   */
  private recordCacheMiss(type: string): void {
    this.stats.total_requests++;
    this.stats.total_misses++;
    this.logger.debug(`Cache miss for ${type} (Hit rate: ${(this.stats.total_hits / this.stats.total_requests * 100).toFixed(1)}%)`);
  }

  /**
   * Extract memory usage from Redis INFO command
   */
  private extractMemoryUsage(info: string): number {
    const lines = info.split('\r\n');
    const memoryLine = lines.find(line => line.startsWith('used_memory:'));
    
    if (memoryLine) {
      const memoryValue = memoryLine.split(':')[1];
      return parseInt(memoryValue, 10);
    }
    
    return 0;
  }

  /**
   * Warm up cache with frequently accessed debates
   */
  async warmUpCache(conversationIds: string[]): Promise<void> {
    this.logger.log(`Warming up cache with ${conversationIds.length} debates`);

    const warmupPromises = conversationIds.map(async (conversationId) => {
      try {
        // Preload transcript and metadata
        await Promise.all([
          this.getDebateTranscript(conversationId),
          this.getDebateMetadata(conversationId),
          this.getValidationResult(conversationId),
        ]);
        
        // Preload participant data
        const metadata = await this.getDebateMetadata(conversationId);
        const participantPromises = metadata.participants.map(participant =>
          this.getParticipantMessages(conversationId, participant.id)
        );
        
        await Promise.all(participantPromises);
        
      } catch (error) {
        this.logger.warn(`Failed to warm up cache for conversation ${conversationId}: ${error.message}`);
      }
    });

    await Promise.all(warmupPromises);
    this.logger.log('Cache warmup completed');
  }

  /**
   * Get cache health status
   */
  async getCacheHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    hit_rate: number;
    size_mb: number;
    issues: string[];
  }> {
    const stats = await this.getCacheStatistics();
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check hit rate
    if (stats.hit_rate < 0.3) {
      issues.push('Low cache hit rate');
      status = 'warning';
    }

    // Check cache size
    if (stats.cache_size_mb > this.DEFAULT_CONFIG.max_cache_size * 0.9) {
      issues.push('Cache size approaching limit');
      status = 'warning';
    }

    if (stats.cache_size_mb > this.DEFAULT_CONFIG.max_cache_size) {
      issues.push('Cache size exceeded limit');
      status = 'critical';
    }

    // Check Redis connectivity
    try {
      await this.redis.ping();
    } catch (error) {
      issues.push('Redis connection issues');
      status = 'critical';
    }

    return {
      status,
      hit_rate: stats.hit_rate,
      size_mb: stats.cache_size_mb,
      issues,
    };
  }
}
