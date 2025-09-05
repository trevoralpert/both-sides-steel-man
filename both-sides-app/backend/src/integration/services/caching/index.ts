/**
 * Caching Services Index
 * 
 * Central exports for all caching and optimization services including intelligent caching,
 * performance monitoring, response optimization, and cache management.
 */

// ===================================================================
// CORE SERVICES
// ===================================================================

export { IntelligentCacheService } from './intelligent-cache.service';
export { CachePerformanceService } from './cache-performance.service';
export { ResponseOptimizationService } from './response-optimization.service';

// ===================================================================
// INTERFACES AND TYPES
// ===================================================================

export type {
  // Cache types
  CacheLevel,
  CacheStrategy,
  InvalidationStrategy,
  CacheEntry,
  CacheConfig,
  CacheStats,
  CacheMetrics,
  CacheRecommendation,
  CachePattern,
  CacheBatch,
} from './intelligent-cache.service';

export type {
  // Performance monitoring types
  CachePerformanceMetrics,
  PerformanceBottleneck,
  OptimizationOpportunity,
  PerformanceTrend,
  CacheOptimizationReport,
  CacheBenchmark,
} from './cache-performance.service';

export type {
  // Response optimization types
  CompressionAlgorithm,
  OptimizationStrategy,
  BatchingStrategy,
  OptimizationConfig,
  OptimizationResult,
  BatchRequest,
  BatchJob,
  ConnectionPool,
  OptimizationMetrics,
  OptimizationRecommendation,
} from './response-optimization.service';

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Create default cache configuration
 */
export function createDefaultCacheConfig(overrides?: Partial<import('./intelligent-cache.service').CacheConfig>): import('./intelligent-cache.service').CacheConfig {
  return {
    enabled: true,
    levels: {
      memory: {
        enabled: true,
        maxEntries: 10000,
        maxSizeBytes: 100 * 1024 * 1024, // 100MB
        strategy: 'lru',
        ttl: 300000, // 5 minutes
      },
      redis: {
        enabled: false, // Disabled by default for demo
        maxEntries: 100000,
        maxSizeBytes: 1024 * 1024 * 1024, // 1GB
        ttl: 3600000, // 1 hour
        keyPrefix: 'both-sides:cache:',
        compression: true,
      },
      database: {
        enabled: false, // Disabled by default for demo
        ttl: 86400000, // 24 hours
        cleanupInterval: 3600000, // 1 hour
      },
    },
    invalidation: {
      strategy: 'time_based',
      batchSize: 100,
      scheduleCleanup: true,
      cleanupInterval: 300000, // 5 minutes
    },
    monitoring: {
      enabled: true,
      metricsInterval: 60000, // 1 minute
      performanceTracking: true,
    },
    ...overrides,
  };
}

/**
 * Create default optimization configuration
 */
export function createDefaultOptimizationConfig(overrides?: Partial<import('./response-optimization.service').OptimizationConfig>): import('./response-optimization.service').OptimizationConfig {
  return {
    enabled: true,
    compression: {
      enabled: true,
      algorithm: 'gzip',
      level: 6,
      threshold: 1024, // 1KB
      mimeTypes: ['application/json', 'text/plain', 'text/html', 'application/xml'],
      excludeExtensions: ['.jpg', '.png', '.gif', '.mp4', '.zip'],
    },
    batching: {
      enabled: true,
      strategy: 'adaptive',
      maxBatchSize: 50,
      maxBatchBytes: 1048576, // 1MB
      maxWaitTime: 100, // 100ms
      priorityLevels: 10,
    },
    connectionPooling: {
      enabled: true,
      maxConnections: 100,
      maxIdleConnections: 10,
      idleTimeout: 30000, // 30 seconds
      connectionTimeout: 5000, // 5 seconds
      keepAlive: true,
    },
    responseTransformation: {
      enabled: true,
      minify: true,
      removeNulls: true,
      camelCase: false,
      fieldFiltering: true,
    },
    caching: {
      enabled: true,
      defaultTTL: 300000, // 5 minutes
      maxSize: 52428800, // 50MB
      compressionThreshold: 2048, // 2KB
    },
    ...overrides,
  };
}

/**
 * Create cache pattern
 */
export function createCachePattern(
  pattern: string,
  type: 'prefix' | 'suffix' | 'contains' | 'regex',
  options?: {
    ttl?: number;
    priority?: number;
    tags?: string[];
    compression?: boolean;
    strategy?: string;
  },
): import('./intelligent-cache.service').CachePattern {
  return {
    pattern,
    type,
    ttl: options?.ttl,
    priority: options?.priority || 5,
    tags: options?.tags || [],
    compression: options?.compression,
    strategy: options?.strategy as any,
  };
}

/**
 * Create benchmark configuration
 */
export function createBenchmarkConfig(
  name: string,
  options?: {
    operationType?: 'mixed' | 'read_heavy' | 'write_heavy';
    keyCount?: number;
    valueSize?: number;
    duration?: number;
    concurrency?: number;
    baseline?: string;
  },
): import('./cache-performance.service').CacheBenchmark['testConfig'] & { name: string; baseline?: string } {
  return {
    name,
    operationType: options?.operationType || 'mixed',
    keyCount: options?.keyCount || 1000,
    valueSize: options?.valueSize || 1024, // 1KB
    duration: options?.duration || 60, // 60 seconds
    concurrency: options?.concurrency || 10,
    baseline: options?.baseline,
  };
}

/**
 * Cache utility functions
 */
export const CacheUtils = {
  /**
   * Generate cache key with prefix
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.map(part => String(part)).join(':')}`;
  },

  /**
   * Calculate data size in bytes
   */
  calculateSize(data: any): number {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return Buffer.byteLength(str, 'utf8');
  },

  /**
   * Format cache size for display
   */
  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 2)}${units[unitIndex]}`;
  },

  /**
   * Calculate hit rate percentage
   */
  calculateHitRate(hits: number, misses: number): number {
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  },

  /**
   * Calculate compression ratio
   */
  calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    return originalSize > 0 ? compressedSize / originalSize : 1;
  },

  /**
   * Calculate size reduction percentage
   */
  calculateSizeReduction(originalSize: number, optimizedSize: number): number {
    return originalSize > 0 ? ((originalSize - optimizedSize) / originalSize) * 100 : 0;
  },

  /**
   * Determine if data should be compressed
   */
  shouldCompress(size: number, mimeType: string, threshold: number = 1024): boolean {
    if (size < threshold) return false;

    const compressibleTypes = [
      'application/json',
      'text/plain',
      'text/html',
      'application/xml',
      'text/css',
      'text/javascript',
      'application/javascript',
    ];

    return compressibleTypes.includes(mimeType);
  },

  /**
   * Create TTL based on data characteristics
   */
  calculateOptimalTTL(
    dataType: 'static' | 'semi_static' | 'dynamic' | 'realtime',
    accessFrequency: 'high' | 'medium' | 'low',
  ): number {
    const baseTTLs = {
      static: 24 * 60 * 60 * 1000,      // 24 hours
      semi_static: 60 * 60 * 1000,      // 1 hour
      dynamic: 15 * 60 * 1000,          // 15 minutes
      realtime: 60 * 1000,              // 1 minute
    };

    const frequencyMultipliers = {
      high: 1.5,   // Longer TTL for frequently accessed data
      medium: 1.0,
      low: 0.5,    // Shorter TTL for rarely accessed data
    };

    return baseTTLs[dataType] * frequencyMultipliers[accessFrequency];
  },

  /**
   * Generate cache tags from object
   */
  generateTags(data: any, prefix?: string): string[] {
    const tags: string[] = [];
    const pre = prefix ? `${prefix}:` : '';

    if (data && typeof data === 'object') {
      // Add type-based tags
      if (data.type) tags.push(`${pre}type:${data.type}`);
      if (data.category) tags.push(`${pre}category:${data.category}`);
      if (data.userId) tags.push(`${pre}user:${data.userId}`);
      if (data.organizationId) tags.push(`${pre}org:${data.organizationId}`);
      
      // Add date-based tags
      if (data.createdAt || data.timestamp) {
        const date = new Date(data.createdAt || data.timestamp);
        tags.push(`${pre}date:${date.toISOString().split('T')[0]}`);
      }
    }

    return tags;
  },
};

/**
 * Performance utility functions
 */
export const PerformanceUtils = {
  /**
   * Categorize performance based on response time
   */
  categorizePerformance(responseTimeMs: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (responseTimeMs <= 50) return 'excellent';
    if (responseTimeMs <= 100) return 'good';
    if (responseTimeMs <= 200) return 'fair';
    if (responseTimeMs <= 500) return 'poor';
    return 'critical';
  },

  /**
   * Calculate performance score (0-100)
   */
  calculatePerformanceScore(
    hitRate: number,
    avgResponseTime: number,
    errorRate: number,
  ): number {
    const hitRateScore = hitRate; // 0-100
    const responseTimeScore = Math.max(0, 100 - (avgResponseTime / 10)); // Penalty for slow responses
    const errorRateScore = Math.max(0, 100 - (errorRate * 10)); // Penalty for errors

    // Weighted average
    return (hitRateScore * 0.4 + responseTimeScore * 0.4 + errorRateScore * 0.2);
  },

  /**
   * Generate performance grade
   */
  getPerformanceGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  },

  /**
   * Calculate trend direction
   */
  calculateTrend(
    current: number,
    previous: number,
    threshold: number = 5,
  ): 'improving' | 'degrading' | 'stable' {
    const changePercent = Math.abs((current - previous) / previous) * 100;
    
    if (changePercent < threshold) return 'stable';
    return current > previous ? 'improving' : 'degrading';
  },

  /**
   * Format performance metric for display
   */
  formatMetric(value: number, type: 'time' | 'percentage' | 'size' | 'rate'): string {
    switch (type) {
      case 'time':
        if (value < 1000) return `${value.toFixed(0)}ms`;
        return `${(value / 1000).toFixed(1)}s`;
      
      case 'percentage':
        return `${value.toFixed(1)}%`;
      
      case 'size':
        return CacheUtils.formatSize(value);
      
      case 'rate':
        if (value < 1) return `${(value * 1000).toFixed(0)}/min`;
        return `${value.toFixed(1)}/s`;
      
      default:
        return value.toString();
    }
  },
};

/**
 * Optimization utility functions
 */
export const OptimizationUtils = {
  /**
   * Determine optimal compression algorithm
   */
  selectCompressionAlgorithm(
    dataType: string,
    size: number,
    clientSupport?: string[],
  ): import('./response-optimization.service').CompressionAlgorithm {
    // Consider client support
    const supported = clientSupport || ['gzip', 'deflate'];
    
    // For small data, compression overhead might not be worth it
    if (size < 1024) return 'none';
    
    // Brotli is best for text content but requires support
    if (dataType.startsWith('text/') || dataType === 'application/json') {
      if (supported.includes('br')) return 'br';
    }
    
    // Gzip is widely supported and efficient
    if (supported.includes('gzip')) return 'gzip';
    
    // Fallback to deflate
    if (supported.includes('deflate')) return 'deflate';
    
    return 'none';
  },

  /**
   * Calculate optimal batch size
   */
  calculateOptimalBatchSize(
    avgRequestSize: number,
    targetLatency: number = 100,
    maxMemory: number = 1024 * 1024, // 1MB
  ): number {
    // Estimate processing time per request (simplified)
    const processingTimePerRequest = 2; // 2ms baseline
    const maxRequestsForLatency = Math.floor(targetLatency / processingTimePerRequest);
    const maxRequestsForMemory = Math.floor(maxMemory / avgRequestSize);
    
    // Take the minimum to stay within both constraints
    return Math.min(maxRequestsForLatency, maxRequestsForMemory, 100); // Cap at 100
  },

  /**
   * Estimate bandwidth savings
   */
  estimateBandwidthSavings(
    originalSize: number,
    optimizedSize: number,
    requestsPerSecond: number,
  ): {
    bytesPerSecond: number;
    mbPerHour: number;
    gbPerDay: number;
  } {
    const savingsPerRequest = originalSize - optimizedSize;
    const bytesPerSecond = savingsPerRequest * requestsPerSecond;
    const mbPerHour = (bytesPerSecond * 3600) / (1024 * 1024);
    const gbPerDay = (mbPerHour * 24) / 1024;

    return {
      bytesPerSecond,
      mbPerHour,
      gbPerDay,
    };
  },

  /**
   * Priority queue for batch processing
   */
  createPriorityQueue<T>(compareFn: (a: T, b: T) => number): {
    enqueue: (item: T) => void;
    dequeue: () => T | undefined;
    peek: () => T | undefined;
    size: () => number;
    isEmpty: () => boolean;
  } {
    const queue: T[] = [];

    return {
      enqueue: (item: T) => {
        queue.push(item);
        queue.sort(compareFn);
      },
      dequeue: () => queue.shift(),
      peek: () => queue[0],
      size: () => queue.length,
      isEmpty: () => queue.length === 0,
    };
  },
};

// ===================================================================
// CONSTANTS
// ===================================================================

export const CACHING_CONSTANTS = {
  // Default TTLs (in milliseconds)
  TTL: {
    VERY_SHORT: 60 * 1000,           // 1 minute
    SHORT: 5 * 60 * 1000,           // 5 minutes
    MEDIUM: 30 * 60 * 1000,         // 30 minutes
    LONG: 2 * 60 * 60 * 1000,       // 2 hours
    VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Size thresholds
  SIZE_THRESHOLDS: {
    COMPRESSION_MIN: 1024,           // 1KB
    BATCH_MAX: 1024 * 1024,         // 1MB
    CACHE_MAX_ENTRY: 10 * 1024 * 1024, // 10MB
  },

  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    RESPONSE_TIME_EXCELLENT: 50,     // 50ms
    RESPONSE_TIME_GOOD: 100,         // 100ms
    RESPONSE_TIME_POOR: 500,         // 500ms
    HIT_RATE_EXCELLENT: 95,          // 95%
    HIT_RATE_GOOD: 80,               // 80%
    HIT_RATE_POOR: 60,               // 60%
  },

  // Cache strategies
  STRATEGIES: {
    DEFAULT: 'lru',
    MEMORY: 'lru',
    REDIS: 'ttl',
    DATABASE: 'write_through',
  },

  // Compression levels
  COMPRESSION_LEVELS: {
    FAST: 1,
    BALANCED: 6,
    BEST: 9,
  },

  // Batch priorities
  BATCH_PRIORITIES: {
    CRITICAL: 1,
    HIGH: 3,
    NORMAL: 5,
    LOW: 7,
    BACKGROUND: 9,
  },
} as const;

// ===================================================================
// ERROR CLASSES
// ===================================================================

export class CachingError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly level?: import('./intelligent-cache.service').CacheLevel,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'CachingError';
  }
}

export class CachePerformanceError extends Error {
  constructor(
    message: string,
    public readonly metricType: string,
    public readonly service?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'CachePerformanceError';
  }
}

export class OptimizationError extends Error {
  constructor(
    message: string,
    public readonly optimizationType: string,
    public readonly stage?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'OptimizationError';
  }
}

// ===================================================================
// CONFIGURATION BUILDERS
// ===================================================================

/**
 * Configuration builder for caching setup
 */
export class CacheConfigBuilder {
  private config: Partial<import('./intelligent-cache.service').CacheConfig> = {};

  static create(): CacheConfigBuilder {
    return new CacheConfigBuilder();
  }

  enableMemoryCache(maxEntries: number = 10000, maxSize: number = 100 * 1024 * 1024): this {
    this.config.levels = this.config.levels || {} as any;
    this.config.levels.memory = {
      enabled: true,
      maxEntries,
      maxSizeBytes: maxSize,
      strategy: 'lru',
      ttl: 300000, // 5 minutes
    };
    return this;
  }

  enableRedisCache(maxEntries: number = 100000, maxSize: number = 1024 * 1024 * 1024): this {
    this.config.levels = this.config.levels || {} as any;
    this.config.levels.redis = {
      enabled: true,
      maxEntries,
      maxSizeBytes: maxSize,
      ttl: 3600000, // 1 hour
      keyPrefix: 'both-sides:cache:',
      compression: true,
    };
    return this;
  }

  enableDatabaseCache(ttl: number = 86400000): this {
    this.config.levels = this.config.levels || {} as any;
    this.config.levels.database = {
      enabled: true,
      ttl,
      cleanupInterval: 3600000, // 1 hour
    };
    return this;
  }

  setInvalidationStrategy(strategy: import('./intelligent-cache.service').InvalidationStrategy): this {
    this.config.invalidation = this.config.invalidation || {} as any;
    this.config.invalidation.strategy = strategy;
    return this;
  }

  enableMonitoring(metricsInterval: number = 60000): this {
    this.config.monitoring = {
      enabled: true,
      metricsInterval,
      performanceTracking: true,
    };
    return this;
  }

  build(): import('./intelligent-cache.service').CacheConfig {
    return createDefaultCacheConfig(this.config);
  }
}

/**
 * Configuration builder for optimization setup
 */
export class OptimizationConfigBuilder {
  private config: Partial<import('./response-optimization.service').OptimizationConfig> = {};

  static create(): OptimizationConfigBuilder {
    return new OptimizationConfigBuilder();
  }

  enableCompression(
    algorithm: import('./response-optimization.service').CompressionAlgorithm = 'gzip',
    level: number = 6,
    threshold: number = 1024,
  ): this {
    this.config.compression = {
      enabled: true,
      algorithm,
      level,
      threshold,
      mimeTypes: ['application/json', 'text/plain', 'text/html', 'application/xml'],
      excludeExtensions: ['.jpg', '.png', '.gif', '.mp4', '.zip'],
    };
    return this;
  }

  enableBatching(
    strategy: import('./response-optimization.service').BatchingStrategy = 'adaptive',
    maxSize: number = 50,
    maxWait: number = 100,
  ): this {
    this.config.batching = {
      enabled: true,
      strategy,
      maxBatchSize: maxSize,
      maxBatchBytes: 1048576, // 1MB
      maxWaitTime: maxWait,
      priorityLevels: 10,
    };
    return this;
  }

  enableConnectionPooling(maxConnections: number = 100, idleTimeout: number = 30000): this {
    this.config.connectionPooling = {
      enabled: true,
      maxConnections,
      maxIdleConnections: Math.floor(maxConnections * 0.1),
      idleTimeout,
      connectionTimeout: 5000,
      keepAlive: true,
    };
    return this;
  }

  enableTransformation(options?: {
    minify?: boolean;
    removeNulls?: boolean;
    camelCase?: boolean;
    fieldFiltering?: boolean;
  }): this {
    this.config.responseTransformation = {
      enabled: true,
      minify: options?.minify ?? true,
      removeNulls: options?.removeNulls ?? true,
      camelCase: options?.camelCase ?? false,
      fieldFiltering: options?.fieldFiltering ?? true,
    };
    return this;
  }

  build(): import('./response-optimization.service').OptimizationConfig {
    return createDefaultOptimizationConfig(this.config);
  }
}

// ===================================================================
// FACTORY FUNCTIONS
// ===================================================================

/**
 * Factory function for creating pre-configured cache instances
 */
export function createCacheInstance(
  type: 'development' | 'production' | 'testing',
  overrides?: Partial<import('./intelligent-cache.service').CacheConfig>,
): import('./intelligent-cache.service').CacheConfig {
  const baseConfigs = {
    development: CacheConfigBuilder.create()
      .enableMemoryCache(5000, 50 * 1024 * 1024) // 50MB
      .enableMonitoring(30000) // 30 seconds
      .build(),
    
    production: CacheConfigBuilder.create()
      .enableMemoryCache(20000, 200 * 1024 * 1024) // 200MB
      .enableRedisCache(200000, 2 * 1024 * 1024 * 1024) // 2GB
      .enableDatabaseCache(24 * 60 * 60 * 1000) // 24 hours
      .enableMonitoring(60000) // 1 minute
      .setInvalidationStrategy('tag_based')
      .build(),
    
    testing: CacheConfigBuilder.create()
      .enableMemoryCache(1000, 10 * 1024 * 1024) // 10MB
      .enableMonitoring(10000) // 10 seconds
      .build(),
  };

  return { ...baseConfigs[type], ...overrides };
}

/**
 * Factory function for creating optimization instances
 */
export function createOptimizationInstance(
  type: 'development' | 'production' | 'testing',
  overrides?: Partial<import('./response-optimization.service').OptimizationConfig>,
): import('./response-optimization.service').OptimizationConfig {
  const baseConfigs = {
    development: OptimizationConfigBuilder.create()
      .enableCompression('gzip', 4, 512) // Fast compression for dev
      .enableBatching('time_based', 25, 200) // Smaller batches
      .enableConnectionPooling(25, 15000) // Fewer connections
      .enableTransformation({ minify: false }) // Readable output for debugging
      .build(),
    
    production: OptimizationConfigBuilder.create()
      .enableCompression('br', 6, 1024) // Optimal compression
      .enableBatching('adaptive', 100, 50) // Efficient batching
      .enableConnectionPooling(200, 60000) // More connections
      .enableTransformation() // All optimizations
      .build(),
    
    testing: OptimizationConfigBuilder.create()
      .enableCompression('gzip', 1, 256) // Fastest compression
      .enableBatching('size_based', 10, 50) // Small batches
      .enableConnectionPooling(10, 5000) // Minimal pooling
      .enableTransformation({ minify: false, removeNulls: false }) // Minimal transformations
      .build(),
  };

  return { ...baseConfigs[type], ...overrides };
}
